import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const DEFAULT = [50, 50, 50, 50, 50, 50, 50, 50];
export function FreeformShape({ value, disabled, onChange }: { value?: string | undefined; disabled: boolean; onChange: (radius: string) => void }) {
  const [radii, setRadii] = useState(DEFAULT);
  const board = useRef<HTMLDivElement>(null);
  const draft = useRef(radii);
  useEffect(() => {
    const parsed = value?.match(/\d+(?:\.\d+)?/g)?.map(Number);
    const next = parsed?.length === 8 ? parsed : DEFAULT;
    setRadii(next); draft.current = next;
  }, [value]);
  const css = `${radii.slice(0, 4).map(n => `${n}%`).join(" ")} / ${radii.slice(4).map(n => `${n}%`).join(" ")}`;
  const commit = (next: number[]) => onChange(`${next.slice(0, 4).map(n => `${n}%`).join(" ")} / ${next.slice(4).map(n => `${n}%`).join(" ")}`);
  const update = (index: number, next: number) => {
    const values = [...draft.current]; values[index] = Math.max(0, Math.min(100, Math.round(next)));
    draft.current = values; setRadii(values); return values;
  };
  return <div className="space-y-2">
    <div className="flex items-center justify-between"><span className="text-xs font-medium">Freeform border</span><Button size="icon" variant="ghost" disabled={disabled} aria-label="Reset freeform border" onClick={() => commit(DEFAULT)}><RotateCcw className="size-3"/></Button></div>
    <div ref={board} className="freeform-board">
      <div className="freeform-preview" style={{ borderRadius: css }}/>
      {radii.map((radius, index) => {
        const corner = index % 4;
        const horizontal = index < 4;
        const right = corner === 1 || corner === 2;
        const bottom = corner >= 2;
        const x = horizontal ? (right ? 100 - radius : radius) : right ? 100 : 0;
        const y = horizontal ? bottom ? 100 : 0 : bottom ? 100 - radius : radius;
        return <Button key={index} size="icon" variant="outline" className="freeform-handle" disabled={disabled} aria-label={`${["Top left", "Top right", "Bottom right", "Bottom left"][corner]} ${horizontal ? "horizontal" : "vertical"} curve`} style={{ left: `${x}%`, top: `${y}%` }}
          onPointerDown={e => { if (disabled) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; const rect = board.current?.getBoundingClientRect(); if (!rect) return; const point = horizontal ? (e.clientX - rect.left) / rect.width * 100 : (e.clientY - rect.top) / rect.height * 100; update(index, (horizontal ? right : bottom) ? 100 - point : point); }}
          onPointerUp={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; e.currentTarget.releasePointerCapture(e.pointerId); commit(draft.current); }}
          onKeyDown={e => { if (disabled || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return; e.preventDefault(); commit(update(index, radius + (["ArrowLeft", "ArrowDown"].includes(e.key) ? -2 : 2))); }}/>
      })}
    </div>
  </div>;
}