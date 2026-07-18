import { Data } from "effect";

import { type ReservationId } from "../domain/value-objects.ts";

export class StreamVersionConflict extends Data.TaggedError("StreamVersionConflict")<{
  readonly actualVersion: number;
  readonly expectedVersion: number;
  readonly reservationId: ReservationId;
}> {}

export class ReservationNotFound extends Data.TaggedError("ReservationNotFound")<{
  readonly reservationId: ReservationId;
}> {}
