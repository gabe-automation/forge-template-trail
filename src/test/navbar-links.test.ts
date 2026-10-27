import { describe, expect, it } from "vitest";
import { blockHtml } from "@/lib/blocks";

describe("navbar page links", () => {
  it("turns menu items into links to the template's pages", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const html = blockHtml("navbar", { text: "Brand", sub: "Home · About", label: "Go", href: "", attrs: { "data-links": `?page=${id}|` } } as never, "x");
    expect(html).toContain(`<a href="?page=${id}">Home</a>`);
    expect(html).toContain("<span>About</span>");
  });
});
