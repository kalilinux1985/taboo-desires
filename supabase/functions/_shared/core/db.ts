import { compile, empty, join, raw, sql, type Driver, Sql } from "./sql.ts";
import {
  columnOf,
  rowToDoc,
  SQL_CAST,
  TABLES,
  toDb,
  toIso,
  type DbTable,
  type Doc,
  type Id,
  type NewDoc,
} from "./schema.ts";
import {
  isUuid,
  type PaginationOptions,
  type PaginationResult,
} from "./values.ts";

export type OrderColumn = {
  column: string;
  cast: "int" | "timestamptz" | "text";
};

const MAX_PAGE = 200;

function encodeCursor(values: string[]): string {
  const bytes = new TextEncoder().encode(JSON.stringify(values));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeCursor(cursor: string): string[] | null {
  try {
    const bin = atob(cursor.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function cursorValue(cast: OrderColumn["cast"], raw: unknown): string {
  return cast === "timestamptz" ? toIso(raw) : String(raw);
}

/**
 * Data access for one transaction. Row helpers return camelCase Docs; `rows`
 * runs arbitrary SQL. Tables read are recorded so the browser knows which
 * live-update notifications should refresh a query.
 */
export class Db {
  readonly reads = new Set<string>();

  constructor(private readonly driver: Driver) {}

  /** Marks tables as read by a hand-written query (for live updates). */
  touch(...tables: DbTable[]) {
    for (const t of tables) this.reads.add(TABLES[t].sqlName);
  }

  async rows(query: Sql): Promise<Record<string, unknown>[]> {
    const { text, params } = compile(query);
    return await this.driver.query(text, params);
  }

  /** First column of the first row, or null. */
  async scalar(query: Sql): Promise<unknown> {
    const rows = await this.rows(query);
    if (rows.length === 0) return null;
    return Object.values(rows[0])[0] ?? null;
  }

  async get<T extends DbTable>(
    table: T,
    id: string | null | undefined,
  ): Promise<Doc<T> | null> {
    if (!isUuid(id)) return null;
    const docs = await this.select(table, sql`where id = ${id}::uuid`);
    return docs[0] ?? null;
  }

  /** `select * from <table> <rest>` mapped to Docs. `rest` holds where / order by / limit. */
  async select<T extends DbTable>(
    table: T,
    rest: Sql = empty,
  ): Promise<Doc<T>[]> {
    this.touch(table);
    const rows = await this.rows(
      sql`select * from public.${raw(TABLES[table].sqlName)} ${rest}`,
    );
    return rows.map((r) => rowToDoc(table, r));
  }

  async first<T extends DbTable>(
    table: T,
    rest: Sql = empty,
  ): Promise<Doc<T> | null> {
    const docs = await this.select(table, sql`${rest} limit 1`);
    return docs[0] ?? null;
  }

  /** Rows of a table selected by an arbitrary query that returns `<table>.*`. */
  async docs<T extends DbTable>(table: T, query: Sql): Promise<Doc<T>[]> {
    this.touch(table);
    return (await this.rows(query)).map((r) => rowToDoc(table, r));
  }

  async insert<T extends DbTable>(table: T, fields: NewDoc<T>): Promise<Id<T>> {
    const entries = Object.entries(fields).filter(
      ([, value]) => value !== undefined,
    );
    const cols = entries.map(([field]) => raw(columnOf(table, field).column));
    const vals = entries.map(([field, value]) => {
      const col = columnOf(table, field);
      return sql`${toDb(col.kind, value)}::${raw(SQL_CAST[col.kind])}`;
    });
    const rows = await this.rows(
      entries.length
        ? sql`insert into public.${raw(TABLES[table].sqlName)} (${join(cols)}) values (${join(vals)}) returning id`
        : sql`insert into public.${raw(TABLES[table].sqlName)} default values returning id`,
    );
    return String(rows[0].id) as Id<T>;
  }

  /** Updates the given fields. A field set to `undefined` is cleared (set to null). */
  async patch<T extends DbTable>(
    table: T,
    id: Id<T>,
    fields: Partial<NewDoc<T>>,
  ): Promise<void> {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map((field) => {
      const col = columnOf(table, field);
      const value = (fields as Record<string, unknown>)[field];
      return sql`${raw(col.column)} = ${toDb(col.kind, value)}::${raw(SQL_CAST[col.kind])}`;
    });
    await this.rows(
      sql`update public.${raw(TABLES[table].sqlName)} set ${join(sets)} where id = ${id}::uuid`,
    );
  }

  async delete<T extends DbTable>(table: T, id: Id<T>): Promise<void> {
    await this.rows(
      sql`delete from public.${raw(TABLES[table].sqlName)} where id = ${id}::uuid`,
    );
  }

  /**
   * Keyset pagination: rows matching `where`, ordered by `order` then id,
   * all in `direction`. The cursor holds the sort values of the last row.
   */
  async paginate<T extends DbTable>(
    table: T,
    spec: { where?: Sql; order: OrderColumn[]; direction: "asc" | "desc" },
    opts: PaginationOptions,
  ): Promise<PaginationResult<Doc<T>>> {
    this.touch(table);
    const limit = Math.max(1, Math.min(MAX_PAGE, Math.floor(opts.numItems)));
    const order: OrderColumn[] = [
      ...spec.order,
      { column: "id", cast: "text" },
    ];
    const op = raw(spec.direction === "asc" ? ">" : "<");
    const conditions: Sql[] = spec.where ? [spec.where] : [];
    const after = opts.cursor ? decodeCursor(opts.cursor) : null;
    if (after && after.length === order.length) {
      const lhs = join(order.map((o) => raw(o.column)));
      const rhs = join(
        order.map(
          (o, i) =>
            sql`${after[i]}::${raw(o.column === "id" ? "uuid" : o.cast)}`,
        ),
      );
      conditions.push(sql`(${lhs}) ${op} (${rhs})`);
    }
    const where = conditions.length
      ? sql`where ${join(conditions, " and ")}`
      : empty;
    const orderBy = join(
      order.map((o) => raw(`${o.column} ${spec.direction}`)),
    );
    const rows = await this.rows(
      sql`select * from public.${raw(TABLES[table].sqlName)} ${where} order by ${orderBy} limit ${limit + 1}`,
    );
    const isDone = rows.length <= limit;
    const pageRows = rows.slice(0, limit);
    const last = pageRows[pageRows.length - 1];
    const continueCursor = last
      ? encodeCursor(order.map((o) => cursorValue(o.cast, last[o.column])))
      : (opts.cursor ?? "");
    return {
      page: pageRows.map((r) => rowToDoc(table, r)),
      isDone,
      continueCursor,
    };
  }

  /** Offset pagination for ranked queries (search). `query` must return `<table>.*`. */
  async paginateOffset<T extends DbTable>(
    table: T,
    query: Sql,
    opts: PaginationOptions,
  ): Promise<PaginationResult<Doc<T>>> {
    this.touch(table);
    const limit = Math.max(1, Math.min(MAX_PAGE, Math.floor(opts.numItems)));
    const offset =
      opts.cursor && /^o:\d+$/.test(opts.cursor)
        ? Number(opts.cursor.slice(2))
        : 0;
    const rows = await this.rows(
      sql`${query} limit ${limit + 1} offset ${offset}`,
    );
    return {
      page: rows.slice(0, limit).map((r) => rowToDoc(table, r)),
      isDone: rows.length <= limit,
      continueCursor: `o:${offset + Math.min(rows.length, limit)}`,
    };
  }
}
