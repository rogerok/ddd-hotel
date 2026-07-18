import { Clock, Effect, Match } from "effect";

import {
  type CancelReservation,
  type CheckInGuest,
  type CheckOutGuest,
  type PlaceReservation,
  type RescheduleReservation,
  type ReservationCommand,
} from "./commands.ts";
import { type DomainError, InvalidStateTransition } from "./errors.ts";
import {
  type GuestCheckedIn,
  type GuestCheckedOut,
  type ReservationCancelled,
  type ReservationEvent,
  type ReservationPlaced,
  type ReservationRescheduledEvent,
} from "./events.ts";
import { initial, type ReservationState } from "./state.ts";

export type Decider<Command, State, Event, Error> = {
  readonly initial: State;
  readonly decide: (
    state: State,
    command: Command,
  ) => Effect.Effect<ReadonlyArray<Event>, Error>;
  readonly evolve: (state: State, event: Event) => State;
};

export type ReservationDecider = Decider<
  ReservationCommand,
  ReservationState,
  ReservationEvent,
  DomainError
>;

export const placeReservation = (
  state: ReservationState,
  command: PlaceReservation,
): Effect.Effect<ReadonlyArray<ReservationPlaced>, DomainError> =>
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
): Effect.Effect<ReadonlyArray<ReservationCancelled>, DomainError> =>
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
): Effect.Effect<ReadonlyArray<GuestCheckedIn>, DomainError> =>
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
): Effect.Effect<ReadonlyArray<GuestCheckedOut>, DomainError> =>
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

export const rescheduleReservation = (
  state: ReservationState,
  command: RescheduleReservation,
): Effect.Effect<ReadonlyArray<ReservationRescheduledEvent>, DomainError> =>
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
        _tag: "ReservationRescheduled",
        occurredAt,
        range: command.range,
        reservationId: command.reservationId,
      },
    ];
  });

export const evolve = (state: ReservationState, event: ReservationEvent): ReservationState =>
  Match.value(event).pipe(
    Match.tag(
      "ReservationPlaced",
      (event): ReservationState => ({
        _tag: "Reserved",
        guest: event.guest,
        range: event.range,
        reservationId: event.reservationId,
        room: event.room,
      }),
    ),
    Match.tag("ReservationCancelled", (event): ReservationState => ({
      _tag: "Cancelled",
      reservationId: event.reservationId,
    })),
    Match.tag("GuestCheckedIn", (event): ReservationState => {
      if (state._tag !== "Reserved") return state;

      return {
        _tag: "CheckedIn",
        guest: state.guest,
        range: state.range,
        reservationId: event.reservationId,
        room: state.room,
      };
    }),
    Match.tag("GuestCheckedOut", (event): ReservationState => ({
      _tag: "CheckedOut",
      reservationId: event.reservationId,
    })),
    Match.tag("ReservationRescheduled", (event): ReservationState => {
      if (state._tag !== "Reserved") return state;

      return {
        ...state,
        range: event.range,
      };
    }),
    Match.exhaustive,
  );

export const decide = (
  state: ReservationState,
  command: ReservationCommand,
): Effect.Effect<ReadonlyArray<ReservationEvent>, DomainError> =>
  Match.value(command).pipe(
    Match.tag("PlaceReservation", (c) => placeReservation(state, c)),
    Match.tag("CancelReservation", (c) => cancelReservation(state, c)),
    Match.tag("CheckInGuest", (c) => checkInGuest(state, c)),
    Match.tag("CheckOutGuest", (c) => checkOutGuest(state, c)),
    Match.tag("RescheduleReservation", (c) => rescheduleReservation(state, c)),
    Match.exhaustive,
  );

export const reservationDecider: ReservationDecider = {
  decide,
  evolve,
  initial,
};

export const replay = (
  events: Iterable<ReservationEvent>,
  decider: ReservationDecider = reservationDecider,
): ReservationState => {
  let state = decider.initial;

  for (const event of events) {
    state = decider.evolve(state, event);
  }

  return state;
};
