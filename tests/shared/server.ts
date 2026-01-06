// Shared server utilities for tests

import http from "http";
import { createApp } from "../../src/app";
import { ReadingStore } from "../../src/store";
import { RequestOptions, ResponseData, ServerContext } from "./types";

export const startServer = (): ServerContext => {
  const store = new ReadingStore();
  const app = createApp(store);
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unexpected server address");
  }
  return { baseUrl: `http://127.0.0.1:${address.port}`, server };
};

export const stopServer = (server: http.Server): Promise<void> =>
  new Promise((resolve) => {
    server.close(() => resolve());
  });

export const withServer = async (
  handler: (context: ServerContext) => Promise<void>
): Promise<void> => {
  const context = startServer();
  try {
    await handler(context);
  } finally {
    await stopServer(context.server);
  }
};

export const request = async (
  baseUrl: string,
  options: RequestOptions
): Promise<ResponseData> => {
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
