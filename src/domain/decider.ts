import { Clock, Effect, Match } from "effect";

import {
  type CancelReservation,
  type CheckInGuest,
  type CheckOutGuest,
  type PlaceReservation,
  type ReservationCommand,
} from "./commands.ts";
import { InvalidStateTransition } from "./errors.ts";
import {
  type GuestCheckedIn,
  GuestCheckedOut,
  type ReservationCancelled,
  type ReservationEvent,
  type ReservationPlaced,
} from "./events.ts";
import { type ReservationState } from "./state.ts";

export type Decider<Command, State, Event, Error> = {
  readonly initial: State;
  // Если мы в этом состоянии и пришла такая команда, какие события выпустить или какую ошибку вернуть
  readonly decide: (state: State, command: Command) => Effect.Effect<ReadonlyArray<Event>, Error>;
  // Если применить это событие к этому состоянию, какое будет новое состояние
  readonly evolve: (state: State, event: Event) => State;

  replay: () => State;
};

export type ReservationDecider = Decider<
  ReservationCommand,
  ReservationState,
  ReservationEvent,
  InvalidStateTransition
>;

export const placeReservation = (
  state: ReservationState,
  command: PlaceReservation,
): Effect.Effect<ReadonlyArray<ReservationPlaced>, InvalidStateTransition> =>
  Effect.gen(function* () {
    if (state._tag !== "NotPlaced") {
      return yield* Effect.fail(
        new InvalidStateTransition({
          command: command._tag,
          from: state._tag,
          reservationId: command.reservationId,
        }),
      );
    }

    const occurredAt = yield* Clock.currentTimeMillis;

    return [
      {
        _tag: "ReservationPlaced",
        guest: command.guest,
        occurredAt,
        range: command.range,
        reservationId: command.reservationId,
        room: command.room,
      },
    ];
  });

export const cancelReservation = (
  state: ReservationState,
  command: CancelReservation,
): Effect.Effect<ReadonlyArray<ReservationCancelled>, InvalidStateTransition> =>
  Effect.gen(function* () {
    if (state._tag !== "Reserved") {
      return yield* Effect.fail(
        new InvalidStateTransition({
          command: command._tag,
          from: state._tag,
          reservationId: command.reservationId,
        }),
      );
    }

    const occurredAt = yield* Clock.currentTimeMillis;

    return [
      {
        _tag: "ReservationCancelled",
        occurredAt,
        reservationId: command.reservationId,
      },
    ];
  });

export const checkInGuest = (
  state: ReservationState,
  command: CheckInGuest,
): Effect.Effect<ReadonlyArray<GuestCheckedIn>, InvalidStateTransition> =>
  Effect.gen(function* () {
    if (state._tag !== "Reserved") {
      return yield* Effect.fail(
        new InvalidStateTransition({
          command: command._tag,
          from: state._tag,
          reservationId: command.reservationId,
        }),
      );
    }

    const occurredAt = yield* Clock.currentTimeMillis;
    return [{ _tag: "GuestCheckedIn", occurredAt, reservationId: command.reservationId }];
  });

export const checkOutGuest = (
  state: ReservationState,
  command: CheckOutGuest,
): Effect.Effect<ReadonlyArray<GuestCheckedOut>, InvalidStateTransition> =>
  Effect.gen(function* () {
    if (state._tag !== "CheckedIn") {
      return yield* Effect.fail(
        new InvalidStateTransition({
          command: command._tag,
          from: state._tag,
          reservationId: command.reservationId,
        }),
      );
    }

    const occurredAt = yield* Clock.currentTimeMillis;
    return [{ _tag: "GuestCheckedOut", occurredAt, reservationId: command.reservationId }];
  });

export const decide = (
  state: ReservationState,
  command: ReservationCommand,
): Effect.Effect<ReadonlyArray<ReservationEvent>, InvalidStateTransition> =>
  Match.value(command).pipe(
    Match.tag("PlaceReservation", (c) => placeReservation(state, c)),
    Match.tag("CancelReservation", (c) => cancelReservation(state, c)),
    Match.tag("CheckInGuest", (c) => checkInGuest(state, c)),
    Match.tag("CheckOutGuest", (c) => checkOutGuest(state, c)),
    Match.exhaustive,
  );
