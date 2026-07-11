import { describe, it, expect } from "vitest";
import { compareSemver, isUpdateRequired } from "./version";

describe("compareSemver", () => {
  it("eşitleri 0 döndürür", () => {
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });
  it("sayısal karşılaştırır (string değil): 1.0.10 > 1.0.9", () => {
    expect(compareSemver("1.0.10", "1.0.9")).toBe(1);
    expect(compareSemver("1.0.9", "1.0.10")).toBe(-1);
  });
  it("major/minor önceliği", () => {
    expect(compareSemver("2.0.0", "1.9.9")).toBe(1);
    expect(compareSemver("1.1.0", "1.0.9")).toBe(1);
  });
  it("eksik/bozuk parçaları 0 sayar", () => {
    expect(compareSemver("1", "1.0.0")).toBe(0);
    expect(compareSemver("1.2", "1.2.0")).toBe(0);
  });
});

describe("isUpdateRequired", () => {
  it("min yoksa asla zorlamaz", () => {
    expect(isUpdateRequired("1.0.0", null)).toBe(false);
    expect(isUpdateRequired("1.0.0", undefined)).toBe(false);
    expect(isUpdateRequired("0.0.1", "0.0.0")).toBe(false);
  });
  it("current < min → zorunlu", () => {
    expect(isUpdateRequired("1.0.3", "1.1.0")).toBe(true);
    expect(isUpdateRequired("1.1.0", "1.1.0")).toBe(false);
    expect(isUpdateRequired("1.2.0", "1.1.0")).toBe(false);
  });
});
