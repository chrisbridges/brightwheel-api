import http from "http";

export type ServerContext = {
  baseUrl: string;
  server: http.Server;
};

export type RequestOptions = {
  method: string;
  path: string;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
};

export type ResponseData = {
  status: number;
  body: string;
  json?: unknown;
  headers: http.IncomingHttpHeaders;
};
