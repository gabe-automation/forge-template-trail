import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, Rocket, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deploySite } from "@/lib/deploy.functions";
import { packageSite } from "@/lib/sandbox";

type Provider = "netlify" | "vercel";
const PROVIDERS: Record<Provider, { name: string; blurb: string; signup: string; token: string; steps: string[] }> = {
  netlify: {
    name: "Netlify", blurb: "Free plan · HTTPS · custom domains",
    signup: "https://app.netlify.com/signup",
    token: "https://app.netlify.com/user/applications#personal-access-tokens",
    steps: ["Create a free Netlify account (or sign in).", "Open “Personal access tokens” and click New access token.", "Paste it below once — we remember it on this device."],
  },
  vercel: {
    name: "Vercel", blurb: "Free Hobby plan · HTTPS · custom domains",
    signup: "https://vercel.com/signup",
    token: "https://vercel.com/account/tokens",
    steps: ["Create a free Vercel account (or sign in).", "Open Account → Tokens and click Create.", "Paste it below once — we remember it on this device."],
  },
};

export function DeployDialog({ open, onOpenChange, projectId, name, pages, homeId }: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId: string; name: string; pages: Record<string, string>; homeId: string | null;
}) {
  const deploy = useServerFn(deploySite);
  const [provider, setProvider] = useState<Provider>("netlify");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const tokenKey = `wc-deploy-token-${provider}`;
  const siteKey = `wc-deploy-site-${provider}-${projectId}`;

  useEffect(() => { setToken(localStorage.getItem(tokenKey) ?? ""); setUrl(localStorage.getItem(`${siteKey}-url`)); }, [tokenKey, siteKey]);

  async function go() {
    if (!Object.keys(pages).length) { toast.info("Add a design page with blocks first."); return; }
    if (token.trim().length < 10) { toast.error(`Paste your ${PROVIDERS[provider].name} token first.`); return; }
    setBusy(true);
    try {
      const pkg = await packageSite(pages, homeId);
      const res = await deploy({ data: { provider, token: token.trim(), siteName: name, siteId: localStorage.getItem(siteKey) ?? undefined, files: pkg.files, binary: pkg.base64() } });
      if (!res.ok) { toast.error(res.error); return; }
      localStorage.setItem(tokenKey, token.trim());
      if (res.siteId) localStorage.setItem(siteKey, res.siteId);
      localStorage.setItem(`${siteKey}-url`, res.url);
      setUrl(res.url);
      toast.success(`Live on ${PROVIDERS[provider].name}`, { action: { label: "Open", onClick: () => window.open(res.url, "_blank") } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    } finally { setBusy(false); }
  }

  const p = PROVIDERS[provider];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish to your own hosting</DialogTitle>
          <DialogDescription>One click sends every page, photo and video to your hosting account. It's set up for the free plan — upgrading is up to you.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PROVIDERS) as Provider[]).map((k) => (
            <button key={k} onClick={() => setProvider(k)}
              className={`rounded-lg border p-3 text-left transition ${provider === k ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50"}`}>
              <span className="block font-medium">{PROVIDERS[k].name}</span>
              <span className="text-xs text-muted-foreground">{PROVIDERS[k].blurb}</span>
            </button>
          ))}
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm">{p.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={p.signup} target="_blank" rel="noopener noreferrer">Free account <ExternalLink className="size-3.5" /></a></Button>
          <Button asChild size="sm" variant="outline"><a href={p.token} target="_blank" rel="noopener noreferrer">Get token <ExternalLink className="size-3.5" /></a></Button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deploy-token">{p.name} access token</Label>
          <Input id="deploy-token" type="password" autoComplete="off" placeholder="Paste token" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <Button onClick={go} disabled={busy} className="w-full">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} {url ? `Update on ${p.name}` : `Publish to ${p.name}`}
        </Button>
        {url && (
          <p className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm">
            <Check className="size-4" /> Live at <a href={url} target="_blank" rel="noopener noreferrer" className="truncate font-medium underline">{url}</a>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
