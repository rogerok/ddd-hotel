import { DateRange, Day } from "../src/domain/types.ts";

describe("DateRange", () => {
  it("happy path", () => {
    expect(DateRange.make({ checkIn: Day.make(5), checkOut: Day.make(10) })).toEqual({
      checkIn: 5,
      checkOut: 10,
    });
  });
  it("checkin greater then checkout", () => {
    expect(() => DateRange.make({ checkIn: Day.make(10), checkOut: Day.make(5) })).toThrow();
  });
  it("interval is greater then 30", () => {
    expect(() => DateRange.make({ checkIn: Day.make(5), checkOut: Day.make(36) })).toThrow();
  });
});
