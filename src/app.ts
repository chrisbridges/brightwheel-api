import express from "express";
import { DuplicateTimestampError, ReadingStore } from "./store";
import { payloadSchema } from "./schemas";

export const createApp = (store: ReadingStore) => {
  const app = express();

  // payload size limiting to 1 MB
  app.use(express.json({ limit: "1mb" }));

  app.post("/readings", (req, res) => {
    // ensure that payload is valid schema
    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid payload",
        details: parsed.error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message
        }))
      });
    }

    try {
      const stored = store.addReadings(parsed.data.id, parsed.data.readings);
      return res.status(201).json({ stored });
    } catch (error) {
      if (error instanceof DuplicateTimestampError) {
        return res.status(400).json({
          error: "Duplicate timestamp in payload",
          details: [{ path: "readings", message: "Duplicate timestamp in payload" }]
        });
      }
      throw error;
    }
  });

  app.get("/devices/:id/latest", (req, res) => {
    const latest = store.getLatestTimestamp(req.params.id);
    if (!latest) {
      return res.status(404).json({ error: "Device not found" });
    }
    return res.json({ latest_timestamp: latest });
  });

  app.get("/devices/:id/cumulative", (req, res) => {
    const total = store.getCumulativeCount(req.params.id);
    if (total === undefined) {
      return res.status(404).json({ error: "Device not found" });
    }
    return res.json({ cumulative_count: total });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "Invalid JSON" });
    }
    return res.status(500).json({ error: "Unexpected error" });
  });

  return app;
};
