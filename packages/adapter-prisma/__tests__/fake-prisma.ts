import type { CommentRecord, FeedbackRecord } from "@siteping/core";
import type { SitepingPrismaClient } from "../src/index.js";

/**
 * In-memory stand-in for the `prisma.sitepingFeedback` and
 * `prisma.sitepingComment` delegates, faithful to the Prisma semantics the
 * adapter relies on: a unique `clientId` (`P2002` on duplicate), `P2025` on
 * update/delete of a missing row and on a `connect` to one, `contains`
 * (case-sensitive, like Postgres `LIKE`), `{ in }` and `{ not }` filters,
 * `orderBy` (one clause or a list), `skip`/`take`, `select`, the comment
 * relation (read only when `include`d, deleted with its feedback like
 * `onDelete: Cascade`), and Prisma's rejection of a `skip` outside a signed
 * 64-bit integer. Ids are zero-padded so they sort in creation order, like
 * the roughly time-ordered cuids the schema defaults to. Lets the published
 * conformance suite run against `PrismaStore` without a database.
 */

/** First `skip` past a signed 64-bit integer — Prisma rejects it and above. */
const PRISMA_SKIP_EXCLUSIVE_MAX = 2 ** 63;

type Where = Record<string, unknown>;

interface CreateArgs {
  data: Record<string, unknown> & { annotations?: { create: Record<string, unknown>[] } };
}

type OrderBy = Partial<Record<"createdAt" | "id", "asc" | "desc">>;

/** What a feedback read asks for besides its own columns. */
interface Include {
  comments?: { orderBy?: OrderBy | OrderBy[] };
}

interface FindManyArgs {
  where: Where;
  include?: Include;
  orderBy?: OrderBy | OrderBy[];
  skip?: number;
  take?: number;
  select?: Record<string, boolean>;
}

/** Compare two rows clause by clause, like SQL `ORDER BY a, b`; 0 on a full tie. */
function compareRows<Row extends Record<keyof OrderBy, unknown>>(a: Row, b: Row, clauses: OrderBy[]): number {
  for (const clause of clauses) {
    for (const [key, direction] of Object.entries(clause) as [keyof OrderBy, "asc" | "desc"][]) {
      const x = a[key] as Date | string;
      const y = b[key] as Date | string;
      const cmp = x instanceof Date && y instanceof Date ? x.getTime() - y.getTime() : x < y ? -1 : x > y ? 1 : 0;
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
  }
  return 0;
}

function prismaError(code: string): Error & { code: string } {
  return Object.assign(new Error(`Prisma ${code}`), { code });
}

function matches(row: object, where: Where): boolean {
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

/**
 * The `sitepingComment` delegate. Rows come back in reverse insertion order
 * unless the read orders them — a real database guarantees no order either,
 * so a query that forgets its `orderBy` fails here too.
 */
export class FakeCommentDelegate {
  rows: CommentRecord[] = [];
  private seq = 0;

  constructor(private readonly feedbackExists: (id: string) => boolean) {}

  async create({
    data: { feedback, ...data },
  }: {
    data: Omit<CommentRecord, "id" | "feedbackId" | "createdAt"> & { feedback: { connect: { id: string } } };
  }): Promise<CommentRecord> {
    const feedbackId = feedback.connect.id;
    if (!this.feedbackExists(feedbackId)) throw prismaError("P2025");
    if (this.rows.some((r) => r.clientId === data.clientId)) throw prismaError("P2002");
    const row: CommentRecord = {
      ...data,
      id: `cm-${String(++this.seq).padStart(6, "0")}`,
      feedbackId,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return structuredClone(row);
  }

  async findMany({ where, orderBy }: { where: Where; orderBy?: OrderBy | OrderBy[] }): Promise<CommentRecord[]> {
    const found = this.rows.filter((r) => matches(r, where));
    if (!orderBy) return structuredClone(found.reverse());
    const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
    return structuredClone(found.sort((a, b) => compareRows(a, b, clauses)));
  }

  async findUnique({ where }: { where: { clientId: string } }): Promise<CommentRecord | null> {
    const row = this.rows.find((r) => r.clientId === where.clientId);
    return row ? structuredClone(row) : null;
  }

  async update(): Promise<never> {
    throw new Error("PrismaStore never updates a comment");
  }

  async delete(): Promise<never> {
    throw new Error("PrismaStore deletes comments with deleteMany");
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

export class FakeFeedbackDelegate {
  private rows: FeedbackRecord[] = [];
  private seq = 0;
  /** Set by {@link fakePrisma} when the client has the comment model. */
  comments: FakeCommentDelegate | undefined;

  /** The row as Prisma returns it: the thread only when `include`d, like any relation. */
  private async read(row: FeedbackRecord, include: Include | undefined): Promise<FeedbackRecord> {
    const { comments: _, ...record } = structuredClone(row);
    if (!include?.comments || !this.comments) return record;
    const orderBy = include.comments.orderBy;
    return {
      ...record,
      comments: await this.comments.findMany({ where: { feedbackId: row.id }, ...(orderBy ? { orderBy } : {}) }),
    };
  }

  /** `onDelete: Cascade` — a feedback's comments go with it. */
  private async cascade(feedbackIds: readonly string[]): Promise<void> {
    await this.comments?.deleteMany({ where: { feedbackId: { in: [...feedbackIds] } } });
  }

  exists(id: string): boolean {
    return this.rows.some((r) => r.id === id);
  }

  async create({ data, include }: CreateArgs & { include?: Include }): Promise<FeedbackRecord> {
    if (this.rows.some((r) => r.clientId === data.clientId)) throw prismaError("P2002");
    const now = new Date();
    const id = `fb-${String(++this.seq).padStart(6, "0")}`;
    const annotations = (data.annotations?.create ?? []).map((a) => ({
      ...(a as unknown as FeedbackRecord["annotations"][number]),
      id: `ann-${String(++this.seq).padStart(6, "0")}`,
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
    return this.read(row, include);
  }

  async findMany({ where, include, orderBy, skip = 0, take, select }: FindManyArgs): Promise<unknown[]> {
    // Prisma's query engine reads `skip` as a signed 64-bit integer: it
    // rejects negatives, non-integers, `Infinity` (serialised as `null`) and
    // values past 2^63 - 1 — where JavaScript's `slice` would silently accept
    // them and mask an adapter that forwards an unchecked offset.
    if (skip < 0 || !Number.isInteger(skip) || skip >= PRISMA_SKIP_EXCLUSIVE_MAX) {
      throw new Error(`PrismaClientValidationError: Invalid value for argument \`skip\`: ${skip}`);
    }
    let result = this.rows.map((r, index) => ({ r, index })).filter(({ r }) => matches(r, where));
    if (orderBy) {
      const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
      // Full ties broken by insertion order desc — the most favourable
      // reading of a real database's unspecified tie order.
      result.sort((a, b) => compareRows(a.r, b.r, clauses) || b.index - a.index);
    }
    result = result.slice(skip, take === undefined ? undefined : skip + take);
    return Promise.all(result.map(({ r }) => (select ? pick(r, select) : this.read(r, include))));
  }

  async findUnique({
    where,
    include,
    select,
  }: {
    where: { id?: string; clientId?: string };
    include?: Include;
    select?: Record<string, boolean>;
  }): Promise<unknown> {
    const row = this.rows.find((r) => (where.id !== undefined ? r.id === where.id : r.clientId === where.clientId));
    if (!row) return null;
    return select ? pick(row, select) : this.read(row, include);
  }

  async update({
    where,
    data,
    include,
  }: {
    where: { id: string };
    data: Partial<FeedbackRecord>;
    include?: Include;
  }): Promise<FeedbackRecord> {
    const row = this.rows.find((r) => r.id === where.id);
    if (!row) throw prismaError("P2025");
    Object.assign(row, data, { updatedAt: new Date() });
    return this.read(row, include);
  }

  async delete({ where }: { where: { id: string } }): Promise<FeedbackRecord> {
    const index = this.rows.findIndex((r) => r.id === where.id);
    if (index === -1) throw prismaError("P2025");
    const [row] = this.rows.splice(index, 1);
    await this.cascade([where.id]);
    return structuredClone(row as FeedbackRecord);
  }

  async deleteMany({ where }: { where: Where }): Promise<{ count: number }> {
    const doomed = this.rows.filter((r) => matches(r, where));
    this.rows = this.rows.filter((r) => !matches(r, where));
    await this.cascade(doomed.map((r) => r.id));
    return { count: doomed.length };
  }

  async count({ where }: { where: Where }): Promise<number> {
    return this.rows.filter((r) => matches(r, where)).length;
  }
}

/**
 * A `SitepingPrismaClient` backed by fresh fake delegates — without the
 * comment model when `comments: false`, like a client generated from a schema
 * synced before threads.
 */
export function fakePrisma({ comments = true }: { comments?: boolean } = {}): SitepingPrismaClient & {
  sitepingFeedback: FakeFeedbackDelegate;
  sitepingComment?: FakeCommentDelegate;
} {
  const sitepingFeedback = new FakeFeedbackDelegate();
  if (!comments) return { sitepingFeedback };
  const sitepingComment = new FakeCommentDelegate((id) => sitepingFeedback.exists(id));
  sitepingFeedback.comments = sitepingComment;
  return { sitepingFeedback, sitepingComment };
}
