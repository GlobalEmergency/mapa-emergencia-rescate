"use client";

import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";

const LANGS = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "es", label: "Español", flag: "🇻🇪" },
] as const;

type LangCode = (typeof LANGS)[number]["code"];

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement: new (
          opts: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay: boolean;
          },
          id: string,
        ) => void;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

function getCookieLang(): LangCode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/googtrans=\/es\/(\w{2})/);
  return (match?.[1] as LangCode) ?? null;
}

function setGoogleTranslateLang(targetLang: string) {
  const value = targetLang === "es" ? "" : `/es/${targetLang}`;
  const domain = window.location.hostname;
  document.cookie = `googtrans=${value};path=/`;
  document.cookie = `googtrans=${value};domain=.${domain};path=/`;
  window.location.reload();
}

export default function TranslateWidget() {
  const [open, setOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<LangCode>("es");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lang = getCookieLang();
    if (lang && LANGS.some((l) => l.code === lang)) {
      setActiveLang(lang as LangCode);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (document.getElementById("google-translate-script")) return;
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement(
        { pageLanguage: "es", includedLanguages: "en,pt", autoDisplay: false },
        "google-translate-container",
      );
    };
    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const current = LANGS.find((l) => l.code === activeLang) ?? LANGS[2];

  return (
    <div ref={ref} className="relative">
      <div id="google-translate-container" className="hidden" aria-hidden />

      <button
        type="button"
        aria-label="Cambiar idioma"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:gap-1.5 lg:px-2 lg:text-[13px] xl:px-2.5"
      >
        <Languages aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="hidden xl:inline">{current.flag} {current.label}</span>
        <span className="hidden lg:inline xl:hidden">{current.flag}</span>
        <span className="lg:hidden">ES</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-[2000] min-w-[9rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setOpen(false);
                setActiveLang(lang.code);
                setGoogleTranslateLang(lang.code);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium transition hover:bg-slate-50 ${
                activeLang === lang.code
                  ? "bg-slate-50 font-semibold text-slate-900"
                  : "text-slate-700"
              }`}
            >
              <span aria-hidden>{lang.flag}</span>
              {lang.label}
              {activeLang === lang.code && (
                <span className="ml-auto text-xs text-slate-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
