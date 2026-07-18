import { Effect, Option } from "effect";

import { type ReservationSnapshot } from "../contracts.ts";
import { type ReservationId } from "../domain/value-objects.ts";
import { ReservationNotFound } from "./errors.ts";
import { ReservationEventStore } from "./reservation-event-store.ts";
import { projectReservation } from "./reservation-projection.ts";

export const getReservation = (
  reservationId: ReservationId,
): Effect.Effect<ReservationSnapshot, ReservationNotFound, ReservationEventStore> =>
  Effect.gen(function* () {
    const store = yield* ReservationEventStore;
    const stream = yield* store.read(reservationId);

    if (stream.version === 0) {
      return yield* new ReservationNotFound({ reservationId });
    }

    const reservation = Option.getOrThrowWith(
      projectReservation(stream.events),
      () => new Error("A non-empty reservation stream must produce a projection"),
    );

    return {
      events: stream.events,
      reservation,
      version: stream.version,
    };
  });
