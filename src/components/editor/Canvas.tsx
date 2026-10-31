import { useRef, useState } from "react";
import { toast } from "sonner";
import { Code2, Copy, Lock, Unlock } from "lucide-react";
import { LockControl } from "./LockControl";
import { nodeBlocked } from "@/lib/nodeAccess";
import { BLOCKS, BLOCK_CSS, BREAKPOINTS, blockHtml, isContainer, isFlow, isPanel, panelCss, panelClass, sanitizeHtml, scopeCss, styleObj, themeVars, type BlockType, type Breakpoint, type Theme } from "@/lib/blocks";
import { blockSnippet, pageHeight, type Geo, type NodeView } from "@/lib/model";
import type { Cursor, Lease, NodeLock } from "@/lib/useRoom";
import { snapGrid, type DragPrefs } from "@/lib/dragPrefs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  nodes: NodeView[];
  bp: Breakpoint;
  theme: Theme;
  scale: number;
  selected: string | null;
  mySession: string;
  leases: Record<string, Lease>;
  cursors: Record<string, Cursor>;
  pageId: string;
  drags: Record<string, { bp: string } & Geo>;
  readOnly: boolean;
  prefs: DragPrefs;
  locks: Record<string, NodeLock>;
  canOverride: (l: NodeLock) => boolean;
  onSelect: (id: string | null) => void;
  onCommit: (id: string, g: Geo, kind: "moved" | "resized") => void;
  onLiveDrag: (id: string, g: Geo, done?: boolean) => void;
  onCursor: (x: number, y: number) => void;
  onDropBlock: (type: BlockType, x: number, y: number, parentId?: string) => void;
  onReorder: (id: string, beforeId: string | null) => void;
  multiSelected?: string[];
  onMultiSelect?: (id: string) => void;
  lockControls: { myId: string; isOwner: boolean; members: { id: string; name: string; color: string }[]; onSet: (id: string, mode: NodeLock["mode"] | null, allowed: string[]) => Promise<boolean> };
};

/** "a:b;c-d:e" → React style object. */
export function cssObj(css: string): React.CSSProperties {
  const o: Record<string, string> = {};
  for (const part of css.split(";")) {
    const i = part.indexOf(":");
    if (i < 1) continue;
    o[part.slice(0, i).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = part.slice(i + 1).trim();
  }
  return o as React.CSSProperties;
}

const SNAP = 6;

export function Canvas(p: Props) {
  const readOnlyRef = useRef(p.readOnly);
  readOnlyRef.current = p.readOnly;
  const accessRef = useRef(p);
  accessRef.current = p;
  const blocked = (id: string) => nodeBlocked(id, accessRef.current.leases, accessRef.current.locks, accessRef.current.mySession, accessRef.current.canOverride);
  const pageW = BREAKPOINTS[p.bp].width;
  const pageH = pageHeight(p.nodes, p.bp);
  const pageRef = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState<{ id: string; g: Geo } | null>(null);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);

  const toPage = (e: { clientX: number; clientY: number }) => {
    const r = pageRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: (e.clientX - r.left) / p.scale, y: (e.clientY - r.top) / p.scale };
  };

  const ids = new Set(p.nodes.map((n) => n.id));
  const childMap = new Map<string, NodeView[]>();
  const top: NodeView[] = [];
  for (const n of p.nodes) {
    if (n.parent && ids.has(n.parent)) {
      const arr = childMap.get(n.parent) ?? [];
      arr.push(n);
      childMap.set(n.parent, arr);
    } else {
      top.push(n);
    }
  }
  const byOrder = (a: NodeView, b: NodeView) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0);
  top.sort(byOrder);
  for (const arr of childMap.values()) arr.sort(byOrder);

  const geoOf = (n: NodeView): Geo => {
    const remote = p.drags[n.id];
    if (local?.id === n.id) return local.g;
    if (remote && remote.bp === p.bp) return remote;
    return n.geo[p.bp];
  };

  /** Absolute page position of a node, walking up parents. */
  const absGeo = (n: NodeView): Geo => {
    const g = geoOf(n);
    let x = g.x, y = g.y;
    let cur = n;
    const seen = new Set<string>();
    while (cur.parent && ids.has(cur.parent) && !seen.has(cur.parent)) {
      seen.add(cur.parent);
      const par = p.nodes.find((m) => m.id === cur.parent);
      if (!par) break;
      const pg = geoOf(par);
      x += pg.x; y += pg.y;
      cur = par;
    }
    return { x, y, w: g.w, h: g.h };
  };

  /** Topmost container whose absolute box contains the page point. */
  const containerAt = (x: number, y: number): NodeView | null => {
    let best: NodeView | null = null;
    for (const n of p.nodes) {
      if (!isContainer(n.type)) continue;
      const g = absGeo(n);
      if (x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h) best = n; // later = higher z
    }
    return best;
  };

  function snap(id: string, g: Geo, resizing: boolean, free = false, bounds?: Geo): { g: Geo; gx: number[]; gy: number[] } {
    const clamp = (o: Geo): Geo => {
      const out = { x: Math.round(o.x), y: Math.max(0, Math.round(o.y)), w: Math.max(24, Math.round(o.w)), h: Math.max(16, Math.round(o.h)) };
      if (bounds) {
        out.w = Math.min(out.w, bounds.w);
        out.h = Math.min(out.h, bounds.h);
        out.x = Math.max(0, Math.min(out.x, bounds.w - out.w));
        out.y = Math.max(0, Math.min(out.y, bounds.h - out.h));
      }
      return out;
    };
    if (free || bounds || (!p.prefs.guides && !p.prefs.grid)) {
      return { g: clamp(g), gx: [], gy: [] };
    }
    if (!p.prefs.guides) {
      const G = p.prefs.grid;
      const o = resizing ? { ...g, w: snapGrid(g.x + g.w, G) - g.x, h: snapGrid(g.y + g.h, G) - g.y } : { ...g, x: snapGrid(g.x, G), y: snapGrid(g.y, G) };
      return { g: clamp(o), gx: [], gy: [] };
    }
    const xs: number[] = [0, pageW, pageW / 2];
    const ys: number[] = [0];
    for (const n of top) {
      if (n.id === id) continue;
      const o = n.geo[p.bp];
      xs.push(o.x, o.x + o.w, o.x + o.w / 2);
      ys.push(o.y, o.y + o.h, o.y + o.h / 2);
    }
    const out = { ...g };
    if (p.prefs.grid) {
      if (resizing) { out.w = snapGrid(g.x + g.w, p.prefs.grid) - g.x; out.h = snapGrid(g.y + g.h, p.prefs.grid) - g.y; }
      else { out.x = snapGrid(g.x, p.prefs.grid); out.y = snapGrid(g.y, p.prefs.grid); }
      g = { ...out };
    }
    const gx: number[] = [];
    const gy: number[] = [];
    const tryAxis = (edges: number[], targets: number[], apply: (d: number) => void, hits: number[]) => {
      let best: { d: number; t: number } | null = null;
      for (const e of edges) for (const t of targets) {
        const d = t - e;
        if (Math.abs(d) <= SNAP && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t };
      }
      if (best) { apply(best.d); hits.push(best.t); }
    };
    if (resizing) {
      tryAxis([g.x + g.w], xs, (d) => (out.w += d), gx);
      tryAxis([g.y + g.h], ys, (d) => (out.h += d), gy);
    } else {
      tryAxis([g.x, g.x + g.w, g.x + g.w / 2], xs, (d) => (out.x += d), gx);
      tryAxis([g.y, g.y + g.h, g.y + g.h / 2], ys, (d) => (out.y += d), gy);
    }
    return { g: clamp(out), gx, gy };
  }

  function startDrag(e: React.PointerEvent, n: NodeView, resizing: boolean) {
    if (p.readOnly || e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey && p.onMultiSelect) { p.onMultiSelect(n.id); return; }
    p.onSelect(n.id);
    if (blocked(n.id)) return;
    const nl = p.locks[n.id];
    if (nl && !p.canOverride(nl)) return;
    const start = toPage(e);
    const orig = n.geo[p.bp];
    const flowParent = n.parent && ids.has(n.parent) ? p.nodes.find((m) => m.id === n.parent) : undefined;
    if (!resizing && flowParent && isFlow(flowParent.type)) {
       const el = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-node]");
       const box = el?.parentElement;
       if (!el || !box) return;
      let dragged = false;
      const mv = (ev: PointerEvent) => {
        if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 4) { dragged = true; el.style.opacity = "0.5"; setDropTarget(flowParent.id); }
      };
      const done = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", mv);
        window.removeEventListener("pointerup", done);
        el.style.opacity = "";
        setDropTarget(null);
         if (!dragged || readOnlyRef.current || blocked(n.id)) return;
        const row = getComputedStyle(box).flexDirection === "row" && getComputedStyle(box).display === "flex";
        const grid = getComputedStyle(box).display === "grid";
        const sibs = [...box.querySelectorAll<HTMLElement>(":scope > [data-node]")].filter((x) => x !== el);
        const before = sibs.find((s2) => {
          const r = s2.getBoundingClientRect();
          if (grid) return ev.clientY < r.top || (ev.clientY <= r.bottom && ev.clientX < r.left + r.width / 2);
          return row ? ev.clientX < r.left + r.width / 2 : ev.clientY < r.top + r.height / 2;
        });
        p.onReorder(n.id, before?.dataset["node"] ?? null);
      };
      window.addEventListener("pointermove", mv);
      window.addEventListener("pointerup", done);
      return;
    }
    const parentView = n.parent && ids.has(n.parent) ? p.nodes.find((m) => m.id === n.parent) : undefined;
    const bounds = parentView ? parentView.geo[p.bp] : undefined;
    let last = orig;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (readOnlyRef.current || blocked(n.id)) return;
      const cur = toPage(ev);
      let dx = cur.x - start.x, dy = cur.y - start.y;
      if (!resizing && p.prefs.axis === "x") dy = 0;
      if (!resizing && p.prefs.axis === "y") dx = 0;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      moved = true;
      const raw = resizing ? { ...orig, w: orig.w + dx, h: orig.h + dy } : { ...orig, x: orig.x + dx, y: orig.y + dy };
      const s = snap(n.id, raw, resizing, ev.altKey, bounds);
      last = s.g;
      setLocal({ id: n.id, g: s.g });
      setGuides({ x: s.gx, y: s.gy });
      p.onLiveDrag(n.id, s.g);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setGuides({ x: [], y: [] });
      if (moved && !readOnlyRef.current && !blocked(n.id)) {
        p.onLiveDrag(n.id, last, true);
        p.onCommit(n.id, last, resizing ? "resized" : "moved");
      }
      setLocal(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function renderNode(n: NodeView, z: number) {
    const g = geoOf(n);
    const remote = p.drags[n.id];
    const lease = p.leases[n.id];
    const lockedByOther = lease && lease.holder_session !== p.mySession;
    const nl = p.locks[n.id];
    const pinned = !!nl && !p.canOverride(nl);
    const isSel = p.selected === n.id || !!p.multiSelected?.includes(n.id);
    const kids = childMap.get(n.id) ?? [];
    const container = isContainer(n.type);
    const panel = isPanel(n.type);
    const par = n.parent && ids.has(n.parent) ? p.nodes.find((m) => m.id === n.parent) : undefined;
    const inFlow = !!par && isFlow(par.type);
    const custom = sanitizeHtml(n.html);
    const ownStyle = styleObj(n.style) as React.CSSProperties;
    return (
      <div
        key={n.id}
        data-node={n.id}
        className={`wc-el group${panel ? ` wc-box wc-box-${n.type}${panelClass(n.type, n.box)}` : ""}${inFlow ? " wc-flow" : ""}`}
        style={{
          left: g.x, top: g.y, width: g.w, height: g.h, zIndex: z,
          ...(panel ? { ...cssObj(panelCss(n.type, n.box)), ...ownStyle } : {}),
          overflow: "visible",
          cursor: p.readOnly ? "default" : lockedByOther || pinned ? "not-allowed" : inFlow ? "grab" : "move",
          outline: isSel ? "2px solid var(--primary)" : dropTarget === n.id ? "2px dashed var(--primary)" : lockedByOther ? `2px dashed ${lease.holder_color}` : undefined,
          outlineOffset: 2,
          transition: remote ? "left 60ms linear, top 60ms linear" : undefined,
        }}
        onPointerDown={(e) => startDrag(e, n, false)}
      >
        {!panel && (
          <div
            className="pointer-events-none h-full w-full overflow-hidden group-hover:outline group-hover:outline-1 group-hover:outline-[var(--ring)]"
            data-block-content
            style={ownStyle}
            dangerouslySetInnerHTML={{ __html: blockHtml(n.type, n, n.id) + custom }}
          />
        )}
        {panel && custom && <div className="pointer-events-none" dangerouslySetInnerHTML={{ __html: custom }} />}
        <Button size="icon" variant="outline"
          type="button"
          aria-label={`View code of ${BLOCKS[n.type].name}`}
          title="View code"
          className="absolute right-1.5 top-1.5 z-30 size-7 bg-card/95 text-foreground opacity-100 shadow-sm transition sm:opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setPeekId(n.id); }}
        >
          <Code2 className="size-3" />
        </Button>
        {container && kids.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="text-center font-sans text-[11px] italic text-muted-foreground/80">
              {n.type === "grid" ? "Drop blocks here · they fill the grid cells" : n.type === "flex" ? "Drop blocks here · they line up in a row" : n.type === "stack" ? "Drop blocks here · they stack top to bottom" : n.type === "absolute" ? "Drop blocks here · place them anywhere inside" : n.type === "section" ? "Drop blocks here · they stack inside this full-width band" : "Drop blocks here"}
            </span>
          </div>
        )}
        {kids.map((k, i) => renderNode(k, i + 1))}
        {lockedByOther && (
          <span
            className="absolute -top-3 right-1 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[10px] font-medium text-primary-foreground"
            style={{ background: lease.holder_color }}
          >
            🔒 {lease.holder_name} is editing
          </span>
        )}
        {nl && !lockedByOther && (
          <span className="absolute -top-3 left-1 z-10 rounded-full border bg-card px-2 py-0.5 font-sans text-[10px] font-medium text-foreground shadow-sm">
            {nl.mode === "move" ? "📌 Pinned" : "🔒 Locked"} by {nl.locked_by_name}{pinned ? "" : " · you can edit"}
          </span>
        )}
        {isSel && (
          <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 font-sans text-[10px] font-medium text-primary-foreground" style={{ transform: `translateX(-50%) scale(${1 / p.scale})`, transformOrigin: "top center" }}>
            {Math.round(g.w)} × {Math.round(g.h)}
          </span>
        )}
        {isSel && !p.readOnly && !pinned && (
          <div
            className="absolute -bottom-1.5 -right-1.5 z-10 size-3 cursor-se-resize rounded-sm border-2 border-primary bg-card"
            onPointerDown={(e) => startDrag(e, n, true)}
          />
        )}
      </div>
    );
  }

  const peekNode = peekId ? p.nodes.find((m) => m.id === peekId) ?? null : null;
  return (
    <div
      className="relative mx-auto origin-top-left"
      style={{ width: pageW * p.scale, height: pageH * p.scale }}
    >
      <style>{BLOCK_CSS + p.nodes.map((n) => scopeCss(n.css, `[data-node="${n.id}"]`)).join("\n")}</style>
      <div
        ref={pageRef}
        className="wc-page wc-editor absolute left-0 top-0 origin-top-left shadow-lift"
        style={{ width: pageW, height: pageH, transform: `scale(${p.scale})`, ...cssVars(p.theme) }}
        onPointerDown={() => p.onSelect(null)}
        onPointerMove={(e) => { const c = toPage(e); p.onCursor(c.x, c.y); }}
        onDragOver={(e) => {
          if (p.readOnly) return;
          e.preventDefault();
          const c = toPage(e);
          const t = containerAt(c.x, c.y);
          setDropTarget((cur) => (cur === (t?.id ?? null) ? cur : (t?.id ?? null)));
        }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => {
          if (p.readOnly) return;
          setDropTarget(null);
          const t = e.dataTransfer.getData("application/x-webcraft-block") as BlockType;
          if (!t) return;
          const c = toPage(e);
          const target = isContainer(t) ? null : containerAt(c.x, c.y);
          if (target) {
            const g = absGeo(target);
            p.onDropBlock(t, c.x - g.x, c.y - g.y, target.id);
          } else {
            p.onDropBlock(t, c.x, c.y);
          }
        }}
      >
        {top.map((n, i) => renderNode(n, i + 1))}
        {guides.x.map((x, i) => (
          <div key={`gx${i}`} className="pointer-events-none absolute top-0 z-[9998] w-px bg-guide" style={{ left: x, height: pageH }} />
        ))}
        {guides.y.map((y, i) => (
          <div key={`gy${i}`} className="pointer-events-none absolute left-0 z-[9998] h-px bg-guide" style={{ top: y, width: pageW }} />
        ))}
        {Object.entries(p.cursors).map(([s, c]) =>
          s === p.mySession || c.page !== p.pageId ? null : (
            <div key={s} className="pointer-events-none absolute z-[9999] transition-all duration-75" style={{ left: c.x, top: c.y }}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ color: c.color }} fill="currentColor"><path d="M3 2l18 8-8 3-3 8z" /></svg>
              <span className="ml-3 rounded px-1.5 py-0.5 font-sans text-[11px] text-primary-foreground" style={{ background: c.color }}>{c.name}</span>
            </div>
          ),
        )}
      </div>
      {peekNode && <CodePeek node={peekNode} nodes={p.nodes} lock={p.locks[peekNode.id]} controls={p.lockControls} readOnly={p.readOnly} onClose={() => setPeekId(null)} />}
    </div>
  );
}

/** Tiny floating code viewer: the exact HTML / CSS / script WebCraft exports for one block. */
function CodePeek({ node, nodes, lock, controls, readOnly, onClose }: { node: NodeView; nodes: NodeView[]; lock?: NodeLock; controls: Props["lockControls"]; readOnly: boolean; onClose: () => void }) {
  const s = blockSnippet(node, nodes);
  const [tab, setTab] = useState<"html" | "css" | "js">("html");
  const val = s[tab];
  const [permissions, setPermissions] = useState(false);
  const manage = !readOnly && (!lock || lock.locked_by === controls.myId || controls.isOwner);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{s.name} · code</DialogTitle>
          <DialogDescription>The code WebCraft exports for this block — what you see is exactly what ships on the live site.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "html" | "css" | "js")} className="min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <TabsList className="h-8">
              <TabsTrigger value="html" className="text-xs">HTML</TabsTrigger>
              <TabsTrigger value="css" className="text-xs">CSS</TabsTrigger>
              <TabsTrigger value="js" className="text-xs">Script</TabsTrigger>
            </TabsList>
            <Button size="icon" variant={lock ? "secondary" : "ghost"} className="size-8" disabled={!manage} aria-label={lock ? "Unlock block" : "Lock block"} title={lock ? "Unlock block" : "Lock block"} onClick={() => controls.onSet(node.id, lock ? null : "full", [])}>{lock ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}</Button>
            <Button variant="ghost" size="sm" onClick={() => setPermissions(v => !v)}>Permissions</Button>
            <Button size="icon" variant="ghost" className="ml-auto size-8" aria-label="Copy code"
              onClick={() => navigator.clipboard.writeText(val).then(() => toast.success("Code copied"))}>
              <Copy className="size-3.5" />
            </Button>
          </div>
          {permissions && <LockControl key={`${node.id}-${JSON.stringify(lock)}`} lock={lock} myId={controls.myId} isOwner={controls.isOwner} readOnly={readOnly} members={controls.members} onSet={(mode, allowed) => controls.onSet(node.id, mode, allowed)} />}
          <pre className="mt-2 max-h-[45vh] min-w-0 overflow-auto whitespace-pre rounded-md bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper">{val}</pre>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function cssVars(t: Theme): React.CSSProperties {
  const o: Record<string, string> = {};
  for (const part of themeVars(t).split(";")) {
    const [k, v] = part.split(":");
    if (k && v) o[k] = v;
  }
  return o as React.CSSProperties;
}
