import { Effect, Schema } from "effect";

import { PlaceReservation } from "./commands.ts";
import { Decider } from "./decider.ts";
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

export const traceDecider = <Command, State, Event, Error>(
  decider: Decider<Command, State, Event, Error>,
): Decider<Command, State, Event, Error> => ({
  decide: (state, command) =>
    Effect.sync(() => { console.log("decide called"); }).pipe(
      Effect.zipRight(decider.decide(state, command)),
    ),
  evolve: (state, event) => {
    console.log("evolve called");
    return decider.evolve(state, event);
  },
  initial: decider.initial,
});
