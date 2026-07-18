import { Schema } from "effect";

import { DateRange, GuestEmail, ReservationId, RoomNumber } from "./value-objects.ts";

export const PlaceReservation = Schema.TaggedStruct("PlaceReservation", {
  guest: GuestEmail,
  range: DateRange,
  reservationId: ReservationId,
  room: RoomNumber,
});
export type PlaceReservation = Schema.Schema.Type<typeof PlaceReservation>;

export const CancelReservation = Schema.TaggedStruct("CancelReservation", {
  reservationId: ReservationId,
});
export type CancelReservation = Schema.Schema.Type<typeof CancelReservation>;

export const CheckInGuest = Schema.TaggedStruct("CheckInGuest", {
  reservationId: ReservationId,
});
export type CheckInGuest = Schema.Schema.Type<typeof CheckInGuest>;

export const CheckOutGuest = Schema.TaggedStruct("CheckOutGuest", {
  reservationId: ReservationId,
});
export type CheckOutGuest = Schema.Schema.Type<typeof CheckOutGuest>;

export const RescheduleReservation = Schema.TaggedStruct("RescheduleReservation", {
  range: DateRange,
  reservationId: ReservationId,
});
export type RescheduleReservation = Schema.Schema.Type<typeof RescheduleReservation>;

export const ReservationCommand = Schema.Union(
  PlaceReservation,
  CancelReservation,
  CheckInGuest,
  CheckOutGuest,
  RescheduleReservation,
);

export type ReservationCommand = Schema.Schema.Type<typeof ReservationCommand>;
