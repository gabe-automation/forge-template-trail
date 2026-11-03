import { describe, expect, it } from "vitest";
import { formatCss, styleCss, safeClip, safeFreeRadius } from "@/lib/blocks";

describe("builder css", () => {
  it("exports the molded border unchanged", () => {
    expect(styleCss({ freeRadius: "60% 40% 30% 70% / 20% 80% 50% 50%", border: "red" })).toContain("border-radius:60% 40% 30% 70% / 20% 80% 50% 50%;");
  });
  it("rejects unsafe or out-of-range molded borders", () => {
    expect(safeFreeRadius("101% 40% 30% 70% / 20% 80% 50% 50%")).toBe("");
    expect(safeFreeRadius("50%;background:url(x)")).toBe("");
  });
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
