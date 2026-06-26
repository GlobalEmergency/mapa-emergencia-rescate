import { getSql, hasDbEnv } from "./db";
import {
  CHAT_ROLE_KEYS,
  CHAT_ROLES,
  getRoleMeta,
  isValidChatRole,
  type ChatMessage,
  type ChatRole,
  type ChatRoleMeta,
} from "./chat-types";

export type { ChatMessage, ChatRole, ChatRoleMeta };
export { CHAT_ROLES, CHAT_ROLE_KEYS, getRoleMeta, isValidChatRole };

const MAX_NAME = 40;
const MAX_TEXT = 500;
const MAX_REPLY_PREVIEW = 120;
const FETCH_LIMIT = 200;

let _schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    const sql = getSql();
    _schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL DEFAULT 'Anónimo',
          role TEXT NOT NULL DEFAULT 'citizen',
          text TEXT NOT NULL,
          reply_to TEXT,
          reply_preview TEXT,
          thread_root_id TEXT,
          thread_bumped_at BIGINT NOT NULL,
          created_at BIGINT NOT NULL
        )
      `;

      // Migración incremental: columnas nuevas para roles e hilos.
      await sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen'`;
      await sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to TEXT`;
      await sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_preview TEXT`;
      await sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS thread_root_id TEXT`;
      await sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS thread_bumped_at BIGINT`;

      // Asegurar que mensajes antiguos tengan thread_root_id y thread_bumped_at.
      await sql`UPDATE chat_messages SET thread_root_id = id WHERE thread_root_id IS NULL`;
      await sql`UPDATE chat_messages SET thread_bumped_at = created_at WHERE thread_bumped_at IS NULL`;

      // Índices para listado ordenado por hilo y búsqueda de respuestas.
      await sql`
        CREATE INDEX IF NOT EXISTS idx_chat_thread_bumped
        ON chat_messages (thread_bumped_at DESC, created_at ASC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_chat_reply
        ON chat_messages (reply_to) WHERE reply_to IS NOT NULL
      `;
    })();
  }
  return _schemaReady;
}

const memoryStore = new Map<string, ChatMessage>();

type ChatRow = {
  id: string;
  name: string;
  role: string;
  text: string;
  reply_to: string | null;
  reply_preview: string | null;
  thread_root_id: string | null;
  thread_bumped_at: string | number;
  created_at: string | number;
};

function rowToMessage(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    name: row.name,
    role: isValidChatRole(row.role) ? row.role : "citizen",
    text: row.text,
    replyTo: row.reply_to ?? null,
    replyPreview: row.reply_preview ?? null,
    threadRootId: row.thread_root_id ?? row.id,
    threadBumpedAt: Number(row.thread_bumped_at),
    createdAt: Number(row.created_at),
  };
}

function sanitizeName(name: string | undefined | null): string {
  const trimmed = (name ?? "").trim().slice(0, MAX_NAME);
  return trimmed || "Anónimo";
}

function normalizeRole(role: string | undefined | null): ChatRole {
  return isValidChatRole(role ?? "") ? (role as ChatRole) : "citizen";
}

function buildReplyPreview(name: string, text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const preview = clean.length > MAX_REPLY_PREVIEW
    ? clean.slice(0, MAX_REPLY_PREVIEW - 1) + "…"
    : clean;
  return `${sanitizeName(name)}: ${preview}`;
}

export interface ListMessagesOptions {
  /** Filtra mensajes por rol. Si no se indica, devuelve todos. */
  role?: ChatRole;
}

/**
 * Devuelve los mensajes agrupados por hilo y ordenados por la última actividad
 * de cada hilo (como WhatsApp). Dentro de un hilo los mensajes mantienen orden
 * cronológico.
 */
export async function listMessages(
  options: ListMessagesOptions = {},
): Promise<ChatMessage[]> {
  const roleFilter = options.role;

  if (hasDbEnv()) {
    await ensureSchema();
    const sql = getSql();

    let rows: ChatRow[];
    if (roleFilter) {
      // Cuando filtramos por rol, solo mostramos mensajes de ese rol y sus
      // respuestas directas, manteniendo el orden por hilo.
      rows = (await sql`
        SELECT m.*
        FROM chat_messages m
        WHERE m.role = ${roleFilter}
           OR m.thread_root_id IN (
             SELECT id FROM chat_messages WHERE role = ${roleFilter}
           )
        ORDER BY m.thread_bumped_at DESC, m.created_at ASC
        LIMIT ${FETCH_LIMIT}
      `) as ChatRow[];
    } else {
      rows = (await sql`
        SELECT id, name, role, text, reply_to, reply_preview,
               thread_root_id, thread_bumped_at, created_at
        FROM chat_messages
        ORDER BY thread_bumped_at DESC, created_at ASC
        LIMIT ${FETCH_LIMIT}
      `) as ChatRow[];
    }
    return rows.map(rowToMessage);
  }

  let values = [...memoryStore.values()];
  if (roleFilter) {
    const visibleRoots = new Set(
      values.filter((m) => m.role === roleFilter).map((m) => m.threadRootId),
    );
    values = values.filter((m) => visibleRoots.has(m.threadRootId));
  }
  return values
    .sort((a, b) => {
      if (a.threadBumpedAt !== b.threadBumpedAt) {
        return b.threadBumpedAt - a.threadBumpedAt;
      }
      return a.createdAt - b.createdAt;
    })
    .slice(0, FETCH_LIMIT);
}

export interface AddMessageInput {
  name?: string;
  text: string;
  role?: string;
  replyTo?: string | null;
}

export async function addMessage(input: AddMessageInput): Promise<ChatMessage> {
  if (!hasDbEnv() && process.env.VERCEL) {
    throw new Error("DATABASE_URL no configurada: la persistencia es obligatoria.");
  }

  const now = Date.now();
  const role = normalizeRole(input.role);
  const replyToId = input.replyTo ?? null;

  let threadRootId: string;
  let replyPreview: string | null = null;

  if (replyToId) {
    const parent = hasDbEnv()
      ? await getParentFromDb(replyToId)
      : memoryStore.get(replyToId) ?? null;
    if (parent) {
      threadRootId = parent.threadRootId ?? parent.id;
      replyPreview = buildReplyPreview(parent.name, parent.text);
    } else {
      threadRootId = replyToId;
    }
  } else {
    threadRootId = replyToId ?? "";
  }

  const message: ChatMessage = {
    id: crypto.randomUUID(),
    name: sanitizeName(input.name),
    role,
    text: input.text.trim().slice(0, MAX_TEXT),
    replyTo: replyToId,
    replyPreview,
    threadRootId,
    threadBumpedAt: now,
    createdAt: now,
  };

  // Si es mensaje raíz, su propio id es el root.
  if (!replyToId) {
    message.threadRootId = message.id;
  }

  if (hasDbEnv()) {
    await ensureSchema();
    const sql = getSql();
    // INSERT del mensaje + "bump" del hilo (sube en orden tipo WhatsApp) en una
    // sola sentencia atómica. El CTE no ve su propio INSERT, pero el mensaje
    // nuevo ya entra con thread_bumped_at = now, así que el estado final es el
    // mismo y evitamos un roundtrip y el riesgo de desync entre ambas queries.
    await sql`
      WITH ins AS (
        INSERT INTO chat_messages
          (id, name, role, text, reply_to, reply_preview,
           thread_root_id, thread_bumped_at, created_at)
        VALUES (
          ${message.id}, ${message.name}, ${message.role}, ${message.text},
          ${message.replyTo}, ${message.replyPreview},
          ${message.threadRootId}, ${message.threadBumpedAt}, ${message.createdAt}
        )
      )
      UPDATE chat_messages
      SET thread_bumped_at = ${now}
      WHERE thread_root_id = ${message.threadRootId}
    `;
  } else {
    memoryStore.set(message.id, message);
    for (const m of memoryStore.values()) {
      if (m.threadRootId === message.threadRootId) {
        m.threadBumpedAt = now;
      }
    }
  }

  return message;
}

async function getParentFromDb(id: string): Promise<ChatMessage | null> {
  const rows = (await getSql()`
    SELECT id, name, role, text, reply_to, reply_preview,
           thread_root_id, thread_bumped_at, created_at
    FROM chat_messages
    WHERE id = ${id}
    LIMIT 1
  `) as ChatRow[];
  return rows[0] ? rowToMessage(rows[0]) : null;
}

export async function removeMessage(id: string): Promise<boolean> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      DELETE FROM chat_messages WHERE id = ${id} RETURNING id
    `) as { id: string }[];
    return rows.length > 0;
  }
  return memoryStore.delete(id);
}

export { MAX_TEXT, MAX_NAME };
