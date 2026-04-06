import { describe, expect, it } from "vitest";
import { buildCategoryPath, buildProductPath, extractStorefrontEntityId } from "@/lib/storefront-routes";

describe("storefront-routes", () => {
  it("builds canonical slug-plus-id storefront paths", () => {
    expect(buildProductPath({ id: "p1", name: "Dell XPS 13" })).toBe("/product/dell-xps-13-p1");
    expect(buildCategoryPath({ id: "c1", name: "Audio Pro" })).toBe("/category/audio-pro-c1");
  });

  it("extracts IDs from legacy and slugged params", () => {
    expect(extractStorefrontEntityId("p1")).toBe("p1");
    expect(extractStorefrontEntityId("dell-xps-13-p1")).toBe("p1");
    expect(extractStorefrontEntityId("audio-pro-11111111-1111-4111-8111-111111111111")).toBe(
      "11111111-1111-4111-8111-111111111111"
    );
  });
});
