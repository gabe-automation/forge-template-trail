import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  provider: z.enum(["netlify", "vercel"]),
  token: z.string().min(10).max(400),
  siteName: z.string().max(60),
  siteId: z.string().max(120).optional(),
  files: z.record(z.string().regex(/^[\w./-]{1,120}$/), z.string().max(5_000_000)),
  /** Binary files (images, videos) as base64. */
  binary: z.record(z.string().regex(/^[\w./-]{1,120}$/), z.string().max(40_000_000)).default({}),
});

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function sha1(s: string | Uint8Array) {
  const bytes = typeof s === "string" ? new TextEncoder().encode(s) : s;
  const buf = await crypto.subtle.digest("SHA-1", bytes as BufferSource);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const slug = (s: string) => (s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "webcraft-site");

/** One-click deploy of the static site to the user's own Netlify or Vercel account (free tiers work). */
export const deploySite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const auth = { Authorization: `Bearer ${data.token}` };
    if (data.provider === "netlify") {
      let siteId = data.siteId;
      if (siteId) {
        const r = await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}`, { headers: auth });
        if (!r.ok) siteId = undefined;
      }
      if (!siteId) {
        const name = `${slug(data.siteName)}-${Math.random().toString(36).slice(2, 7)}`;
        const r = await fetch("https://api.netlify.com/api/v1/sites", { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ name }) });
        if (!r.ok) return { ok: false as const, error: r.status === 401 ? "Netlify rejected the access token." : `Netlify couldn't create the site (${r.status}).` };
        siteId = ((await r.json()) as { id: string }).id;
      }
      const digests: Record<string, string> = {};
      const bySha: Record<string, string> = {};
      const all: Record<string, string | Uint8Array> = { ...data.files };
      for (const [path, content] of Object.entries(data.binary)) all[path] = b64(content);
      for (const [path, content] of Object.entries(all)) {
        const h = await sha1(content);
        digests[`/${path}`] = h;
        bySha[h] = path;
      }
      const dr = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ files: digests }) });
      if (!dr.ok) return { ok: false as const, error: `Netlify deploy failed (${dr.status}).` };
      const deploy = (await dr.json()) as { id: string; required?: string[]; ssl_url?: string; url?: string };
      for (const h of deploy.required ?? []) {
        const path = bySha[h];
        if (!path) continue;
        const up = await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files/${path}`, { method: "PUT", headers: { ...auth, "content-type": "application/octet-stream" }, body: all[path] as BodyInit });
        if (!up.ok) return { ok: false as const, error: `Netlify upload failed for ${path}.` };
      }
      const sr = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers: auth });
      const site = sr.ok ? ((await sr.json()) as { ssl_url?: string; url?: string }) : {};
      return { ok: true as const, url: site.ssl_url ?? site.url ?? deploy.ssl_url ?? "", siteId };
    }
    const name = slug(data.siteName);
    const r = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({
        name, target: "production",
        files: [...Object.entries(data.files).map(([file, content]) => ({ file, data: content })), ...Object.entries(data.binary).map(([file, content]) => ({ file, data: content, encoding: "base64" }))],
        projectSettings: { framework: null, buildCommand: null, outputDirectory: null, installCommand: null },
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { url?: string; alias?: string[]; error?: { message?: string } };
    if (!r.ok) return { ok: false as const, error: r.status === 403 || r.status === 401 ? "Vercel rejected the access token." : j.error?.message ?? `Vercel deploy failed (${r.status}).` };
    return { ok: true as const, url: `https://${name}.vercel.app`, previewUrl: j.url ? `https://${j.url}` : undefined, siteId: name };
  });
