import { describe, expect, it } from "vitest";
import { formatCss, styleCss, safeClip } from "@/lib/blocks";

describe("builder css", () => {
  it("formats css with one indented declaration per line", () => {
    expect(formatCss("a{color:red;top:0}")).toBe("a {\n  color: red;\n  top: 0;\n}\n");
  });
  it("circle shape rounds the block fully", () => {
    expect(styleCss({ shape: "circle" })).toContain("border-radius:50%");
  });
  it("rejects unsafe custom clip paths", () => {
    expect(safeClip("url(javascript:x)")).toBe("");
  });
});
