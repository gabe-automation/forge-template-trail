import { SITE_TEMPLATES, templateViews, templatePageCount, type SiteTemplate } from "@/lib/siteTemplates";
import { SitePreview } from "@/components/SitePreview";
import { toView, type NodeView } from "@/lib/model";
import { DEFAULT_THEME, type Theme } from "@/lib/blocks";
import { val, type Props } from "@/lib/crdt";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceShell, TemplateGallery } from "@/components/WorkspaceGallery";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowUpRight, Check, Plus, Trash2, RotateCcw } from "lucide-react";
import { useDeviceAccess } from "@/hooks/use-device-access";
import { canManageProject, inProjectSection } from "@/lib/projectTrash";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Your projects — WebCraft" },
      { name: "description", content: "All the websites you and your team are building in WebCraft." },
      { property: "og:title", content: "Your projects — WebCraft" },
      { property: "og:description", content: "All the websites you and your team are building in WebCraft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { readOnly } = useDeviceAccess();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("project_members")
        .select("role, projects(id, name, created_at, deleted_at)")
        .eq("user_id", u.user?.id ?? "");
      if (error) throw error;
      return (data ?? [])
        .flatMap((r) => r.projects ? [{ role: r.role, ...r.projects }] : [])
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });

  const ids = (projects ?? []).map((p) => p.id);
  const { data: thumbs } = useQuery({
    queryKey: ["project-thumbs", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const [n, pg, pr] = await Promise.all([
        supabase.from("nodes").select("id, project_id, props").in("project_id", ids),
        supabase.from("pages").select("id, project_id, kind, sort, created_at").in("project_id", ids).eq("kind", "canvas").order("sort").order("created_at"),
        supabase.from("projects").select("id, theme").in("id", ids),
      ]);
      const first: Record<string, string> = {};
      for (const p of pg.data ?? []) if (!first[p.project_id]) first[p.project_id] = p.id;
      const out: Record<string, { nodes: NodeView[]; theme: Theme }> = {};
      for (const p of pr.data ?? []) out[p.id] = { nodes: [], theme: { ...DEFAULT_THEME, ...(p.theme as Partial<Theme>) } };
      for (const row of n.data ?? []) {
        const props = row.props as unknown as Props;
        if (val<string>(props, "kind", "") === "wb") continue;
        const v = toView(row.id, props);
        if (!v || (v.page ?? first[row.project_id]) !== first[row.project_id]) continue;
        out[row.project_id]?.nodes.push(v);
      }
      return out;
    },
  });
  const [tpl, setTpl] = useState("");
  const [section, setSection] = useState("Projects");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const filtered = (projects ?? []).filter((p) => inProjectSection(p.deleted_at, section) && p.name.toLowerCase().includes(search.toLowerCase()));

  async function removeProject(id: string, action: "trash" | "restore" | "delete") {
    if (busy || !canManageProject(projects?.find(p => p.id === id)?.role ?? "", readOnly)) return;
    if (action !== "restore" && !window.confirm(action === "delete" ? "Permanently delete this project and all its pages? This cannot be undone." : "Move this project to Trash?")) return;
    setBusy(true);
    const result = action === "delete" ? await supabase.from("projects").delete().eq("id", id) : await supabase.from("projects").update({ deleted_at: action === "restore" ? null : new Date().toISOString() }).eq("id", id);
    setBusy(false);
    if (result.error) { toast.error("Couldn't update the project"); return; }
    await qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success(action === "restore" ? "Project restored" : action === "delete" ? "Project permanently deleted" : "Project moved to Trash");
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !name.trim() || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_project", { _name: name });
    if (error || !data) {
      setBusy(false);
      toast.error("Couldn't create project");
      return;
    }
    setName("");
    if (tpl) sessionStorage.setItem(`webcraft:tpl:${data}`, tpl);
    qc.invalidateQueries({ queryKey: ["projects"] });
    navigate({ to: "/p/$projectId", params: { projectId: data } });
  }

  return <WorkspaceShell signedIn section={section} onSection={setSection} search={search} onSearch={setSearch}
    onSignOut={() => supabase.auth.signOut().then(() => navigate({ to: "/" }))}>
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <h1 className="text-lg font-semibold">{section === "Projects" ? "Recents" : section}</h1>
      {readOnly ? <span className="text-xs text-muted-foreground">View only</span> : <Button size="sm" aria-label="New project" onClick={() => { setTpl(sessionStorage.getItem("webcraft:pending-template") ?? ""); sessionStorage.removeItem("webcraft:pending-template"); setCreating(true); }}><Plus className="size-4"/><span className="hidden sm:inline">New design file</span></Button>}
    </div>
    {section === "Templates" ? <TemplateGallery readOnly={readOnly} search={search} onPick={(t) => { if (!readOnly) { setTpl(t.id); setCreating(true); } }}/>
      : <>
        {isLoading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-56 animate-pulse rounded-lg bg-muted"/>)}</div>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {!readOnly && !isLoading && section !== "Trash" && <Button variant="ghost" type="button" onClick={() => { setTpl(""); setCreating(true); }} className="group flex h-auto min-w-0 flex-col items-stretch gap-0 overflow-hidden rounded-lg border bg-card p-0 text-left whitespace-normal transition hover:ring-2 hover:ring-primary">
            <span className="grid h-[180px] place-items-center bg-muted"><span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="size-6"/></span></span>
            <span className="block p-3"><span className="block text-sm font-medium">New design file</span><span className="text-xs text-muted-foreground">Blank or from a template</span></span>
          </Button>}
          {filtered.map((p) => <div key={p.id} className="group flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card transition hover:ring-2 hover:ring-primary"><Link to="/p/$projectId" params={{ projectId: p.id }}>
            <div className="h-[180px] overflow-hidden bg-muted"><SitePreview nodes={thumbs?.[p.id]?.nodes ?? []} theme={thumbs?.[p.id]?.theme ?? DEFAULT_THEME} height={180}/></div>
            <div className="flex min-w-0 items-center gap-2 border-t p-3"><span className="grid size-6 shrink-0 place-items-center rounded bg-primary text-[10px] font-bold text-primary-foreground">{p.name.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{p.name}</span><span className="block text-xs capitalize text-muted-foreground">{p.role} · {new Date(p.created_at).toLocaleDateString()}</span></span><ArrowUpRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100"/></div>
          </Link>{p.role === "owner" && !readOnly && <div className="flex justify-end gap-1 border-t px-2 py-1">{p.deleted_at && <Button size="icon" variant="ghost" disabled={busy} aria-label={`Restore ${p.name}`} title="Restore project" onClick={() => removeProject(p.id, "restore")}><RotateCcw className="size-4"/></Button>}<Button size="icon" variant="ghost" disabled={busy} aria-label={`${p.deleted_at ? "Permanently delete" : "Move to trash"} ${p.name}`} title={p.deleted_at ? "Permanently delete" : "Move to trash"} onClick={() => removeProject(p.id, p.deleted_at ? "delete" : "trash")}><Trash2 className="size-4"/></Button></div>}</div>)}
        </div>
        {!isLoading && filtered.length === 0 && (section === "Trash" ? <p className="py-12 text-muted-foreground">Trash is empty.</p> : <div className="mt-8"><h2 className="mb-6 text-xl font-semibold">Start from a template</h2><TemplateGallery readOnly={readOnly} search={search} onPick={(t) => { if (!readOnly) { setTpl(t.id); setCreating(true); } }}/></div>)}
      </>}
    <Dialog open={creating && !readOnly} onOpenChange={setCreating}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-lg sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Start a new project</DialogTitle>
          <DialogDescription>Pick a starting point — templates arrive as complete multi-page websites you can reshape block by block.</DialogDescription>
        </DialogHeader>
        {(() => {
          const blank = { id: "", name: "Blank canvas", description: "One empty page — start from scratch and drop blocks in as you go.", theme: DEFAULT_THEME };
          const selected = SITE_TEMPLATES.find((t) => t.id === tpl);
          const choices: (typeof blank | SiteTemplate)[] = [blank, ...SITE_TEMPLATES];
          return (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
              <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {choices.map((t) => {
                  const sel = tpl === t.id;
                  const isTpl = "blocks" in t && (t as SiteTemplate).blocks.length > 0;
                  const count = isTpl ? templatePageCount(t as SiteTemplate) : 1;
                  return (
                    <Button variant="ghost" key={t.id} type="button" aria-pressed={sel} onClick={() => setTpl(t.id)}
                      className={`group relative block h-auto overflow-hidden rounded-lg border bg-card p-0 text-left whitespace-normal transition hover:shadow-lift ${sel ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/50"}`}>
                      {isTpl
                        ? <SitePreview nodes={templateViews(t as SiteTemplate)} theme={t.theme} height={140} className="w-full border-b" />
                        : <div className="grid h-[140px] place-items-center border-b bg-dotgrid text-xs text-muted-foreground">Empty page</div>}
                      <span className="relative block p-3">
                        <span className="flex items-start justify-between gap-2"><span className="line-clamp-2 block text-sm font-medium leading-snug">{t.name}</span><span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{count} page{count > 1 ? "s" : ""}</span></span>
                        <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">{t.description}</span>
                        {sel && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow"><Check className="size-3.5" /></span>}
                      </span>
                    </Button>
                  );
                })}
              </div>
              <aside className="hidden flex-col gap-3 self-start border-l pl-4 lg:flex">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Your choice</p>
                <p className="text-sm font-medium">{selected?.name ?? "Blank canvas"}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{selected?.description ?? "Begin with an empty page and add blocks as you go."}</p>
                <p className="mt-auto border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                  You'll land straight in the editor{selected ? <> with <strong className="text-foreground">{templatePageCount(selected)} page{templatePageCount(selected) > 1 ? "s" : ""}</strong> already set up</> : ""} — theme, fonts and photos included.
                </p>
              </aside>
            </div>
          );
        })()}
        <form onSubmit={create} className="sticky bottom-0 -mx-6 -mb-6 flex flex-col gap-2 border-t bg-card/95 px-6 py-3 backdrop-blur sm:flex-row">
          <Input aria-label="Project name" required autoFocus placeholder="Name your project — e.g. Studio redesign" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Button type="submit" disabled={busy || !name.trim()} className="sm:w-44">{busy ? "Creating…" : "Create project"}</Button>
        </form>
      </DialogContent></Dialog>
  </WorkspaceShell>;
}
