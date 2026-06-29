"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <div style={{ fontSize: "3rem" }} aria-hidden>
            ⚠️
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0" }}>
            Algo salió mal
          </h1>
          <p style={{ color: "#475569", lineHeight: 1.5 }}>
            La aplicación tuvo un error inesperado. Recarga la página para
            continuar.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "9999px",
              padding: "0.625rem 1.25rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
