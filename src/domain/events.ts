import { Schema } from "effect";

import { DateRange, GuestEmail, ReservationId, RoomNumber } from "./types.ts";

export const ReservationPlaced = Schema.TaggedStruct("ReservationPlaced", {
  guest: GuestEmail,
  occurredAt: Schema.Number,
  range: DateRange,
  reservationId: ReservationId,
  room: RoomNumber,
});
export type ReservationPlaced = Schema.Schema.Type<typeof ReservationPlaced>;

export const ReservationCancelled = Schema.TaggedStruct("ReservationCancelled", {
  occurredAt: Schema.Number,
  reservationId: ReservationId,
});
export type ReservationCancelled = Schema.Schema.Type<typeof ReservationCancelled>;

export const GuestCheckedIn = Schema.TaggedStruct("GuestCheckedIn", {
  occurredAt: Schema.Number,
  reservationId: ReservationId,
});
export type GuestCheckedIn = Schema.Schema.Type<typeof GuestCheckedIn>;

export const GuestCheckedOut = Schema.TaggedStruct("GuestCheckedOut", {
  occurredAt: Schema.Number,
  reservationId: ReservationId,
});
export type GuestCheckedOut = Schema.Schema.Type<typeof GuestCheckedOut>;

export const ReservationEvent = Schema.Union(
  ReservationPlaced,
  ReservationCancelled,
  GuestCheckedIn,
  GuestCheckedOut,
);

export type ReservationEvent = Schema.Schema.Type<typeof ReservationEvent>;
