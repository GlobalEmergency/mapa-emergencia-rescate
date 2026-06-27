"use client";

import { useMemo } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import edificiosData from "@/data/derived/edificios-afectados.json";
import { REPORT_TYPES } from "@/lib/types";
import LinkText from "./LinkText";
import { severityMeta } from "@/lib/severity";
import { xShareHrefFor, whatsappShareHrefFor } from "@/lib/share";
import {
	type EdificioAfectado,
	EDIFICIOS_SNAPSHOT_DATE,
	EDIFICIOS_SOURCE_LABEL,
	EDIFICIOS_SOURCE_URL,
} from "@/lib/edificios";

const edificios = edificiosData as EdificioAfectado[];

/** Texto para compartir un edificio (sin el enlace; lo añade el destino). */
function edificioShareText(e: EdificioAfectado): string {
	const s = severityMeta(e.severity);
	const parts = [`🏢 Edificio afectado (${s.label}): ${e.place}`];
	if (e?.note?.trim()) parts.push(e.note.trim());
	parts.push("Mapa de Emergencia y Rescate · Terremoto Venezuela");
	return parts.join(" — ");
}

// Todos los edificios usan el mismo marcador de "Edificación" 🏢 (mismo estilo
// que los reportes tipo building). La severidad va como dato en el popup.
const buildingMeta = REPORT_TYPES.building;

function createEdificioIcon() {
	return L.divIcon({
		className: "emergency-marker",
		html: `<span class="emergency-pin" style="background:${buildingMeta.color}"><span class="emergency-pin__icon">${buildingMeta.icon}</span></span>`,
		iconSize: [34, 34],
		iconAnchor: [17, 34],
		popupAnchor: [0, -30],
	});
}

/** Capa de solo-lectura con los edificios dañados importados de
 * sismovenezuela.org. Popup al click con place/daño/nota/foto y atribución. */
export default function EdificiosAfectadosLayer() {
	const edificioIcon = useMemo(() => createEdificioIcon(), []);

	return (
		<>
			{edificios.map((e) => {
				const s = severityMeta(e.severity);
				return (
					<Marker key={e.id} position={[e.lat, e.lng]} icon={edificioIcon}>
						<Popup>
							<div className="space-y-1.5 text-sm">
								<p className="flex items-center gap-1.5 font-semibold">
									<span aria-hidden>{buildingMeta.icon}</span>
									<span>Edificio afectado</span>
								</p>
								<p className="font-medium">{e.place}</p>
								<p className="text-xs">
									Daño: <strong style={{ color: s.text }}>{s.label}</strong>
								</p>
								{e.note && (
									<p className="break-words text-slate-600">
										<LinkText text={e.note} />
									</p>
								)}
								{e.photo_url && (
									<a
										href={e.photo_url}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Ver foto en grande"
									>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={e.photo_url}
											alt={`Foto del edificio: ${e.place}`}
											loading="lazy"
											className="my-1 max-h-52 w-full rounded-lg bg-slate-100 object-contain"
										/>
									</a>
								)}
								<div className="mt-1 flex gap-1.5">
									<a
										href={xShareHrefFor(e, edificioShareText(e))}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Compartir en X"
										style={{ color: "#ffffff" }}
										className="flex flex-1 items-center justify-center gap-1 rounded-md bg-black px-2 py-1.5 text-xs font-semibold no-underline transition hover:opacity-90"
									>
										<span aria-hidden className="font-bold">
											𝕏
										</span>{" "}
										Compartir
									</a>
									<a
										href={whatsappShareHrefFor(e, edificioShareText(e))}
										target="_blank"
										rel="noopener noreferrer"
										aria-label="Compartir por WhatsApp"
										style={{ color: "#0f172a" }}
										className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#4ade80] px-2 py-1.5 text-xs font-bold no-underline transition hover:brightness-95"
									>
										WhatsApp
									</a>
								</div>
								<p className="text-[11px] text-slate-500">
									Fuente:{" "}
									<a
										href={EDIFICIOS_SOURCE_URL}
										target="_blank"
										rel="noopener noreferrer"
										className="font-semibold text-amber-700 underline"
									>
										{EDIFICIOS_SOURCE_LABEL}
									</a>{" "}
									· datos al {EDIFICIOS_SNAPSHOT_DATE}
								</p>
							</div>
						</Popup>
					</Marker>
				);
			})}
		</>
	);
}
