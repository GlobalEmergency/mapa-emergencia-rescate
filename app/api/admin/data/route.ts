import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { listReports, isPersistent } from "@/lib/store";
import { listMessages } from "@/lib/chat";
import { listMissing } from "@/lib/missing";
import { REPORT_TYPE_KEYS, type ReportType } from "@/lib/types";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [reports, messages, people] = await Promise.all([
    listReports(),
    listMessages(),
    listMissing({ includeFound: true }),
  ]);

  const now = Date.now();

  const byType = Object.fromEntries(
    REPORT_TYPE_KEYS.map((key) => [key, 0]),
  ) as Record<ReportType, number>;
  let totalAffected = 0;
  let reportsLastHour = 0;
  let reportsLast24h = 0;
  let reportsWithPhoto = 0;
  for (const report of reports) {
    if (byType[report.type] !== undefined) byType[report.type] += 1;
    totalAffected += report.affected;
    if (now - report.createdAt <= HOUR) reportsLastHour += 1;
    if (now - report.createdAt <= DAY) reportsLast24h += 1;
    if (report.photoUrl) reportsWithPhoto += 1;
  }

  const messagesLastHour = messages.filter(
    (m) => now - m.createdAt <= HOUR,
  ).length;

  const peopleWithPhoto = people.filter((p) => p.photoUrl).length;
  const peopleFound = people.filter((p) => p.status === "found").length;
  const peopleActive = people.length - peopleFound;

  return NextResponse.json(
    {
      generatedAt: now,
      persistent: isPersistent(),
      stats: {
        reports: {
          total: reports.length,
          byType,
          totalAffected,
          lastHour: reportsLastHour,
          last24h: reportsLast24h,
          withPhoto: reportsWithPhoto,
        },
        chat: {
          total: messages.length,
          lastHour: messagesLastHour,
        },
        missing: {
          total: people.length,
          active: peopleActive,
          found: peopleFound,
          withPhoto: peopleWithPhoto,
        },
      },
      reports,
      messages,
      people,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
