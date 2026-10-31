import { panelClass, BLOCKS, BLOCK_CSS, isFlow, isPanel, panelCss, scopeCss, BOX_KEYS, BREAKPOINTS, STYLE_KEYS, attrString, blockHtml, formatCss, type BoxOpts, styleCss, themeVars, esc, type BlockStyle, type BlockType, type Breakpoint, type Theme } from "./blocks";
import { val, type Props } from "./crdt";
import { chartRuntime } from "./exportRuntime";

export type Geo = { x: number; y: number; w: number; h: number };
export type NodeView = {
  id: string;
  type: BlockType;
  parent: string | null;
  order: string;
  text: string;
  sub: string;
  label: string;
  href: string;
  page: string | null;
  style: BlockStyle;
  attrs: Record<string, string>;
  script: string;
  html: string;
  css: string;
  box: BoxOpts;
  geo: Record<Breakpoint, Geo>;
};

export function styleOf(p: Props): BlockStyle {
  const o: Record<string, unknown> = {};
  for (const k of STYLE_KEYS) {
    const v = val<unknown>(p, `s.${k}`, undefined);
    if (v !== undefined && v !== "") o[k] = v;
  }
  return o as BlockStyle;
}

export function boxOf(p: Props): BoxOpts {
  const o: Record<string, unknown> = {};
  for (const k of BOX_KEYS) { const v = val<unknown>(p, `c.${k}`, undefined); if (v !== undefined && v !== null && v !== "") o[k] = v; }
  return o as BoxOpts;
}

export function geoFor(p: Props, bp: Breakpoint): Geo {
  const d: Geo = {
    x: val(p, "x@desktop", 0),
    y: val(p, "y@desktop", 0),
    w: val(p, "w@desktop", 200),
    h: val(p, "h@desktop", 80),
  };
  if (bp === "desktop") return d;
  const pageW = BREAKPOINTS[bp].width;
  const ratio = pageW / BREAKPOINTS.desktop.width;
  const derived: Geo =
    bp === "mobile"
      ? { x: 12, y: Math.round(d.y * 1.15), w: pageW - 24, h: d.h }
      : { x: Math.round(d.x * ratio), y: d.y, w: Math.min(pageW, Math.round(d.w * ratio)), h: d.h };
  return {
    x: val(p, `x@${bp}`, derived.x),
    y: val(p, `y@${bp}`, derived.y),
    w: val(p, `w@${bp}`, derived.w),
    h: val(p, `h@${bp}`, derived.h),
  };
}

export function toView(id: string, p: Props): NodeView | null {
  if (val(p, "deleted", false)) return null;
  const type = val<string>(p, "type", "") as BlockType;
  const def = BLOCKS[type];
  if (!def) return null;
  return {
    id,
    type,
    parent: val<string | null>(p, "parent", null),
    order: val(p, "order", "m"),
    text: val(p, "text", def.text),
    sub: val(p, "sub", def.sub),
    label: val(p, "label", def.label),
    href: val(p, "href", ""),
    page: val<string | null>(p, "page", null),
    style: styleOf(p),
    attrs: val<Record<string, string>>(p, "attrs", {}) ?? {},
    script: val(p, "script", ""),
    html: val(p, "html", ""),
    css: val(p, "css", ""),
    box: boxOf(p),
    geo: { desktop: geoFor(p, "desktop"), tablet: geoFor(p, "tablet"), mobile: geoFor(p, "mobile") },
  };
}

export function pageHeight(nodes: NodeView[], bp: Breakpoint): number {
  const ids = new Set(nodes.map((n) => n.id));
  let m = 700;
  for (const n of nodes) {
    if (n.parent && ids.has(n.parent)) continue; // children don't extend the page
    m = Math.max(m, n.geo[bp].y + n.geo[bp].h + 120);
  }
  return m;
}

const shortId = (id: string) => "n" + id.replace(/-/g, "").slice(0, 8);

/** Renders one node (and its nested children) exactly as the export does. Shared by site export and the block code peek. */
function renderNodeEl(n: NodeView, indent: string, childrenOf: Map<string, NodeView[]>, byId: Map<string, NodeView>): string {
  const kids = (childrenOf.get(n.id) ?? [])
    .map((k) => renderNodeEl(k, indent + "  ", childrenOf, byId))
    .join("\n");
  const inner = blockHtml(n.type, n, shortId(n.id)) + (n.html.trim() ? `\n${indent}  ${n.html.trim()}` : "");
  const par = n.parent ? byId.get(n.parent) : undefined;
  const cls = ["wc-el", isPanel(n.type) ? `wc-box wc-box-${n.type}${panelClass(n.type, n.box)}` : "", par && isFlow(par.type) ? "wc-flow" : ""].filter(Boolean).join(" ");
  return `${indent}<div class="${cls}" id="${shortId(n.id)}"${n.type === "input" ? attrString(Object.fromEntries(Object.entries(n.attrs).filter(([k]) => k.startsWith("data-hide-")))) : attrString(n.attrs)}>${inner ? `\n${indent}  ${inner}` : ""}${kids ? `\n${kids}` : ""}\n${indent}</div>`;
}

/** Builds child map + render context from a flat node list (order = paint order). */
function buildTree(nodes: NodeView[]) {
  const sorted = [...nodes].sort((a, b) => a.geo.desktop.y - b.geo.desktop.y || a.geo.desktop.x - b.geo.desktop.x);
  const ids = new Set(nodes.map((n) => n.id));
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const childrenOf = new Map<string, NodeView[]>();
  const topLevel: NodeView[] = [];
  for (const n of sorted) {
    if (n.parent && ids.has(n.parent)) {
      const arr = childrenOf.get(n.parent) ?? [];
      arr.push(n);
      childrenOf.set(n.parent, arr);
    } else {
      topLevel.push(n);
    }
  }
  return { sorted, ids, byId, childrenOf, topLevel };
}

/** The exact code WebCraft exports for one block: HTML fragment, its CSS rule(s) and its wrapped script. */
export function blockSnippet(n: NodeView, all: NodeView[]): { html: string; css: string; js: string; name: string } {
  const ids = new Set(all.map((m) => m.id));
  const tree = new Map<string, NodeView[]>();
  const inTree = new Set([n.id]);
  const queue = [n.id];
  while (queue.length) {
    const cur = queue.pop();
    if (!cur) continue;
    for (const m of all) {
      if (m.parent !== cur || inTree.has(m.id)) continue;
      inTree.add(m.id);
      queue.push(m.id);
      const arr = tree.get(cur) ?? [];
      arr.push(m);
      tree.set(cur, arr);
    }
  }
  const byId = new Map(all.map((m) => [m.id, m] as const));
  const sid = shortId(n.id);
  const html = renderNodeEl(n, "", tree, byId).replace(/^\n|\n$/g, "");
  const g = n.geo.desktop;
  const rule = `#${sid}{${styleCss(n.style) + panelCss(n.type, n.box)}left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px;z-index:1;}`;
  const css = formatCss([rule, scopeCss(n.css, "#" + sid)].filter(Boolean).join("\n"));
  let js = "";
  if (n.script.trim()) {
    const code = n.script.replace(/<\/script/gi, "<\\/script").split("\n").map((l) => "    " + l).join("\n");
    js = `// ${BLOCKS[n.type].name}${n.text ? ` "${n.text.slice(0, 30).replace(/\n/g, " ")}"` : ""} · #${sid}\n(function (el, input) {\n  if (!el) return;\n  try {\n${code}\n  } catch (err) { console.error("[WebCraft] #${sid}", err); }\n})(document.getElementById("${sid}"), document.querySelector("#${sid} input, #${sid} textarea, #${sid} select"));`;
  } else {
    js = `// ${BLOCKS[n.type].name} has no custom logic yet.\n// Add some from Edit → Code snippets → Script.`;
  }
  return { html, css, js, name: BLOCKS[n.type].name };
}

export function generateExport(nodes: NodeView[], theme: Theme, title: string) {
  const { sorted, childrenOf, topLevel } = buildTree(nodes);
  const body = topLevel.map((n) => renderNodeEl(n, "    ", childrenOf, new Map(nodes.map((m) => [m.id, m] as const)))).join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="wc-page">
${body}
  </main>
  <div id="wc-live" class="wc-sr" aria-live="polite"></div>
  <script src="script.js"></script>
</body>
</html>
`;
  const rules = (bp: Breakpoint) =>
    sorted
      .map((n) => {
        const g = n.geo[bp];
        return `  #${shortId(n.id)}{${bp === "desktop" ? styleCss(n.style) + panelCss(n.type, n.box) : ""}left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px;z-index:${sorted.indexOf(n) + 1};}`;
      })
      .join("\n");
  const rawCss = `:root{${themeVars(theme)}}
body{margin:0;background:var(--wc-surface);}
.wc-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}
${BLOCK_CSS.trim()}
.wc-page{width:${BREAKPOINTS.desktop.width}px;min-height:${pageHeight(nodes, "desktop")}px;margin:0 auto;}
${rules("desktop")}
${sorted.map((n) => scopeCss(n.css, "#" + shortId(n.id))).filter(Boolean).join("\n")}
@media ${BREAKPOINTS.tablet.query}{
  .wc-page{width:${BREAKPOINTS.tablet.width}px;min-height:${pageHeight(nodes, "tablet")}px;}
${rules("tablet")}
}
@media ${BREAKPOINTS.mobile.query}{
  .wc-page{width:${BREAKPOINTS.mobile.width}px;min-height:${pageHeight(nodes, "mobile")}px;}
${rules("mobile")}
}
`;
  const css = formatCss(rawCss);
  const scripts = sorted.filter((n) => n.script.trim()).map((n) => {
    const sid = shortId(n.id);
    const code = n.script.replace(/<\/script/gi, "<\\/script").split("\n").map((l) => "    " + l).join("\n");
    return `// ${BLOCKS[n.type].name}${n.text ? ` "${n.text.slice(0, 30).replace(/\n/g, " ")}"` : ""} · #${sid}
(function (el, input) {
  if (!el) return;
  try {
${code}
  } catch (err) { console.error("[WebCraft] #${sid}", err); }
})(document.getElementById("${sid}"), document.querySelector("#${sid} input, #${sid} textarea, #${sid} select"));`;
  });
  const js = `// WebCraft site runtime — script.js is the JavaScript for the ENTIRE website.\n// It holds the site-wide behavior (smooth scrolling for # links) plus every\n// block's own logic from Edit → Code snippets → Script, in page order.\n\ndocument.addEventListener("click", (event) => {\n  if (!(event.target instanceof Element)) return;\n  const link = event.target.closest('a[href^="#"]');\n  if (!link) return;\n  const target = document.getElementById(link.getAttribute("href").slice(1));\n  if (target) {\n    event.preventDefault();\n    target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });\n  }\n});\n\n${chartRuntime()}\n\n${STORE_JS}\n\n${scripts.length ? scripts.join("\n\n") : "// No block-specific logic has been added yet."}\n`;
  return { html, css, js };
}

/** Built-in store: cart lives in the visitor's browser; checkout opens the cart's payment link. */
const STORE_JS = `// Store — product "Add to cart" buttons and the cart & checkout block.
(function () {
  const KEY = "wc-cart";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
  const save = (items) => { localStorage.setItem(KEY, JSON.stringify(items)); render(); document.dispatchEvent(new CustomEvent("webcraft:cart-changed", { detail: { items, total: items.reduce((sum, it) => sum + it.price * it.qty, 0) } })); };
  window.WebCraft = window.WebCraft || {};
  window.WebCraft.cart = { getItems: load, clear: () => save([]), add: item => { if (!item || !item.id || !Number.isFinite(Number(item.price)) || Number(item.price) < 0) return; const items = load(); const found = items.find(it => it.id === item.id); if (found) found.qty += 1; else items.push({ ...item, price: Number(item.price), qty: 1 }); save(items); } };
  function render() {
    const items = load();
    document.querySelectorAll("[data-wc-cart]").forEach((cart) => {
      const list = cart.querySelector(".wc-cart-items");
      const cur = items[0]?.currency || "$";
      list.innerHTML = "";
      items.forEach((it, i) => {
        const li = document.createElement("li");
        li.textContent = it.qty + " × " + it.name + " — " + cur + (it.price * it.qty).toFixed(2);
        const rm = document.createElement("button");
        rm.textContent = "✕";
        rm.setAttribute("aria-label", "Remove " + it.name);
        rm.onclick = () => { const next = load(); next.splice(i, 1); save(next); };
        li.append(rm);
        list.append(li);
      });
      cart.querySelector(".wc-cart-empty").hidden = items.length > 0;
      cart.querySelector(".wc-cart-total strong").textContent = cur + items.reduce((s, it) => s + it.price * it.qty, 0).toFixed(2);
    });
  }
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const add = event.target.closest(".wc-add");
    if (add) {
      const p = add.closest("[data-wc-product]");
      const items = load();
      const found = items.find((it) => it.id === p.dataset.wcProduct);
      if (found) found.qty += 1;
      else items.push({ id: p.dataset.wcProduct, name: p.dataset.name, price: Number(p.dataset.price), currency: p.dataset.currency, qty: 1 });
      save(items);
      add.textContent = "Added ✓";
      setTimeout(() => (add.textContent = "Add to cart"), 1200);
    }
    const checkout = event.target.closest(".wc-checkout");
    if (checkout && checkout.tagName === "A") {
      const items = load();
      const request = new CustomEvent("webcraft:checkout", { cancelable: true, bubbles: true, detail: { items, total: items.reduce((sum, it) => sum + it.price * it.qty, 0), destination: checkout.href } });
      if (!checkout.dispatchEvent(request)) { event.preventDefault(); return; }
      const total = load().reduce((s, it) => s + it.price * it.qty, 0).toFixed(2);
      if (/paypal\\.me\\//i.test(checkout.href)) checkout.href = checkout.href.replace(/\\/[\\d.]+$/, "") + "/" + total;
    }
  });
  render();
})();`;
