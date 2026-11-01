import { describe, expect, it } from "vitest";
import { geoProps, groupingGeometry, splitRenderedBlock } from "@/lib/editorStructure";
import { generateExport } from "@/lib/model";
import { DEFAULT_THEME } from "@/lib/blocks";
import { nodeBlocked } from "@/lib/nodeAccess";
import { blocksToViews } from "@/lib/siteTemplates";
import type { Lease, NodeLock } from "@/lib/useRoom";
import { chartRuntime } from "@/lib/exportRuntime";

describe("Builder structure", () => {
  it("splits a compound button and text into independently editable nodes", () => {
    const node = blocksToViews("split", [{ type: "hero", y: 0 }])[0];
    if (!node) throw new Error("Missing fixture");
    const root = document.createElement("div");
    root.innerHTML = '<div data-block-content><section><h1>Welcome</h1><a class="wc-btn" href="https://example.org">Shop</a></section></div>';
    root.querySelectorAll("*").forEach(el => Object.defineProperty(el, "getBoundingClientRect", { value: () => ({ x: 10, y: 20, left: 10, top: 20, right: 210, bottom: 100, width: 200, height: 80 }) }));
    const parts = splitRenderedBlock(node, root, 1);
    expect(parts.find(p => p.text === "Welcome")?.type).toBe("element");
    expect(parts.find(p => p.text === "Shop")?.href).toBe("https://example.org");
    expect(parts.find(p => p.text === "Shop")?.parent).toBe(parts[0]?.id);
  });
  it("provides a programmable cart and cancellable checkout event", () => {
    localStorage.clear();
    const nodes = blocksToViews("store", [{ type: "cart", y: 0, href: "https://example.org/checkout" }]);
    const output = generateExport(nodes, DEFAULT_THEME, "Store");
    const host = document.createElement("div");
    host.innerHTML = output.html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "";
    document.body.append(host);
    new Function(output.js)();
    const api = (window as unknown as { WebCraft: { cart: { add: (item: unknown) => void; getItems: () => unknown[] } } }).WebCraft.cart;
    api.add({ id: "tote", name: "Tote", price: 24, currency: "$" });
    expect(api.getItems()).toHaveLength(1);
    expect(host.querySelector(".wc-cart-total strong")?.textContent).toBe("$24.00");
    host.addEventListener("webcraft:checkout", event => event.preventDefault(), { once: true });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    host.querySelector(".wc-checkout")?.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    host.remove();
    localStorage.clear();
  });
  it("groups siblings without changing their positions across breakpoints", () => {
    const nodes = blocksToViews("group-test", [{ type: "text", x: 50, y: 40, w: 200, h: 80 }, { type: "button", x: 280, y: 140, w: 100, h: 40 }]);
    const { boxes, children } = groupingGeometry(nodes);
    expect(boxes.desktop).toEqual({ x: 50, y: 40, w: 330, h: 140 });
    for (const bp of ["desktop", "tablet", "mobile"] as const) for (const n of nodes) {
      expect((children[n.id]?.[bp].x ?? NaN) + boxes[bp].x).toBe(n.geo[bp].x);
      expect((children[n.id]?.[bp].y ?? NaN) + boxes[bp].y).toBe(n.geo[bp].y);
    }
    expect(geoProps(boxes)["w@desktop"]).toBe(330);
  });
  it("blocks another session's automatic lease even for the project owner", () => {
    const leases = { a: { holder_session: "other" } as Lease };
    expect(nodeBlocked("a", leases, {}, "me", () => true)).toBe(true);
    expect(nodeBlocked("a", leases, {}, "other", () => false)).toBe(false);
  });
  it("allows pinned text edits but blocks movement and fully locked edits", () => {
    const lock = { mode: "move" } as NodeLock;
    expect(nodeBlocked("a", {}, { a: lock }, "me", () => false)).toBe(true);
    expect(nodeBlocked("a", {}, { a: lock }, "me", () => false, false)).toBe(false);
    expect(nodeBlocked("a", {}, { a: { ...lock, mode: "full" } }, "me", () => false, false)).toBe(true);
  });
  it("updates an exported chart from custom code", () => {
    const el = document.createElement("div");
    el.id = "custom-chart";
    el.dataset["chart"] = "line";
    document.body.append(el);
    new Function(chartRuntime())();
    const api = (window as unknown as { WebCraft: { setChart: (id: string, rows: unknown[]) => void } }).WebCraft;
    api.setChart(el.id, [{ label: "Sales", value: 42 }, { label: "Orders", value: 8 }]);
    expect(el.querySelectorAll("circle").length).toBe(2);
    expect(el.querySelector("text")?.textContent).toBe("Sales");
    el.remove();
  });
});