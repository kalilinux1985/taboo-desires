// A tiny Postgres client (wire protocol v3, trust or cleartext password auth,
// text results) used only by tests to talk to a real Postgres such as the one
// `supabase start` runs. Production uses postgres.js inside the Edge Function.

import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";
import net from "node:net";
import type { Param } from "../../core/sql.ts";

export type PgError = Error & { code?: string; detail?: string };

type Pending = {
  rows: Record<string, unknown>[];
  fields: string[];
  error: PgError | null;
  resolve: (rows: Record<string, unknown>[]) => void;
  reject: (e: PgError) => void;
};

export class PgWire {
  private socket!: net.Socket;
  private buffer = Buffer.alloc(0);
  private queue: Pending[] = [];
  private chain: Promise<unknown> = Promise.resolve();
  private ready!: () => void;
  private scram: {
    nonce: string;
    clientFirstBare: string;
    serverSignature?: Buffer;
  } | null = null;
  private failed!: (e: Error) => void;

  static async connect(url: string): Promise<PgWire> {
    const client = new PgWire();
    await client.open(new URL(url));
    return client;
  }

  private open(url: URL): Promise<void> {
    const user = decodeURIComponent(url.username || "postgres");
    const password = decodeURIComponent(url.password);
    const database = decodeURIComponent(url.pathname.slice(1) || "postgres");
    // host=/path/to/socket/dir in the query string selects a unix socket
    const socketDir = url.searchParams.get("host");
    const port = Number(url.port || 5432);
    return new Promise((resolve, reject) => {
      this.ready = resolve;
      this.failed = reject;
      this.socket = socketDir
        ? net.createConnection({ path: `${socketDir}/.s.PGSQL.${port}` })
        : net.createConnection({ host: url.hostname, port });
      this.socket.on("error", (e) => {
        this.failed(e);
        for (const p of this.queue.splice(0)) p.reject(e);
      });
      this.socket.on("data", (chunk: Buffer) => this.onData(chunk, password));
      this.socket.on("connect", () => {
        const params = Buffer.from(
          `user\0${user}\0database\0${database}\0options\0-c TimeZone=UTC\0\0`,
        );
        const head = Buffer.alloc(8);
        head.writeInt32BE(8 + params.length, 0);
        head.writeInt32BE(196608, 4);
        this.socket.write(Buffer.concat([head, params]));
      });
    });
  }

  private onData(chunk: Buffer, password: string) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 5) {
      const type = String.fromCharCode(this.buffer[0]);
      const len = this.buffer.readInt32BE(1);
      if (this.buffer.length < 1 + len) return;
      const body = this.buffer.subarray(5, 1 + len);
      this.buffer = this.buffer.subarray(1 + len);
      this.handle(type, body, password);
    }
  }

  private handle(type: string, body: Buffer, password: string) {
    const current = this.queue[0];
    switch (type) {
      case "R": {
        const kind = body.readInt32BE(0);
        if (kind === 0 || kind === 12) break; // ok / SASL final (server signature checked below)
        if (kind === 3) this.socket.write(message("p", cstr(password)));
        else if (kind === 10) this.scramStart(body);
        else if (kind === 11)
          this.scramContinue(body.toString("utf8", 4), password);
        else this.failed(new Error(`Unsupported auth method ${kind}`));
        break;
      }
      case "Z":
        if (current) {
          this.queue.shift();
          if (current.error) current.reject(current.error);
          else current.resolve(current.rows);
        } else {
          this.ready();
        }
        break;
      case "T": {
        const count = body.readInt16BE(0);
        let offset = 2;
        const fields: string[] = [];
        for (let i = 0; i < count; i++) {
          const end = body.indexOf(0, offset);
          fields.push(body.toString("utf8", offset, end));
          offset = end + 1 + 18;
        }
        if (current) current.fields = fields;
        break;
      }
      case "D": {
        if (!current) break;
        const count = body.readInt16BE(0);
        let offset = 2;
        const row: Record<string, unknown> = {};
        for (let i = 0; i < count; i++) {
          const len = body.readInt32BE(offset);
          offset += 4;
          row[current.fields[i]] =
            len === -1 ? null : body.toString("utf8", offset, offset + len);
          if (len > 0) offset += len;
        }
        current.rows.push(row);
        break;
      }
      case "E": {
        const fields: Record<string, string> = {};
        let offset = 0;
        while (offset < body.length && body[offset] !== 0) {
          const code = String.fromCharCode(body[offset]);
          const end = body.indexOf(0, offset + 1);
          fields[code] = body.toString("utf8", offset + 1, end);
          offset = end + 1;
        }
        const error: PgError = new Error(fields.M ?? "Postgres error");
        error.code = fields.C;
        error.detail = fields.D;
        if (current) current.error = error;
        else this.failed(error);
        break;
      }
      default:
        // ParseComplete, BindComplete, CommandComplete, NoData, notices, parameter status...
        break;
    }
  }

  // SCRAM-SHA-256 (RFC 5802 / 7677), what Supabase's Postgres uses
  private scramStart(body: Buffer) {
    if (!body.toString("utf8", 4).split("\0").includes("SCRAM-SHA-256")) {
      this.failed(new Error("Server does not offer SCRAM-SHA-256"));
      return;
    }
    const nonce = randomBytes(18).toString("base64");
    const clientFirstBare = `n=,r=${nonce}`;
    this.scram = { nonce, clientFirstBare };
    const first = Buffer.from(`n,,${clientFirstBare}`);
    this.socket.write(
      message(
        "p",
        Buffer.concat([cstr("SCRAM-SHA-256"), int32(first.length), first]),
      ),
    );
  }

  private scramContinue(serverFirst: string, password: string) {
    const attrs = Object.fromEntries(
      serverFirst.split(",").map((kv) => [kv[0], kv.slice(2)]),
    );
    if (!this.scram || !attrs.r?.startsWith(this.scram.nonce)) {
      this.failed(new Error("Bad SCRAM server nonce"));
      return;
    }
    const salted = pbkdf2Sync(
      password,
      Buffer.from(attrs.s, "base64"),
      Number(attrs.i),
      32,
      "sha256",
    );
    const clientKey = createHmac("sha256", salted)
      .update("Client Key")
      .digest();
    const storedKey = createHash("sha256").update(clientKey).digest();
    const clientFinalNoProof = `c=biws,r=${attrs.r}`;
    const authMessage = `${this.scram.clientFirstBare},${serverFirst},${clientFinalNoProof}`;
    const signature = createHmac("sha256", storedKey)
      .update(authMessage)
      .digest();
    const proof = Buffer.from(clientKey.map((b, i) => b ^ signature[i]));
    const serverKey = createHmac("sha256", salted)
      .update("Server Key")
      .digest();
    this.scram.serverSignature = createHmac("sha256", serverKey)
      .update(authMessage)
      .digest();
    this.socket.write(
      message(
        "p",
        Buffer.from(`${clientFinalNoProof},p=${proof.toString("base64")}`),
      ),
    );
  }

  /** Runs one statement. Calls are serialized on the connection. */
  query(
    text: string,
    params: Param[] = [],
  ): Promise<Record<string, unknown>[]> {
    const run = () =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        this.queue.push({ rows: [], fields: [], error: null, resolve, reject });
        if (params.length === 0 && !text.includes("$1")) {
          this.socket.write(message("Q", cstr(text)));
          return;
        }
        const parse = message(
          "P",
          Buffer.concat([cstr(""), cstr(text), int16(0)]),
        );
        const values = params.map((p) => {
          if (p === null) return int32(-1);
          const bytes = Buffer.from(p, "utf8");
          return Buffer.concat([int32(bytes.length), bytes]);
        });
        const bind = message(
          "B",
          Buffer.concat([
            cstr(""),
            cstr(""),
            int16(0),
            int16(params.length),
            ...values,
            int16(0),
          ]),
        );
        const describe = message(
          "D",
          Buffer.concat([Buffer.from("P"), cstr("")]),
        );
        const execute = message("E", Buffer.concat([cstr(""), int32(0)]));
        const sync = message("S", Buffer.alloc(0));
        this.socket.write(
          Buffer.concat([parse, bind, describe, execute, sync]),
        );
      });
    const result = this.chain.then(run, run);
    this.chain = result.catch(() => undefined);
    return result;
  }

  async close() {
    this.socket.write(message("X", Buffer.alloc(0)));
    this.socket.end();
  }
}

function cstr(s: string) {
  return Buffer.from(`${s}\0`, "utf8");
}
function int16(n: number) {
  const b = Buffer.alloc(2);
  b.writeInt16BE(n, 0);
  return b;
}
function int32(n: number) {
  const b = Buffer.alloc(4);
  b.writeInt32BE(n, 0);
  return b;
}
function message(type: string, body: Buffer) {
  const head = Buffer.alloc(5);
  head.write(type, 0, "ascii");
  head.writeInt32BE(body.length + 4, 1);
  return Buffer.concat([head, body]);
}
