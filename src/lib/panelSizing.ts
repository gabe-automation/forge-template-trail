export const PANEL_MIN = 200;
export const PANEL_MAX = 320;
export function boundedPanelWidth(width: number): number {
  return Math.min(PANEL_MAX, Math.max(PANEL_MIN, Number.isFinite(width) ? width : 224));
}