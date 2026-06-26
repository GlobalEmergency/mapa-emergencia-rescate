"use client";

import { useEffect } from "react";

const STORAGE_KEY = "terremoto:theme";

/**
 * Aplica modo claro/oscuro en `<html data-dark>` según preferencia del sistema
 * o elección guardada en localStorage.
 */
export default function ThemeProvider() {
  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (stored !== "light" && prefersDark);
    root.dataset.dark = dark ? "true" : "false";

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(STORAGE_KEY)) return;
      root.dataset.dark = e.matches ? "true" : "false";
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return null;
}

/** Alterna tema claro/oscuro y persiste la elección. */
export function toggleTheme(): void {
  const root = document.documentElement;
  const next = root.dataset.dark !== "true";
  root.dataset.dark = next ? "true" : "false";
  localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
}
