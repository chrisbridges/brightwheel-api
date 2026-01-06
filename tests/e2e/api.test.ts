import http from "http";
import { createApp } from "../../src/app";
import { ReadingStore } from "../../src/store";

const deviceId = "36d5658a-6908-479e-887e-a949ec199272";

type ServerContext = {
  baseUrl: string;
  server: http.Server;
};

type RequestOptions = {
  method: string;
  path: string;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
};

type ResponseData = {
  status: number;
  body: string;
  json?: unknown;
  headers: http.IncomingHttpHeaders;
};

const startServer = (): ServerContext => {
  const store = new ReadingStore();
  const app = createApp(store);
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unexpected server address");
  }
  return { baseUrl: `http://127.0.0.1:${address.port}`, server };
};

const stopServer = (server: http.Server): Promise<void> =>
  new Promise((resolve) => {
    server.close(() => resolve());
  });

const request = async (baseUrl: string, options: RequestOptions): Promise<ResponseData> => {
  const { method, path, body, rawBody, headers = {} } = options;
  if (body !== undefined && rawBody !== undefined) {
    throw new Error("Use either body or rawBody");
  }

  const payload = rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined);
  const finalHeaders: Record<string, string> = { ...headers };

  if (payload !== undefined && !finalHeaders["content-type"]) {
    finalHeaders["content-type"] = "application/json";
  }
  if (payload !== undefined) {
    finalHeaders["content-length"] = Buffer.byteLength(payload).toString();
  }

  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method,
        headers: finalHeaders
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const bodyText = Buffer.concat(chunks).toString("utf8");
          let json: unknown;
          if (res.headers["content-type"]?.includes("application/json") && bodyText) {
            try {
              json = JSON.parse(bodyText);
            } catch {
              json = undefined;
            }
          }
          resolve({
            status: res.statusCode ?? 0,
            body: bodyText,
            json,
            headers: res.headers
          });
        });
      }
    );
    req.on("error", reject);
    if (payload !== undefined) {
      req.write(payload);
    }
    req.end();
  });
};

const withServer = async (
  handler: (context: ServerContext) => Promise<void>
): Promise<void> => {
  const context = startServer();
  try {
    await handler(context);
  } finally {
    await stopServer(context.server);
  }
};

describe("POST /readings", () => {
  it("returns 201 with stored count for a valid payload", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:08:15+01:00", count: 2 },
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      expect(response.status).toBe(201);
      expect(response.json).toEqual({ stored: 2 });
    });
  });

  it("returns 201 with stored count for duplicates across requests", async () => {
    await withServer(async ({ baseUrl }) => {
      await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:09:15+01:00", count: 999 }
          ]
        }
      });

      expect(response.status).toBe(201);
      expect(response.json).toEqual({ stored: 0 });
    });
  });

  it("returns 400 for an invalid uuid", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: "not-a-uuid",
          readings: [
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      expect(response.status).toBe(400);
    });
  });

  it("returns 400 for empty readings arrays", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: []
        }
      });

      expect(response.status).toBe(400);
    });
  });

  it("returns 400 for invalid JSON payloads", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "POST",
        path: "/readings",
        rawBody: "{invalid-json",
        headers: { "content-type": "application/json" }
      });

      expect(response.status).toBe(400);
      expect(response.json).toEqual({ error: "Invalid JSON" });
    });
  });
});

describe("GET /devices/:id/latest", () => {
  it("returns 404 for an unknown device", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "GET",
        path: `/devices/${deviceId}/latest`
      });

      expect(response.status).toBe(404);
    });
  });

  it("returns the latest timestamp value", async () => {
    await withServer(async ({ baseUrl }) => {
      await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:08:15+01:00", count: 2 },
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      const response = await request(baseUrl, {
        method: "GET",
        path: `/devices/${deviceId}/latest`
      });

      expect(response.status).toBe(200);
      expect(response.json).toEqual({ latest_timestamp: "2021-09-29T15:09:15.000Z" });
    });
  });
});

describe("GET /devices/:id/cumulative", () => {
  it("returns 404 for an unknown device", async () => {
    await withServer(async ({ baseUrl }) => {
      const response = await request(baseUrl, {
        method: "GET",
        path: `/devices/${deviceId}/cumulative`
      });

      expect(response.status).toBe(404);
    });
  });

  it("returns the cumulative count for a device", async () => {
    await withServer(async ({ baseUrl }) => {
      await request(baseUrl, {
        method: "POST",
        path: "/readings",
        body: {
          id: deviceId,
          readings: [
            { timestamp: "2021-09-29T16:08:15+01:00", count: 2 },
            { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
          ]
        }
      });

      const response = await request(baseUrl, {
        method: "GET",
        path: `/devices/${deviceId}/cumulative`
      });

      expect(response.status).toBe(200);
      expect(response.json).toEqual({ cumulative_count: 17 });
    });
  });
});
