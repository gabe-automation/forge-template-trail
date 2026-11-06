import { describe, expect, it } from "vitest";
import { boundedPanelWidth } from "@/lib/panelSizing";
describe("Bounded left Properties panel", () => {
  it("keeps dragging within a modest 200–320 pixel range", () => {
    expect(boundedPanelWidth(80)).toBe(200);
    expect(boundedPanelWidth(900)).toBe(320);
    expect(boundedPanelWidth(260)).toBe(260);
  });
});