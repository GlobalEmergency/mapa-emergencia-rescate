"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo enviar el mensaje.");
      }

      setSuccess(data.message ?? "Mensaje enviado.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="e-inner space-y-4">
      <div className="e-form2">
        <div>
          <label
            htmlFor="contact-name"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Tu nombre
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            className="e-input py-2.5"
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Tu correo
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
            required
            className="e-input py-2.5"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-subject"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Asunto
        </label>
        <input
          id="contact-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={120}
          required
          placeholder="Ej.: Colaboración, reporte de error, prensa…"
          className="e-input py-2.5"
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Mensaje
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={6}
          required
          className="e-input min-h-[140px] resize-y py-2.5"
        />
      </div>

      <p className="text-xs text-[var(--etext2)]">
        Los mensajes llegan al buzón interno del equipo ({CONTACT_EMAIL}). No
        necesitas tener correo en ese dominio para escribirnos.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="e-btn e-btn-primary px-5 py-3 disabled:opacity-60"
      >
        {submitting ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
