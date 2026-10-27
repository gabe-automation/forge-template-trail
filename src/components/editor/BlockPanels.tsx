import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { mediaUrl, type BlockType } from "@/lib/blocks";
import { snippetsFor, type SnippetKind } from "@/lib/snippets";
import type { NodeView } from "@/lib/model";

type Attrs = Record<string, string>;
const withAttr = (a: Attrs, k: string, v: string | null): Attrs => {
  const n = { ...a };
  if (v === null || v === "") delete n[k]; else n[k] = v;
  return n;
};

/* ------------------------------------------------------------------ media */

export function MediaPanel({ node, projectId, disabled, onAttrs }: { node: NodeView; projectId: string; disabled: boolean; onAttrs: (a: Attrs) => void }) {
  const isVideo = node.type === "video";
  const key = node.type === "hero" ? "data-cover" : isVideo ? "data-video" : "data-image";
  const cur = node.attrs[key] ?? "";
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  async function upload(file: File, attr: string) {
    const okType = attr === "data-video" ? /^video\//.test(file.type) : /^image\//.test(file.type);
    if (!okType) { toast.error(attr === "data-video" ? "Choose a video file (MP4 or WebM)." : "Choose an image file."); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Files must be under 50 MB."); return; }
    setBusy(attr);
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const name = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("site-media").upload(`${projectId}/${name}`, file, { contentType: file.type, upsert: false });
    setBusy(null);
    if (error) { toast.error("Upload failed — try again."); return; }
    onAttrs(withAttr(node.attrs, attr, `/media/${projectId}/${name}`));
    toast.success("Uploaded");
  }

  const preview = isVideo ? "" : mediaUrl(cur);
  const flag = (k: "autoplay" | "loop" | "muted", label: string) => (
    <label className="flex items-center justify-between text-xs">{label}
      <Switch checked={node.attrs[`data-${k}`] === "true"} disabled={disabled} onCheckedChange={(c) => onAttrs(withAttr(node.attrs, `data-${k}`, c ? "true" : null))} />
    </label>
  );

  return (
    <div className="space-y-2.5 border-t pt-4">
      <Label className="block">{isVideo ? "Video" : node.type === "hero" ? "Cover photo" : "Photo"}</Label>
      {preview && <img src={preview} alt="" className="h-24 w-full rounded-md border object-cover" />}
      <input ref={fileRef} type="file" hidden accept={isVideo ? "video/*" : "image/*"} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, key); e.target.value = ""; }} />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" disabled={disabled || !!busy} onClick={() => fileRef.current?.click()}>
          {busy === key ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} Upload {isVideo ? "video" : "photo"}
        </Button>
        {cur && <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onAttrs(withAttr(node.attrs, key, null))}>Remove</Button>}
      </div>
      <Input aria-label="Media link" disabled={disabled} placeholder={isVideo ? "…or paste a YouTube, Vimeo or .mp4 link" : "…or paste an image link (https://…)"}
        defaultValue={cur.startsWith("/media/") ? "" : cur} key={cur}
        onBlur={(e) => { const v = e.target.value.trim(); if (v !== cur && !(cur.startsWith("/media/") && !v)) onAttrs(withAttr(node.attrs, key, v || null)); }} />
      {isVideo && (
        <>
          <input ref={posterRef} type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, "data-poster"); e.target.value = ""; }} />
          <Button size="sm" variant="ghost" className="w-full justify-start" disabled={disabled || !!busy} onClick={() => posterRef.current?.click()}>
            {busy === "data-poster" ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {node.attrs["data-poster"] ? "Change" : "Add"} thumbnail picture
          </Button>
          {flag("autoplay", "Play automatically")}
          {flag("loop", "Repeat")}
          {flag("muted", "Start muted")}
        </>
      )}
      <p className="text-xs text-muted-foreground">Uploads show in the editor, preview, published site and every download.</p>
    </div>
  );
}

/* ------------------------------------------------------------ attributes */

const LINKY: BlockType[] = ["button", "navbar", "hero", "pricing", "login", "register"];
const MEDIA_KEYS = /^data-(image|cover|video|poster|autoplay|loop|muted)$/;
const FRIENDLY_KEYS = new Set(["title", "aria-label", "data-new-tab", "data-hide-mobile", "data-hide-desktop", "type", "name", "required", "autocomplete"]);

export function AttrsPanel({ node, disabled, onAttrs }: { node: NodeView; disabled: boolean; onAttrs: (a: Attrs) => void }) {
  const a = node.attrs;
  const set = (k: string, v: string | null) => onAttrs(withAttr(a, k, v));
  const [open, setOpen] = useState(false);
  const extra = Object.entries(a).filter(([k]) => !FRIENDLY_KEYS.has(k) && !MEDIA_KEYS.test(k));
  const [nk, setNk] = useState(""); const [nv, setNv] = useState("");

  const text = (k: string, label: string, hint: string) => (
    <label className="block space-y-1 text-xs">
      <span className="font-medium">{label}</span>
      <Input className="h-8 text-xs" disabled={disabled} placeholder={hint} defaultValue={a[k] ?? ""} key={a[k] ?? ""}
        onBlur={(e) => e.target.value.trim() !== (a[k] ?? "") && set(k, e.target.value.trim() || null)} />
    </label>
  );
  const toggle = (k: string, label: string, hint: string) => (
    <label className="flex items-start justify-between gap-3 text-xs">
      <span><span className="block font-medium">{label}</span><span className="text-muted-foreground">{hint}</span></span>
      <Switch checked={a[k] === "true" || (k === "required" && a[k] === "")} disabled={disabled} onCheckedChange={(c) => set(k, c ? "true" : null)} />
    </label>
  );

  return (
    <div className="space-y-3 border-t pt-4">
      <Label className="block">Behaviour & accessibility</Label>
      {text("title", "Hover tip", "Shown when someone points at it")}
      {text("aria-label", "Description for screen readers", "e.g. “Sign up for the newsletter”")}
      {LINKY.includes(node.type) && toggle("data-new-tab", "Open link in a new tab", "Keeps your site open behind it")}
      {node.type === "input" && (
        <>
          <label className="block space-y-1 text-xs">
            <span className="font-medium">What people type</span>
            <select disabled={disabled} value={a["type"] ?? "text"} onChange={(e) => set("type", e.target.value === "text" ? null : e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
              <option value="text">Any text</option><option value="email">Email address</option><option value="tel">Phone number</option>
              <option value="number">Number</option><option value="password">Password</option><option value="date">Date</option><option value="url">Website</option>
            </select>
          </label>
          {toggle("required", "Must be filled in", "The form won't send without it")}
          {text("name", "Field name", "Used when the form is sent, e.g. email")}
        </>
      )}
      {toggle("data-hide-mobile", "Hide on phones", "Only shows on tablets and computers")}
      {toggle("data-hide-desktop", "Hide on computers", "Only shows on phones and tablets")}

      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground">
        Advanced: custom attributes {extra.length ? `(${extra.length})` : ""} <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 rounded-md bg-muted/50 p-2">
          <p className="text-[11px] text-muted-foreground">For developers: extra settings added to this block's code, like <code>data-track="signup"</code>.</p>
          {extra.map(([k, v]) => (
            <div key={k} className="flex items-center gap-1 text-xs">
              <code className="min-w-0 flex-1 truncate">{k}="{v}"</code>
              <Button size="icon" variant="ghost" className="size-6" disabled={disabled} aria-label={`Remove ${k}`} onClick={() => set(k, null)}><X className="size-3" /></Button>
            </div>
          ))}
          <div className="flex gap-1">
            <Input className="h-7 text-xs" placeholder="name" value={nk} disabled={disabled} onChange={(e) => setNk(e.target.value)} />
            <Input className="h-7 text-xs" placeholder="value" value={nv} disabled={disabled} onChange={(e) => setNv(e.target.value)} />
            <Button size="icon" variant="secondary" className="size-7 shrink-0" disabled={disabled || !/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(nk) || /^on/i.test(nk)} aria-label="Add attribute"
              onClick={() => { set(nk, nv); setNk(""); setNv(""); }}><Plus className="size-3" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- snippets */

const KINDS: { k: SnippetKind; label: string; field: "html" | "css" | "script"; hint: string }[] = [
  { k: "html", label: "HTML", field: "html", hint: "Extra content added inside this block." },
  { k: "css", label: "CSS", field: "css", hint: "Styles for this block. “&” means this block." },
  { k: "js", label: "Script", field: "script", hint: "Runs on the live site. “el” is this block." },
];

export function SnippetsPanel({ node, disabled, onScript, onHtml, onCss }: { node: NodeView; disabled: boolean; onScript: (v: string) => void; onHtml: (v: string) => void; onCss: (v: string) => void }) {
  const [tab, setTab] = useState<SnippetKind>("css");
  const kind = KINDS.find((x) => x.k === tab)!;
  const value = node[kind.field];
  const save = (v: string) => (kind.field === "html" ? onHtml : kind.field === "css" ? onCss : onScript)(v);
  const list = snippetsFor(tab, node.type);
  return (
    <div className="space-y-2.5 border-t pt-4">
      <Label className="block">Code snippets</Label>
      <div className="flex rounded-md border p-0.5 text-xs">
        {KINDS.map((x) => (
          <button key={x.k} onClick={() => setTab(x.k)} className={`flex-1 rounded px-2 py-1 ${tab === x.k ? "bg-secondary font-medium" : "text-muted-foreground"}`}>
            {x.label}{node[x.field].trim() ? " •" : ""}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{kind.hint} Tap a snippet to add it.</p>
      <div className="flex flex-wrap gap-1">
        {list.map((s) => {
          const has = value.includes(s.code);
          return (
            <button key={s.name} disabled={disabled} title={s.hint}
              onClick={() => save(has ? value.replace(s.code, "").replace(/\n{3,}/g, "\n\n").trim() : (value.trim() ? value.trim() + "\n" : "") + s.code)}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition ${has ? "border-primary bg-primary/10 text-foreground" : "hover:border-primary/60"}`}>
              {has ? "✓ " : "+ "}{s.name}
            </button>
          );
        })}
      </div>
      <textarea key={`${node.id}-${tab}-${value.length}`} defaultValue={value} disabled={disabled} spellCheck={false} rows={5}
        aria-label={`${kind.label} for this block`} placeholder={tab === "css" ? "& { … }" : tab === "js" ? "el.addEventListener(…)" : "<p>…</p>"}
        onBlur={(e) => e.target.value !== value && save(e.target.value)}
        className="w-full resize-y rounded-md border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </div>
  );
}
