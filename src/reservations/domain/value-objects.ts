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

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const millisecondsPerDay = 86_400_000;

const dayTimestamp = (value: string): number => Date.parse(`${value}T00:00:00.000Z`);

const isCalendarDay = (value: string): true | string => {
  const timestamp = dayTimestamp(value);

  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  ) {
    return `${value} не является календарной датой YYYY-MM-DD`;
  }

  return true;
};

export const Day = Schema.String.pipe(
  Schema.pattern(dayPattern),
  Schema.filter(isCalendarDay),
  Schema.brand("Day"),
);
export type Day = Schema.Schema.Type<typeof Day>;

export const DateRange = Schema.Struct({
  checkIn: Day,
  checkOut: Day,
}).pipe(
  Schema.filter((range) => {
    const intervalDays =
      (dayTimestamp(range.checkOut) - dayTimestamp(range.checkIn)) / millisecondsPerDay;

    if (intervalDays <= 0) {
      return `checkIn (${range.checkIn}) должен быть строго меньше checkOut (${range.checkOut})`;
    }

    if (intervalDays > MAX_DAYS_DATE_RANGE_INTERVAL) {
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
