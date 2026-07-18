import { Effect, Either } from "effect";
import { expect, vi } from "vitest";

import { type Decider } from "../src/reservations/domain/decider.ts";
import { traceDecider } from "../src/reservations/domain/trace-decider.ts";

type Command = "fail" | "ok";
type Event = "fail" | "incremented";
type TestError = "boom";

const decider: Decider<Command, number, Event, TestError> = {
  decide: (_state, command) =>
    command === "fail" ? Effect.fail("boom" as const) : Effect.succeed(["incremented"] as const),
  evolve: (state, event) => (event === "incremented" ? state + 1 : state),
  initial: 0,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("traceDecider", () => {
  it("logs decide when Effect is run", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const traced = traceDecider(decider);

    const effect = traced.decide(0, "ok");

    expect(log).not.toHaveBeenCalled();

    const result = await Effect.runPromise(effect);

    expect(result).toEqual(["incremented"]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("decide called");
  });

  it("logs decide when Effect fails", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const traced = traceDecider(decider);

    const effect = traced.decide(0, "fail");

    expect(log).not.toHaveBeenCalled();

    const result = await Effect.runPromise(Effect.either(effect));

    expect(Either.isLeft(result)).toBe(true);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("decide called");
  });

  it("logs evolve and preserves the evolved state", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const traced = traceDecider(decider);

    const result = traced.evolve(0, "incremented");

    expect(result).toBe(1);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("evolve called");
  });
});
