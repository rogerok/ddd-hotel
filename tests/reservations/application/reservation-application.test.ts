import { Effect, Either, ManagedRuntime } from "effect";

import { ReservationNotFound } from "../../../src/reservations/application/errors.ts";
import { getReservation } from "../../../src/reservations/application/get-reservation.ts";
import { handleReservationCommand } from "../../../src/reservations/application/handle-reservation-command.ts";
import { ReservationEventStore } from "../../../src/reservations/application/reservation-event-store.ts";
import {
  CancelReservation,
  CheckInGuest,
  CheckOutGuest,
  PlaceReservation,
  RescheduleReservation,
} from "../../../src/reservations/domain/commands.ts";
import {
  DateRange,
  Day,
  GuestEmail,
  ReservationId,
  RoomNumber,
} from "../../../src/reservations/domain/value-objects.ts";
import { InMemoryReservationEventStoreLive } from "../../../src/reservations/infrastructure/in-memory-reservation-event-store.ts";

const id = ReservationId.make("res_app00001");
const otherId = ReservationId.make("res_app00002");
const guest = GuestEmail.make("app@example.com");
const room = RoomNumber.make("101");
const initialRange = DateRange.make({
  checkIn: Day.make("2026-08-01"),
  checkOut: Day.make("2026-08-03"),
});
const rescheduledRange = DateRange.make({
  checkIn: Day.make("2026-08-02"),
  checkOut: Day.make("2026-08-05"),
});

const place = (reservationId = id): PlaceReservation =>
  PlaceReservation.make({
    guest,
    range: initialRange,
    reservationId,
    room,
  });

let runtime: ManagedRuntime.ManagedRuntime<ReservationEventStore, never>;

beforeEach(() => {
  runtime = ManagedRuntime.make(InMemoryReservationEventStoreLive);
});

afterEach(async () => {
  await runtime.dispose();
});

describe("reservation application", () => {
  it("appends a successful decision and increments the stream version", async () => {
    const accepted = await runtime.runPromise(handleReservationCommand(place()));

    expect(accepted.snapshot.version).toBe(1);
    expect(accepted.appendedEvents.map((event) => event._tag)).toEqual([
      "ReservationPlaced",
    ]);
    expect(accepted.snapshot.reservation.status).toBe("Reserved");
  });

  it("does not mutate history or version after a domain rejection", async () => {
    await runtime.runPromise(handleReservationCommand(place()));
    const rejection = await runtime.runPromise(
      Effect.either(handleReservationCommand(place())),
    );
    const snapshot = await runtime.runPromise(getReservation(id));

    expect(Either.isLeft(rejection)).toBe(true);
    expect(snapshot.version).toBe(1);
    expect(snapshot.events).toHaveLength(1);
  });

  it("allows one append for a shared expected version and rejects the second", async () => {
    const event = {
      _tag: "ReservationPlaced" as const,
      guest,
      occurredAt: 0,
      range: initialRange,
      reservationId: id,
      room,
    };
    const firstVersion = await runtime.runPromise(
      Effect.gen(function* () {
        const store = yield* ReservationEventStore;
        return yield* store.append(id, 0, [event]);
      }),
    );
    const secondAppend = await runtime.runPromise(
      Effect.gen(function* () {
        const store = yield* ReservationEventStore;
        return yield* Effect.either(store.append(id, 0, [event]));
      }),
    );

    expect(firstVersion).toBe(1);
    expect(Either.isLeft(secondAppend)).toBe(true);
    if (Either.isLeft(secondAppend)) {
      expect(secondAppend.left).toMatchObject({
        _tag: "StreamVersionConflict",
        actualVersion: 1,
        expectedVersion: 0,
        reservationId: id,
      });
    }
  });

  it("isolates streams by reservation ID", async () => {
    await runtime.runPromise(handleReservationCommand(place(id)));
    await runtime.runPromise(handleReservationCommand(place(otherId)));

    const first = await runtime.runPromise(getReservation(id));
    const second = await runtime.runPromise(getReservation(otherId));

    expect(first.events).toHaveLength(1);
    expect(second.events).toHaveLength(1);
    expect(first.reservation.reservationId).toBe(id);
    expect(second.reservation.reservationId).toBe(otherId);
  });

  it("returns ReservationNotFound for a version zero stream", async () => {
    const result = await runtime.runPromise(Effect.either(getReservation(id)));

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toEqual(new ReservationNotFound({ reservationId: id }));
    }
  });

  it("preserves guest, room, and rescheduled range after terminal events", async () => {
    await runtime.runPromise(handleReservationCommand(place()));
    await runtime.runPromise(
      handleReservationCommand(
        RescheduleReservation.make({ range: rescheduledRange, reservationId: id }),
      ),
    );
    await runtime.runPromise(
      handleReservationCommand(CheckInGuest.make({ reservationId: id })),
    );
    await runtime.runPromise(
      handleReservationCommand(CheckOutGuest.make({ reservationId: id })),
    );

    const snapshot = await runtime.runPromise(getReservation(id));

    expect(snapshot.version).toBe(4);
    expect(snapshot.reservation).toEqual({
      guest,
      range: rescheduledRange,
      reservationId: id,
      room,
      status: "CheckedOut",
    });
  });

  it("preserves projection data when cancellation is terminal", async () => {
    await runtime.runPromise(handleReservationCommand(place()));
    await runtime.runPromise(
      handleReservationCommand(CancelReservation.make({ reservationId: id })),
    );

    const snapshot = await runtime.runPromise(getReservation(id));

    expect(snapshot.reservation).toEqual({
      guest,
      range: initialRange,
      reservationId: id,
      room,
      status: "Cancelled",
    });
  });
});
