import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Download, Lock, Monitor, Smartphone, Tablet, Trash2, ArrowUpToLine, Plus, FileText, PenTool, MessagesSquare, MoreHorizontal, MessageSquarePlus, Crosshair, Layers,
  Eye, Globe, LayoutTemplate, HelpCircle, Pin, Unlock, UserMinus, PanelLeft, Server, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Canvas } from "@/components/editor/Canvas";
import { Whiteboard } from "@/components/editor/Whiteboard";
import { ChatPage } from "@/components/editor/ChatPage";
import { ActivityPreview } from "@/components/editor/ActivityPreview";
import { CollabTextarea } from "@/components/editor/CollabTextarea";
import { BLOCKS, BREAKPOINTS, DEFAULT_THEME, safeHref, type BlockStyle, type BlockType, type Breakpoint, type Theme } from "@/lib/blocks";
import { generateExport, toView, type Geo, type NodeView } from "@/lib/model";
import { keyBetween, val } from "@/lib/crdt";
import { useRoom, type Activity, type Me } from "@/lib/useRoom";
import { useSharedText, type SharedText } from "@/lib/sharedText";
import { useChat } from "@/lib/useChat";
import { useDragPrefs } from "@/lib/dragPrefs";
import { DragSettings } from "@/components/editor/DragSettings";
import { IntegrationFields } from "@/components/editor/IntegrationFields";
import { FreeformShape } from "@/components/editor/FreeformShape";
import { COMPOUND_TYPES, geoProps, groupingGeometry, splitRenderedBlock } from "@/lib/editorStructure";
import { nodeBlocked } from "@/lib/nodeAccess";
import type { NodeLock } from "@/lib/useRoom";
import { SITE_TEMPLATES, blocksToViews, templatePageCount, templateViews, type SiteTemplate, type TplBlock } from "@/lib/siteTemplates";
import { SitePreview } from "@/components/SitePreview";
import { openSandboxed, downloadSiteZip } from "@/lib/sandbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SHAPES, ANIMS, styleObj, type ShapeKey, type AnimKey, isContainer, isFlow, absolutizeMedia, type BoxOpts } from "@/lib/blocks";
import { presetFor } from "@/lib/snippets";
import { MediaPanel, AttrsPanel, SnippetsPanel } from "@/components/editor/BlockPanels";
import { DeployDialog } from "@/components/editor/DeployDialog";
import { Rocket, Upload } from "lucide-react";
import { ContextMenuOverlay, ZoomHud, LayersTree, ZOOM_MIN, ZOOM_MAX, type MenuItem } from "@/components/editor/CanvasChrome";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useDeviceAccess } from "@/hooks/use-device-access";

export const Route = createFileRoute("/_authenticated/p/$projectId")({
  head: () => ({
    meta: [
      { title: "Editor — WebCraft" },
      { name: "description", content: "Edit your website live with your team in WebCraft." },
      { property: "og:title", content: "Editor — WebCraft" },
      { property: "og:description", content: "Edit your website live with your team in WebCraft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditorPage,
});

type Page = { id: string; kind: string; title: string; sort: string };
const PAGE_ICON = { canvas: FileText, whiteboard: PenTool, chat: MessagesSquare } as Record<string, typeof FileText>;

function EditorPage() {
  const { projectId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: info } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const [p, m, prof] = await Promise.all([
        supabase.from("projects").select("id, name, theme, owner_id").eq("id", projectId).maybeSingle(),
        supabase.from("project_members").select("user_id, role").eq("project_id", projectId),
        supabase.from("profiles").select("id, display_name, color"),
      ]);
      return { project: p.data, members: m.data ?? [], profiles: prof.data ?? [] };
    },
  });

  const myProfile = info?.profiles.find((x) => x.id === user.id);
  const me = useMemo<Me | null>(
    () => (myProfile ? { id: user.id, name: myProfile.display_name, color: myProfile.color } : null),
    [user.id, myProfile],
  );
  const myRole = info?.members.find((m) => m.user_id === user.id)?.role;
  const { isMobile, readOnly } = useDeviceAccess(myRole ?? "unknown");
  const room = useRoom(projectId, me, readOnly);
  const shared = useSharedText(projectId, !!myRole && !readOnly);
  const members = useMemo(
    () => (info?.members ?? []).map((m) => {
      const pr = info?.profiles.find((x) => x.id === m.user_id);
      return { id: m.user_id, name: pr?.display_name ?? "Member", color: pr?.color ?? "#78716c" };
    }),
    [info],
  );
  const isOwner = myRole === "owner";
  const [prefs, setPrefs] = useDragPrefs(projectId);
  const canOverride = (l: NodeLock) => l.locked_by === user.id || isOwner || l.allowed.includes(user.id);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";

  // ---------- pages ----------
  const { data: pages = [], isFetched: pagesFetched } = useQuery({
    queryKey: ["pages", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("pages").select("id, kind, title, sort").eq("project_id", projectId).order("sort").order("created_at");
      return (data ?? []) as Page[];
    },
  });
  useEffect(() => {
    const ch = supabase.channel(`pages:${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pages", filter: `project_id=eq.${projectId}` }, () => qc.invalidateQueries({ queryKey: ["pages", projectId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [projectId, qc]);
  const seeded = useRef(false);
  useEffect(() => {
    if (!pagesFetched || pages.length || readOnly || !myRole || seeded.current) return;
    seeded.current = true;
    supabase.from("pages").insert({ project_id: projectId, kind: "canvas", title: "Home", sort: "m" }).then(() => qc.invalidateQueries({ queryKey: ["pages", projectId] }));
  }, [pagesFetched, pages.length, readOnly, myRole, projectId, qc]);
  const [pageId, setPageId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const page = chatOpen ? { id: "team-chat", kind: "chat", title: "Team chat", sort: "" } : pages.find((x) => x.id === pageId) ?? pages[0] ?? null;
  const firstCanvas = pages.find((x) => x.kind === "canvas")?.id ?? null;

  async function addPage(kind: "canvas" | "whiteboard" | "chat") {
    if (readOnly) return;
    if (kind === "chat") { setChatOpen(true); return; }
    const last = pages[pages.length - 1]?.sort ?? null;
    const title = kind === "canvas" ? `Page ${pages.filter((x) => x.kind === "canvas").length + 1}` : kind === "whiteboard" ? "Whiteboard" : "Team chat";
    const { data, error } = await supabase.from("pages").insert({ project_id: projectId, kind, title, sort: keyBetween(last, null) }).select("id").single();
    if (error) { toast.error("Couldn't add page"); return; }
    await qc.invalidateQueries({ queryKey: ["pages", projectId] });
    setPageId(data.id);
    setChatOpen(false);
  }
  async function renamePage(pg: Page) {
    if (readOnly) return;
    const t = window.prompt("Page name", pg.title)?.trim();
    if (!t || t === pg.title) return;
    await supabase.from("pages").update({ title: t }).eq("id", pg.id);
    qc.invalidateQueries({ queryKey: ["pages", projectId] });
  }
  async function deletePage(pg: Page) {
    if (readOnly) return;
    if (pages.length <= 1 || !window.confirm(`Delete “${pg.title}”?`)) return;
    await supabase.from("pages").delete().eq("id", pg.id);
    if (page?.id === pg.id) setPageId(null);
    qc.invalidateQueries({ queryKey: ["pages", projectId] });
  }

  const chat = useChat(projectId, user.id, page?.kind === "chat", nameOf);
  const [attach, setAttach] = useState<Activity | null>(null);
  const [chatDraft, setChatDraft] = useState("");

  // ---------- canvas ----------
  const [bp, setBp] = useState<Breakpoint>("desktop");
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const selectionRef = useRef<string | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [hostOpen, setHostOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const heldRef = useRef<{ id: string; label: string } | null>(null);
  useEffect(() => {
    if (!readOnly) return;
    setPanelOpen(false);
    setTplOpen(false);
    setDeployOpen(false);
    setHostOpen(false);
    const held = heldRef.current;
    heldRef.current = null;
    if (held) void room.release(held.id, held.label);
    room.setStatus("watching");
  }, [readOnly]);
  useEffect(() => { if (isMobile) setBp("mobile"); }, [isMobile]);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  useEffect(() => {
    if (info?.project?.theme) setTheme({ ...DEFAULT_THEME, ...(info.project.theme as Partial<Theme>) });
  }, [info?.project?.theme]);

  const views = useMemo(() => {
    const out: NodeView[] = [];
    if (!page || page.kind !== "canvas") return out;
    for (const [id, p] of Object.entries(room.nodes)) {
      const v = toView(id, p);
      if (!v) continue;
      if ((v.page ?? firstCanvas) !== page.id) continue;
      for (const f of ["text", "sub", "label"] as const) if (shared.has(`${id}:${f}`)) v[f] = shared.get(`${id}:${f}`);
      out.push(v);
    }
    return out;
  }, [room.nodes, page, firstCanvas, shared.ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = views.find((v) => v.id === selected) ?? null;
  const labelOf = (v: NodeView) => `${BLOCKS[v.type].name}${v.text ? ` “${v.text.slice(0, 24)}”` : ""}`;

  useEffect(() => {
    const t = setInterval(() => {
      const h = heldRef.current;
      if (h) room.acquire(h.id, h.label, true);
    }, 5000);
    const onLeave = () => {
      const h = heldRef.current;
      if (h) room.release(h.id, h.label);
    };
    window.addEventListener("beforeunload", onLeave);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeunload", onLeave);
      onLeave();
    };
  }, [room.acquire, room.release]);

  async function select(id: string | null) {
    if (id === selected) return;
    const prev = heldRef.current;
    heldRef.current = null;
    if (prev) room.release(prev.id, prev.label);
    selectionRef.current = id;
    setSelected(id);
    setMultiSelected(id ? [id] : []);

    room.setStatus(id && !readOnly ? "editing" : "watching");
    if (!id || readOnly) return;
    const v = views.find((x) => x.id === id);
    if (!v) return;
    const label = labelOf(v);
    const ok = await room.acquire(id, label);
    if (selectionRef.current !== id) { if (ok) void room.release(id, label); return; }
    if (ok) heldRef.current = { id, label };
    else toast.info(`${label} is locked by ${room.leases[id]?.holder_name ?? "a teammate"}. You can still edit anything else.`);
  }
  useEffect(() => { select(null); }, [page?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addBlock(type: BlockType, at?: { x: number; y: number }, copy?: NodeView, parentId?: string) {
    if (!page || readOnly || (parentId && blockedNode(parentId))) return;
    const def = BLOCKS[type];
    const id = crypto.randomUUID();
    const parent = parentId ? views.find((v) => v.id === parentId) : undefined;
    const siblings = parent ? views.filter((v) => v.parent === parent.id) : views.filter((v) => !v.parent || !views.some((p) => p.id === v.parent));
    const maxOrder = views.reduce<string | null>((m, v) => (!m || v.order > m ? v.order : m), null);
    const pageW = BREAKPOINTS.desktop.width;
    const boundW = parent ? parent.geo.desktop.w : pageW;
    const boundH = parent ? parent.geo.desktop.h : Infinity;
    const flowW = parent && isFlow(parent.type) ? (parent.type === "flex" && (parent.box.dir ?? "row") === "row" ? Math.min(def.w, Math.max(120, Math.round((boundW - 32) / 3))) : boundW - 32) : boundW;
    const w = copy ? copy.geo.desktop.w : Math.min(def.w, flowW);
    const h = copy ? copy.geo.desktop.h : Math.min(def.h, boundH);
    const lowest = siblings.reduce((m, v) => Math.max(m, v.geo.desktop.y + v.geo.desktop.h), 0);
    const G = prefs.grid;
    const useCursor = at && bp === "desktop" && (parent ? true : prefs.drop === "cursor");
    const sg = (v: number) => (G ? Math.round(v / G) * G : v);
    const x = copy ? copy.geo.desktop.x + 24 : useCursor ? sg(Math.round(at.x - w / 2)) : prefs.drop === "stack" ? 0 : Math.round((boundW - w) / 2);
    const y = copy ? copy.geo.desktop.y + 24 : useCursor ? sg(Math.round(at.y - h / 2)) : sg(lowest + 32);
    const extra: Record<string, unknown> = {};
    if (copy) {
      extra["text"] = copy.text; extra["sub"] = copy.sub; extra["label"] = copy.label; extra["href"] = copy.href;
      extra["attrs"] = copy.attrs; extra["script"] = copy.script; extra["html"] = copy.html; extra["css"] = copy.css;
      for (const [k, v] of Object.entries(copy.box)) extra[`c.${k}`] = v;
      for (const [k, v] of Object.entries(copy.style)) extra[`s.${k}`] = v;
    } else {
      const pre = presetFor(type);
      if (pre.css) extra["css"] = pre.css;
      if (pre.script) extra["script"] = pre.script;
      if (pre.html) extra["html"] = pre.html;
    }
    const gx = Math.max(0, Math.min(boundW - w, x));
    const gy = Math.max(0, Math.min(Math.max(0, boundH - h), y));
    const geo: Record<string, unknown> = { "x@desktop": gx, "y@desktop": gy, "w@desktop": w, "h@desktop": h };
    if (parent) {
      // Children use container-relative coordinates on every breakpoint.
      for (const b of ["tablet", "mobile"] as const) {
        geo[`x@${b}`] = gx; geo[`y@${b}`] = gy; geo[`w@${b}`] = w; geo[`h@${b}`] = h;
      }
    }
    await room.op(
      id,
      {
        type, parent: parent?.id ?? null, page: page.id, order: keyBetween(maxOrder, null), deleted: false,
        ...geo, ...extra,
      },
      copy ? "duplicated" : "created",
      parent ? `${def.name} in ${BLOCKS[parent.type].name}` : def.name,
    );
    if (copy || parent) select(id);
  }

  const blockedNode = (id: string, geometry = true) => nodeBlocked(id, room.leases, room.locks, room.session, canOverride, geometry);
  function multiSelect(id: string) {
    setMultiSelected(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }
  async function splitBlock(n: NodeView) {
    if (readOnly || blockedNode(n.id)) return;
    const root = document.querySelector<HTMLElement>(`[data-node="${n.id}"]`);
    if (!root) return;
    const parts = splitRenderedBlock(n, root, scale);
    if (!parts.length) return;
    const result = await room.op(n.id, { type: "absolute", attrs: { ...n.attrs, "data-group": "true", "data-original-type": n.type }, html: "", text: "", sub: "", label: "" }, "split", labelOf(n));
    if (result !== "applied") return;
    for (const part of parts) {
      await room.op(part.id, { type: part.type, parent: part.parent, page: part.page, order: part.order, text: part.text, sub: "", label: "", href: part.href, attrs: part.attrs, html: part.html, css: part.css, ...geoProps(part.geo) }, "created", "Editable element");
    }
    setAssetsOpen(true);
  }
  async function groupNodes() {
    const nodes = views.filter(n => multiSelected.includes(n.id));
    if (nodes.length < 2 || readOnly || nodes.some(n => blockedNode(n.id)) || nodes.some(n => n.parent !== nodes[0]?.parent)) return;
    const { boxes, children } = groupingGeometry(nodes);
    const id = crypto.randomUUID();
    const result = await room.op(id, { type: "absolute", parent: nodes[0]?.parent ?? null, page: page?.id, order: nodes[0]?.order, attrs: { "data-group": "true" }, ...geoProps(boxes) }, "created", "Group");
    if (result !== "applied") return;
    for (const n of nodes) { const child = children[n.id]; if (child) await room.op(n.id, { parent: id, ...geoProps(child) }, "grouped", labelOf(n)); }
    void select(id);
  }
  async function ungroup(n: NodeView) {
    const kids = views.filter(v => v.parent === n.id);
    if (readOnly || blockedNode(n.id) || kids.some(v => blockedNode(v.id))) return;
    for (const child of kids) {
      const geo = Object.fromEntries((["desktop", "tablet", "mobile"] as const).map(bp => [bp, { ...child.geo[bp], x: child.geo[bp].x + n.geo[bp].x, y: child.geo[bp].y + n.geo[bp].y }])) as NodeView["geo"];
      await room.op(child.id, { parent: n.parent, ...geoProps(geo) }, "ungrouped", labelOf(child));
    }
    await room.op(n.id, { deleted: true }, "deleted", "Group");
    void select(null);
  }

  /** Delete a block and everything nested inside it. */
  async function removeNode(id: string) {
    if (readOnly) return;
    const byParent = new Map<string | null, string[]>();
    for (const v of views) {
      const arr = byParent.get(v.parent) ?? [];
      arr.push(v.id);
      byParent.set(v.parent, arr);
    }
    const queue = [id];
    const all: string[] = [];
    while (queue.length) {
      const cur = queue.pop();
      if (!cur) continue;
      all.push(cur);
      for (const k of byParent.get(cur) ?? []) queue.push(k);
    }
    if (all.some(n => blockedNode(n))) return;
    const label = labelOf(views.find((v) => v.id === id) ?? ({ type: "text", text: "" } as NodeView));
    await Promise.all(all.map((n) => room.op(n, { deleted: true }, "deleted", all.length > 1 ? `${label} (+${all.length - 1} inside)` : label)));
  }

  function commitGeo(id: string, g: Geo, kind: "moved" | "resized") {
    if (readOnly || blockedNode(id)) return;
    const v = views.find((x) => x.id === id);
    if (!v) return;
    room.op(id, { [`x@${bp}`]: g.x, [`y@${bp}`]: g.y, [`w@${bp}`]: g.w, [`h@${bp}`]: g.h }, kind, labelOf(v));
  }

  const selectedLock = sel ? room.locks[sel.id] : undefined;
  const selectedLease = sel ? room.leases[sel.id] : undefined;
  const selPin = selectedLock && !canOverride(selectedLock) ? selectedLock : null;
  const selLockedBy = selectedLease && selectedLease.holder_session !== room.session ? selectedLease.holder_name
    : selPin?.mode === "full" ? `${selPin.locked_by_name} (locked)` : undefined;

  // keyboard: nudge, duplicate, delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!sel || readOnly || selLockedBy || page?.kind !== "canvas" || t.tagName === "TEXTAREA" || t.tagName === "INPUT") return;
      if (selPin) return;
      const step = e.shiftKey ? prefs.nudge * 10 : prefs.nudge;
      const g = sel.geo[bp];
      const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (d[e.key]) { e.preventDefault(); commitGeo(sel.id, { ...g, x: g.x + d[e.key]![0], y: Math.max(0, g.y + d[e.key]![1]) }, "moved"); }
      else if ((e.key === "Delete" || e.key === "Backspace")) { void removeNode(sel.id); select(null); }
      else if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); addBlock(sel.type, undefined, sel); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** Change stacking order among siblings (later = on top). */
  function restack(id: string, dir: "front" | "back" | "up" | "down") {
    const n = views.find((v) => v.id === id);
    if (!n || readOnly || blockedNode(n.id)) return;
    const sibs = views.filter((v) => v.parent === n.parent && v.id !== id).sort((x, y) => (x.order < y.order ? -1 : 1));
    const all = views.filter((v) => v.parent === n.parent).sort((x, y) => (x.order < y.order ? -1 : 1));
    const cur = all.findIndex((v) => v.id === id);
    let idx = dir === "front" ? sibs.length : dir === "back" ? 0 : dir === "up" ? Math.min(sibs.length, cur + 1) : Math.max(0, cur - 1);
    if (idx < 0) idx = 0;
    const prev = sibs[idx - 1]?.order ?? null;
    const next = idx < sibs.length ? sibs[idx]!.order : null;
    room.op(id, { order: keyBetween(prev, next) }, "reordered", labelOf(n));
  }

  function paste() {
    const c = clipRef.current;
    if (!c || readOnly || page?.kind !== "canvas") return;
    void addBlock(c.type, undefined, c);
  }

  // Figma-style shortcuts: zoom, copy/paste, layer order.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (page?.kind !== "canvas" || t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); setZoom((z) => Math.min(ZOOM_MAX, z * 1.25)); }
      else if (mod && e.key === "-") { e.preventDefault(); setZoom((z) => Math.max(ZOOM_MIN, z / 1.25)); }
      else if ((mod && e.key === "0") || (e.shiftKey && e.code === "Digit1")) { e.preventDefault(); setZoom(1); }
      else if (mod && e.key === "c" && sel) { clipRef.current = sel; toast.success("Copied"); }
      else if (mod && e.key === "v") { e.preventDefault(); paste(); }
      else if (sel && !readOnly && !selLockedBy && (e.key === "]" || e.key === "[")) {
        e.preventDefault();
        restack(sel.id, e.key === "]" ? (mod ? "front" : "up") : (mod ? "back" : "down"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function menuItems(id: string | null): MenuItem[] {
    const n = id ? views.find((v) => v.id === id) : undefined;
    const locked = !!n && blockedNode(n.id);
    const off = readOnly || locked;
    const canvasOnly: MenuItem[] = [
      { label: "Paste here", shortcut: "Ctrl+V", onClick: paste, disabled: readOnly || !clipRef.current },
      "sep",
      { label: "Zoom in", shortcut: "Ctrl +", onClick: () => setZoom((z) => Math.min(ZOOM_MAX, z * 1.25)) },
      { label: "Zoom out", shortcut: "Ctrl −", onClick: () => setZoom((z) => Math.max(ZOOM_MIN, z / 1.25)) },
      { label: "Zoom to fit", shortcut: "Shift+1", onClick: () => setZoom(1) },
    ];
    if (!n) return canvasOnly;
    return [
      { label: "Copy", shortcut: "Ctrl+C", onClick: () => { clipRef.current = n; toast.success("Copied"); } },
      { label: "Paste", shortcut: "Ctrl+V", onClick: paste, disabled: readOnly || !clipRef.current },
      { label: "Duplicate", shortcut: "Ctrl+D", onClick: () => void addBlock(n.type, undefined, n), disabled: off },
      "sep",
      { label: "Bring to front", shortcut: "Ctrl+]", onClick: () => restack(n.id, "front"), disabled: off },
      { label: "Bring forward", shortcut: "]", onClick: () => restack(n.id, "up"), disabled: off },
      { label: "Send backward", shortcut: "[", onClick: () => restack(n.id, "down"), disabled: off },
      { label: "Send to back", shortcut: "Ctrl+[", onClick: () => restack(n.id, "back"), disabled: off },
      "sep",
      { label: "Select for grouping", onClick: () => multiSelect(n.id), disabled: off },
      { label: "Group selection", onClick: () => void groupNodes(), disabled: off || multiSelected.length < 2 },
      { label: "Ungroup", onClick: () => void ungroup(n), disabled: off || n.attrs["data-group"] !== "true" },
      { label: "Split into editable layers", onClick: () => void splitBlock(n), disabled: off || !COMPOUND_TYPES.includes(n.type) },
      "sep",
      { label: "Select parent", onClick: () => n.parent && select(n.parent), disabled: !n.parent },
      { label: "Edit properties", onClick: () => { select(n.id); setPanelOpen(true); } },
      "sep",
      { label: "Delete", shortcut: "Del", onClick: () => { void removeNode(n.id); select(null); }, disabled: off, danger: true },
    ];
  }

  async function saveTheme(t: Theme) {
    if (readOnly) return;
    setTheme(t);
    const { error } = await supabase.from("projects").update({ theme: t }).eq("id", projectId);
    if (error) toast.error("Couldn't save theme");
  }

  const exp = useMemo(() => generateExport(views, theme, info?.project?.name ?? "Site"), [views, theme, info?.project?.name]);
  const sitePages = useMemo(() => Object.fromEntries(pages.filter((p) => p.kind === "canvas").map((pg) => {
    const nodes = Object.entries(room.nodes).flatMap(([id, props]) => {
      const v = toView(id, props);
      if (!v || (v.page ?? firstCanvas) !== pg.id) return [];
      for (const f of ["text", "sub", "label"] as const) if (shared.has(`${id}:${f}`)) v[f] = shared.get(`${id}:${f}`);
      return [v];
    });
    const out = generateExport(nodes, theme, pg.title);
    return [pg.id, out.html.replace('<link rel="stylesheet" href="styles.css">', `<style>${out.css}</style>`).replace('<script src="script.js"></script>', `<script>${out.js}</script>`)] as const;
  })), [pages, room.nodes, shared.ver, firstCanvas, theme]);
  const singleHtml = () => exp.html
    .replace('<link rel="stylesheet" href="styles.css">', () => `<style>${exp.css}</style>`)
    .replace('<script src="script.js"></script>', () => `<script>${exp.js}</script>`);
  const { data: published } = useQuery({
    queryKey: ["published", projectId],
    queryFn: async () => (await supabase.from("published_sites").select("updated_at").eq("project_id", projectId).maybeSingle()).data,
  });
  const siteUrl = typeof window !== "undefined" ? `${window.location.origin}/site/${projectId}` : "";
  function previewSite() {
    if (page?.kind !== "canvas") { toast.info("Open a design page to preview it."); return; }
    const data = JSON.stringify(Object.fromEntries(Object.entries(sitePages).map(([k, v]) => [k, absolutizeMedia(v, window.location.origin)]))).replace(/</g, "\\u003c");
    const handler = `<script>var pages=${data};function navigatePage(e){var a=e.target.closest('a[href^="?page="]');if(!a)return;var id=a.getAttribute('href').slice(6);if(pages[id]){e.preventDefault();document.open();document.write(pages[id]);document.close();document.addEventListener('click',navigatePage)}}document.addEventListener('click',navigatePage)</script>`;
    const html = absolutizeMedia(singleHtml().replace('</body>', `${handler}</body>`), window.location.origin);
    if (!openSandboxed(html, info?.project?.name ?? "Preview")) toast.error("Allow pop-ups to preview");
  }
  async function publishSite() {
    if (readOnly) return;
    if (page?.kind !== "canvas") { toast.info("Open the design page you want to publish."); return; }
    if (!views.length) { toast.info("This page is empty — add some blocks first."); return; }
    // Absolute media URLs so photos load no matter where the site is opened from.
    const origin = window.location.origin;
    const html = absolutizeMedia(singleHtml(), origin);
    const pagesHtml = Object.fromEntries(Object.entries(sitePages).map(([k, v]) => [k, absolutizeMedia(v, origin)]));
    const { error } = await supabase.from("published_sites").upsert({ project_id: projectId, title: info?.project?.name ?? "", html, pages_html: pagesHtml as never, published_by: user.id, updated_at: new Date().toISOString() });
    if (error) { toast.error("Couldn't publish"); return; }
    qc.invalidateQueries({ queryKey: ["published", projectId] });
    toast.success("Site published", { action: { label: "Open", onClick: () => window.open(siteUrl, "_blank") } });
  }
  async function unpublish() {
    if (readOnly) return;
    await supabase.from("published_sites").delete().eq("project_id", projectId);
    qc.invalidateQueries({ queryKey: ["published", projectId] });
    toast.success("Site unpublished");
  }
  async function applyTemplate(t: SiteTemplate) {
    if (!page || page.kind !== "canvas" || readOnly) return;
    if (views.length && !window.confirm(`Add the “${t.name}” home page below what's already on this page? Its other pages are always added as new pages.`)) return;
    const pageW = BREAKPOINTS.desktop.width;
    const failed = { v: false };
    let lastSort = pages[pages.length - 1]?.sort ?? null;

    /** Apply one template page's blocks onto a project page. */
    const applyBlocks = async (tplBlocks: TplBlock[], pageTarget: string, baseY: number) => {
      const viewsFor = blocksToViews(t.id, tplBlocks);
      let order: string | null = null;
      const jobs = tplBlocks.flatMap((b, i) => {
        const def = BLOCKS[b.type];
        const pid = crypto.randomUUID();
        const w = Math.min(b.w ?? def.w, pageW), h = b.h ?? def.h;
        const geometry = viewsFor.find((n) => n.id === `${t.id}-${i}-0000-0000-000000000000`)?.geo;
        order = keyBetween(order, null);
        const kidJobs = (b.kids ?? []).map((k, j) => {
          const kd = BLOCKS[k.type];
          order = keyBetween(order, null);
          const kg = { x: k.x ?? 0, y: k.y, w: k.w ?? kd.w, h: k.h ?? kd.h };
          return room.op(crypto.randomUUID(), {
            type: k.type, parent: pid, page: pageTarget, order, deleted: false,
            ...Object.fromEntries((["desktop", "tablet", "mobile"] as const).flatMap((bp2) => Object.entries(viewsFor.find(n => n.id === `${t.id}-${i}-${j}-k000-0000-000000000000`)?.geo[bp2] ?? kg).map(([kk, v]) => [`${kk}@${bp2}`, v]))),
            text: k.text ?? kd.text, sub: k.sub ?? kd.sub, label: k.label ?? kd.label, href: k.href ?? "", attrs: k.attrs ?? {},
            html: k.html ?? "", css: k.css ?? "", script: k.script ?? "",
            ...Object.fromEntries(Object.entries(k.style ?? {}).map(([kk, v]) => [`s.${kk}`, v])),
          }, "created", `${kd.name} (${t.name} template)`);
        });
        return [room.op(pid, {
          type: b.type, parent: null, page: pageTarget, order, deleted: false,
          "x@desktop": b.x ?? Math.round((pageW - w) / 2), "y@desktop": baseY + b.y, "w@desktop": w, "h@desktop": h,
          ...Object.fromEntries((["tablet", "mobile"] as const).flatMap((bp) => geometry ? Object.entries(geometry[bp]).map(([k, v]) => [`${k}@${bp}`, k === "y" ? baseY + v : v]) : [])),
          text: b.text ?? def.text, sub: b.sub ?? def.sub, label: b.label ?? def.label, href: b.href ?? "", attrs: b.attrs ?? {},
          ...Object.fromEntries(Object.entries(b.style ?? {}).map(([k, v]) => [`s.${k}`, v])),
          ...Object.fromEntries(Object.entries(b.box ?? {}).map(([k, v]) => [`c.${k}`, v])),
          html: b.html ?? "", css: b.css ?? "", script: b.script ?? "",
        }, "created", `${def.name} (${t.name} template)`), ...kidJobs];
      });
      const results = await Promise.all(jobs);
      if (results.some((r) => r !== "applied" && r !== "duplicate")) failed.v = true;
    };

    const base = views.reduce((m, v) => Math.max(m, v.geo.desktop.y + v.geo.desktop.h), 0) + (views.length ? 48 : 0);
    // A template is a real website: its extra pages are created as proper project pages.
    const created: { id: string; title: string; blocks: TplBlock[] }[] = [];
    for (const tp of t.pages ?? []) {
      const sort = keyBetween(lastSort, null);
      lastSort = sort;
      const { data: np, error } = await supabase.from("pages").insert({ project_id: projectId, kind: "canvas", title: tp.title, sort }).select("id").single();
      if (error || !np) { failed.v = true; continue; }
      created.push({ id: np.id, title: tp.title, blocks: tp.blocks });
    }
    // Every page's menu links to every page, so visitors can move around the site.
    const menu = [{ id: page.id, title: "Home" }, ...created];
    const withMenu = (blocks: TplBlock[]) => created.length ? blocks.map((b) => b.type === "navbar"
      ? { ...b, sub: menu.map((m) => m.title).join(" · "), attrs: { ...(b.attrs ?? {}), "data-links": menu.map((m) => `?page=${m.id}`).join("|") } }
      : b) : blocks;
    await applyBlocks(withMenu(t.blocks), page.id, base);
    if (!views.length) await saveTheme(t.theme);
    for (const c of created) await applyBlocks(withMenu(c.blocks), c.id, 0);
    await qc.invalidateQueries({ queryKey: ["pages", projectId] });
    const pageCount = templatePageCount(t);
    if (failed.v) toast.error("Some template blocks could not be added");
    else toast.success(pageCount > 1 ? `${t.name} added — ${pageCount} pages created` : `${t.name} template added`);
  }
  // Apply a template picked on the projects screen, once the first page is ready.
  useEffect(() => {
    if (!room.loaded || !page || page.kind !== "canvas" || readOnly) return;
    const key = `webcraft:tpl:${projectId}`;
    const id = sessionStorage.getItem(key);
    if (!id) return;
    sessionStorage.removeItem(key);
    const t = SITE_TEMPLATES.find((x) => x.id === id);
    if (t && views.length === 0) void applyTemplate(t);
  }, [room.loaded, page?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  function openChat(prefill?: string) {
    if (prefill) setChatDraft(prefill);
    setChatOpen(true);
  }
  const wbItems = useMemo(() => Object.entries(room.nodes).flatMap(([id, pr]) => {
    if (val<string>(pr, "kind", "") !== "wb" || val(pr, "deleted", false)) return [];
    const text = (shared.has(`${id}:text`) ? shared.get(`${id}:text`) : val<string>(pr, "text", "")).trim();
    return text ? [{ id, text }] : [];
  }), [room.nodes, shared.ver]); // eslint-disable-line react-hooks/exhaustive-deps

  const areaRef = useRef<HTMLDivElement>(null);
  const [areaW, setAreaW] = useState(1000);
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAreaW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [page?.kind]);
  const fit = Math.max(0.1, Math.min(1, (areaW - (areaW < 640 ? 24 : 64)) / BREAKPOINTS[bp].width));
  const [zoom, setZoom] = useState(1);
  const scale = fit * zoom;
  const zoomRef = useRef({ zoom, fit });
  zoomRef.current = { zoom, fit };
  const [frameW, setFrameW] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string | null } | null>(null);
  const clipRef = useRef<NodeView | null>(null);
  const spaceRef = useRef(false);

  // Ctrl/Cmd + wheel or trackpad pinch zooms around the cursor; plain wheel scrolls.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const { zoom: z, fit: f } = zoomRef.current;
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * Math.exp(-dy * 0.0025)));
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const k = next / z;
      const sx = (el.scrollLeft + px) * k - px, sy = (el.scrollTop + py) * k - py;
      setZoom(next);
      requestAnimationFrame(() => { el.scrollLeft = sx; el.scrollTop = sy; });
      void f;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [page?.kind]);

  // Space held = hand tool (drag to pan), like Figma.
  useEffect(() => {
    const typing = (t: EventTarget | null) => { const el = t as HTMLElement | null; return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable); };
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !typing(e.target)) { spaceRef.current = true; if (areaRef.current) areaRef.current.style.cursor = "grab"; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") { spaceRef.current = false; if (areaRef.current) areaRef.current.style.cursor = ""; } };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  function panStart(e: React.PointerEvent<HTMLElement>) {
    if (!(spaceRef.current || e.button === 1)) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    const sx = e.clientX, sy = e.clientY, l = el.scrollLeft, t = el.scrollTop;
    el.style.cursor = "grabbing";
    const mv = (ev: PointerEvent) => { el.scrollLeft = l - (ev.clientX - sx); el.scrollTop = t - (ev.clientY - sy); };
    const upFn = () => { el.style.cursor = spaceRef.current ? "grab" : ""; window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", upFn); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", upFn);
  }

  /** Drag the frame edge to resize the page width; crossing 1024 / 640 switches layouts live. */
  function frameResize(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, w0 = BREAKPOINTS[bp].width, sc = scale;
    const mv = (ev: PointerEvent) => {
      const w = Math.round(Math.max(320, Math.min(1920, w0 + ((ev.clientX - sx) * 2) / sc)));
      setFrameW(w);
      setBp(w > 1024 ? "desktop" : w > 640 ? "tablet" : "mobile");
    };
    const upFn = () => { setFrameW(null); window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", upFn); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", upFn);
  }

  function jumpTo(a: Activity) {
    if (!a.node_id) return;
    const pr = room.nodes[a.node_id];
    if (!pr) { toast.info("That item no longer exists."); return; }
    const target = val<string | null>(pr, "page", null) ?? firstCanvas;
    if (target) { setPageId(target); setChatOpen(false); }
    if (val<string>(pr, "kind", "") !== "wb") setTimeout(() => select(a.node_id), 50);
  }

  if (info && !info.project) {
    return (
      <div className="grid min-h-screen place-items-center text-center">
        <div>
          <h1 className="text-3xl">Project not found</h1>
          <p className="mt-2 text-muted-foreground">It may have been deleted, or you're not a member.</p>
          <Button asChild className="mt-6"><Link to="/projects">Back to projects</Link></Button>
        </div>
      </div>
    );
  }

  const onPage = (s: string) => room.peers.filter((p) => p.session !== room.session && (room.cursors[p.session]?.page ?? null) === s);

  return (
    <div className={`editor-workspace ${readOnly ? "editor-read-only" : ""} flex h-dvh flex-col overflow-hidden bg-background`}>
      <header className="editor-header grid h-11 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 border-b bg-card px-2 [&_button]:h-8">
        <Button variant="ghost" size="icon" asChild><Link to="/projects" aria-label="Back to projects"><ArrowLeft /></Link></Button>
        <span className="min-w-0 truncate font-display text-sm font-semibold xl:max-w-40">{info?.project?.name ?? "…"}</span>
        <Button size="sm" variant={chatOpen ? "secondary" : "outline"} onClick={() => openChat()} className="relative" aria-label="Open team chat">
          <MessagesSquare className="size-4" /> <span className="hidden sm:inline">Chat</span>
          {chat.unread > 0 && !chatOpen && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{chat.unread}</span>}
        </Button>
        <div className="editor-tools col-span-3 flex min-w-0 items-center gap-1 overflow-x-auto border-b bg-card px-2 py-1.5 [&>*]:shrink-0">
        <Button size="icon" variant={assetsOpen ? "secondary" : "ghost"} className="lg:hidden" aria-label="Pages, layers and assets" title="Pages, layers and assets" onClick={() => { setAssetsOpen(v => !v); setPanelOpen(false); }}><Layers className="size-4" /></Button>
        {readOnly && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground" title={isMobile ? "Mobile is read-only for everyone" : undefined}>
            View only
          </span>
        )}
        {page?.kind === "canvas" ? (
          <div className="mx-auto flex rounded-lg border bg-background p-0.5">
            {(["desktop", "tablet", "mobile"] as Breakpoint[]).map((b) => {
              const Icon = b === "desktop" ? Monitor : b === "tablet" ? Tablet : Smartphone;
              return (
                <Button key={b} size="icon" variant={bp === b ? "secondary" : "ghost"} onClick={() => setBp(b)} aria-label={`${BREAKPOINTS[b].label} page view`} aria-pressed={bp === b} title={`${BREAKPOINTS[b].label} page view`} className="size-8">
                  <Icon className="size-4" />
                </Button>
              );
            })}
          </div>
        ) : <span className="mx-auto text-sm text-muted-foreground">{page?.title}</span>}
        <div className="flex items-center gap-1">
          <Button size="sm" disabled={readOnly && !pages.some((x) => x.kind === "whiteboard")} variant={page?.kind === "whiteboard" ? "secondary" : "ghost"} onClick={() => { const w = pages.find((x) => x.kind === "whiteboard"); if (w) { setPageId(w.id); setChatOpen(false); } else addPage("whiteboard"); }}><PenTool className="size-4" /> <span className="hidden xl:inline">Whiteboard</span></Button>
        </div>
        {page?.kind === "canvas" && !readOnly && (
          <Button size="sm" variant="outline" onClick={() => setTplOpen(true)}><LayoutTemplate className="size-4" /> <span className="hidden xl:inline">Templates</span></Button>
        )}
        {page?.kind !== "chat" && (
          <Button size="sm" variant={panelOpen ? "secondary" : "outline"} className="xl:hidden" onClick={() => { setPanelOpen((o) => !o); setAssetsOpen(false); }} aria-label="Toggle properties panel" title="Properties"><PanelLeft className="size-4" /></Button>
        )}
        {page && page.kind !== "chat" && !readOnly && <DragSettings prefs={prefs} onChange={setPrefs} />}
        <Button size="sm" variant="outline" disabled={page?.kind !== "canvas"} onClick={previewSite} title="Preview website"><Eye className="size-4" /> <span className="hidden xl:inline">Preview</span></Button>
        {!readOnly && <Popover>
          <PopoverTrigger asChild><Button size="sm"><Globe className="size-4" /> <span className="hidden xl:inline">Publish</span></Button></PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3 text-sm">
            <p className="font-medium">Publish your website</p>
            {published ? (
              <>
                <p className="text-muted-foreground">Live since {new Date(published.updated_at).toLocaleString()}.</p>
                <a href={siteUrl} target="_blank" rel="noreferrer" className="block truncate text-primary underline">{siteUrl}</a>
                <div className="flex gap-2">
                  <Button size="sm" onClick={publishSite}>Update site</Button>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(siteUrl); toast.success("Link copied"); }}>Copy link</Button>
                  <Button size="sm" variant="ghost" onClick={unpublish}>Unpublish</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">Anyone with the link can see this page and linked project pages.</p>
                <Button size="sm" onClick={publishSite}>Publish now</Button>
              </>
            )}
            <div className="border-t pt-3">
              <p className="mb-2 text-xs text-muted-foreground">Or put it on your own free hosting account:</p>
              <Button size="sm" className="mb-2 w-full" onClick={() => setDeployOpen(true)}><Rocket className="size-4" /> One-click deploy · Netlify or Vercel</Button>
              <Button size="sm" variant="outline" className="w-full" onClick={() => setHostOpen(true)}><Server className="size-4" /> Hostinger, GoDaddy & others (ZIP)</Button>
            </div>
          </PopoverContent>
        </Popover>}

        <ThemeToggle />
        <div className="hidden -space-x-2 sm:flex">
          {room.peers.map((p) => (
            <span key={p.session} title={`${p.name}${p.session === room.session ? " (you)" : ""} · ${p.status}`}
              className="relative grid size-8 place-items-center rounded-full border-2 border-card text-[11px] font-semibold text-primary-foreground"
              style={{ background: p.color }}>
              {initials(p.name)}
              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card ${p.status === "editing" ? "bg-success" : p.status === "idle" ? "bg-muted-foreground" : "bg-warning"}`} />
            </span>
          ))}
        </div>
        </div>
      </header>

      <div className="mt-11 flex min-h-0 flex-1">
        {(assetsOpen || panelOpen) && <div className="fixed inset-x-0 bottom-0 top-[5.5rem] z-30 bg-background/60 xl:hidden" onClick={() => { setAssetsOpen(false); setPanelOpen(false); }} />}
        {/* Settings panel (left) */}
        {page?.kind !== "chat" && (
        <aside aria-label="Properties" className={`${panelOpen ? "fixed bottom-0 left-0 top-[5.5rem] z-40 flex shadow-lift" : "hidden"} order-first w-[min(20rem,92vw)] shrink-0 flex-col border-r bg-card xl:static xl:flex xl:w-64 xl:shadow-none`}>
          <div className="flex items-center justify-end px-2 pt-2 xl:hidden"><Button size="icon" variant="ghost" className="size-7" onClick={() => setPanelOpen(false)} aria-label="Close panel"><X className="size-4" /></Button></div>
          <Tabs defaultValue="inspect" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="m-2 grid grid-cols-4">
              <TabsTrigger value="inspect">Edit</TabsTrigger>

              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>

            <TabsContent value="inspect" className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              {page?.kind === "whiteboard" ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <h2 className="text-xl text-foreground">Whiteboard</h2>
                  <p>Everyone on this page sees your notes, shapes and drawings live. Selecting something locks it for you until you click away.</p>
                  <p>Double-click a sticky, shape or text to write — several people can type in the same note at once.</p>
                  <p>Tick the circle on any task to mark it <strong className="text-foreground">Done</strong>; click a task's status to move it along. Undo and redo with Ctrl+Z / Ctrl+Y.</p>
                  <p>Select an item and use the pin or lock buttons to stop others moving or changing it.</p>
                  <p>Use <strong className="text-foreground">Plan</strong> for sprint board, user flow, API design, bug triage and retro templates. Vote on stickies with the thumbs-up.</p>
                  <p>Shortcuts: V select, H pan, K task, S sticky, R process, D decision, O start/end, A connector, C code, I API, T text, F frame, P pen. Ctrl + scroll zooms.</p>
                </div>
              ) : sel ? (
                <>
                <Inspector
                  key={sel.id}
                  node={sel}
                  onSplit={() => void splitBlock(sel)}
                  bp={bp}
                  shared={shared}
                  lockedBy={selLockedBy}
                  readOnly={readOnly}
                   onEdit={(f, v) => room.op(sel.id, { [f]: v }, "edited", labelOf(sel))}
                    onLink={(v) => { if (v && !safeHref(v)) { toast.error("Use a valid website, payment, email, or project page link"); return; } room.op(sel.id, { href: v }, "linked", labelOf(sel)); }}
                    pages={pages.filter((p) => p.kind === "canvas")}
                  onStyle={(k, v) => room.op(sel.id, { [`s.${k}`]: v ?? null }, "styled", labelOf(sel))}
                  onAttrs={(a) => room.op(sel.id, { attrs: a }, "set attributes on", labelOf(sel))}
                  onScript={(js) => room.op(sel.id, { script: js }, "edited logic of", labelOf(sel))}
                  onHtml={(v) => room.op(sel.id, { html: v }, "edited HTML of", labelOf(sel))}
                  onCss={(v) => room.op(sel.id, { css: v }, "edited CSS of", labelOf(sel))}
                  projectId={projectId}
                  onBox={(k, v) => room.op(sel.id, { [`c.${k}`]: v ?? null }, "changed layout of", labelOf(sel))}
                  onGeo={(g) => commitGeo(sel.id, g, "resized")}
                  onFront={() => {
                    const max = views.reduce<string | null>((m, v) => (!m || v.order > m ? v.order : m), null);
                    room.op(sel.id, { order: keyBetween(max, null) }, "reordered", labelOf(sel));
                  }}
                  onDuplicate={() => addBlock(sel.type, undefined, sel)}
                  onDelete={async () => {
                    await removeNode(sel.id);
                    select(null);
                  }}
                />
                </>
              ) : (
                <>
                  <ThemePanel theme={theme} readOnly={readOnly} onChange={saveTheme} />

                </>
              )}
            </TabsContent>

            <TabsContent value="activity" className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
              <p className="px-3 pb-2 text-xs text-muted-foreground">Click an entry to preview what changed.</p>
              <ul className="space-y-1" aria-live="polite">
                {room.activity.map((a) => {
                  const blocked = a.outcome.startsWith("blocked");
                  return (
                    <li key={a.id}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-secondary ${blocked ? "bg-destructive/10" : ""}`}>
                            <div className="flex items-baseline justify-between gap-2">
                              <span>
                                <strong className="font-medium">{a.actor_name}</strong>{" "}
                                <span className="text-muted-foreground">{blocked ? `tried to ${a.action.replace(/ed$/, "")}` : a.action}</span>{" "}
                                {a.target}
                              </span>
                              <time className="shrink-0 text-[10px] text-muted-foreground">
                                {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </time>
                            </div>
                            {blocked && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-destructive">
                                <Lock className="size-3" /> Blocked{a.detail?.holder ? ` — ${a.detail.holder} is editing it` : " — view-only access"}
                              </p>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="left" className="w-80">
                          <p className="mb-2 text-sm"><strong>{a.actor_name}</strong> {a.action} {a.target}</p>
                          <ActivityPreview a={a} props={a.node_id ? room.nodes[a.node_id] : undefined} theme={theme} />
                          <div className="mt-3 flex gap-2">
                            {a.node_id && <Button size="sm" variant="outline" onClick={() => jumpTo(a)}><Crosshair className="size-3.5" /> Show</Button>}
                            {!blocked && (
                              <Button size="sm" onClick={() => { setAttach(a); openChat(); }}><MessageSquarePlus className="size-3.5" /> Discuss</Button>
                            )}
                            {!blocked && (
                              <Button size="sm" variant="outline" onClick={() => {
                                setAttach(a);
                                const who = members.find((m) => m.name === a.actor_name);
                                openChat(who && who.id !== user.id ? `@${who.name.replace(/\s+/g, "_")} why did you make this change? ` : "Who made this change, and why? ");
                              }}><HelpCircle className="size-3.5" /> Ask why</Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </li>
                  );
                })}
                {room.activity.length === 0 && <p className="p-3 text-sm text-muted-foreground">No activity yet.</p>}
              </ul>
            </TabsContent>

            <TabsContent value="code" className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
                <CodeView exp={exp} pages={sitePages} homeId={firstCanvas} name={`${info?.project?.name ?? "site"}-${page?.title ?? ""}`} />
            </TabsContent>

            <TabsContent value="team" className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              <TeamPanel
                projectId={projectId}
                isOwner={myRole === "owner" && !readOnly}
                myId={user.id}
                members={(info?.members ?? []).map((m) => ({ ...m, profile: info?.profiles.find((p) => p.id === m.user_id) }))}
                onChanged={() => qc.invalidateQueries({ queryKey: ["project", projectId] })}
              />
            </TabsContent>
          </Tabs>
        </aside>
        )}
        {/* Pages + blocks (right) */}
        <aside aria-label="Pages layers and assets" className={`${assetsOpen ? "fixed bottom-0 right-0 top-[5.5rem] z-40 flex shadow-lift" : "hidden"} order-last w-[min(18rem,88vw)] shrink-0 flex-col overflow-y-auto border-l bg-sidebar p-2 lg:static lg:flex lg:w-52 lg:shadow-none xl:w-56`}>
          <div className="flex justify-end lg:hidden"><Button size="icon" variant="ghost" aria-label="Close assets panel" onClick={() => setAssetsOpen(false)}><X className="size-4" /></Button></div>
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pages</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-6" disabled={readOnly} aria-label="Add page"><Plus className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => addPage("canvas")}><FileText /> Blank page</DropdownMenuItem>
                <DropdownMenuItem onClick={() => addPage("whiteboard")}><PenTool /> Whiteboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => addPage("chat")}><MessagesSquare /> Team chat</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ul className="mb-1 space-y-0.5">
            {pages.map((pg) => {
              const Icon = PAGE_ICON[pg.kind] ?? FileText;
              const here = onPage(pg.id);
              return (
                <li key={pg.id} className={`group flex items-center rounded-md ${page?.id === pg.id ? "bg-secondary font-medium" : "hover:bg-secondary/60"}`}>
                  <button onClick={() => { setPageId(pg.id); setChatOpen(false); }} onDoubleClick={() => !readOnly && renamePage(pg)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{pg.title}</span>
                    {pg.kind === "chat" && chat.unread > 0 && page?.id !== pg.id && (
                      <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{chat.unread}</span>
                    )}
                    <span className="ml-auto flex -space-x-1">{here.slice(0, 3).map((p) => <span key={p.session} className="size-2 rounded-full ring-1 ring-card" style={{ background: p.color }} />)}</span>
                  </button>
                  {!readOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="px-1 opacity-0 group-hover:opacity-100" aria-label="Page options"><MoreHorizontal className="size-4" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => renamePage(pg)}>Rename</DropdownMenuItem>
                        <DropdownMenuItem disabled={pages.length <= 1} onClick={() => deletePage(pg)} className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
          <Button variant={chatOpen ? "secondary" : "ghost"} size="sm" onClick={() => openChat()} className="mb-3 justify-start"><MessagesSquare className="size-4" /> Team chat</Button>
          {!readOnly && (
            <button onClick={() => addPage("canvas")} className="mb-4 flex items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
              <Plus className="size-4" /> New blank page
            </button>
          )}
          {page?.kind === "canvas" && (
            <div className="mb-4 border-t pt-3">
              <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Layers</p>
              <LayersTree views={views} selected={selected} multiSelected={multiSelected} onMultiSelect={multiSelect} onSelect={(id) => select(id)} onContext={(id, x, y) => { setMenu({ x, y, id }); }} />
            </div>
          )}
          {page?.kind === "canvas" && !readOnly && (
            <>
              <p className="mb-2 border-t px-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assets</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(BLOCKS) as BlockType[]).map((t) => (
                  <Button variant="outline" key={t} disabled={readOnly} draggable={!readOnly}
                    onDragStart={(e) => e.dataTransfer.setData("application/x-webcraft-block", t)}
                    onClick={() => { void addBlock(t, undefined, undefined, sel && isContainer(sel.type) ? sel.id : undefined); setAssetsOpen(false); }}
                    className="h-auto min-h-14 flex-col gap-1 whitespace-normal px-1 py-2 text-[11px]">
                    <BlockGlyph type={t} />
                    {BLOCKS[t].name}
                  </Button>
                ))}
              </div>

            </>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile page switcher (sidebars are hidden on small screens) */}
          <div className="flex items-center gap-1 overflow-x-auto border-b bg-sidebar px-2 py-1.5 lg:hidden">
            {pages.map((pg) => {
              const Icon = PAGE_ICON[pg.kind] ?? FileText;
              return (
                <button key={pg.id} onClick={() => { setPageId(pg.id); setChatOpen(false); }}
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs ${page?.id === pg.id ? "bg-secondary font-medium" : "text-muted-foreground"}`}>
                  <Icon className="size-3.5" /> {pg.title}
                </button>
              );
            })}
            <button onClick={() => openChat()} className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs ${chatOpen ? "bg-secondary font-medium" : "text-muted-foreground"}`}>
              <MessagesSquare className="size-3.5" /> Chat
              {chat.unread > 0 && <span className="rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{chat.unread}</span>}
            </button>
          </div>
        {page?.kind === "whiteboard" ? (
          <Whiteboard key={page.id} pageId={page.id} nodes={room.nodes} userId={user.id} session={room.session} leases={room.leases}
            cursors={room.cursors} drags={room.drags} readOnly={readOnly} shared={shared}
            projectId={projectId} prefs={prefs} locks={room.locks} canOverride={canOverride}
            onLock={(id, mode, label) => room.setLock(id, mode, room.locks[id]?.allowed ?? [], label)}
            ops={{ op: room.op, acquire: room.acquire, release: room.release, sendDrag: room.sendDrag, sendCursor: room.sendCursor }} />
        ) : page?.kind === "chat" ? (
          <ChatPage myId={user.id} members={members} messages={chat.messages} activity={room.activity} nodes={room.nodes} theme={theme}
            readOnly={readOnly} attach={attach} setAttach={setAttach} send={chat.send} remove={chat.remove} onJump={jumpTo}
            draft={chatDraft} clearDraft={() => setChatDraft("")} wbItems={wbItems}
            onOpenWb={() => { const w = pages.find((x) => x.kind === "whiteboard"); if (w) { setPageId(w.id); setChatOpen(false); } }} />
        ) : (
          <div className="relative flex min-h-0 min-w-0 flex-1">
          <main ref={areaRef} className="editor-gradient min-w-0 flex-1 overflow-auto p-3 sm:p-6 lg:p-8"
            onPointerDownCapture={panStart}
            onContextMenu={(e) => {
              e.preventDefault();
              const id = (e.target as HTMLElement).closest<HTMLElement>("[data-node]")?.dataset["node"] ?? null;

              setMenu({ x: e.clientX, y: e.clientY, id });
            }}
            onMouseLeave={() => room.setStatus(selected && !readOnly ? "editing" : "watching")}>
            {!room.loaded || !page ? (
              <p className="text-center text-muted-foreground">Loading page…</p>
            ) : (
              <>
                {views.length === 0 && <p className="mb-4 text-center text-muted-foreground">{readOnly ? "Empty page" : "Blank page"}</p>}
                <div className="relative mx-auto" style={{ width: (frameW ?? BREAKPOINTS[bp].width) * scale }}>
                <p className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground"><span className="font-medium text-foreground">{page.title}</span> {BREAKPOINTS[bp].label} · {frameW ?? BREAKPOINTS[bp].width}px</p>
                <Canvas nodes={views} bp={bp} theme={theme} scale={scale} selected={selected} mySession={room.session} leases={room.leases}
                  previewWidth={frameW ?? BREAKPOINTS[bp].width} onInspect={id => { void select(id); setPanelOpen(true); setAssetsOpen(false); }}
                  cursors={room.cursors} pageId={page.id} drags={room.drags} readOnly={readOnly} prefs={prefs} locks={room.locks} canOverride={canOverride} onSelect={select} onCommit={commitGeo}
                  multiSelected={multiSelected} onMultiSelect={multiSelect} lockControls={{ myId: user.id, isOwner, members, onSet: (id, mode, allowed) => room.setLock(id, mode, allowed, "Block") }}
                  onLiveDrag={(id, g, done) => room.sendDrag({ id, bp, ...g, done })}
                  onCursor={(x, y) => room.sendCursor(x, y, page.id)}
                  onDropBlock={(t, x, y, parentId) => addBlock(t, { x, y }, undefined, parentId)}
                  onReorder={(id, beforeId) => {
                    const n = views.find((v) => v.id === id);
                    if (!n) return;
                    const sibs = views.filter((v) => v.parent === n.parent && v.id !== id).sort((a, b) => (a.order < b.order ? -1 : 1));
                    const idx = beforeId ? sibs.findIndex((v) => v.id === beforeId) : sibs.length;
                    const prev = sibs[idx - 1]?.order ?? null;
                    const next = idx < sibs.length ? sibs[idx]?.order ?? null : null;
                    room.op(id, { order: keyBetween(prev, next) }, "reordered", labelOf(n));
                  }} />
                {!readOnly && !isMobile && (
                  <div role="separator" aria-label="Drag to resize page width" title="Drag to resize — the layout switches between desktop, tablet and mobile"
                    onPointerDown={frameResize}
                    className="group absolute -right-4 bottom-0 top-6 flex w-3 cursor-ew-resize items-center justify-center">
                    <span className="h-10 w-1 rounded-full bg-border transition group-hover:bg-primary" />
                  </div>
                )}
                </div>
              </>
            )}
          </main>
          <div className="pointer-events-none absolute bottom-3 right-3 z-20">
            <ZoomHud zoom={zoom} onZoom={setZoom} width={frameW ?? BREAKPOINTS[bp].width} label={BREAKPOINTS[bp].label} />
          </div>
          </div>
        )}
        </div>

      </div>

      {menu && <ContextMenuOverlay x={menu.x} y={menu.y} items={menuItems(menu.id)} onClose={() => setMenu(null)} />}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Website templates</DialogTitle><DialogDescription>Each template is a complete multi-page website — a home page plus real inner pages, all editable block by block.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {SITE_TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => { setTplOpen(false); applyTemplate(t); }} className="overflow-hidden rounded-lg border text-left transition hover:border-primary hover:shadow-lift">
                <SitePreview nodes={templateViews(t)} theme={t.theme} height={190} className="border-b" />
                <span className="block p-3"><span className="flex items-center gap-2"><span className="block font-medium">{t.name}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{templatePageCount(t)} pages</span></span><span className="text-xs text-muted-foreground">{t.description}</span></span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <DeployDialog open={deployOpen} onOpenChange={setDeployOpen} projectId={projectId} name={info?.project?.name ?? "site"} pages={sitePages} homeId={firstCanvas} />
      <HostingDialog open={hostOpen} onOpenChange={setHostOpen} siteUrl={siteUrl} published={!!published}
        onZip={(host) => downloadSiteZip(sitePages, firstCanvas, info?.project?.name ?? "site", host)} />
    </div>
  );
}

const HOSTS = {
  Hostinger: { upload: ["Log in to hPanel and open Websites → Manage.", "Open File Manager and go into the public_html folder.", "Delete the default index.php or default.php file if there is one.", "Upload the ZIP, right-click it and choose Extract, then delete the ZIP."], forward: ["In hPanel open Domains → your domain → Redirects (or Domain forwarding).", "Choose a permanent (301) redirect and paste your published link.", "Save. It can take up to a few hours to take effect."] },
  GoDaddy: { upload: ["Open My Products → Web Hosting → Manage → cPanel Admin.", "Open File Manager → public_html.", "Upload the ZIP, select it and choose Extract.", "Remove any old index files that came with the hosting."], forward: ["Open My Products → Domains → your domain → DNS → Forwarding.", "Add forwarding to your published link, type Permanent (301).", "Save. GoDaddy says it can take up to 48 hours."] },
  Namecheap: { upload: ["Open Hosting List → Go to cPanel.", "Open File Manager → public_html.", "Upload the ZIP and Extract it there."], forward: ["Open Domain List → Manage → Redirect Domain.", "Add a redirect from your domain to your published link.", "Save. Changes can take about 30 minutes."] },
  "Other host": { upload: ["Open your host's file manager or connect by FTP.", "Go to the website root (often public_html, www or htdocs).", "Upload and extract the ZIP so index.html sits in the root."], forward: ["Find Domain forwarding / Redirects in your domain settings.", "Point your domain to your published link with a permanent (301) redirect."] },
} as const;

function HostingDialog({ open, onOpenChange, siteUrl, published, onZip }: { open: boolean; onOpenChange: (o: boolean) => void; siteUrl: string; published: boolean; onZip: (host: string) => void }) {
  const [host, setHost] = useState<keyof typeof HOSTS>("Hostinger");
  const h = HOSTS[host];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Put your site on your own hosting</DialogTitle>
          <DialogDescription>Your download is already configured for static hosting. Choose a provider for the exact upload or domain steps.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(HOSTS) as (keyof typeof HOSTS)[]).map((k) => (
            <Button key={k} size="sm" variant={host === k ? "default" : "outline"} onClick={() => setHost(k)}>{k}</Button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border p-4">
            <h3 className="font-medium">Option 1 · Upload the files</h3>
            <p className="mt-1 text-xs text-muted-foreground">Your site runs on your {host} hosting. Re-upload after changes.</p>
            <Button size="sm" className="mt-3" onClick={() => onZip(host)}><Download className="size-4" /> Download preconfigured ZIP</Button>
            <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm">{h.upload.map((x) => <li key={x}>{x}</li>)}</ol>
          </section>
          <section className="rounded-lg border p-4">
            <h3 className="font-medium">Option 2 · Forward your domain</h3>
            <p className="mt-1 text-xs text-muted-foreground">Your WebCraft address is already live-ready. Your domain provider still requires you to approve the forwarding change.</p>
            {published ? (
              <div className="mt-3 flex items-center gap-1">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{siteUrl}</code>
                <Button size="icon" variant="outline" className="size-7" aria-label="Copy link" onClick={() => { navigator.clipboard.writeText(siteUrl); toast.success("Link copied"); }}><Copy className="size-3.5" /></Button>
              </div>
            ) : <p className="mt-3 rounded bg-warning/15 p-2 text-xs">Publish the site first to get your link.</p>}
            <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm">{h.forward.map((x) => <li key={x}>{x}</li>)}</ol>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function initials(n: string) {
  return n.split(/\s+/).map((x) => x[0] ?? "").join("").slice(0, 2).toUpperCase();
}

function BlockGlyph({ type }: { type: BlockType }) {
  const bar = "rounded-[1px] bg-muted-foreground/50";
  const box = "flex h-7 w-11 flex-col justify-center gap-0.5 rounded-sm border bg-background p-1";
  switch (type) {
    case "navbar": return <div className={box}><div className="flex justify-between"><div className={`${bar} h-1 w-3`} /><div className="h-1 w-2 rounded-full bg-primary" /></div></div>;
    case "hero": return <div className={box}><div className={`${bar} h-1.5 w-7`} /><div className={`${bar} h-0.5 w-5`} /><div className="h-1 w-3 rounded-full bg-primary" /></div>;
    case "button": return <div className={`${box} items-center`}><div className="h-2 w-6 rounded-full bg-primary" /></div>;
    case "image": return <div className={box}><div className="h-full rounded-sm bg-accent/60" /></div>;
    case "cards": case "pricing": return <div className={`${box} flex-row items-stretch`}>{[0, 1, 2].map((i) => <div key={i} className="flex-1 rounded-[1px] border" />)}</div>;
    case "login": case "register": return <div className={`${box} items-center`}>{[0, 1].map((i) => <div key={i} className="h-1 w-5 rounded-[1px] border" />)}<div className="h-1 w-5 rounded-full bg-primary" /></div>;
    case "input": return <div className={box}><div className={`${bar} h-0.5 w-4`} /><div className="h-2 w-9 rounded-[2px] border bg-card" /></div>;
    case "flex": return <div className={`${box} flex-row items-center gap-0.5`}>{[0, 1, 2].map((i) => <div key={i} className="h-3 flex-1 rounded-[1px] bg-primary/30" />)}</div>;
    case "grid": return <div className={`${box} grid grid-cols-3 gap-0.5`}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-1.5 rounded-[1px] bg-primary/30" />)}</div>;
    case "stack": return <div className={`${box} gap-0.5`}>{[0, 1, 2].map((i) => <div key={i} className="h-1 w-full rounded-[1px] bg-primary/30" />)}</div>;
    case "absolute": return <div className={`${box} relative`}><div className="absolute left-1 top-1 h-3 w-5 rounded-[1px] bg-primary/25" /><div className="absolute left-3 top-2.5 h-3 w-5 rounded-[1px] bg-primary/50" /></div>;
    case "section": return <div className={`${box} bg-accent/20`}><div className={`${bar} h-1 w-6`} /><div className={`${bar} h-0.5 w-8`} /></div>;
    case "divider": return <div className={box}><div className="h-px w-full bg-muted-foreground/60" /></div>;
    default: return <div className={box}><div className={`${bar} h-1 w-8`} /><div className={`${bar} h-1 w-6`} /></div>;
  }
}

function LayersList({ views, leases, session, onSelect }: { views: NodeView[]; leases: Record<string, { holder_session: string; holder_name: string; holder_color: string }>; session: string; onSelect: (id: string) => void }) {
  const sorted = [...views].sort((a, b) => (a.order > b.order ? -1 : 1));
  return (
    <div className="mt-8">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Layers className="size-4" /> Layers</h3>
      {sorted.length === 0 && <p className="text-xs text-muted-foreground">Nothing on this page yet.</p>}
      <ul className="space-y-0.5">
        {sorted.map((v) => {
          const l = leases[v.id];
          return (
            <li key={v.id}>
              <button onClick={() => onSelect(v.id)} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-secondary">
                <span className="truncate">{BLOCKS[v.type].name}{v.text ? ` · ${v.text.slice(0, 22)}` : ""}</span>
                {l && (
                  <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] text-primary-foreground" style={{ background: l.holder_color }}>
                    <Lock className="size-2.5" /> {l.holder_session === session ? "You" : l.holder_name}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Inspector(props: {
  node: NodeView;
  onSplit: () => void;
  bp: Breakpoint;
  shared: SharedText;
  lockedBy?: string | undefined;
  readOnly: boolean;
  onEdit: (f: "text" | "sub" | "label", v: string) => void;
  onLink: (v: string) => void;
  pages: Page[];
  onStyle: (k: keyof BlockStyle, v: unknown) => void;
  onAttrs: (a: Record<string, string>) => void;
  onScript: (js: string) => void;
  onHtml: (v: string) => void;
  onCss: (v: string) => void;
  projectId: string;
  onBox: (k: keyof BoxOpts, v: unknown) => void;
  onGeo: (g: Geo) => void;
  onFront: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { node } = props;
  const def = BLOCKS[node.type];
  const g = node.geo[props.bp];
  const st = node.style;
  const disabled = props.readOnly || !!props.lockedBy;
  const fields: { f: "text" | "sub" | "label"; label: string }[] = [];
  if (def.text) fields.push({ f: "text", label: node.type === "image" ? "Alt text / caption" : node.type === "cards" || node.type === "pricing" ? "Titles (separate with |)" : node.type === "input" ? "Field label" : isContainer(node.type) && node.type !== "section" ? "Items (separate with |)" : "Text" });
  if (def.sub) fields.push({ f: "sub", label: node.type === "pricing" ? "Prices (separate with |)" : node.type === "cards" ? "Descriptions (separate with |)" : node.type === "input" ? "Placeholder" : "Secondary text" });
  if (def.label) fields.push({ f: "label", label: node.type === "stats" ? "Changes (separate with |)" : "Button label" });
  if (node.type === "chart") { fields[0] = { f: "text", label: "Labels (separate with |)" }; fields[1] = { f: "sub", label: "Values (separate with |)" }; }
  if (node.type === "stats") { fields[0] = { f: "text", label: "Metric names (separate with |)" }; fields[1] = { f: "sub", label: "Values (separate with |)" }; }
  if (node.type === "product") { fields[0] = { f: "text", label: "Product name" }; fields[1] = { f: "sub", label: "Price (number)" }; }
  if (node.type === "cart") fields[1] = { f: "sub", label: "Empty-cart message" };
  const setAttr = (k: string, v: string) => props.onAttrs({ ...node.attrs, [k]: v });

  const color = (k: "bg" | "color" | "btn" | "border", label: string) => (
    <label className="flex items-center justify-between gap-2 text-xs">
      {label}
      <span className="flex items-center gap-1">
        <input type="color" disabled={disabled} defaultValue={st[k] ?? "#ffffff"} key={st[k] ?? "none"}
          onBlur={(e) => e.target.value !== st[k] && props.onStyle(k, e.target.value)} className="h-7 w-10 cursor-pointer rounded border bg-transparent" />
        {st[k] && <button disabled={disabled} className="text-[10px] text-muted-foreground hover:underline" onClick={() => props.onStyle(k, null)}>reset</button>}
      </span>
    </label>
  );
  const range = (k: "radius" | "pad" | "opacity" | "scale" | "rotate" | "animDur" | "animDelay", label: string, min: number, max: number, step: number, dflt: number) => (
    <label className="block text-xs">
      <span className="flex justify-between">{label}<span className="text-muted-foreground">{st[k] ?? dflt}</span></span>
      <input type="range" min={min} max={max} step={step} disabled={disabled} defaultValue={st[k] ?? dflt} key={String(st[k] ?? dflt)}
        onPointerUp={(e) => props.onStyle(k, Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => props.onStyle(k, Number((e.target as HTMLInputElement).value))}
        className="mt-1 w-full accent-[var(--primary)]" />
    </label>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">{def.name}</h2>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" disabled={disabled} onClick={props.onDuplicate} aria-label="Duplicate"><Copy /></Button>
          <Button size="icon" variant="ghost" disabled={disabled} onClick={props.onFront} aria-label="Bring to front"><ArrowUpToLine /></Button>
          <Button size="icon" variant="ghost" disabled={disabled} onClick={props.onDelete} aria-label="Delete"><Trash2 /></Button>
        </div>
      </div>
      {props.lockedBy ? (
        <p className="flex items-center gap-2 rounded-md bg-warning/15 px-3 py-2 text-sm"><Lock className="size-4" /> {props.lockedBy} is editing this block — it's locked for you.</p>
      ) : !props.readOnly && (
        <p className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-xs"><Lock className="size-3.5" /> You hold the lock on this block. Others can't change it until you click away.</p>
      )}
      {COMPOUND_TYPES.includes(node.type) && <Button variant="outline" size="sm" className="w-full" disabled={disabled} onClick={props.onSplit}><Layers className="size-4" /> Split into editable layers</Button>}
      <IntegrationFields node={node} disabled={disabled} onAttrs={props.onAttrs} />
      {fields.map(({ f, label }) => (
        <div key={f} className="space-y-1.5">
          <Label>{label}</Label>
          <CollabTextarea shared={props.shared} k={`${node.id}:${f}`} seed={node[f]} disabled={disabled} rows={f === "label" ? 1 : 3}
            onCommit={(v) => props.onEdit(f, v)} />
        </div>
      ))}
      {["button", "navbar", "hero", "pricing", "login", "register", "product", "cart"].includes(node.type) && (
        <div className="space-y-2 border-t pt-4">
          <Label>Button destination</Label>
          <select aria-label="Button destination type" disabled={disabled} value={node.href.startsWith("?page=") ? "page" : "url"}
            onChange={(e) => props.onLink(e.target.value === "page" ? `?page=${props.pages[0]?.id ?? ""}` : "")}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm">
            <option value="url">Website or payment link</option><option value="page">Another page in this project</option>
          </select>
          {node.href.startsWith("?page=") ? (
            <select aria-label="Destination page" disabled={disabled} value={node.href.slice(6)} onChange={(e) => props.onLink(`?page=${e.target.value}`)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
              {props.pages.map((pg) => <option key={pg.id} value={pg.id}>{pg.title}</option>)}
            </select>
          ) : <Input aria-label="Website or payment URL" disabled={disabled} type="url" placeholder="https://checkout.example.com/…" defaultValue={node.href} key={node.id + node.href}
              onBlur={(e) => { if (e.target.value !== node.href) props.onLink(e.target.value.trim()); }} />}
          <p className="text-xs text-muted-foreground">Paste your payment provider's checkout link, or select a project page. Sign-in and sign-up blocks also need a destination; they do not create user accounts.</p>
        </div>
      )}
      {node.type === "chart" && (
        <div className="space-y-2 border-t pt-4">
          <Label>Chart type</Label>
          <div className="grid grid-cols-5 gap-1">
            {["bar", "line", "area", "pie", "donut"].map((k) => (
              <button key={k} disabled={disabled} onClick={() => setAttr("data-chart", k)} className={`rounded border px-1 py-1 text-[11px] capitalize ${(node.attrs["data-chart"] ?? "bar") === k ? "border-primary bg-primary/10" : ""}`}>{k}</button>
            ))}
          </div>
          <Input aria-label="Chart title" placeholder="Chart title" disabled={disabled} defaultValue={node.attrs["data-title"] ?? ""} key={node.id + "t"} onBlur={(e) => setAttr("data-title", e.target.value)} />
          <p className="text-xs text-muted-foreground">Color follows the Button color in Style.</p>
        </div>
      )}
      {node.type === "product" && (
        <div className="space-y-2 border-t pt-4">
          <Label>Store</Label>
          <Input aria-label="Currency symbol" placeholder="Currency symbol, e.g. $ or ₱" disabled={disabled} defaultValue={node.attrs["data-currency"] ?? "$"} key={node.id + "c"} onBlur={(e) => setAttr("data-currency", e.target.value.slice(0, 4))} />
          <Input aria-label="Product image URL" placeholder="Image URL (https://…)" disabled={disabled} defaultValue={node.attrs["data-image"] ?? ""} key={node.id + "i"} onBlur={(e) => setAttr("data-image", e.target.value.trim())} />
          <p className="text-xs text-muted-foreground">"Add to cart" fills any Cart block on the site. A destination link above adds a "Buy now" button (e.g. a Stripe Payment Link).</p>
        </div>
      )}
      {node.type === "cart" && <p className="border-t pt-4 text-xs text-muted-foreground">Set the destination to your Stripe or PayPal payment link. PayPal.me links get the cart total added automatically.</p>}
      {isContainer(node.type) && (
        <BoxPanel type={node.type} box={node.box} disabled={disabled} onBox={props.onBox} />
      )}
      {["image", "hero", "video"].includes(node.type) && (
        <MediaPanel key={`media-${node.id}`} node={node} projectId={props.projectId} disabled={disabled} onAttrs={props.onAttrs} />
      )}
      <AttrsPanel key={`attrs-${node.id}-${JSON.stringify(node.attrs).length}`} node={node} disabled={disabled} onAttrs={props.onAttrs} />
      <SnippetsPanel key={`snip-${node.id}`} node={node} disabled={disabled} onScript={props.onScript} onHtml={props.onHtml} onCss={props.onCss} />
      <div className="space-y-3">
        <Label className="block">Style</Label>
        {color("bg", "Background")}
        {color("color", "Text color")}
        {color("btn", "Accent color")}
        {color("border", "Border")}
        {range("radius", "Corner radius", 0, 48, 1, 0)}
        {range("pad", "Padding", 0, 64, 2, 0)}
        {range("scale", "Text scale", 0.6, 1.8, 0.05, 1)}
        {range("opacity", "Opacity", 0.1, 1, 0.05, 1)}
        <div className="flex items-center justify-between text-xs">
          Alignment
          <div className="flex rounded-md border p-0.5">
            {(["left", "center", "right"] as const).map((a) => (
              <button key={a} disabled={disabled} onClick={() => props.onStyle("align", st.align === a ? null : a)}
                className={`rounded px-2 py-0.5 capitalize ${st.align === a ? "bg-secondary font-medium" : "text-muted-foreground"}`}>{a}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          Font
          <div className="flex rounded-md border p-0.5">
            {(["serif", "sans", "mono"] as const).map((a) => (
              <button key={a} disabled={disabled} onClick={() => props.onStyle("font", st.font === a ? null : a)}
                className={`rounded px-2 py-0.5 capitalize ${st.font === a ? "bg-secondary font-medium" : "text-muted-foreground"}`}>{a}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 border-t pt-3 text-xs">
          <span className="block font-medium">Shape</span>
          <div className="grid grid-cols-7 gap-1">
            {(Object.keys(SHAPES) as ShapeKey[]).map((k) => (
              <Button variant="outline" size="icon" key={k} disabled={disabled} title={SHAPES[k].label} aria-label={SHAPES[k].label} onClick={() => { props.onStyle("freeRadius", null); props.onStyle("shape", k === "rect" ? null : k); }}
                className={`h-auto w-full aspect-square p-0 ${(st.shape ?? "rect") === k ? "border-primary bg-accent" : ""}`}>
                <span className="block size-4 bg-primary/70" style={styleObj({ shape: k })} />
              </Button>
            ))}
          </div>
          <FreeformShape value={st.freeRadius} disabled={disabled} onChange={radius => { props.onStyle("clip", null); props.onStyle("shape", null); props.onStyle("freeRadius", radius); }}/>
          <Input aria-label="Custom clip path" placeholder="Custom: polygon(0 0, 100% 0, 80% 100%, 0 100%)" disabled={disabled} defaultValue={st.clip ?? ""} key={node.id + (st.clip ?? "")}
            onBlur={(e) => props.onStyle("clip", e.target.value.trim() || null)} className="h-8 font-mono text-[11px]" />
          {range("rotate", "Rotation (°)", -180, 180, 1, 0)}
        </div>
        <div className="space-y-1.5 border-t pt-3 text-xs">
          <span className="block font-medium">Animation</span>
          <select aria-label="Animation" disabled={disabled} value={st.anim ?? ""} onChange={(e) => props.onStyle("anim", e.target.value || null)} className="h-8 w-full rounded-md border bg-background px-2">
            <option value="">None</option>
            {(Object.keys(ANIMS) as AnimKey[]).map((k) => <option key={k} value={k}>{ANIMS[k]}</option>)}
          </select>
          {st.anim && <>{range("animDur", "Duration (s)", 0.2, 6, 0.1, 0.8)}{range("animDelay", "Delay (s)", 0, 3, 0.1, 0)}</>}
        </div>
        <label className="flex items-center justify-between text-xs">
          Drop shadow
          <Switch checked={!!st.shadow} disabled={disabled} onCheckedChange={(c) => props.onStyle("shadow", c)} />
        </label>
      </div>
      <div key={`${g.x}-${g.y}-${g.w}-${g.h}`}>
        <Label className="mb-1.5 block">Position & size · {BREAKPOINTS[props.bp].label}</Label>
        <div className="grid grid-cols-4 gap-2">
          {(["x", "y", "w", "h"] as const).map((k) => (
            <label key={k} className="text-[11px] uppercase text-muted-foreground">
              {k}
              <Input type="number" defaultValue={g[k]} disabled={disabled} className="mt-1 h-8 px-2 text-xs"
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n) && n !== g[k]) props.onGeo({ ...g, [k]: n });
                }} />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Each screen size keeps its own layout.</p>
      </div>
    </div>
  );
}

function ThemePanel({ theme, readOnly, onChange }: { theme: Theme; readOnly: boolean; onChange: (t: Theme) => void }) {
  const [t, setT] = useState(theme);
  useEffect(() => setT(theme), [theme]);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl">Site theme</h2>
        <p className="text-sm text-muted-foreground">Select a block to edit it. These colors style the exported site.</p>
      </div>
      {(["primary", "accent", "surface", "ink"] as const).map((k) => (
        <label key={k} className="flex items-center justify-between gap-3 text-sm capitalize">
          {k}
          <input
            type="color"
            value={t[k]}
            disabled={readOnly}
            onChange={(e) => setT({ ...t, [k]: e.target.value })}
            onBlur={() => onChange(t)}
            className="h-8 w-14 cursor-pointer rounded border bg-transparent"
          />
        </label>
      ))}
    </div>
  );
}

function CodeView({ exp, pages, name, homeId }: { exp: { html: string; css: string; js: string }; pages: Record<string, string>; name: string; homeId: string | null }) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const base: Record<string, string> = { "index.html": exp.html, "styles.css": exp.css, "script.js": exp.js };
  const files = Object.keys(base).map((k) => ({ k, v: edits[k] ?? base[k]!, edited: k in edits }));
  const val = (k: string) => edits[k] ?? base[k]!;
  const combined = () => {
    let html = val("index.html");
    const css = `<style>${val("styles.css")}</style>`;
    const js = `<script>${val("script.js")}</script>`;
    html = html.replace(/<link[^>]+styles\.css[^>]*>/i, css).replace(/<script[^>]+script\.js[^>]*><\/script>/i, js);
    if (!html.includes(css)) html = html.replace(/<\/head>/i, `${css}</head>`);
    if (!html.includes(js)) html = html.replace(/<\/body>/i, `${js}</body>`);
    return html;
  };
  function preview() {
    if (!openSandboxed(combined())) toast.error("Allow pop-ups to preview");
  }
  async function zip() {
    const homeKey = homeId && pages[homeId] !== undefined ? homeId : Object.keys(pages)[0];
    if (!homeKey) { toast.error("Nothing to export yet — add blocks first."); return; }
    // Package through the same pipeline as hosting deploys, so every photo, cover and
    // video is bundled into assets/ and page links are rewritten to page-*.html files.
    await downloadSiteZip({ ...pages, [homeKey]: combined() }, homeKey, name);
  }
  return (
    <Tabs defaultValue="index.html" className="flex h-full flex-col">
      <div className="flex items-center gap-1">
        <TabsList className="h-8">
          {files.map((f) => <TabsTrigger key={f.k} value={f.k} className="text-xs">{f.k}{f.edited ? " •" : ""}</TabsTrigger>)}
        </TabsList>
        <Button size="sm" variant="ghost" className="ml-auto h-8 px-2 text-xs" onClick={preview}>Preview</Button>
        <Button size="icon" variant="ghost" className="size-8" onClick={zip} aria-label="Export as ZIP"><Download /></Button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">script.js is the JavaScript for the entire website — the site runtime plus every block's own logic, in page order.</p>
      {Object.keys(edits).length > 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">Edited code is used for Preview and ZIP export only; canvas changes won't overwrite your edits until you reset.</p>
      )}
      {files.map((f) => (
        <TabsContent key={f.k} value={f.k} className="relative mt-2 min-h-0 flex-1">
          <div className="absolute right-2 top-2 z-10 flex gap-1">
            {f.edited && (
              <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setEdits(({ [f.k]: _, ...rest }) => rest)}>Reset</Button>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="size-7"
              onClick={() => navigator.clipboard.writeText(f.v).then(() => toast.success(`${f.k} copied`))}
              aria-label={`Copy ${f.k}`}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
          <textarea
            value={f.v}
            spellCheck={false}
            aria-label={`Edit ${f.k}`}
            onChange={(e) => { const v = e.target.value; setEdits((s) => ({ ...s, [f.k]: v })); }}
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              e.preventDefault();
              const t = e.currentTarget, s = t.selectionStart, en = t.selectionEnd;
              const v = t.value.slice(0, s) + "  " + t.value.slice(en);
              setEdits((st) => ({ ...st, [f.k]: v }));
              requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
            }}
            className="h-full w-full resize-none overflow-auto whitespace-pre rounded-md bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TeamPanel(props: {
  projectId: string;
  isOwner: boolean;
  myId: string;
  members: { user_id: string; role: string; profile?: { display_name: string; color: string } | undefined }[];
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.rpc("add_member_by_email", { _project: props.projectId, _email: email, _role: role });
    if (error) toast.error(error.message);
    else if (data === "not_found") toast.error("No WebCraft account with that email yet — ask them to sign up first.");
    else {
      toast.success("Added to the project");
      setEmail("");
      props.onChanged();
    }
  }
  return (
    <div className="space-y-5">
      <h2 className="text-xl">Team</h2>
      <ul className="space-y-2">
        {props.members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 text-sm">
            <span className="grid size-7 place-items-center rounded-full text-[10px] font-semibold text-primary-foreground" style={{ background: m.profile?.color ?? "gray" }}>
              {initials(m.profile?.display_name ?? "?")}
            </span>
            <span className="flex-1">{m.profile?.display_name ?? "Member"}</span>
            <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
            {props.isOwner && m.role !== "owner" && m.user_id !== props.myId && (
              <Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label={`Remove ${m.profile?.display_name ?? "member"}`} title="Remove from project"
                onClick={async () => {
                  if (!window.confirm(`Remove ${m.profile?.display_name ?? "this member"} from the project? They'll lose access right away.`)) return;
                  const { error } = await supabase.from("project_members").delete().eq("project_id", props.projectId).eq("user_id", m.user_id);
                  if (error) toast.error("Couldn't remove member"); else { toast.success("Member removed"); props.onChanged(); }
                }}><UserMinus className="size-3.5" /></Button>
            )}
          </li>
        ))}
      </ul>
      {props.isOwner && (
        <form onSubmit={invite} className="space-y-2 border-t pt-4">
          <Label>Invite by email</Label>
          <Input type="email" required placeholder="teammate@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")} className="h-9 flex-1 rounded-md border bg-background px-2 text-sm">
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="submit">Invite</Button>
          </div>
        </form>
      )}
    </div>
  );
}


function BoxPanel({ type, box, disabled, onBox }: { type: BlockType; box: BoxOpts; disabled: boolean; onBox: (k: keyof BoxOpts, v: unknown) => void }) {
  const seg = <K extends keyof BoxOpts>(k: K, label: string, opts: readonly string[], dflt: string) => (
    <div className="flex items-center justify-between gap-2 text-xs">
      {label}
      <div className="flex flex-wrap rounded-md border p-0.5">
        {opts.map((o) => (
          <button key={o} disabled={disabled} onClick={() => onBox(k, o === dflt ? null : o)}
            className={`rounded px-1.5 py-0.5 capitalize ${(box[k] ?? dflt) === o ? "bg-secondary font-medium" : "text-muted-foreground"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-2.5 border-t pt-4">
      <Label className="block">Container layout</Label>
      {type !== "absolute" && (
        <label className="block text-xs"><span className="flex justify-between">Gap<span className="text-muted-foreground">{box.gap ?? 16}px</span></span>
          <input type="range" min={0} max={64} step={2} disabled={disabled} defaultValue={box.gap ?? 16} key={String(box.gap)} onPointerUp={(e) => onBox("gap", Number((e.target as HTMLInputElement).value))} className="mt-1 w-full accent-[var(--primary)]" />
        </label>
      )}
      {type === "grid" && (
        <label className="block text-xs"><span className="flex justify-between">Columns<span className="text-muted-foreground">{box.cols ?? 3}</span></span>
          <input type="range" min={1} max={6} step={1} disabled={disabled} defaultValue={box.cols ?? 3} key={String(box.cols)} onPointerUp={(e) => onBox("cols", Number((e.target as HTMLInputElement).value))} className="mt-1 w-full accent-[var(--primary)]" />
        </label>
      )}
      {type === "flex" && seg("dir", "Direction", ["row", "column"], "row")}
      {(type === "flex" || type === "stack") && seg("justify", "Justify", ["start", "center", "end", "between"], "start")}
      {type !== "absolute" && seg("align", "Align", ["start", "center", "end", "stretch"], "stretch")}
      {type === "flex" && (
        <label className="flex items-center justify-between text-xs">Wrap items<Switch checked={!!box.wrap} disabled={disabled} onCheckedChange={(c) => onBox("wrap", c || null)} /></label>
      )}
      {type === "absolute" && <p className="text-xs text-muted-foreground">Layers overlap freely, each offset from the last — good for collages and stacked cards.</p>}
    </div>
  );
}
