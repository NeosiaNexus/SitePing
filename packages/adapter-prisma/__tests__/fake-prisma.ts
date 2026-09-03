import type { FeedbackRecord } from "@siteping/core";
import type { SitepingPrismaClient } from "../src/index.js";

/**
 * In-memory stand-in for the `prisma.sitepingFeedback` delegate, faithful to
 * the Prisma semantics the adapter relies on: a unique `clientId` (`P2002`
 * on duplicate), `P2025` on update/delete of a missing row, `contains`
 * (case-sensitive, like Postgres `LIKE`), `{ in }` and `{ not }` filters,
 * `orderBy`, `skip`/`take`, `select`, and Prisma's rejection of a negative
 * `skip`. Lets the published conformance suite run against `PrismaStore`
 * without a database.
 */

type Where = Record<string, unknown>;

interface CreateArgs {
  data: Record<string, unknown> & { annotations?: { create: Record<string, unknown>[] } };
}

interface FindManyArgs {
  where: Where;
  orderBy?: { createdAt?: "asc" | "desc" };
  skip?: number;
  take?: number;
  select?: Record<string, boolean>;
}

function prismaError(code: string): Error & { code: string } {
  return Object.assign(new Error(`Prisma ${code}`), { code });
}

function matches(row: FeedbackRecord, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => {
    const value = (row as unknown as Record<string, unknown>)[key];
    if (typeof cond === "object" && cond !== null) {
      if ("contains" in cond) return String(value).includes(String((cond as { contains: string }).contains));
      if ("in" in cond) return (cond as { in: unknown[] }).in.includes(value);
      if ("not" in cond) return value !== (cond as { not: unknown }).not;
    }
    return value === cond;
  });
}

function pick(row: FeedbackRecord, select: Record<string, boolean> | undefined): unknown {
  if (!select) return structuredClone(row);
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, on]) => on)
      .map(([key]) => [key, (row as unknown as Record<string, unknown>)[key]]),
  );
}

export class FakeFeedbackDelegate {
  private rows: FeedbackRecord[] = [];
  private seq = 0;

  async create({ data }: CreateArgs): Promise<FeedbackRecord> {
    if (this.rows.some((r) => r.clientId === data.clientId)) throw prismaError("P2002");
    const now = new Date();
    const id = `fb-${++this.seq}`;
    const annotations = (data.annotations?.create ?? []).map((a) => ({
      ...(a as unknown as FeedbackRecord["annotations"][number]),
      id: `ann-${++this.seq}`,
      feedbackId: id,
      elementId: (a.elementId as string | undefined) ?? null,
      anchorKey: (a.anchorKey as string | null | undefined) ?? null,
      createdAt: now,
    }));
    const row: FeedbackRecord = {
      ...(data as unknown as FeedbackRecord),
      id,
      urlPattern: (data.urlPattern as string | null | undefined) ?? null,
      screenshotUrl: (data.screenshotUrl as string | null | undefined) ?? null,
      screenshotRegion: (data.screenshotRegion as FeedbackRecord["screenshotRegion"]) ?? null,
      diagnostics: (data.diagnostics as FeedbackRecord["diagnostics"]) ?? null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
      annotations,
    };
    this.rows.push(row);
    return structuredClone(row);
  }

  async findMany({ where, orderBy, skip = 0, take, select }: FindManyArgs): Promise<unknown[]> {
    if (skip < 0) throw new Error(`PrismaClientValidationError: Invalid value for argument \`skip\`: ${skip}`);
    let result = this.rows.map((r, index) => ({ r, index })).filter(({ r }) => matches(r, where));
    if (orderBy?.createdAt === "desc") {
      // Ties broken by insertion order desc — the most favourable reading of
      // a real database's unspecified tie order.
      result.sort((a, b) => b.r.createdAt.getTime() - a.r.createdAt.getTime() || b.index - a.index);
    }
    result = result.slice(skip, take === undefined ? undefined : skip + take);
    return result.map(({ r }) => pick(r, select));
  }

  async findUnique({ where }: { where: { id?: string; clientId?: string } }): Promise<FeedbackRecord | null> {
    const row = this.rows.find((r) => (where.id !== undefined ? r.id === where.id : r.clientId === where.clientId));
    return row ? structuredClone(row) : null;
  }

  async update({ where, data }: { where: { id: string }; data: Partial<FeedbackRecord> }): Promise<FeedbackRecord> {
    const row = this.rows.find((r) => r.id === where.id);
    if (!row) throw prismaError("P2025");
    Object.assign(row, data, { updatedAt: new Date() });
    return structuredClone(row);
  }

  async delete({ where }: { where: { id: string } }): Promise<FeedbackRecord> {
    const index = this.rows.findIndex((r) => r.id === where.id);
    if (index === -1) throw prismaError("P2025");
    const [row] = this.rows.splice(index, 1);
    return structuredClone(row as FeedbackRecord);
  }

  async deleteMany({ where }: { where: Where }): Promise<{ count: number }> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !matches(r, where));
    return { count: before - this.rows.length };
  }

  async count({ where }: { where: Where }): Promise<number> {
    return this.rows.filter((r) => matches(r, where)).length;
  }
}

/** A `SitepingPrismaClient` backed by a fresh {@link FakeFeedbackDelegate}. */
export function fakePrisma(): SitepingPrismaClient & { sitepingFeedback: FakeFeedbackDelegate } {
  return { sitepingFeedback: new FakeFeedbackDelegate() };
}
