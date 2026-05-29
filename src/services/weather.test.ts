import { describe, expect, it } from "vitest";
import { describeWeather } from "./weather";

describe("describeWeather", () => {
  it("maps known WMO codes to Spanish descriptions", () => {
    expect(describeWeather(0)).toBe("Despejado");
    expect(describeWeather(2)).toBe("Parcialmente nublado");
    expect(describeWeather(63)).toBe("Lluvia");
    expect(describeWeather(95)).toBe("Tormenta");
  });

  it("falls back for unknown codes", () => {
    expect(describeWeather(1234)).toBe("Clima no disponible");
  });
});
