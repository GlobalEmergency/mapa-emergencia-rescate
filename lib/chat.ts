import { asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb, hasDbEnv, schema } from "./drizzle";
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

const { chatMessages } = schema;

const MAX_NAME = 40;
const MAX_TEXT = 500;
const MAX_REPLY_PREVIEW = 120;
const FETCH_LIMIT = 200;

const memoryStore = new Map<string, ChatMessage>();

type ChatRow = typeof chatMessages.$inferSelect;

function rowToMessage(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    name: row.name,
    role: isValidChatRole(row.role) ? row.role : "citizen",
    text: row.text,
    replyTo: row.replyTo ?? null,
    replyPreview: row.replyPreview ?? null,
    threadRootId: row.threadRootId ?? row.id,
    threadBumpedAt: Number(row.threadBumpedAt),
    createdAt: Number(row.createdAt),
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
    let rows: ChatRow[];
    if (roleFilter) {
      // Cuando filtramos por rol, solo mostramos mensajes de ese rol y sus
      // respuestas directas, manteniendo el orden por hilo.
      rows = (await getDb()
        .select()
        .from(chatMessages)
        .where(
          or(
            eq(chatMessages.role, roleFilter),
            inArray(
              chatMessages.threadRootId,
              getDb()
                .select({ id: chatMessages.id })
                .from(chatMessages)
                .where(eq(chatMessages.role, roleFilter)),
            ),
          ),
        )
        .orderBy(desc(chatMessages.threadBumpedAt), asc(chatMessages.createdAt))
        .limit(FETCH_LIMIT)) as ChatRow[];
    } else {
      rows = (await getDb()
        .select()
        .from(chatMessages)
        .orderBy(desc(chatMessages.threadBumpedAt), asc(chatMessages.createdAt))
        .limit(FETCH_LIMIT)) as ChatRow[];
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
    // INSERT del mensaje + "bump" del hilo (sube en orden tipo WhatsApp) en una
    // sola sentencia atómica. El CTE no ve su propio INSERT, pero el mensaje
    // nuevo ya entra con thread_bumped_at = now, así que el estado final es el
    // mismo y evitamos un roundtrip y el riesgo de desync entre ambas queries.
    await getDb().execute(sql`
      WITH ins AS (
        INSERT INTO ${chatMessages}
          (id, name, role, text, reply_to, reply_preview,
           thread_root_id, thread_bumped_at, created_at)
        VALUES (
          ${message.id}, ${message.name}, ${message.role}, ${message.text},
          ${message.replyTo}, ${message.replyPreview},
          ${message.threadRootId}, ${message.threadBumpedAt}, ${message.createdAt}
        )
      )
      UPDATE ${chatMessages}
      SET thread_bumped_at = ${now}
      WHERE thread_root_id = ${message.threadRootId}
    `);
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
  const rows = await getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, id))
    .limit(1);
  return rows[0] ? rowToMessage(rows[0]) : null;
}

export async function removeMessage(id: string): Promise<boolean> {
  if (hasDbEnv()) {
    // El builder de delete().returning() no resuelve sobre el tipo unión de
    // drivers (neon-http | node-postgres); usamos el escape `sql` preservando
    // la semántica exacta del DELETE ... RETURNING id.
    const result = await getDb().execute(
      sql`DELETE FROM ${chatMessages} WHERE ${chatMessages.id} = ${id} RETURNING ${chatMessages.id}`,
    );
    const rows = (Array.isArray(result) ? result : result.rows) as unknown[];
    return rows.length > 0;
  }
  return memoryStore.delete(id);
}

export { MAX_TEXT, MAX_NAME };
