import { describe, expect, it } from "vitest";
import { buildFtsQuery, expandSynonyms, foldTr, tokenize, trLower } from "./search";

describe("trLower", () => {
  it("Türkçe İ/I'yı doğru küçültür", () => {
    expect(trLower("İSTANBUL")).toBe("istanbul");
    expect(trLower("IĞDIR")).toBe("ığdır");
  });
});

describe("foldTr", () => {
  it("aksanları ASCII'ye katlar", () => {
    expect(foldTr("Şarj")).toBe("sarj");
    expect(foldTr("Ağ")).toBe("ag");
    expect(foldTr("Buzdolabı")).toBe("buzdolabi");
    expect(foldTr("Çankaya")).toBe("cankaya");
  });
});

describe("tokenize", () => {
  it("noktalama temizler, böler", () => {
    expect(tokenize("iPhone 13, 128 GB!")).toEqual(["iphone", "13", "128", "gb"]);
  });
});

describe("expandSynonyms", () => {
  it("ayfon → iphone grubunu ekler", () => {
    expect(expandSynonyms(["ayfon"])).toContain("iphone");
  });
  it("dolap → buzdolabi grubunu ekler", () => {
    expect(expandSynonyms(["dolap"])).toContain("buzdolabi");
  });
});

describe("buildFtsQuery", () => {
  it("boş sorguda boş döner", () => {
    expect(buildFtsQuery("   ")).toBe("");
  });
  it("çok kelimeli sorguyu AND ile birleştirir", () => {
    const q = buildFtsQuery("ekran karti");
    expect(q).toContain(" AND ");
    expect(q).toContain("ekran*");
    expect(q).toContain("karti*");
  });
  it("synonym genişletmesini OR ile ekler (ayfon→iphone)", () => {
    const q = buildFtsQuery("ayfon");
    expect(q).toContain("iphone*");
    expect(q).toContain(" OR ");
  });
  it("her token prefix (*) araması olur — typo toleransı", () => {
    expect(buildFtsQuery("sams")).toContain("sams*");
  });
});
