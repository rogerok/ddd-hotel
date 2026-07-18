import { Context, Effect } from "effect";

import { type ReservationEvent } from "../domain/events.ts";
import { type ReservationId } from "../domain/value-objects.ts";
import { type StreamVersionConflict } from "./errors.ts";

export type ReservationEventStream = {
  readonly events: ReadonlyArray<ReservationEvent>;
  readonly version: number;
};

export type ReservationEventStoreService = {
  readonly append: (
    reservationId: ReservationId,
    expectedVersion: number,
    events: ReadonlyArray<ReservationEvent>,
  ) => Effect.Effect<number, StreamVersionConflict>;
  readonly read: (
    reservationId: ReservationId,
  ) => Effect.Effect<ReservationEventStream>;
};

export class ReservationEventStore extends Context.Tag(
  "@ddd-hotel/ReservationEventStore",
)<ReservationEventStore, ReservationEventStoreService>() {}
