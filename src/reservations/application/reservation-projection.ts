import { Option } from "effect";

import { type ReservationView } from "../contracts.ts";
import { type ReservationEvent } from "../domain/events.ts";

const evolveProjection = (
  current: Option.Option<ReservationView>,
  event: ReservationEvent,
): Option.Option<ReservationView> => {
  switch (event._tag) {
    case "ReservationPlaced":
      return Option.some({
        guest: event.guest,
        range: event.range,
        reservationId: event.reservationId,
        room: event.room,
        status: "Reserved",
      });
    case "ReservationRescheduled":
      return Option.map(current, (reservation) => ({
        ...reservation,
        range: event.range,
      }));
    case "GuestCheckedIn":
      return Option.map(current, (reservation) => ({
        ...reservation,
        status: "CheckedIn",
      }));
    case "GuestCheckedOut":
      return Option.map(current, (reservation) => ({
        ...reservation,
        status: "CheckedOut",
      }));
    case "ReservationCancelled":
      return Option.map(current, (reservation) => ({
        ...reservation,
        status: "Cancelled",
      }));
  }
};

export const projectReservation = (
  events: Iterable<ReservationEvent>,
): Option.Option<ReservationView> => {
  let reservation = Option.none<ReservationView>();

  for (const event of events) {
    reservation = evolveProjection(reservation, event);
  }

  return reservation;
};
