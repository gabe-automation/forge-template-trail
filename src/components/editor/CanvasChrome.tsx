import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Minus, Plus } from "lucide-react";
import { BLOCKS } from "@/lib/blocks";
import type { NodeView } from "@/lib/model";

export type MenuItem = { label: string; shortcut?: string; onClick: () => void; disabled?: boolean; danger?: boolean } | "sep";

/** Figma-style right-click menu, positioned at the cursor and kept on screen. */
export function ContextMenuOverlay({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  useEffect(() => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ x: Math.min(x, window.innerWidth - r.width - 8), y: Math.min(y, window.innerHeight - r.height - 8) });
    }
    const close = (e: Event) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", esc);
    window.addEventListener("blur", onClose);
    return () => { window.removeEventListener("pointerdown", close, true); window.removeEventListener("keydown", esc); window.removeEventListener("blur", onClose); };
  }, [x, y, onClose]);
  return (
    <div ref={ref} role="menu" className="fixed z-[100] min-w-56 rounded-lg border bg-popover p-1 text-xs text-popover-foreground shadow-lift"
      style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, i) => it === "sep" ? <div key={i} className="my-1 h-px bg-border" /> : (
        <button key={i} role="menuitem" type="button" disabled={it.disabled}
          onClick={() => { onClose(); it.onClick(); }}
          className={`flex w-full items-center justify-between gap-6 rounded px-2 py-1.5 text-left hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-40 ${it.danger ? "text-destructive" : ""}`}>
          <span>{it.label}</span>{it.shortcut && <span className="opacity-60">{it.shortcut}</span>}
        </button>
      ))}
    </div>
  );
}

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4;

export function ZoomHud({ zoom, onZoom, width, label }: { zoom: number; onZoom: (z: number) => void; width: number; label: string }) {
  const clamp = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-lg border bg-card px-1 py-1 text-xs shadow-lift">
      <span className="hidden px-2 text-muted-foreground sm:inline">{label} · {width}px</span>
      <button type="button" className="grid size-7 place-items-center rounded hover:bg-muted" onClick={() => onZoom(clamp(zoom / 1.25))} aria-label="Zoom out"><Minus className="size-3.5" /></button>
      <button type="button" className="w-12 rounded py-1 text-center font-medium tabular-nums hover:bg-muted" onClick={() => onZoom(1)} title="Zoom to fit (Shift+1)">{Math.round(zoom * 100)}%</button>
      <button type="button" className="grid size-7 place-items-center rounded hover:bg-muted" onClick={() => onZoom(clamp(zoom * 1.25))} aria-label="Zoom in"><Plus className="size-3.5" /></button>
    </div>
  );
}

/** Nested layer list, top of the page first — like Figma's Layers panel. */
export function LayersTree({ views, selected, onSelect, onContext }: {
  views: NodeView[]; selected: string | null; onSelect: (id: string) => void; onContext: (id: string, x: number, y: number) => void;
}) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const ids = new Set(views.map((v) => v.id));
  const kids = new Map<string | null, NodeView[]>();
  for (const v of views) {
    const k = v.parent && ids.has(v.parent) ? v.parent : null;
    const arr = kids.get(k) ?? [];
    arr.push(v);
    kids.set(k, arr);
  }
  for (const arr of kids.values()) arr.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
  const row = (v: NodeView, depth: number): React.ReactNode => {
    const ch = kids.get(v.id) ?? [];
    const open = !closed[v.id];
    const name = (v.text || v.label || "").trim().slice(0, 28);
    return (
      <li key={v.id}>
        <div className={`flex items-center gap-1 rounded py-1 pr-1 text-xs ${selected === v.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
          style={{ paddingLeft: 4 + depth * 12 }}
          onContextMenu={(e) => { e.preventDefault(); onContext(v.id, e.clientX, e.clientY); }}>
          {ch.length ? <button type="button" aria-label={open ? "Collapse" : "Expand"} className="shrink-0" onClick={() => setClosed((c) => ({ ...c, [v.id]: open }))}>
            {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button> : <span className="w-3 shrink-0" />}
          <button type="button" onClick={() => onSelect(v.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
            <span className="shrink-0 font-medium">{BLOCKS[v.type]?.name ?? v.type}</span>
            {name && <span className="truncate text-muted-foreground">{name}</span>}
          </button>
        </div>
        {ch.length > 0 && open && <ul>{ch.map((c) => row(c, depth + 1))}</ul>}
      </li>
    );
  };
  const top = kids.get(null) ?? [];
  if (!top.length) return <p className="px-2 py-1 text-xs text-muted-foreground">No layers yet.</p>;
  return <ul className="space-y-px">{top.map((v) => row(v, 0))}</ul>;
}
