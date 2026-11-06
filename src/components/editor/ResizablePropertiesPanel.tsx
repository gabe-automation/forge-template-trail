import { useState, type ReactNode } from "react";
import { boundedPanelWidth, PANEL_MIN, PANEL_MAX } from "@/lib/panelSizing";

export function ResizablePropertiesPanel({ children, className }: { children: ReactNode; className: string }) {
  const [width, setWidth] = useState(256);
  return <aside aria-label="Properties" className={className} style={{ width: `min(${width}px, 92vw)` }}>
    <div role="separator" tabIndex={0} aria-label="Resize left panel" aria-orientation="vertical" aria-valuemin={PANEL_MIN} aria-valuemax={PANEL_MAX} aria-valuenow={width}
      title="Resize properties panel" className="absolute inset-y-0 -right-1 z-50 hidden w-2 cursor-col-resize touch-none outline-none hover:bg-primary/20 focus-visible:bg-primary/20 md:block"
      onKeyDown={e => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setWidth(w => boundedPanelWidth(w + (e.key === "ArrowRight" ? 8 : -8))); }
        if (e.key === "Home") setWidth(PANEL_MIN);
        if (e.key === "End") setWidth(PANEL_MAX);
      }}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => {
        const panel = e.currentTarget.parentElement;
        if (panel && e.currentTarget.hasPointerCapture(e.pointerId)) setWidth(boundedPanelWidth(e.clientX - panel.getBoundingClientRect().left));
      }}
      onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} />
    {children}
  </aside>;
}