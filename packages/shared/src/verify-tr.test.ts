import { describe, it, expect } from "vitest";
import { isValidTcKimlik, isValidVergiNo, isValidStoreIdentity } from "./verify-tr";

describe("isValidTcKimlik", () => {
  it("geçerli TC (checksum tutan)", () => {
    expect(isValidTcKimlik("10000000146")).toBe(true);
    expect(isValidTcKimlik("11111111110")).toBe(true);
  });
  it("checksum tutmayan geçersiz", () => {
    expect(isValidTcKimlik("10000000140")).toBe(false);
    expect(isValidTcKimlik("12345678901")).toBe(false);
  });
  it("format hataları", () => {
    expect(isValidTcKimlik("01234567890")).toBe(false); // ilk hane 0
    expect(isValidTcKimlik("1234567890")).toBe(false); // 10 hane
    expect(isValidTcKimlik("abcdefghijk")).toBe(false);
    expect(isValidTcKimlik("")).toBe(false);
  });
});

describe("isValidVergiNo", () => {
  it("geçerli VKN (checksum tutan)", () => {
    expect(isValidVergiNo("1234567890")).toBe(true);
  });
  it("checksum tutmayan geçersiz", () => {
    expect(isValidVergiNo("1234567891")).toBe(false);
  });
  it("format hataları", () => {
    expect(isValidVergiNo("123456789")).toBe(false); // 9 hane
    expect(isValidVergiNo("12345678901")).toBe(false); // 11 hane
    expect(isValidVergiNo("abcdefghij")).toBe(false);
  });
});

describe("isValidStoreIdentity", () => {
  it("bireysel → TC gerekir", () => {
    expect(isValidStoreIdentity({ legalType: "individual", tcNo: "10000000146" })).toBe(true);
    expect(isValidStoreIdentity({ legalType: "individual", tcNo: "10000000140" })).toBe(false);
    expect(isValidStoreIdentity({ legalType: "individual" })).toBe(false);
  });
  it("şirket → vergi no gerekir", () => {
    expect(isValidStoreIdentity({ legalType: "company", taxNo: "1234567890" })).toBe(true);
    expect(isValidStoreIdentity({ legalType: "company", taxNo: "1234567891" })).toBe(false);
    expect(isValidStoreIdentity({ legalType: "company" })).toBe(false);
  });
});
