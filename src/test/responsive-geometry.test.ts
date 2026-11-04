import { describe, expect, it } from "vitest";
import { geoFor } from "@/lib/model";
describe("Responsive geometry", () => {
  it("preserves customized mobile geometry", () => {
    expect(geoFor({ "x@mobile": { v: 25, c: 1, a: "test" }, "y@mobile": { v: 90, c: 1, a: "test" }, "w@mobile": { v: 300, c: 1, a: "test" }, "h@mobile": { v: 180, c: 1, a: "test" } }, "mobile")).toEqual({ x: 25, y: 90, w: 300, h: 180 });
  });
});