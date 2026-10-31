import type { NodeView } from "@/lib/model";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function IntegrationFields({ node, disabled, onAttrs }: { node: NodeView; disabled: boolean; onAttrs: (attrs: Record<string, string>) => void }) {
  if (!["chart", "product", "cart"].includes(node.type)) return null;
  const fields: [string, string][] = node.type === "chart" ? [["data-source", "JSON data URL"], ["data-label-key", "Label field"], ["data-value-key", "Value field"]] : node.type === "product" ? [["data-product-id", "Product ID"]] : [["data-store-id", "Store ID"]];
  return <section className="space-y-2 border-t pt-4"><Label>Code integration</Label>{fields.map(([key, label]) => <div key={key} className="space-y-1"><Label htmlFor={`${node.id}-${key}`} className="text-xs">{label}</Label><Input id={`${node.id}-${key}`} disabled={disabled} defaultValue={node.attrs[key] ?? ""} onBlur={e => onAttrs({ ...node.attrs, [key]: e.target.value.trim() })} /></div>)}</section>;
}