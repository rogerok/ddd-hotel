import { Effect, Option } from "effect";

import { type ReservationCommandAccepted } from "../contracts.ts";
import { type ReservationCommand } from "../domain/commands.ts";
import { replay, reservationDecider } from "../domain/decider.ts";
import { type DomainError } from "../domain/errors.ts";
import { type StreamVersionConflict } from "./errors.ts";
import { ReservationEventStore } from "./reservation-event-store.ts";
import { projectReservation } from "./reservation-projection.ts";

export const handleReservationCommand = (
  command: ReservationCommand,
): Effect.Effect<
  ReservationCommandAccepted,
  DomainError | StreamVersionConflict,
  ReservationEventStore
> =>
  Effect.gen(function* () {
    const store = yield* ReservationEventStore;
    const stream = yield* store.read(command.reservationId);
    const state = replay(stream.events);
    const appendedEvents = yield* reservationDecider.decide(state, command);
    const version = yield* store.append(
      command.reservationId,
      stream.version,
      appendedEvents,
    );
    const events = [...stream.events, ...appendedEvents];
    const reservation = Option.getOrThrowWith(
      projectReservation(events),
      () => new Error("A successful reservation command must produce a projection"),
    );

    return {
      appendedEvents,
      snapshot: {
        events,
        reservation,
        version,
      },
    };
  });
