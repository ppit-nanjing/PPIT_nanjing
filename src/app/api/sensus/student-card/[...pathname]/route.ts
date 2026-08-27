import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { hasModuleAccess } from "@/lib/admin-scope";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pathname: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { pathname: segments } = await params;
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const pathname = segments.join("/");
  if (!pathname.startsWith("sensus/")) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const ownsCard = pathname.startsWith(`sensus/${session.user.id}/`);
  const canReviewCards = hasModuleAccess(session.user.adminScope, "reports");
  if (!ownsCard && !canReviewCards) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const blob = await get(pathname, { access: "private" });
  if (!blob?.stream) return Response.json({ error: "Not found" }, { status: 404 });

  return new Response(blob.stream, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(blob.blob.size),
      "Content-Type": blob.blob.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}