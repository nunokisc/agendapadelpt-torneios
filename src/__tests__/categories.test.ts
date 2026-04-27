import { describe, it, expect } from "vitest";
import { FPP_CATEGORIES, FPP_CATEGORIES_BY_CODE, getCategoryName } from "@/lib/categories";

describe("FPP_CATEGORIES", () => {
  it("has at least 34 entries", () => {
    expect(FPP_CATEGORIES.length).toBeGreaterThanOrEqual(34);
  });

  it("every entry has code, name and group", () => {
    for (const c of FPP_CATEGORIES) {
      expect(c.code).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.group).toBeTruthy();
    }
  });

  it("codes are unique", () => {
    const codes = FPP_CATEGORIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("contains expected Masculino codes M1–M6", () => {
    for (const code of ["M1", "M2", "M3", "M4", "M5", "M6"]) {
      expect(FPP_CATEGORIES.some((c) => c.code === code)).toBe(true);
    }
  });

  it("contains expected Feminino codes F1–F6", () => {
    for (const code of ["F1", "F2", "F3", "F4", "F5", "F6"]) {
      expect(FPP_CATEGORIES.some((c) => c.code === code)).toBe(true);
    }
  });

  it("contains Misto codes MX1–MX6", () => {
    for (const code of ["MX1", "MX2", "MX3", "MX4", "MX5", "MX6"]) {
      expect(FPP_CATEGORIES.some((c) => c.code === code)).toBe(true);
    }
  });

  it("contains Veteranos Masculinos codes", () => {
    for (const code of ["+35M", "+40M", "+45M", "+50M", "+55M", "+60M"]) {
      expect(FPP_CATEGORIES.some((c) => c.code === code)).toBe(true);
    }
  });

  it("contains Veteranas Femininas codes", () => {
    for (const code of ["+35F", "+40F", "+45F", "+50F", "+55F", "+60F"]) {
      expect(FPP_CATEGORIES.some((c) => c.code === code)).toBe(true);
    }
  });

  it("contains Jovens codes", () => {
    for (const code of ["SUB18", "SUB14", "SUB12"]) {
      expect(FPP_CATEGORIES.some((c) => c.code === code)).toBe(true);
    }
  });

  it("groups all Masculinos correctly", () => {
    const mascCodes = ["M1", "M2", "M3", "M4", "M5", "M6"];
    for (const code of mascCodes) {
      const cat = FPP_CATEGORIES.find((c) => c.code === code)!;
      expect(cat.group).toBe("Masculinos");
    }
  });

  it("groups +35M..+60M as Veteranos", () => {
    const vetCodes = ["+35M", "+40M", "+45M", "+50M", "+55M", "+60M"];
    for (const code of vetCodes) {
      const cat = FPP_CATEGORIES.find((c) => c.code === code)!;
      expect(cat.group).toBe("Veteranos");
    }
  });
});

describe("FPP_CATEGORIES_BY_CODE", () => {
  it("M3 entry resolves correctly", () => {
    expect(FPP_CATEGORIES_BY_CODE["M3"].name).toBe("Masculinos 3");
    expect(FPP_CATEGORIES_BY_CODE["M3"].group).toBe("Masculinos");
  });

  it("+40F resolves correctly", () => {
    expect(FPP_CATEGORIES_BY_CODE["+40F"].name).toBe("+40 Femininas");
  });

  it("unknown code returns undefined", () => {
    expect(FPP_CATEGORIES_BY_CODE["XXXX"]).toBeUndefined();
  });

  it("number of entries matches FPP_CATEGORIES array", () => {
    expect(Object.keys(FPP_CATEGORIES_BY_CODE).length).toBe(FPP_CATEGORIES.length);
  });
});

describe("getCategoryName", () => {
  it("returns the name for a known code", () => {
    expect(getCategoryName("M3")).toBe("Masculinos 3");
    expect(getCategoryName("F4")).toBe("Femininos 4");
    expect(getCategoryName("+40M")).toBe("+40 Masculinos");
    expect(getCategoryName("MX1")).toBe("Mistos 1");
    expect(getCategoryName("SUB18")).toBe("Sub-18");
  });

  it("returns the code itself for unknown codes (fallback)", () => {
    expect(getCategoryName("OPEN")).toBe("OPEN");
    expect(getCategoryName("CUSTOM")).toBe("CUSTOM");
    expect(getCategoryName("")).toBe("");
  });
});
