import { sql, desc } from "drizzle-orm";
import { getDb, hasDbEnv, schema } from "./drizzle";

const { contactMessages } = schema;

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface ContactStats {
  total: number;
  unread: number;
  last24h: number;
}

const MAX_NAME = 80;
const MAX_EMAIL = 120;
const MAX_SUBJECT = 120;
const MAX_MESSAGE = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

const memoryMessages: ContactMessage[] = [];

// Tipo de fila que devuelve Drizzle para las columnas que seleccionamos.
type ContactRow = Pick<
  typeof contactMessages.$inferSelect,
  "id" | "name" | "email" | "subject" | "message" | "read" | "createdAt"
>;

function rowToMessage(row: ContactRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    read: Boolean(row.read),
    createdAt: Number(row.createdAt),
  };
}

// Columnas comunes a las listas (sin exponer ip_hash).
const listColumns = {
  id: contactMessages.id,
  name: contactMessages.name,
  email: contactMessages.email,
  subject: contactMessages.subject,
  message: contactMessages.message,
  read: contactMessages.read,
  createdAt: contactMessages.createdAt,
} as const;

export function validateContactInput(input: {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
}):
  | { ok: true; name: string; email: string; subject: string; message: string }
  | { ok: false; error: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";

  if (name.length < 1 || name.length > MAX_NAME) {
    return { ok: false, error: "El nombre debe tener entre 1 y 80 caracteres." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > MAX_EMAIL) {
    return { ok: false, error: "Ingresa un correo válido." };
  }
  if (subject.length < 1 || subject.length > MAX_SUBJECT) {
    return {
      ok: false,
      error: "El asunto debe tener entre 1 y 120 caracteres.",
    };
  }
  if (message.length < 1 || message.length > MAX_MESSAGE) {
    return {
      ok: false,
      error: "El mensaje debe tener entre 1 y 2000 caracteres.",
    };
  }

  return { ok: true, name, email, subject, message };
}

export async function createContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  ipHash?: string | null;
}): Promise<ContactMessage> {
  const row: ContactMessage = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.message,
    read: false,
    createdAt: Date.now(),
  };

  if (hasDbEnv()) {
    await getDb().insert(contactMessages).values({
      id: row.id,
      name: row.name,
      email: row.email,
      subject: row.subject,
      message: row.message,
      read: false,
      ipHash: input.ipHash ?? null,
      createdAt: row.createdAt,
    });
    return row;
  }

  memoryMessages.unshift(row);
  return row;
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  if (hasDbEnv()) {
    const rows = await getDb()
      .select(listColumns)
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));
    return rows.map(rowToMessage);
  }

  return [...memoryMessages];
}

export async function getContactStats(): Promise<ContactStats> {
  if (hasDbEnv()) {
    const cutoff = Date.now() - DAY_MS;
    const rows = await getDb()
      .select({
        total: sql<number>`COUNT(*)::int`,
        unread: sql<number>`COUNT(*) FILTER (WHERE ${contactMessages.read} = false)::int`,
        last24h: sql<number>`COUNT(*) FILTER (WHERE ${contactMessages.createdAt} >= ${cutoff})::int`,
      })
      .from(contactMessages);

    const row = rows[0];
    return {
      total: Number(row?.total ?? 0),
      unread: Number(row?.unread ?? 0),
      last24h: Number(row?.last24h ?? 0),
    };
  }

  const now = Date.now();
  return {
    total: memoryMessages.length,
    unread: memoryMessages.filter((m) => !m.read).length,
    last24h: memoryMessages.filter((m) => now - m.createdAt <= DAY_MS).length,
  };
}

export async function markContactMessageRead(id: string): Promise<boolean> {
  if (hasDbEnv()) {
    // El builder de update().returning() no resuelve sobre el tipo unión de
    // drivers (neon-http | node-postgres); usamos el escape `sql` preservando
    // la semántica exacta del UPDATE ... RETURNING id.
    const result = await getDb().execute(
      sql`UPDATE ${contactMessages} SET ${contactMessages.read} = true WHERE ${contactMessages.id} = ${id} RETURNING ${contactMessages.id}`,
    );
    const rows = (Array.isArray(result) ? result : result.rows) as unknown[];
    return rows.length > 0;
  }

  const item = memoryMessages.find((m) => m.id === id);
  if (!item) return false;
  item.read = true;
  return true;
}
