import { describe, it, expect } from "vitest";
import { CATEGORIES, getCategory, getChildren, getCategoryPath, leafCategories, rootCategories, getAttributeSchema } from "./categories";

describe("kategori taksonomisi bütünlüğü", () => {
  it("id'ler global benzersiz", () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("her parentId geçerli bir kategoriye işaret eder", () => {
    for (const c of CATEGORIES) {
      if (c.parentId !== null) expect(getCategory(c.parentId), `parent yok: ${c.id}→${c.parentId}`).toBeDefined();
    }
  });

  it("mevcut id'ler KORUNMUŞ (canlı ilanlar bağlı)", () => {
    for (const id of ["elektronik", "ev-yasam", "moda", "vasita", "hobi", "bebek", "telefon", "bilgisayar", "otomobil", "beyaz-esya", "mobilya"]) {
      expect(getCategory(id), `korunmalı id kayıp: ${id}`).toBeDefined();
    }
  });

  it("yeni kökler eklendi", () => {
    for (const id of ["emlak", "spor-outdoor", "is-sanayi", "hayvanlar-alemi"]) {
      expect(getCategory(id), `yeni kök kayıp: ${id}`).toBeDefined();
    }
  });

  it("en az 10 kök + 80 leaf var (derin taksonomi)", () => {
    expect(rootCategories().length).toBeGreaterThanOrEqual(10);
    expect(leafCategories().length).toBeGreaterThanOrEqual(80);
  });

  it("her kökün en az 5 alt kategorisi var", () => {
    for (const root of rootCategories()) {
      expect(getChildren(root.id).length, `${root.id} çok az alt kategori`).toBeGreaterThanOrEqual(5);
    }
  });

  it("select attribute'larda options dolu", () => {
    for (const c of CATEGORIES) {
      for (const a of c.attributes ?? []) {
        if (a.type === "select" && !a.dependsOn) {
          expect((a.options?.length ?? 0) > 0, `${c.id}.${a.key} select ama options boş`).toBe(true);
        }
      }
    }
  });

  it("marka→model bağımlılığı geçerli (dependsOn + optionsByParent)", () => {
    const tel = getCategory("telefon");
    const model = tel?.attributes?.find((a) => a.key === "model");
    expect(model?.dependsOn).toBe("brand");
    expect(Object.keys(model?.optionsByParent ?? {}).length).toBeGreaterThan(0);
  });

  it("getCategoryPath kökten yaprağa yol verir", () => {
    const path = getCategoryPath("telefon");
    expect(path[0]?.id).toBe("elektronik");
    expect(path[path.length - 1]?.id).toBe("telefon");
  });

  it("getAttributeSchema çalışıyor", () => {
    expect(getAttributeSchema("otomobil").length).toBeGreaterThan(0);
  });
});
