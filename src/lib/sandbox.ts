import { esc } from "./blocks";

/** Opens site HTML in a new tab inside a sandboxed frame, so block scripts can't reach the editor's session. */
export function openSandboxed(html: string, title = "Preview"): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  // The site runs inside a srcdoc frame (about:srcdoc), where root-relative URLs would
  // otherwise have nothing to resolve against — a <base> keeps every image, style and
  // link loading from the site's own origin.
  const withBase = /<base\s/i.test(html) ? html : html.replace(/<head([^>]*)>/i, `<head$1><base href="${window.location.origin}/">`);
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe sandbox="allow-scripts allow-forms allow-popups allow-modals" srcdoc="${esc(withBase)}"></iframe></body></html>`);
  w.document.close();
  return true;
}

const toB64 = (buf: ArrayBuffer) => {
  let bin = ""; const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(bin);
};

/**
 * Turns the site's pages into standalone static files. Every photo, cover, poster and
 * uploaded video is downloaded and bundled under assets/, so the site works on any host.
 */
export async function packageSite(pages: Record<string, string>, homeId: string | null) {
  const media = new Map<string, string>();
  const binary: Record<string, ArrayBuffer> = {};
  for (const html of Object.values(pages)) {
    for (const match of html.matchAll(/<(?:img|video|source)\b[^>]*?\b(?:src|poster)="([^"]+)"/gi)) {
      for (const m of match[0].matchAll(/\b(?:src|poster)="([^"]+)"/gi)) {
        const src = m[1];
        if (!src || media.has(src) || src.startsWith("data:") || /youtube|vimeo/i.test(src)) continue;
        const abs = new URL(src, window.location.origin).href;
        const response = await fetch(abs);
        if (!response.ok) throw new Error("A photo or video could not be packaged. Please try again.");
        const ext = src.split("?")[0]?.split(".").pop()?.match(/^(png|jpe?g|webp|gif|svg|avif|mp4|webm|mov|ogg)$/i)?.[0]?.toLowerCase()
          ?? (response.headers.get("content-type")?.split("/")[1]?.split(";")[0] ?? "bin");
        const filename = `assets/media-${media.size + 1}.${ext}`;
        binary[filename] = await response.arrayBuffer();
        media.set(src, filename);
      }
    }
  }
  const fix = (h: string) => h.replace(/\?page=([0-9a-f-]{36})/gi, (_, id: string) => (id === homeId ? "index.html" : `page-${id}.html`));
  const files: Record<string, string> = {};
  for (const [id, html] of Object.entries(pages)) {
    let packaged = fix(html);
    for (const [src, filename] of media) packaged = packaged.replaceAll(`"${src}"`, `"${filename}"`);
    files[id === homeId ? "index.html" : `page-${id}.html`] = packaged;
  }
  if (!files["index.html"]) { const first = Object.keys(files)[0]; if (first) files["index.html"] = files[first]!; }
  files["404.html"] = "<!doctype html><meta charset=\"utf-8\"><title>Page not found</title><main style=\"font:16px system-ui;padding:3rem\"><h1>Page not found</h1><p><a href=\"/index.html\">Return home</a></p></main>";
  return { files, binary, base64: () => Object.fromEntries(Object.entries(binary).map(([k, v]) => [k, toB64(v)])) };
}

export async function downloadSiteZip(pages: Record<string, string>, homeId: string | null, name: string, host?: string) {
  const JSZip = (await import("jszip")).default;
  const z = new JSZip();
  const pkg = await packageSite(pages, homeId);
  for (const [k, v] of Object.entries(pkg.files)) z.file(k, v);
  for (const [k, v] of Object.entries(pkg.binary)) z.file(k, v);
  z.file(".htaccess", "DirectoryIndex index.html\nOptions -Indexes\nErrorDocument 404 /404.html\n");
  z.file("README.txt", `PRECONFIGURED WEBCRAFT SITE\n\nThis package is ready for ${host ?? "standard static"} hosting. No build command or code setup is needed.\n\n1. Upload every file in this folder to your website root (usually public_html).\n2. Keep index.html, .htaccess, the assets folder and the page-*.html files together.\n3. Open your domain and confirm the home page, photos, videos and page links work.\n\nTo update the site later, download a fresh package and replace these files.\n`);
  const blob = await z.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "site"}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
