import { getSql, hasDbEnv } from "./db";

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

let _schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    const sql = getSql();
    _schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          read BOOLEAN NOT NULL DEFAULT false,
          ip_hash TEXT,
          created_at BIGINT NOT NULL
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx
        ON contact_messages (created_at DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS contact_messages_unread_idx
        ON contact_messages (read, created_at DESC)
      `;
    })();
  }
  return _schemaReady;
}

interface ContactRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  created_at: number;
}

function rowToMessage(row: ContactRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    read: Boolean(row.read),
    createdAt: Number(row.created_at),
  };
}

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
    await ensureSchema();
    await getSql()`
      INSERT INTO contact_messages (
        id, name, email, subject, message, read, ip_hash, created_at
      )
      VALUES (
        ${row.id},
        ${row.name},
        ${row.email},
        ${row.subject},
        ${row.message},
        false,
        ${input.ipHash ?? null},
        ${row.createdAt}
      )
    `;
    return row;
  }

  memoryMessages.unshift(row);
  return row;
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT id, name, email, subject, message, read, created_at
      FROM contact_messages
      ORDER BY created_at DESC
    `) as ContactRow[];
    return rows.map(rowToMessage);
  }

  return [...memoryMessages];
}

export async function getContactStats(): Promise<ContactStats> {
  if (hasDbEnv()) {
    await ensureSchema();
    const cutoff = Date.now() - DAY_MS;
    const rows = (await getSql()`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE read = false)::int AS unread,
        COUNT(*) FILTER (WHERE created_at >= ${cutoff})::int AS last24h
      FROM contact_messages
    `) as { total: number; unread: number; last24h: number }[];

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
    await ensureSchema();
    const rows = (await getSql()`
      UPDATE contact_messages SET read = true
      WHERE id = ${id}
      RETURNING id
    `) as { id: string }[];
    return rows.length > 0;
  }

  const item = memoryMessages.find((m) => m.id === id);
  if (!item) return false;
  item.read = true;
  return true;
}
