import { Effect, Schema } from "effect";

import { PlaceReservation } from "./commands.ts";
import { InvalidReservationInput } from "./errors.ts";
import { FloorNumber, Money, RoomNumber } from "./types.ts";

export const sumMoney = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) {
    throw new Error(`currency mismatch: ${a.currency} vs ${b.currency}`);
  }
  return { amountCents: a.amountCents + b.amountCents, currency: a.currency };
};

export const floorOf = (room: RoomNumber): FloorNumber => {
  const isThreeDigitRoom = room.length === 3;

  const floor = isThreeDigitRoom ? room.slice(0, 1) : room.slice(0, 2);

  return FloorNumber.make(Number(floor));
};

export const parseCommand = (raw: unknown) =>
  Schema.decodeUnknown(PlaceReservation)(raw).pipe(
    Effect.mapError((cause) => new InvalidReservationInput({ cause, field: "PlaceReservation" })),
  );
