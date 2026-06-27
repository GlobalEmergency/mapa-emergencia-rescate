import { getMissingResolutionPhoto } from "@/lib/missing";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/missing/{id}/resolution-photo:
 *   get:
 *     tags: [missing]
 *     summary: Devuelve la foto de resolución de una persona localizada (bytes o redirección al CDN)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID de la persona desaparecida
 *     responses:
 *       200:
 *         description: Imagen de resolución (bytes binarios)
 *         content:
 *           image/*: {}
 *       302:
 *         description: Redirección al CDN (R2) donde está alojada la foto migrada
 *       404:
 *         description: No se encontró foto de resolución para la persona
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photo = await getMissingResolutionPhoto(id);
  if (!photo) {
    return new Response("No encontrada", { status: 404 });
  }
  // Foto migrada a R2: redirigimos al CDN en vez de servir bytes.
  if ("redirectTo" in photo) {
    return Response.redirect(photo.redirectTo, 302);
  }
  return new Response(new Uint8Array(photo.buffer), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
