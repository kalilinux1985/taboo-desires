// Minimal tagged-template SQL builder. Values always become $n parameters
// (never string-concatenated), nested `sql` fragments are inlined.

export class Sql {
  constructor(
    readonly parts: readonly string[],
    readonly values: readonly unknown[],
  ) {}
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): Sql {
  return new Sql([...strings], values);
}

/** Trusted SQL text (identifiers, keywords). Never pass user input here. */
export function raw(text: string): Sql {
  return new Sql([text], []);
}

export const empty = raw("");

export function join(items: Sql[], separator = ", "): Sql {
  if (items.length === 0) return empty;
  const parts: string[] = [""];
  const values: unknown[] = [];
  items.forEach((item, i) => {
    if (i > 0) parts[parts.length - 1] += separator;
    values.push(item);
    parts.push("");
  });
  return new Sql(parts, values);
}

/** Postgres array literal for a text[] parameter. */
function arrayLiteral(items: readonly unknown[]): string {
  const escaped = items.map((item) => {
    if (item === null || item === undefined) return "NULL";
    return `"${String(item).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  });
  return `{${escaped.join(",")}}`;
}

export type Param = string | null;

export function serialize(value: unknown): Param {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("Refusing to send a non-finite number to SQL");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return arrayLiteral(value);
  return JSON.stringify(value);
}

export function compile(query: Sql): { text: string; params: Param[] } {
  const params: Param[] = [];
  const walk = (q: Sql): string => {
    let text = q.parts[0];
    q.values.forEach((value, i) => {
      if (value instanceof Sql) {
        text += walk(value);
      } else {
        params.push(serialize(value));
        text += `$${params.length}`;
      }
      text += q.parts[i + 1];
    });
    return text;
  };
  return { text: walk(query), params };
}

/** What a database connection must provide: run one statement inside the current transaction. */
export interface Driver {
  query(text: string, params: Param[]): Promise<Record<string, unknown>[]>;
}
