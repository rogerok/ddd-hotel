import { Schema } from "effect";

export const MAX_DAYS_DATE_RANGE_INTERVAL = 30;
export const MAX_ROOMS_IN_FLOOR = 99;

export const ReservationId = Schema.String.pipe(
  Schema.pattern(/^res_[a-z0-9]{8,}$/i, { identifier: "ReservationId" }),
  Schema.brand("ReservationId"),
);
export type ReservationId = Schema.Schema.Type<typeof ReservationId>;

export const RoomNumber = Schema.String.pipe(
  Schema.pattern(/^(?:[1-9]\d{2}|1\d{3}|20\d{2})$/, {
    identifier: "RoomNumber",
  }),
  Schema.brand("RoomNumber"),
);
export type RoomNumber = Schema.Schema.Type<typeof RoomNumber>;

export const FloorNumber = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.lessThanOrEqualTo(20),
  Schema.brand("FloorNumber"),
);
export type FloorNumber = Schema.Schema.Type<typeof FloorNumber>;

export const GuestEmail = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { identifier: "GuestEmail" }),
  Schema.brand("GuestEmail"),
);
export type GuestEmail = Schema.Schema.Type<typeof GuestEmail>;

export const Day = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("Day"),
);
export type Day = Schema.Schema.Type<typeof Day>;

export const DateRange = Schema.Struct({
  checkIn: Day,
  checkOut: Day,
}).pipe(
  Schema.filter((range) => {
    const interval = range.checkOut - range.checkIn;
    if (interval < 0) {
      return `checkIn (${range.checkIn}) должен быть строго меньше checkOut (${range.checkOut})`;
    }

    if (interval > MAX_DAYS_DATE_RANGE_INTERVAL) {
      return `Интервал не может быть более ${MAX_DAYS_DATE_RANGE_INTERVAL} дней`;
    }

    return true;
  }),
);

export type DateRange = Schema.Schema.Type<typeof DateRange>;

export const Currency = Schema.Literal("USD", "EUR", "RUB").pipe(Schema.brand("Currency"));
export type Currency = Schema.Schema.Type<typeof Currency>;

export const Money = Schema.Struct({
  amountCents: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  currency: Currency,
});
export type Money = Schema.Schema.Type<typeof Money>;

export const Percent = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(100),
  Schema.brand("Percent"),
);
export const Probability = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(1),
  Schema.brand("Probability"),
);

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
