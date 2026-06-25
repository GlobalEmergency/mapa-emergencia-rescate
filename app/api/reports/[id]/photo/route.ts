import { getReportPhoto } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photo = await getReportPhoto(id);
  if (!photo) {
    return new Response("No encontrada", { status: 404 });
  }
  // La foto de un reporte no cambia: caché agresiva en el CDN.
  return new Response(new Uint8Array(photo.buffer), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
