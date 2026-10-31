import { type Breakpoint } from "./blocks";
import type { Geo, NodeView } from "./model";

export const COMPOUND_TYPES = ["navbar", "hero", "cards", "pricing", "testimonial", "login", "register", "footer", "stats", "product", "cart", "image"];

/** Preserve all three breakpoint positions when nesting selected siblings. */
export function groupingGeometry(nodes: NodeView[]) {
  const boxes = {} as Record<Breakpoint, Geo>;
  const children: Record<string, Record<Breakpoint, Geo>> = {};
  for (const bp of ["desktop", "tablet", "mobile"] as const) {
    const x = Math.min(...nodes.map(n => n.geo[bp].x));
    const y = Math.min(...nodes.map(n => n.geo[bp].y));
    const right = Math.max(...nodes.map(n => n.geo[bp].x + n.geo[bp].w));
    const bottom = Math.max(...nodes.map(n => n.geo[bp].y + n.geo[bp].h));
    boxes[bp] = { x, y, w: right - x, h: bottom - y };
    for (const node of nodes) {
      children[node.id] ??= {} as Record<Breakpoint, Geo>;
      const child = children[node.id];
      if (!child) continue;
      child[bp] = { ...node.geo[bp], x: node.geo[bp].x - x, y: node.geo[bp].y - y };
    }
  }
  return { boxes, children };
}

export function geoProps(geo: Record<Breakpoint, Geo>) {
  return Object.fromEntries(Object.entries(geo).flatMap(([bp, g]) => Object.entries(g).map(([k, v]) => [`${k}@${bp}`, v])));
}

/** Convert rendered compound content to actual, individually selectable nodes. Browser-only on invocation. */
export function splitRenderedBlock(node: NodeView, root: HTMLElement, scale: number): NodeView[] {
  const content = root.querySelector<HTMLElement>(":scope > [data-block-content]");
  if (!content) return [];
  const origin = content.getBoundingClientRect();
  const result: NodeView[] = [];
  const walk = (el: Element, parent: string, parentBox: DOMRect, order: number) => {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const id = crypto.randomUUID();
    const atomic = ["SVG", "IMG", "VIDEO", "IFRAME", "INPUT"].includes(el.tagName.toUpperCase());
    const hasChildren = !atomic && el.children.length > 0;
    const type = hasChildren ? "absolute" : "element";
    const st = getComputedStyle(el);
    const declarations = ["color", "background-color", "border", "border-radius", "box-shadow", "font-family", "font-size", "font-weight", "font-style", "line-height", "text-align", "text-decoration", "opacity", "object-fit", "fill", "stroke"]
      .map(key => `${key}: ${st.getPropertyValue(key)};`).join("\n");
    const x = (rect.left - parentBox.left) / scale, y = (rect.top - parentBox.top) / scale;
    const g = { x, y, w: rect.width / scale, h: rect.height / scale };
    const attrs = Object.fromEntries([...el.attributes].filter(a => /^(data-|aria-|name$|type$|placeholder$|value$|alt$|src$)/.test(a.name)).map(a => [a.name === "src" ? "data-image" : a.name, a.value]));
    attrs["data-tag"] = el.tagName.toLowerCase();
    attrs["data-class"] = el.getAttribute("class") ?? "";
    if (atomic) attrs["data-atomic"] = "true";
    const geo = Object.fromEntries((["desktop", "tablet", "mobile"] as const).map(bp => {
      const ratio = node.geo[bp].w / node.geo.desktop.w;
      return [bp, { ...g, x: x * ratio, w: g.w * ratio }];
    })) as Record<Breakpoint, Geo>;
    result.push({ ...node, id, parent, type, order: String(order).padStart(5, "0"), text: hasChildren || atomic ? "" : el.textContent ?? "", sub: "", label: "", href: el.getAttribute("href") ?? "", attrs, style: {}, box: {}, html: atomic ? el.outerHTML : "", script: "", css: `& {\n${declarations}\nmargin: 0; padding: 0; box-sizing: border-box;\n}\n& > .wc-part { width: 100%; height: 100%; margin: 0; font: inherit; color: inherit; border-radius: inherit; }`, geo });
    if (hasChildren) [...el.children].forEach((child, i) => walk(child, id, rect, i));
  };
  [...content.children].forEach((el, i) => walk(el, node.id, origin, i));
  return result;
}