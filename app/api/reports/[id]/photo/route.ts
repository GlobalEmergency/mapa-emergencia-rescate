import { getReportPhoto } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/reports/{id}/photo:
 *   get:
 *     tags: [reports]
 *     summary: Devuelve la foto de un reporte (bytes o redirección al CDN)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID del reporte
 *     responses:
 *       200:
 *         description: Imagen del reporte servida como bytes
 *         content:
 *           image/*: {}
 *       302:
 *         description: Foto migrada a R2; redirección al CDN
 *       404:
 *         description: Foto no encontrada
 *         content:
 *           text/plain: {}
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photo = await getReportPhoto(id);
  if (!photo) {
    return new Response("No encontrada", { status: 404 });
  }
  // Foto migrada a R2: redirigimos al CDN en vez de servir bytes.
  if ("redirectTo" in photo) {
    return Response.redirect(photo.redirectTo, 302);
  }
  // La foto de un reporte no cambia: caché agresiva en el CDN.
  return new Response(new Uint8Array(photo.buffer), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
