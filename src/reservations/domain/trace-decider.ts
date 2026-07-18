import { Effect } from "effect";

import { type Decider } from "./decider.ts";

export const traceDecider = <Command, State, Event, Error>(
  decider: Decider<Command, State, Event, Error>,
): Decider<Command, State, Event, Error> => ({
  decide: (state, command) =>
    Effect.sync(() => {
      console.log("decide called");
    }).pipe(Effect.zipRight(decider.decide(state, command))),
  evolve: (state, event) => {
    console.log("evolve called");
    return decider.evolve(state, event);
  },
  initial: decider.initial,
});
