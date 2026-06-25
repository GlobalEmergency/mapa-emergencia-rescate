import { getSql, hasDbEnv } from "./db";
import type { Donation, DonationStats } from "./donation-shared";

export {
  PAYPAL_DONATION_URL,
  MIN_DONATION_CENTS,
  MAX_DONATION_CENTS,
  validateDonationInput,
  formatDonationUsd,
} from "./donation-shared";
export type { Donation, DonationStats } from "./donation-shared";

interface DonationRow {
  id: string;
  name: string;
  amount_usd: number;
  created_at: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const memoryDonations: Donation[] = [];

let _schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    const sql = getSql();
    _schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS donations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          amount_usd INTEGER NOT NULL,
          ip_hash TEXT,
          user_agent TEXT,
          created_at BIGINT NOT NULL
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS donations_created_at_idx
        ON donations (created_at DESC)
      `;
    })();
  }
  return _schemaReady;
}

function rowToDonation(row: DonationRow): Donation {
  return {
    id: row.id,
    name: row.name,
    amountCents: Number(row.amount_usd),
    createdAt: Number(row.created_at),
  };
}

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
  };

  if (hasDbEnv()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO donations (id, name, amount_usd, ip_hash, user_agent, created_at)
      VALUES (
        ${donation.id},
        ${donation.name},
        ${donation.amountCents},
        ${input.ipHash ?? null},
        ${input.userAgent ?? null},
        ${donation.createdAt}
      )
    `;
    return donation;
  }

  memoryDonations.unshift(donation);
  return donation;
}

export async function listRecentDonations(limit = 30): Promise<Donation[]> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT id, name, amount_usd, created_at
      FROM donations
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as DonationRow[];
    return rows.map(rowToDonation);
  }

  return memoryDonations.slice(0, limit);
}

export async function listAllDonations(): Promise<Donation[]> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT id, name, amount_usd, created_at
      FROM donations
      ORDER BY created_at DESC
    `) as DonationRow[];
    return rows.map(rowToDonation);
  }

  return [...memoryDonations];
}

export async function getDonationStats(): Promise<DonationStats> {
  if (hasDbEnv()) {
    await ensureSchema();
    const now = Date.now();
    const cutoff = now - DAY_MS;
    const rows = (await getSql()`
      SELECT
        COUNT(*)::int AS count,
        COALESCE(SUM(amount_usd), 0)::int AS total_cents,
        COUNT(*) FILTER (WHERE created_at >= ${cutoff})::int AS last24h_count,
        COALESCE(SUM(amount_usd) FILTER (WHERE created_at >= ${cutoff}), 0)::int AS last24h_cents
      FROM donations
    `) as {
      count: number;
      total_cents: number;
      last24h_count: number;
      last24h_cents: number;
    }[];

    const row = rows[0];
    return {
      count: Number(row?.count ?? 0),
      totalCents: Number(row?.total_cents ?? 0),
      last24hCount: Number(row?.last24h_count ?? 0),
      last24hCents: Number(row?.last24h_cents ?? 0),
    };
  }

  return computeStats(memoryDonations);
}
