import { describe, expect, it } from "vitest";
import { clampText, formatCurrency, slugify } from "@/lib/format";

describe("format helpers", () => {
  it("formats currency in MXN", () => {
    expect(formatCurrency(1499.5)).toContain("1,499.50");
  });

  it("clamps long text safely", () => {
    expect(clampText("1234567890", 6)).toBe("12345...");
  });

  it("slugifies labels for UI-safe ids", () => {
    expect(slugify("Audio Pro Max")).toBe("audio-pro-max");
  });
});
