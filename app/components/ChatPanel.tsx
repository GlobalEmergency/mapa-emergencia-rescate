"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLowBandwidthMode } from "./useLowBandwidthMode";

interface ChatMessage {
  id: string;
  name: string;
  text: string;
  createdAt: number;
}

const POLL_INTERVAL_MS = 5000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 30_000;
const ADMIN_STORAGE_KEY = "emergency:adminToken";
const NAME_STORAGE_KEY = "emergency:chatName";
const MAX_TEXT = 500;

export default function ChatPanel({ embedded = false }: { embedded?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (localStorage.getItem(NAME_STORAGE_KEY) ?? ""),
  );
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );

  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  const fetchMessages = useCallback(async () => {
    setAdminToken(sessionStorage.getItem(ADMIN_STORAGE_KEY));
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // se reintenta en el siguiente ciclo
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      fetchMessages();
      interval = setInterval(fetchMessages, network.pollIntervalMs);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchMessages, network.pollIntervalMs]);

  useEffect(() => {
    if (atBottomRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  const handleSend = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      const trimmed = text.trim();
      if (!trimmed) return;
      setSending(true);
      localStorage.setItem(NAME_STORAGE_KEY, name.trim());
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), text: trimmed }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "No se pudo enviar.");
        setText("");
        atBottomRef.current = true;
        if (data.message) {
          setMessages((prev) =>
            prev.some((m) => m.id === data.message.id)
              ? prev
              : [...prev, data.message],
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar.");
      } finally {
        setSending(false);
      }
    },
    [text, name],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!adminToken) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
      await fetch(`/api/chat/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken },
      }).catch(() => {});
    },
    [adminToken],
  );

  return (
    <section id="chat" className="mx-auto w-full max-w-7xl px-4 pb-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {!embedded && (
          <>
            <h2 className="text-lg font-bold text-slate-900">
              🤝 Espacio de voluntarios
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Espacio de intercambio de información entre voluntarios. Coordínense,
              compartan información verificada y ofrezcan o pidan apoyo. Sean
              respetuosos: no compartan datos sensibles ni difundan rumores sin
              confirmar.
            </p>
          </>
        )}

        <div
          ref={listRef}
          onScroll={handleScroll}
          className={`h-[60vh] max-h-[420px] min-h-[280px] space-y-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 sm:h-[400px] sm:max-h-none ${embedded ? "mt-0" : "mt-4"}`}
        >
          {messages.length === 0 ? (
            <p className="grid h-full place-items-center text-sm text-slate-400">
              Aún no hay mensajes. ¡Escribe el primero!
            </p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="group flex items-start gap-2">
                <div className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {message.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {new Date(message.createdAt).toLocaleTimeString("es-VE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
                    {message.text}
                  </p>
                </div>
                {adminToken && (
                  <button
                    type="button"
                    onClick={() => handleDelete(message.id)}
                    aria-label="Borrar mensaje"
                    className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md text-base text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="mt-3 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre (opcional)"
            maxLength={40}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 sm:max-w-xs"
          />
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend(e);
                }
              }}
              rows={2}
              maxLength={MAX_TEXT}
              placeholder="Escribe un mensaje…"
              className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="h-[42px] shrink-0 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {sending ? "…" : "Enviar"}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </section>
  );
}
