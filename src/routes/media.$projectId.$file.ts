import { createFileRoute } from "@tanstack/react-router";

// Public, stable URL for uploaded site media (images/videos) so previews, published
// sites and external hosts can all load them. Redirects to a short-lived signed URL.
export const Route = createFileRoute("/media/$projectId/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[0-9a-f-]{36}$/i.test(params.projectId) || !/^[\w.-]{1,120}$/.test(params.file)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("site-media").createSignedUrl(`${params.projectId}/${params.file}`, 60 * 60 * 6);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(null, { status: 302, headers: { location: data.signedUrl, "cache-control": "public, max-age=3600" } });
      },
    },
  },
});
