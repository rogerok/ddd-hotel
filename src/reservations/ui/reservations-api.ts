import { Effect, Schema } from "effect";

import {
  type ApiError,
  ApiErrorResponse,
  type ReservationCommandAccepted,
  ReservationCommandAccepted as ReservationCommandAcceptedSchema,
  ReservationCommandRequest,
  type ReservationSnapshot,
  ReservationSnapshot as ReservationSnapshotSchema,
} from "../contracts.ts";
import { type ReservationCommand } from "../domain/commands.ts";
import { type ReservationId } from "../domain/value-objects.ts";
import { InvalidApiResponse, NetworkError } from "./errors.ts";

export type ReservationsApiError = ApiError | InvalidApiResponse | NetworkError;

export interface ReservationsApi {
  readonly execute: (
    command: ReservationCommand,
  ) => Effect.Effect<ReservationCommandAccepted, ReservationsApiError>;
  readonly load: (
    reservationId: ReservationId,
  ) => Effect.Effect<ReservationSnapshot, ReservationsApiError>;
}

const readJson = (response: Response): Effect.Effect<unknown, InvalidApiResponse> =>
  Effect.tryPromise({
    try: () => response.text(),
    catch: (cause) => new InvalidApiResponse({ cause }),
  }).pipe(
    Effect.flatMap((body) =>
      Effect.try({
        try: () => JSON.parse(body) as unknown,
        catch: (cause) => new InvalidApiResponse({ cause }),
      }),
    ),
  );

const decodeResponse = <Success, Encoded>(
  response: Response,
  successSchema: Schema.Schema<Success, Encoded>,
): Effect.Effect<Success, ApiError | InvalidApiResponse> =>
  readJson(response).pipe(
    Effect.flatMap((body) =>
      response.ok
        ? Schema.decodeUnknown(successSchema)(body).pipe(
            Effect.mapError((cause) => new InvalidApiResponse({ cause })),
          )
        : Schema.decodeUnknown(ApiErrorResponse)(body).pipe(
            Effect.mapError((cause) => new InvalidApiResponse({ cause })),
            Effect.flatMap(({ error }) => Effect.fail(error)),
          ),
    ),
  );

export class FetchReservationsApi implements ReservationsApi {
  constructor(private readonly baseUrl = "/api") {}

  readonly execute = (
    command: ReservationCommand,
  ): Effect.Effect<ReservationCommandAccepted, ReservationsApiError> =>
    Schema.encode(ReservationCommandRequest)(command).pipe(
      Effect.orDie,
      Effect.flatMap((body) =>
        Effect.tryPromise({
          try: () =>
            fetch(`${this.baseUrl}/reservations/commands`, {
              body: JSON.stringify(body),
              headers: { "content-type": "application/json" },
              method: "POST",
            }),
          catch: (cause) => new NetworkError({ cause }),
        }),
      ),
      Effect.flatMap((response) =>
        decodeResponse(response, ReservationCommandAcceptedSchema),
      ),
    );

  readonly load = (
    reservationId: ReservationId,
  ): Effect.Effect<ReservationSnapshot, ReservationsApiError> =>
    Effect.tryPromise({
      try: () =>
        fetch(`${this.baseUrl}/reservations/${encodeURIComponent(reservationId)}`),
      catch: (cause) => new NetworkError({ cause }),
    }).pipe(
      Effect.flatMap((response) => decodeResponse(response, ReservationSnapshotSchema)),
    );
}
