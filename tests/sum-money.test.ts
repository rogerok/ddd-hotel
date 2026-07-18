import { expect } from "vitest";

import { sumMoney } from "../src/reservations/domain/value-object-examples.ts";
import { Currency, Money } from "../src/reservations/domain/value-objects.ts";

const usd1 = Money.make({
  amountCents: 10,
  currency: Currency.make("USD"),
});
const usd2 = Money.make({
  amountCents: 20,
  currency: Currency.make("USD"),
});
const rub = Money.make({
  amountCents: 20,
  currency: Currency.make("RUB"),
});

describe("sumMoney", () => {
  it("happy path", () => {
    const sum = sumMoney(usd1, usd2);

    expect(sum.amountCents).toBe(30);
    expect(sum.currency).toBe("USD");
  });

  it("mismatch", () => {
    expect(() => sumMoney(usd1, rub)).toThrow();
  });
});
