import { Cause, Effect, ManagedRuntime, ParseResult, Schema } from "effect";
import { type FastifyPluginCallback } from "fastify";

import { type ReservationNotFound, type StreamVersionConflict } from "../application/errors.ts";
import { getReservation } from "../application/get-reservation.ts";
import { handleReservationCommand } from "../application/handle-reservation-command.ts";
import { ReservationEventStore } from "../application/reservation-event-store.ts";
import {
  ApiErrorResponse,
  type InternalServerError,
  type InvalidRequest,
  type InvalidStateTransitionError,
  ReservationCommandAccepted,
  ReservationCommandRequest,
  type ReservationNotFoundError,
  ReservationParams,
  ReservationSnapshot,
  type StreamVersionConflictError,
} from "../contracts.ts";
import { type DomainError } from "../domain/errors.ts";

type HttpResult = {
  readonly body: unknown;
  readonly statusCode: number;
};

type ExpectedError = DomainError | InvalidRequest | ReservationNotFound | StreamVersionConflict;

const internalServerError: InternalServerError = {
  _tag: "InternalServerError",
  message: "Unexpected server error",
};

const encodeExpectedError = (error: ExpectedError): Effect.Effect<HttpResult> => {
  let statusCode: number;
  let transportError:
    | InvalidRequest
    | InvalidStateTransitionError
    | ReservationNotFoundError
    | StreamVersionConflictError;

  switch (error._tag) {
    case "InvalidRequest":
      statusCode = 400;
      transportError = error;
      break;
    case "ReservationNotFound":
      statusCode = 404;
      transportError = {
        _tag: "ReservationNotFound",
        reservationId: error.reservationId,
      };
      break;
    case "InvalidStateTransition":
      statusCode = 409;
      transportError = {
        _tag: "InvalidStateTransition",
        command: error.command,
        from: error.from,
        reservationId: error.reservationId,
      };
      break;
    case "StreamVersionConflict":
      statusCode = 409;
      transportError = {
        _tag: "StreamVersionConflict",
        actualVersion: error.actualVersion,
        expectedVersion: error.expectedVersion,
        reservationId: error.reservationId,
      };
      break;
  }

  return Schema.encode(ApiErrorResponse)({ error: transportError }).pipe(
    Effect.orDie,
    Effect.map((body) => ({ body, statusCode })),
  );
};

export const reservationRoutes = (
  runtime: ManagedRuntime.ManagedRuntime<ReservationEventStore, never>,
): FastifyPluginCallback =>
  (fastify, _options, done) => {
    fastify.post<{ Body: unknown }>("/api/reservations/commands", async (request, reply) => {
      const result = await runtime.runPromise(
        Schema.decodeUnknown(ReservationCommandRequest)(request.body, { errors: "all" }).pipe(
          Effect.mapError(
            (error): InvalidRequest => ({
              _tag: "InvalidRequest",
              message: ParseResult.TreeFormatter.formatErrorSync(error),
            }),
          ),
          Effect.flatMap(handleReservationCommand),
          Effect.matchEffect({
            onFailure: encodeExpectedError,
            onSuccess: (accepted) =>
              Schema.encode(ReservationCommandAccepted)(accepted).pipe(
                Effect.orDie,
                Effect.map((body): HttpResult => ({ body, statusCode: 200 })),
              ),
          }),
          Effect.catchAllCause((cause) =>
            Effect.sync((): HttpResult => {
              request.log.error(Cause.pretty(cause));
              return { body: { error: internalServerError }, statusCode: 500 };
            }),
          ),
        ),
      );

      return reply.code(result.statusCode).send(result.body);
    });

    fastify.get<{ Params: unknown }>("/api/reservations/:reservationId", async (request, reply) => {
      const result = await runtime.runPromise(
        Schema.decodeUnknown(ReservationParams)(request.params, { errors: "all" }).pipe(
          Effect.mapError(
            (error): InvalidRequest => ({
              _tag: "InvalidRequest",
              message: ParseResult.TreeFormatter.formatErrorSync(error),
            }),
          ),
          Effect.flatMap(({ reservationId }) => getReservation(reservationId)),
          Effect.matchEffect({
            onFailure: encodeExpectedError,
            onSuccess: (snapshot) =>
              Schema.encode(ReservationSnapshot)(snapshot).pipe(
                Effect.orDie,
                Effect.map((body): HttpResult => ({ body, statusCode: 200 })),
              ),
          }),
          Effect.catchAllCause((cause) =>
            Effect.sync((): HttpResult => {
              request.log.error(Cause.pretty(cause));
              return { body: { error: internalServerError }, statusCode: 500 };
            }),
          ),
        ),
      );

      return reply.code(result.statusCode).send(result.body);
    });
    done();
  };
