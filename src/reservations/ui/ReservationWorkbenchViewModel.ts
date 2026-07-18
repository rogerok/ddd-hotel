import { Effect, Either, ParseResult, Schema } from "effect";
import { flow, makeAutoObservable } from "mobx";

import {
  type ReservationCommandAccepted,
  ReservationCommandRequest,
  type ReservationSnapshot,
} from "../contracts.ts";
import { type ReservationCommand } from "../domain/commands.ts";
import { ReservationId } from "../domain/value-objects.ts";
import { type ReservationsApi, type ReservationsApiError } from "./reservations-api.ts";

export type ReservationCommandTag = ReservationCommand["_tag"];
export type RequestState = "idle" | "pending";
export type WorkbenchOutcome =
  | {
      readonly _tag: "Accepted";
      readonly appendedEvents: number;
      readonly command: ReservationCommandTag;
    }
  | {
      readonly _tag: "Rejected";
      readonly error: string;
      readonly message: string;
    };

type ExecuteResult = Either.Either<ReservationCommandAccepted, ReservationsApiError>;
type LoadResult = Either.Either<ReservationSnapshot, ReservationsApiError>;

const failureMessage = (error: ReservationsApiError): string => {
  switch (error._tag) {
    case "InvalidRequest":
      return error.message;
    case "InvalidStateTransition":
      return `${error.command} is not allowed from ${error.from}`;
    case "ReservationNotFound":
      return `Reservation ${error.reservationId} was not found`;
    case "StreamVersionConflict":
      return `Expected version ${error.expectedVersion}, actual ${error.actualVersion}`;
    case "InternalServerError":
      return error.message;
    case "NetworkError":
      return "Network request failed";
    case "InvalidApiResponse":
      return "Server returned an invalid response";
  }
};

export class ReservationWorkbenchViewModel {
  reservationId = "res_demo0001";
  guest = "alice@example.com";
  room = "101";
  checkIn = "2026-07-20";
  checkOut = "2026-07-22";
  selectedCommand: ReservationCommandTag = "PlaceReservation";
  snapshot: ReservationSnapshot | null = null;
  requestState: RequestState = "idle";
  outcome: WorkbenchOutcome | null = null;

  constructor(private readonly api: ReservationsApi) {
    makeAutoObservable<this, "api">(this, {
      api: false,
      execute: flow.bound,
      load: flow.bound,
    });
  }

  *execute(): Generator<Promise<ExecuteResult>, void, ExecuteResult> {
    const rawCommand =
      this.selectedCommand === "PlaceReservation"
        ? {
            _tag: this.selectedCommand,
            guest: this.guest,
            range: { checkIn: this.checkIn, checkOut: this.checkOut },
            reservationId: this.reservationId,
            room: this.room,
          }
        : this.selectedCommand === "RescheduleReservation"
          ? {
              _tag: this.selectedCommand,
              range: { checkIn: this.checkIn, checkOut: this.checkOut },
              reservationId: this.reservationId,
            }
          : {
              _tag: this.selectedCommand,
              reservationId: this.reservationId,
            };
    const decoded = Schema.decodeUnknownEither(ReservationCommandRequest)(rawCommand, {
      errors: "all",
    });

    if (Either.isLeft(decoded)) {
      this.outcome = {
        _tag: "Rejected",
        error: "InvalidRequest",
        message: ParseResult.TreeFormatter.formatErrorSync(decoded.left),
      };
      return;
    }

    this.requestState = "pending";

    try {
      const result = yield Effect.runPromise(Effect.either(this.api.execute(decoded.right)));

      if (Either.isLeft(result)) {
        this.outcome = {
          _tag: "Rejected",
          error: result.left._tag,
          message: failureMessage(result.left),
        };
        return;
      }

      this.snapshot = result.right.snapshot;
      this.outcome = {
        _tag: "Accepted",
        appendedEvents: result.right.appendedEvents.length,
        command: decoded.right._tag,
      };
    } finally {
      this.requestState = "idle";
    }
  }

  *load(): Generator<Promise<LoadResult>, void, LoadResult> {
    const decodedId = Schema.decodeUnknownEither(ReservationId)(this.reservationId, {
      errors: "all",
    });

    if (Either.isLeft(decodedId)) {
      this.snapshot = null;
      this.outcome = {
        _tag: "Rejected",
        error: "InvalidRequest",
        message: ParseResult.TreeFormatter.formatErrorSync(decodedId.left),
      };
      return;
    }

    this.requestState = "pending";

    try {
      const result = yield Effect.runPromise(Effect.either(this.api.load(decodedId.right)));

      if (Either.isLeft(result)) {
        if (result.left._tag === "ReservationNotFound") {
          this.snapshot = null;
        }

        this.outcome = {
          _tag: "Rejected",
          error: result.left._tag,
          message: failureMessage(result.left),
        };
        return;
      }

      this.snapshot = result.right;
      this.outcome = null;
    } finally {
      this.requestState = "idle";
    }
  }

  reset(): void {
    const random = crypto.getRandomValues(new Uint32Array(1))[0];
    this.reservationId = `res_${random?.toString(16).padStart(8, "0") ?? "00000000"}`;
    this.selectedCommand = "PlaceReservation";
    this.snapshot = null;
    this.outcome = null;
  }
}
