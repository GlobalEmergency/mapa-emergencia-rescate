import { memo } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { REPORT_TYPES, type EmergencyReport } from "@/lib/types";
import { mediaUrl } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { xShareHref, whatsappShareHref } from "@/lib/share";
import LinkText from "@/components/ui/LinkText";
import { markerIcon } from "./icons";

/** Pin de reporte de emergencia con su popup. Memoizado: la lista re-renderiza
 * al refrescar datos, pero un reporte sin cambios no debe recrear su Marker. */
function ReportMarkerBase({
	report,
	confirmed,
	isAdmin,
	onConfirm,
	onResolve,
	markerRefs,
}: {
	report: EmergencyReport;
	confirmed: boolean;
	isAdmin: boolean;
	onConfirm: (id: string) => void;
	onResolve: (id: string) => void;
	markerRefs: React.MutableRefObject<Map<string, L.Marker>>;
}) {
	return (
		<Marker
			key={report.id}
			position={[report.lat, report.lng]}
			icon={markerIcon(report.type)}
			ref={(marker) => {
				if (marker) markerRefs.current.set(report.id, marker);
				else markerRefs.current.delete(report.id);
			}}
		>
			<Popup>
				<div className="space-y-1.5 text-sm">
					<p className="font-semibold">
						{REPORT_TYPES[report.type].emoji}{" "}
						{REPORT_TYPES[report.type].label}
					</p>
					{report.photoUrl && (
						<a
							href={report.photoUrl}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Ver foto en grande"
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={mediaUrl(report.photoUrl)}
								alt="Foto del reporte"
								loading="lazy"
								className="my-1 max-h-52 w-full rounded-lg bg-slate-100 object-contain"
							/>
						</a>
					)}
					<p className="font-medium">{report.place}</p>
					{report.affected > 0 && (
						<p className="text-xs text-slate-600">
							Personas afectadas/atrapadas: {report.affected}
						</p>
					)}
					{report.needs && (
						<p className="break-words text-slate-600">
							Necesidad: <LinkText text={report.needs} />
						</p>
					)}
					<p
						className="text-xs text-slate-500"
						title={new Date(report.createdAt).toLocaleString("es-VE")}
					>
						🕒 {timeAgo(report.createdAt)} ·{" "}
						{new Date(report.createdAt).toLocaleString("es-VE")}
					</p>
					<div className="mt-2 flex gap-1.5">
						<a
							href={xShareHref(report)}
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
							href={whatsappShareHref(report)}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Compartir por WhatsApp"
							style={{ color: "#0f172a" }}
							className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#4ade80] px-2 py-1.5 text-xs font-bold no-underline transition hover:brightness-95"
						>
							WhatsApp
						</a>
					</div>
					<button
						type="button"
						onClick={() => onConfirm(report.id)}
						disabled={confirmed}
						title={
							confirmed
								? "Ya confirmaste este reporte"
								: "Yo también veo esto"
						}
						className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition ${
							confirmed
								? "border-slate-200 bg-slate-100 text-slate-500"
								: "border-sky-200 text-sky-700 hover:bg-sky-50"
						}`}
					>
						✓ Yo también veo esto · {report.confirmations}
					</button>
					{isAdmin && (
						<button
							type="button"
							onClick={() => onResolve(report.id)}
							className="mt-1 block text-xs font-medium text-emerald-700 underline"
						>
							Marcar como atendido (limpiar del mapa)
						</button>
					)}
				</div>
			</Popup>
		</Marker>
	);
}

export const ReportMarker = memo(ReportMarkerBase);
