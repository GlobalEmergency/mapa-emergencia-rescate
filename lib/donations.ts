import { sql, desc } from "drizzle-orm";
import { getDb, hasDbEnv, schema } from "./drizzle";
import {
  MONTHLY_DONATION_GOAL_CENTS,
  type Donation,
  type DonationStats,
} from "./donation-shared";

const { donations } = schema;

export {
  PAYPAL_DONATION_URL,
  MIN_DONATION_CENTS,
  MAX_DONATION_CENTS,
  MONTHLY_DONATION_GOAL_CENTS,
  validateDonationInput,
  formatDonationUsd,
} from "./donation-shared";
export type {
  Donation,
  DonationStats,
  DonationMonthlyStats,
} from "./donation-shared";

const DAY_MS = 24 * 60 * 60 * 1000;

const memoryDonations: Donation[] = [];

// Tipo de fila que devuelve Drizzle para las columnas que seleccionamos.
type DonationRow = Pick<
  typeof donations.$inferSelect,
  "id" | "name" | "amountUsd" | "createdAt"
>;

function rowToDonation(row: DonationRow): Donation {
  return {
    id: row.id,
    name: row.name,
    amountCents: Number(row.amountUsd),
    createdAt: Number(row.createdAt),
  };
}

// Columnas comunes a las listas (sin exponer ip_hash/user_agent).
const listColumns = {
  id: donations.id,
  name: donations.name,
  amountUsd: donations.amountUsd,
  createdAt: donations.createdAt,
} as const;

function computeStats(donations: Donation[]): DonationStats {
  const now = Date.now();
  let last24hCount = 0;
  let last24hCents = 0;
  let totalCents = 0;

  for (const donation of donations) {
    totalCents += donation.amountCents;
    if (now - donation.createdAt <= DAY_MS) {
      last24hCount += 1;
      last24hCents += donation.amountCents;
    }
  }

  return {
    count: donations.length,
    totalCents,
    last24hCount,
    last24hCents,
  };
}

export async function recordDonation(input: {
  name: string;
  amountCents: number;
  ipHash?: string | null;
  userAgent?: string | null;
}): Promise<Donation> {
  const donation: Donation = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    amountCents: input.amountCents,
    createdAt: Date.now(),
    status: "intent",
  };

  if (hasDbEnv()) {
    await getDb().insert(donations).values({
      id: donation.id,
      name: donation.name,
      amountUsd: donation.amountCents,
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: donation.createdAt,
      status: donation.status,
    });
    return donation;
  }

  memoryDonations.unshift(donation);
  return donation;
}

export async function listRecentDonations(limit = 30): Promise<Donation[]> {
  if (hasDbEnv()) {
    const rows = await getDb()
      .select(listColumns)
      .from(donations)
      .orderBy(desc(donations.createdAt))
      .limit(limit);
    return rows.map(rowToDonation);
  }

  return memoryDonations.slice(0, limit);
}

export async function listAllDonations(): Promise<Donation[]> {
  if (hasDbEnv()) {
    const rows = await getDb()
      .select(listColumns)
      .from(donations)
      .orderBy(desc(donations.createdAt));
    return rows.map(rowToDonation);
  }

  return [...memoryDonations];
}

function startOfCurrentMonthMs(now = Date.now()): number {
  const date = new Date(now);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export async function getMonthlyDonationStats(): Promise<{
  raisedCents: number;
  goalCents: number;
}> {
  const goalCents = MONTHLY_DONATION_GOAL_CENTS;
  const monthStart = startOfCurrentMonthMs();

  if (hasDbEnv()) {
    const rows = await getDb()
      .select({
        raisedCents: sql<number>`COALESCE(SUM(${donations.amountUsd}), 0)::int`,
      })
      .from(donations)
      .where(
        sql`${donations.createdAt} >= ${monthStart} AND ${donations.status} = 'completed'`,
      );

    return {
      raisedCents: Number(rows[0]?.raisedCents ?? 0),
      goalCents,
    };
  }

  const raisedCents = memoryDonations
    .filter(
      (donation) =>
        donation.status === "completed" && donation.createdAt >= monthStart,
    )
    .reduce((sum, donation) => sum + donation.amountCents, 0);

  return { raisedCents, goalCents };
}

export async function getDonationStats(): Promise<DonationStats> {
  if (hasDbEnv()) {
    const cutoff = Date.now() - DAY_MS;
    const rows = await getDb()
      .select({
        count: sql<number>`COUNT(*)::int`,
        totalCents: sql<number>`COALESCE(SUM(${donations.amountUsd}), 0)::int`,
        last24hCount: sql<number>`COUNT(*) FILTER (WHERE ${donations.createdAt} >= ${cutoff})::int`,
        last24hCents: sql<number>`COALESCE(SUM(${donations.amountUsd}) FILTER (WHERE ${donations.createdAt} >= ${cutoff}), 0)::int`,
      })
      .from(donations);

    const row = rows[0];
    return {
      count: Number(row?.count ?? 0),
      totalCents: Number(row?.totalCents ?? 0),
      last24hCount: Number(row?.last24hCount ?? 0),
      last24hCents: Number(row?.last24hCents ?? 0),
    };
  }

  return computeStats(memoryDonations);
}
