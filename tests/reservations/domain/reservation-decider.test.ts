import { Effect, Either, TestClock, TestContext } from "effect";

import {
  CancelReservation,
  CheckInGuest,
  CheckOutGuest,
  PlaceReservation,
  RescheduleReservation,
  type ReservationCommand,
} from "../../../src/reservations/domain/commands.ts";
import {
  replay,
  reservationDecider,
} from "../../../src/reservations/domain/decider.ts";
import { InvalidStateTransition } from "../../../src/reservations/domain/errors.ts";
import { type ReservationEvent } from "../../../src/reservations/domain/events.ts";
import { type ReservationState } from "../../../src/reservations/domain/state.ts";
import {
  DateRange,
  Day,
  GuestEmail,
  ReservationId,
  RoomNumber,
} from "../../../src/reservations/domain/value-objects.ts";

type DecideResult = Either.Either<
  ReadonlyArray<ReservationEvent>,
  InvalidStateTransition
>;

type FullScenarioResult = {
  readonly events: ReservationEvent[];
  readonly state: ReservationState;
};

const at = 1_700_000_000_000;
const id = ReservationId.make("res_abcd1234");
const guest = GuestEmail.make("alice@example.com");
const room = RoomNumber.make("101");
const initialRange = DateRange.make({
  checkIn: Day.make("2026-01-01"),
  checkOut: Day.make("2026-01-03"),
});
const rescheduledRange = DateRange.make({
  checkIn: Day.make("2026-01-02"),
  checkOut: Day.make("2026-01-05"),
});

const placed = (range = initialRange): ReservationEvent => ({
  _tag: "ReservationPlaced",
  guest,
  occurredAt: at,
  range,
  reservationId: id,
  room,
});

const runDecide = (
  history: ReadonlyArray<ReservationEvent>,
  command: ReservationCommand,
): Effect.Effect<DecideResult> =>
  Effect.gen(function* () {
    yield* TestClock.setTime(at);
    return yield* Effect.either(reservationDecider.decide(replay(history), command));
  }).pipe(Effect.provide(TestContext.TestContext));

const runFullScenario = (
  scenario: ReadonlyArray<ReservationCommand>,
): Effect.Effect<FullScenarioResult, InvalidStateTransition> =>
  Effect.gen(function* () {
    yield* TestClock.setTime(at);
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
  }).pipe(Effect.provide(TestContext.TestContext));

describe("reservationDecider", () => {
  it("PlaceReservation emits ReservationPlaced from initial state", async () => {
    const command = PlaceReservation.make({
      guest,
      range: initialRange,
      reservationId: id,
      room,
    });
    const result = await Effect.runPromise(runDecide([], command));

    expect(result).toEqual(
      Either.right([
        {
          _tag: "ReservationPlaced",
          guest,
          occurredAt: at,
          range: initialRange,
          reservationId: id,
          room,
        },
      ]),
    );
  });

  it("RescheduleReservation keeps the aggregate Reserved and preserves identity data", async () => {
    const command = RescheduleReservation.make({
      range: rescheduledRange,
      reservationId: id,
    });
    const result = await Effect.runPromise(runDecide([placed()], command));

    expect(result).toEqual(
      Either.right([
        {
          _tag: "ReservationRescheduled",
          occurredAt: at,
          range: rescheduledRange,
          reservationId: id,
        },
      ]),
    );

    const state = replay([
      placed(),
      {
        _tag: "ReservationRescheduled",
        occurredAt: at,
        range: rescheduledRange,
        reservationId: id,
      },
    ]);

    expect(state).toEqual({
      _tag: "Reserved",
      guest,
      range: rescheduledRange,
      reservationId: id,
      room,
    });
  });

  it("allows CheckInGuest after reschedule", async () => {
    const history: ReservationEvent[] = [
      placed(),
      {
        _tag: "ReservationRescheduled",
        occurredAt: at,
        range: rescheduledRange,
        reservationId: id,
      },
    ];
    const result = await Effect.runPromise(
      runDecide(history, CheckInGuest.make({ reservationId: id })),
    );

    expect(result).toEqual(
      Either.right([{ _tag: "GuestCheckedIn", occurredAt: at, reservationId: id }]),
    );
  });

  it("CancelReservation emits ReservationCancelled from Reserved", async () => {
    const result = await Effect.runPromise(
      runDecide([placed()], CancelReservation.make({ reservationId: id })),
    );

    expect(result).toEqual(
      Either.right([{ _tag: "ReservationCancelled", occurredAt: at, reservationId: id }]),
    );
  });

  it("CheckOutGuest emits GuestCheckedOut from CheckedIn", async () => {
    const result = await Effect.runPromise(
      runDecide(
        [
          placed(),
          { _tag: "GuestCheckedIn", occurredAt: at, reservationId: id },
        ],
        CheckOutGuest.make({ reservationId: id }),
      ),
    );

    expect(result).toEqual(
      Either.right([{ _tag: "GuestCheckedOut", occurredAt: at, reservationId: id }]),
    );
  });

  it("rejects duplicate PlaceReservation", async () => {
    const result = await Effect.runPromise(
      runDecide(
        [placed()],
        PlaceReservation.make({ guest, range: initialRange, reservationId: id, room }),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toEqual(
        new InvalidStateTransition({
          command: "PlaceReservation",
          from: "Reserved",
          reservationId: id,
        }),
      );
    }
  });

  it("rejects cancellation after check-in", async () => {
    const result = await Effect.runPromise(
      runDecide(
        [placed(), { _tag: "GuestCheckedIn", occurredAt: at, reservationId: id }],
        CancelReservation.make({ reservationId: id }),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.from).toBe("CheckedIn");
      expect(result.left.command).toBe("CancelReservation");
    }
  });

  it.each([
    {
      command: CheckInGuest.make({ reservationId: id }),
      history: [
        placed(),
        { _tag: "GuestCheckedIn", occurredAt: at, reservationId: id } as const,
        { _tag: "GuestCheckedOut", occurredAt: at, reservationId: id } as const,
      ],
      state: "CheckedOut",
    },
    {
      command: RescheduleReservation.make({ range: rescheduledRange, reservationId: id }),
      history: [
        placed(),
        { _tag: "ReservationCancelled", occurredAt: at, reservationId: id } as const,
      ],
      state: "Cancelled",
    },
  ])("rejects $command._tag from terminal $state", async ({ command, history, state }) => {
    const result = await Effect.runPromise(runDecide(history, command));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.from).toBe(state);
    }
  });

  it("runFullScenario returns the same final state as replay", async () => {
    const scenario: ReservationCommand[] = [
      PlaceReservation.make({ guest, range: initialRange, reservationId: id, room }),
      RescheduleReservation.make({ range: rescheduledRange, reservationId: id }),
      CheckInGuest.make({ reservationId: id }),
      CheckOutGuest.make({ reservationId: id }),
    ];
    const result = await Effect.runPromise(runFullScenario(scenario));

    expect(result.events.map((event) => event._tag)).toEqual([
      "ReservationPlaced",
      "ReservationRescheduled",
      "GuestCheckedIn",
      "GuestCheckedOut",
    ]);
    expect(replay(result.events)).toEqual(result.state);
    expect(result.state._tag).toBe("CheckedOut");
  });
});
