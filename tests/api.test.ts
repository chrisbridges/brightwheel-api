import request from "supertest";
import { createApp } from "../src/app";
import { ReadingStore } from "../src/store";

const deviceId = "36d5658a-6908-479e-887e-a949ec199272";

const payload = {
  id: deviceId,
  readings: [
    { timestamp: "2021-09-29T16:09:15+01:00", count: 15 },
    { timestamp: "2021-09-29T16:08:15+01:00", count: 2 }
  ]
};

describe("readings API", () => {
  it("stores readings, ignores duplicates, and returns latest/cumulative", async () => {
    const app = createApp(new ReadingStore());

    const first = await request(app).post("/readings").send(payload);
    expect(first.status).toBe(201);
    expect(first.body.stored).toBe(2);

    const duplicate = await request(app).post("/readings").send(payload);
    expect(duplicate.status).toBe(201);
    expect(duplicate.body.stored).toBe(0);

    const latest = await request(app).get(`/devices/${deviceId}/latest`);
    expect(latest.status).toBe(200);
    expect(latest.body.latest_timestamp).toBe("2021-09-29T16:09:15+01:00");

    const cumulative = await request(app).get(`/devices/${deviceId}/cumulative`);
    expect(cumulative.status).toBe(200);
    expect(cumulative.body.cumulative_count).toBe(17);
  });

  it("rejects invalid payloads", async () => {
    const app = createApp(new ReadingStore());

    const response = await request(app).post("/readings").send({ id: "nope" });
    expect(response.status).toBe(400);
  });
});
