import {
  type DateRange,
  type GuestEmail,
  type ReservationId,
  type RoomNumber,
} from "./value-objects.ts";

export type ReservationReserved = {
  readonly _tag: "Reserved";
  readonly guest: GuestEmail;
  readonly range: DateRange;
  readonly reservationId: ReservationId;
  readonly room: RoomNumber;
};

export type ReservationNotPlaced = { readonly _tag: "NotPlaced" };

export type ReservationCheckedIn = {
  readonly _tag: "CheckedIn";
  readonly guest: GuestEmail;
  readonly range: DateRange;
  readonly reservationId: ReservationId;
  readonly room: RoomNumber;
};

export type ReservationCheckedOut = {
  readonly _tag: "CheckedOut";
  readonly reservationId: ReservationId;
};
export type ReservationCanceled = {
  readonly _tag: "Cancelled";
  readonly reservationId: ReservationId;
};


export type ReservationState =
  | ReservationCanceled
  | ReservationCheckedIn
  | ReservationCheckedOut
  | ReservationNotPlaced
  | ReservationReserved;

export const initial: ReservationNotPlaced = { _tag: "NotPlaced" };
