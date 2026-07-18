import { FloorNumber, Money, RoomNumber } from "./value-objects.ts";

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

