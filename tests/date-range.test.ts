import { Either, Schema } from "effect";

import { DateRange, Day } from "../src/reservations/domain/value-objects.ts";

const range = (checkIn: string, checkOut: string): DateRange =>
  DateRange.make({
    checkIn: Day.make(checkIn),
    checkOut: Day.make(checkOut),
  });

describe("Day", () => {
  it("accepts a valid leap day", () => {
    expect(Day.make("2024-02-29")).toBe("2024-02-29");
  });

  it("rejects an invalid calendar day", () => {
    const result = Schema.decodeUnknownEither(Day)("2026-02-29");

    expect(Either.isLeft(result)).toBe(true);
  });

  it("rejects a non-ISO format", () => {
    const result = Schema.decodeUnknownEither(Day)("20.07.2026");

    expect(Either.isLeft(result)).toBe(true);
  });
});

describe("DateRange", () => {
  it("rejects equal dates", () => {
    expect(() => range("2026-07-20", "2026-07-20")).toThrow();
  });

  it("rejects reversed dates", () => {
    expect(() => range("2026-07-21", "2026-07-20")).toThrow();
  });

  it("calculates across a month boundary", () => {
    expect(range("2026-01-31", "2026-02-02")).toEqual({
      checkIn: "2026-01-31",
      checkOut: "2026-02-02",
    });
  });

  it("calculates across a year boundary", () => {
    expect(range("2025-12-31", "2026-01-02")).toEqual({
      checkIn: "2025-12-31",
      checkOut: "2026-01-02",
    });
  });

  it("accepts an interval of exactly 30 days", () => {
    expect(range("2026-01-01", "2026-01-31")).toEqual({
      checkIn: "2026-01-01",
      checkOut: "2026-01-31",
    });
  });

  it("rejects an interval of 31 days", () => {
    expect(() => range("2026-01-01", "2026-02-01")).toThrow();
  });
});
