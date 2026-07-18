import { Effect, Either } from "effect";
import { flowResult } from "mobx";
import { vi } from "vitest";

import { type ReservationSnapshot } from "../../../src/reservations/contracts.ts";
import { PlaceReservation } from "../../../src/reservations/domain/commands.ts";
import {
  DateRange,
  Day,
  GuestEmail,
  ReservationId,
  RoomNumber,
} from "../../../src/reservations/domain/value-objects.ts";
import { InvalidApiResponse, NetworkError } from "../../../src/reservations/ui/errors.ts";
import {
  FetchReservationsApi,
  type ReservationsApi,
} from "../../../src/reservations/ui/reservations-api.ts";
import { ReservationWorkbenchViewModel } from "../../../src/reservations/ui/ReservationWorkbenchViewModel.ts";

const id = ReservationId.make("res_ui000001");
const guest = GuestEmail.make("ui@example.com");
const room = RoomNumber.make("101");
const range = DateRange.make({
  checkIn: Day.make("2026-10-01"),
  checkOut: Day.make("2026-10-03"),
});
const command = PlaceReservation.make({
  guest,
  range,
  reservationId: id,
  room,
});
const snapshot: ReservationSnapshot = {
  events: [
    {
      _tag: "ReservationPlaced",
      guest,
      occurredAt: 1,
      range,
      reservationId: id,
      room,
    },
  ],
  reservation: {
    guest,
    range,
    reservationId: id,
    room,
    status: "Reserved",
  },
  version: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FetchReservationsApi", () => {
  it("maps a rejected fetch to NetworkError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await Effect.runPromise(
      Effect.either(new FetchReservationsApi().execute(command)),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(NetworkError);
    }
  });

  it("maps malformed JSON to InvalidApiResponse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not json", { status: 200 })),
    );
    const result = await Effect.runPromise(
      Effect.either(new FetchReservationsApi().execute(command)),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidApiResponse);
    }
  });

  it("maps a success schema mismatch to InvalidApiResponse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ version: 1 }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      ),
    );
    const result = await Effect.runPromise(
      Effect.either(new FetchReservationsApi().execute(command)),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidApiResponse);
    }
  });

  it("returns a decoded ApiError from a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              _tag: "InvalidStateTransition",
              command: "PlaceReservation",
              from: "Reserved",
              reservationId: id,
            },
          }),
          { headers: { "content-type": "application/json" }, status: 409 },
        ),
      ),
    );
    const result = await Effect.runPromise(
      Effect.either(new FetchReservationsApi().execute(command)),
    );

    expect(result).toEqual(
      Either.left({
        _tag: "InvalidStateTransition",
        command: "PlaceReservation",
        from: "Reserved",
        reservationId: id,
      }),
    );
  });
});

describe("ReservationWorkbenchViewModel", () => {
  it("returns to idle and preserves the latest snapshot after an execute failure", async () => {
    const api: ReservationsApi = {
      execute: () => Effect.fail(new NetworkError({ cause: new Error("offline") })),
      load: () => Effect.succeed(snapshot),
    };
    const viewModel = new ReservationWorkbenchViewModel(api);
    viewModel.reservationId = id;
    viewModel.guest = guest;
    viewModel.room = room;
    viewModel.checkIn = range.checkIn;
    viewModel.checkOut = range.checkOut;
    viewModel.snapshot = snapshot;

    await flowResult(viewModel.execute());

    expect(viewModel.requestState).toBe("idle");
    expect(viewModel.snapshot).toEqual(snapshot);
    expect(viewModel.outcome).toEqual({
      _tag: "Rejected",
      error: "NetworkError",
      message: "Network request failed",
    });
  });

  it("clears the snapshot only when Load returns ReservationNotFound", async () => {
    const api: ReservationsApi = {
      execute: () => Effect.dieMessage("not used"),
      load: (reservationId) =>
        Effect.fail({ _tag: "ReservationNotFound" as const, reservationId }),
    };
    const viewModel = new ReservationWorkbenchViewModel(api);
    viewModel.reservationId = id;
    viewModel.snapshot = snapshot;

    await flowResult(viewModel.load());

    expect(viewModel.requestState).toBe("idle");
    expect(viewModel.snapshot).toBeNull();
    expect(viewModel.outcome).toEqual({
      _tag: "Rejected",
      error: "ReservationNotFound",
      message: `Reservation ${id} was not found`,
    });
  });
});
