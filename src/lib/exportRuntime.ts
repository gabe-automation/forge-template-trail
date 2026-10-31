import { chartSvg, esc } from "./blocks";

/** Plain browser JavaScript, also available to a site's custom block scripts. */
export function chartRuntime() {
  return `// Charts: WebCraft.setChart(id, [{ label, value }]); public JSON endpoints only.
(function () {
  const split = s => String(s).split("|").map(x => x.trim());
  const esc = ${esc.toString()};
  const chartSvg = ${chartSvg.toString()};
  window.WebCraft = window.WebCraft || {};
  window.WebCraft.setChart = function (id, rows) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el || !Array.isArray(rows)) return;
    const labelKey = el.dataset.labelKey || "label", valueKey = el.dataset.valueKey || "value";
    el.innerHTML = chartSvg({ text: rows.map(r => String(r[labelKey] ?? "")).join("|"), sub: rows.map(r => Number(r[valueKey]) || 0).join("|"), label: "", attrs: Object.fromEntries(Object.entries(el.dataset).map(([k,v]) => ["data-" + k.replace(/[A-Z]/g, c => "-" + c.toLowerCase()), v])) });
    el.dispatchEvent(new CustomEvent("webcraft:chart-updated", { bubbles: true, detail: { rows } }));
  };
  document.querySelectorAll("[data-source]").forEach(async el => {
    try {
      const url = new URL(el.dataset.source, location.href);
      if (!["https:", "http:"].includes(url.protocol)) return;
      const response = await fetch(url, { credentials: "omit" });
      if (!response.ok) throw new Error("Chart data unavailable");
      const data = await response.json();
      window.WebCraft.setChart(el, Array.isArray(data) ? data : data.rows);
    } catch (error) { el.dispatchEvent(new CustomEvent("webcraft:data-error", { bubbles: true, detail: { message: String(error) } })); }
  });
})();`;
}