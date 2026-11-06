import { useState, type ReactNode } from "react";
import { boundedPanelWidth, PANEL_MIN, PANEL_MAX } from "@/lib/panelSizing";

export function ResizableAssetsPanel({ children, className }: { children: ReactNode; className: string }) {
  const [width, setWidth] = useState(224);
  return <aside aria-label="Pages layers and assets" className={`relative ${className}`} style={{ width: `min(${width}px, 88vw)` }}>
    <div role="separator" tabIndex={0} aria-label="Resize right panel" aria-orientation="vertical" aria-valuemin={PANEL_MIN} aria-valuemax={PANEL_MAX} aria-valuenow={width}
      title="Resize panel" className="absolute inset-y-0 -left-1 z-50 hidden w-2 cursor-col-resize touch-none outline-none hover:bg-primary/20 focus-visible:bg-primary/20 md:block"
      onKeyDown={e => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setWidth(w => boundedPanelWidth(w + (e.key === "ArrowLeft" ? 8 : -8))); }
        if (e.key === "Home") setWidth(PANEL_MIN);
        if (e.key === "End") setWidth(PANEL_MAX);
      }}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setWidth(boundedPanelWidth(e.currentTarget.parentElement?.getBoundingClientRect().right ? (e.currentTarget.parentElement.getBoundingClientRect().right - e.clientX) : width)); }}
      onPointerUp={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} />
    <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
  </aside>;
}