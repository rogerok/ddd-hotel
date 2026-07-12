import { expect } from "vitest";

import { FloorNumber, floorOf, RoomNumber } from "../src/domain/types.ts";

describe("floorOf", () => {
  it.each([
    ["101", 1],
    ["199", 1],
    ["901", 9],
    ["1001", 10],
    ["1999", 19],
    ["2034", 20],
  ])("returns floor for room", (room, floor) => {
    expect(floorOf(RoomNumber.make(room))).toBe(FloorNumber.make(floor));
  });
});
