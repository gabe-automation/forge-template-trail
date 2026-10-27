import { useEffect, useRef, useState } from "react";
import { BLOCK_CSS, BREAKPOINTS, blockHtml, isFlow, isPanel, panelCss, styleObj, themeVars, DEFAULT_THEME, type Theme } from "@/lib/blocks";
import { pageHeight, type NodeView } from "@/lib/model";
import { cssObj } from "@/components/editor/Canvas";

/** Scaled, non-interactive thumbnail of a canvas page. */
export function SitePreview({ nodes, theme = DEFAULT_THEME, height = 180, className = "" }: { nodes: NodeView[]; theme?: Theme; height?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(300);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 300));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pageW = BREAKPOINTS.desktop.width;
  const scale = w / pageW;
  const vars: Record<string, string> = {};
  for (const part of themeVars(theme).split(";")) { const [k, v] = part.split(":"); if (k && v) vars[k] = v; }
  const ids = new Set(nodes.map((n) => n.id));
  const childMap = new Map<string, NodeView[]>();
  const top: NodeView[] = [];
  for (const n of nodes) {
    if (n.parent && ids.has(n.parent)) {
      const arr = childMap.get(n.parent) ?? [];
      arr.push(n);
      childMap.set(n.parent, arr);
    } else top.push(n);
  }
  const byOrder = (a: NodeView, b: NodeView) => (a.order < b.order ? -1 : 1);
  top.sort(byOrder);
  for (const arr of childMap.values()) arr.sort(byOrder);
  const renderNode = (n: NodeView, flow = false): React.ReactNode => {
    const g = n.geo.desktop;
    const panel = isPanel(n.type);
    return (
      <div key={n.id} className={`wc-el${panel ? ` wc-box wc-box-${n.type}` : ""}${flow ? " wc-flow" : ""}`} style={{ left: g.x, top: g.y, width: g.w, height: g.h, ...(panel ? cssObj(panelCss(n.type, n.box)) : {}), ...(styleObj(n.style) as React.CSSProperties) }}>
        {!panel && <div className="h-full w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: blockHtml(n.type, n, "pv" + n.id.slice(0, 6)) }} />}
        {(childMap.get(n.id) ?? []).map((k) => renderNode(k, isFlow(n.type)))}
      </div>
    );
  };
  return (
    <div ref={ref} className={`relative overflow-hidden bg-muted ${className}`} style={{ height }} aria-hidden>
      <style>{BLOCK_CSS}</style>
      {nodes.length === 0 ? (
        <div className="grid h-full place-items-center bg-dotgrid text-xs text-muted-foreground">Empty page</div>
      ) : (
        <div className="wc-page pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ width: pageW, height: pageHeight(nodes, "desktop"), transform: `scale(${scale})`, ...(vars as React.CSSProperties) }}>
          {top.map((n) => renderNode(n))}
        </div>
      )}
    </div>
  );
}
