import { Effect, Either, TestClock, TestContext } from "effect";

import {
  CheckInGuest,
  CheckOutGuest,
  PlaceReservation,
  RescheduleReservation,
  type ReservationCommand,
} from "../src/domain/commands.ts";
import { replay, reservationDecider } from "../src/domain/decider.ts";
import { InvalidStateTransition } from "../src/domain/errors.ts";
import { type ReservationEvent } from "../src/domain/events.ts";
import { DateRange, Day, GuestEmail, ReservationId, RoomNumber } from "../src/domain/types.ts";

const at = 1_700_000_000_000;
const id = ReservationId.make("res_abcd1234");
const guest = GuestEmail.make("alice@example.com");
const room = RoomNumber.make("101");
const range = DateRange.make({ checkIn: Day.make(20_260_101), checkOut: Day.make(20_260_103) });

const runDecide = (history: ReadonlyArray<ReservationEvent>, command: ReservationCommand) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(at);
    const state = replay(history);

    return yield* Effect.either(reservationDecider.decide(state, command));
  }).pipe(Effect.provide(TestContext.TestContext));

const runFullScenario = (scenario: ReadonlyArray<ReservationCommand>) =>
  Effect.gen(function* () {
    const eventsLog: ReservationEvent[] = [];

    let state = reservationDecider.initial;

    for (const command of scenario) {
      const events = yield* reservationDecider.decide(state, command);

      eventsLog.push(...events);

      for (const event of events) {
        state = reservationDecider.evolve(state, event);
      }
    }
    return { events: eventsLog, state };
  });

Effect.gen(function* () {});
describe("reservationDecider", () => {
  it("PlaceReservation in empty history returns ReservationPlaced", async () => {
    const command = PlaceReservation.make({
      guest,
      range,
      reservationId: id,
      room,
    });

    const result = await Effect.runPromise(runDecide([], command));
    expect(Either.isRight(result)).toBe(true);

    if (Either.isRight(result)) {
      expect(result.right).toEqual([
        { _tag: "ReservationPlaced", guest, occurredAt: at, range, reservationId: id, room },
      ]);
    }
  });

  it("Dismiss PlaceReservation on Reserved", async () => {
    const history: ReservationEvent[] = [
      { _tag: "ReservationPlaced", guest, occurredAt: at, range, reservationId: id, room },
    ];

    const command = PlaceReservation.make({
      guest,
      range,
      reservationId: id,
      room,
    });

    const result = await Effect.runPromise(runDecide(history, command));

    expect(Either.isLeft(result)).toBe(true);

    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidStateTransition);
    }
  });

  it("CheckedOut after full life cycle", () => {
    const history: ReservationEvent[] = [
      { _tag: "ReservationPlaced", guest, occurredAt: at, range, reservationId: id, room },
      { _tag: "GuestCheckedIn", occurredAt: at, reservationId: id },
      { _tag: "GuestCheckedOut", occurredAt: at, reservationId: id },
    ];

    expect(replay(history)._tag).toBe("CheckedOut");
  });

  it("runFullScenario returns final state matching replayed event log", async () => {
    const scenario: ReservationCommand[] = [
      PlaceReservation.make({
        guest,
        range,
        reservationId: id,
        room,
      }),
      CheckInGuest.make({ reservationId: id }),
      CheckOutGuest.make({ reservationId: id }),
    ];

    const result = await Effect.runPromise(runFullScenario(scenario));
    const replayedState = result.events.reduce(
      reservationDecider.evolve,
      reservationDecider.initial,
    );

    expect(replayedState).toEqual(result.state);
  });

  it("RescheduledReservation happy path", async () => {
    const history: ReservationEvent[] = [
      { _tag: "ReservationPlaced", guest, occurredAt: at, range, reservationId: id, room },
    ];

    const command = RescheduleReservation.make({
      range,
      reservationId: id,
    });

    const result = await Effect.runPromise(runDecide(history, command));

    expect(Either.isRight(result)).toBe(true);

    if (Either.isRight(result)) {
      expect(result.right).toEqual([
        {
          _tag: "ReservationRescheduled",
          occurredAt: at,
          range: command.range,
          reservationId: command.reservationId,
        },
      ]);
    }
  });

  it("RescheduledReservation invalid state transition", async () => {
    const history: ReservationEvent[] = [
      { _tag: "GuestCheckedIn", occurredAt: at, reservationId: id },
    ];

    const command = RescheduleReservation.make({
      range,
      reservationId: id,
    });

    const result = await Effect.runPromise(runDecide(history, command));

    expect(Either.isLeft(result)).toBe(true);

    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidStateTransition);
    }
  });
});
