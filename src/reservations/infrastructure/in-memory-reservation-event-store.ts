import { Effect, Either, HashMap, Layer, Option, Ref } from "effect";

import { StreamVersionConflict } from "../application/errors.ts";
import {
  ReservationEventStore,
  type ReservationEventStoreService,
  type ReservationEventStream,
} from "../application/reservation-event-store.ts";
import { type ReservationId } from "../domain/value-objects.ts";

const emptyStream: ReservationEventStream = { events: [], version: 0 };

type Streams = HashMap.HashMap<ReservationId, ReservationEventStream>;

const makeReservationEventStore = Effect.gen(function* () {
  const streams = yield* Ref.make<Streams>(HashMap.empty());

  return ReservationEventStore.of({
    append: (reservationId, expectedVersion, events) =>
      Ref.modify(streams, (
        currentStreams,
      ): readonly [Either.Either<number, StreamVersionConflict>, Streams] => {
        const current = Option.getOrElse(
          HashMap.get(currentStreams, reservationId),
          () => emptyStream,
        );

        if (current.version !== expectedVersion) {
          return [
            Either.left(
              new StreamVersionConflict({
                actualVersion: current.version,
                expectedVersion,
                reservationId,
              }),
            ),
            currentStreams,
          ];
        }

        if (events.length === 0) {
          return [Either.right(current.version), currentStreams];
        }

        const next: ReservationEventStream = {
          events: [...current.events, ...events],
          version: current.version + events.length,
        };

        return [
          Either.right(next.version),
          HashMap.set(currentStreams, reservationId, next),
        ];
      }).pipe(
        Effect.flatMap(
          Either.match({
            onLeft: Effect.fail,
            onRight: Effect.succeed,
          }),
        ),
      ),
    read: (reservationId) =>
      Ref.get(streams).pipe(
        Effect.map((currentStreams) =>
          Option.getOrElse(HashMap.get(currentStreams, reservationId), () => emptyStream),
        ),
      ),
  } satisfies ReservationEventStoreService);
});

export const InMemoryReservationEventStoreLive = Layer.effect(
  ReservationEventStore,
  makeReservationEventStore,
);
