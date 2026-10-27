import { describe, expect, it } from "vitest";
import { SITE_TEMPLATES, blocksToViews, templatePageCount, templateViews } from "@/lib/siteTemplates";
import { blockSnippet, generateExport } from "@/lib/model";

describe("multi-page templates", () => {
  it("every template ships a home page plus at least two inner pages", () => {
    for (const t of SITE_TEMPLATES) {
      expect(templatePageCount(t), t.name).toBeGreaterThanOrEqual(3);
      for (const p of t.pages ?? []) {
        expect(p.blocks.length, `${t.name} → ${p.title}`).toBeGreaterThan(0);
        expect(p.blocks.some((b) => b.type === "navbar"), `${p.title} needs a navbar`).toBe(true);
        expect(p.blocks.some((b) => b.type === "footer"), `${p.title} needs a footer`).toBe(true);
      }
    }
  });

  it("template blocks convert to views with valid geometry", () => {
    const t = SITE_TEMPLATES[0]!;
    const views = [...templateViews(t), ...blocksToViews(t.id, t.pages![0]!.blocks)];
    expect(views.length).toBeGreaterThan(0);
    for (const v of views) {
      expect(v.geo.desktop.w).toBeGreaterThan(0);
      expect(v.geo.desktop.h).toBeGreaterThan(0);
    }
  });
});

describe("blockSnippet", () => {
  it("returns the block's exact exported HTML, CSS and wrapped script", () => {
    const t = SITE_TEMPLATES[0]!;
    const views = templateViews(t);
    const hero = views.find((v) => v.type === "hero")!;
    const s = blockSnippet(hero, views);
    expect(s.name).toBe("Hero");
    expect(s.html).toContain('<div class="wc-el" id="n' + hero.id.replace(/-/g, "").slice(0, 8));
    expect(s.html).toContain("COMMON GROUND");
    expect(s.html).toContain('<img class="wc-cover" src="/images/studio-product.jpg"');
    expect(s.css).toContain(`#n${hero.id.replace(/-/g, "").slice(0, 8)}`);
    expect(s.css).toContain(".wc-btn"); // preset snippet CSS is scoped to the block
    expect(s.js).toContain("setInterval"); // typewriter script, wrapped
    expect(s.js).toContain("document.getElementById");
  });

  it("site export keeps the block snippet consistent", () => {
    const t = SITE_TEMPLATES[0]!;
    const views = templateViews(t);
    const exp = generateExport(views, t.theme, t.name);
    const hero = views.find((v) => v.type === "hero")!;
    const sid = hero.id.replace(/-/g, "").slice(0, 8);
    expect(exp.html).toContain(`id="n${sid}"`);
    expect(exp.js).toContain(`document.getElementById("n${sid}")`);
  });
});
