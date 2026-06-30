import type { Request, Response } from "express";
import { z } from "zod";
import { badGateway, badRequest, serviceUnavailable } from "@/lib/errors";
import { NEED_CATEGORIES, NEED_PRIORITIES, type NewNeed } from "../../domain/need";
import {
  NeedPublishError,
  NeedPublishingDisabledError,
} from "../../domain/need-publisher";
import {
  NeedLocationNotFoundError,
  type PublishNeed,
} from "../../application/publish-need";

// Origen del `author`, fijado por el servidor (nunca se acepta del cliente).
const AUTHOR_SOURCE = "terremotovenezuela.app";

const itemSchema = z.object({
  name: z.string().trim().min(1, "Indica qué necesitas.").max(120),
  quantity: z.coerce.number().int().min(1).max(100000),
  unit: z.string().trim().max(40).optional(),
  category: z.enum(NEED_CATEGORIES),
});

// Contacto opcional del solicitante: el cliente solo aporta los datos.
const authorSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email("Correo inválido.").max(160).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  note: z.string().trim().min(1).max(280).optional(),
});

export const publishNeedBody = z.object({
  title: z.string().trim().min(1, "Indica un título.").max(140),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(NEED_PRIORITIES),
  address: z.string().trim().min(3, "Indica una dirección o zona.").max(200),
  items: z.array(itemSchema).min(1, "Agrega al menos un artículo.").max(20),
  author: authorSchema.optional(),
});

type PublishNeedInput = z.infer<typeof publishNeedBody>;

function toNewNeed(input: PublishNeedInput): NewNeed {
  return {
    title: input.title,
    description: input.description ?? null,
    priority: input.priority,
    address: input.address,
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit ?? null,
      category: item.category,
    })),
    author: input.author
      ? {
          name: input.author.name ?? null,
          email: input.author.email ?? null,
          phone: input.author.phone ?? null,
          note: input.author.note ?? null,
          verified: false, // captación anónima: la identidad no se verifica
          source: AUTHOR_SOURCE,
        }
      : null,
  };
}

export function makePublishNeedHandler(publishNeed: PublishNeed) {
  return async (req: Request, res: Response): Promise<void> => {
    const input = req.body as PublishNeedInput;
    try {
      const ref = await publishNeed.execute(toNewNeed(input));
      res.status(201).json({ need: ref });
    } catch (error) {
      if (error instanceof NeedPublishingDisabledError) {
        throw serviceUnavailable(error.message);
      }
      if (error instanceof NeedLocationNotFoundError) {
        throw badRequest(
          "No pudimos ubicar esa dirección. Sé más específico (calle, sector, ciudad).",
        );
      }
      if (error instanceof NeedPublishError) {
        throw badGateway(error.message);
      }
      throw error;
    }
  };
}
