import { describe, expect, it } from "vitest";
import { geoProps, groupingGeometry } from "@/lib/editorStructure";
import { nodeBlocked } from "@/lib/nodeAccess";
import { blocksToViews } from "@/lib/siteTemplates";
import type { Lease, NodeLock } from "@/lib/useRoom";
import { chartRuntime } from "@/lib/exportRuntime";

describe("Builder structure", () => {
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