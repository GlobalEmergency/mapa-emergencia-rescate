import { ImageResponse } from "next/og";
import { listReports } from "@/lib/store";
import { listMissing } from "@/lib/missing";
import { REPORT_TYPES, REPORT_TYPE_KEYS, type ReportType } from "@/lib/types";

export const runtime = "nodejs";
export const alt =
  "Mapa de Emergencia y Rescate · Terremoto en Venezuela. Reporte ciudadano en tiempo real.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// La imagen se regenera en el edge cada 60 s para reflejar las métricas
// actuales sin recargar la DB en cada compartido.
export const revalidate = 60;

export default async function OpengraphImage() {
  let totalReports = 0;
  let totalMissing = 0;
  let totalAffected = 0;
  const byType = Object.fromEntries(
    REPORT_TYPE_KEYS.map((key) => [key, 0]),
  ) as Record<ReportType, number>;
  try {
    const [reports, missing] = await Promise.all([listReports(), listMissing()]);
    totalReports = reports.length;
    totalMissing = missing.length;
    for (const r of reports) {
      totalAffected += r.affected;
      if (byType[r.type] !== undefined) byType[r.type] += 1;
    }
  } catch {
    // Si la DB no responde, mostramos la imagen base sin números.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 70px",
          background:
            "linear-gradient(135deg, #fef2f2 0%, #fff 50%, #f1f5f9 100%)",
          fontFamily: "system-ui, sans-serif",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#dc2626",
              color: "white",
              fontSize: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🚨
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#dc2626",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Mapa Emergencia VE
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            marginTop: 30,
            color: "#0f172a",
            maxWidth: 1000,
          }}
        >
          Mapa de Emergencia y Rescate · Terremoto en Venezuela
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#475569",
            marginTop: 16,
            maxWidth: 1000,
          }}
        >
          Reporte ciudadano en tiempo real para coordinar rescates, suministros
          y personas desaparecidas.
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: "auto",
          }}
        >
          <Stat label="Reportes activos" value={totalReports} accent="#dc2626" />
          <Stat label="Personas afectadas" value={totalAffected} accent="#0f172a" />
          <Stat
            label="Personas desaparecidas"
            value={totalMissing}
            accent="#9333ea"
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          {REPORT_TYPE_KEYS.map((type) => (
            <div
              key={type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: 20,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: REPORT_TYPES[type].color,
                  color: "white",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {REPORT_TYPES[type].icon}
              </div>
              <span style={{ color: "#475569" }}>{REPORT_TYPES[type].label}:</span>
              <span style={{ fontWeight: 700 }}>{byType[type]}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 22,
            color: "#64748b",
            fontSize: 18,
          }}
        >
          <span>terremotovenezuela.app</span>
          <span>Hecho por voluntarios · Código abierto</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: "18px 26px",
        minWidth: 220,
      }}
    >
      <span style={{ fontSize: 16, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 56, fontWeight: 800, color: accent, lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}
