import { getSql, hasDbEnv } from "./db";

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  createdAt: number;
}

const MAX_NAME = 40;
const MAX_TEXT = 500;
const FETCH_LIMIT = 100;

let _schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    const sql = getSql();
    _schemaReady = sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Anónimo',
        text TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )
    `.then(() => undefined);
  }
  return _schemaReady;
}

const memoryStore = new Map<string, ChatMessage>();

type ChatRow = {
  id: string;
  name: string;
  text: string;
  created_at: string | number;
};

function rowToMessage(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    name: row.name,
    text: row.text,
    createdAt: Number(row.created_at),
  };
}

function sanitizeName(name: string | undefined | null): string {
  const trimmed = (name ?? "").trim().slice(0, MAX_NAME);
  return trimmed || "Anónimo";
}

/** Devuelve los mensajes más recientes en orden cronológico (antiguo → nuevo). */
export async function listMessages(): Promise<ChatMessage[]> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT id, name, text, created_at
      FROM chat_messages
      ORDER BY created_at DESC
      LIMIT ${FETCH_LIMIT}
    `) as ChatRow[];
    return rows.map(rowToMessage).reverse();
  }
  return [...memoryStore.values()]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-FETCH_LIMIT);
}

export async function addMessage(input: {
  name?: string;
  text: string;
}): Promise<ChatMessage> {
  if (!hasDbEnv() && process.env.VERCEL) {
    throw new Error("DATABASE_URL no configurada: la persistencia es obligatoria.");
  }
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    name: sanitizeName(input.name),
    text: input.text.trim().slice(0, MAX_TEXT),
    createdAt: Date.now(),
  };
  if (hasDbEnv()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO chat_messages (id, name, text, created_at)
      VALUES (${message.id}, ${message.name}, ${message.text}, ${message.createdAt})
    `;
  } else {
    memoryStore.set(message.id, message);
  }
  return message;
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
