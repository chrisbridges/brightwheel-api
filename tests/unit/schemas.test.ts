import { payloadSchema, readingSchema } from "../../src/schemas";

const deviceId = "36d5658a-6908-479e-887e-a949ec199272";

describe("readingSchema", () => {
  it("accepts ISO-8601 timestamps with offsets", () => {
    const parsed = readingSchema.safeParse({
      timestamp: "2021-09-29T16:09:15+01:00",
      count: 15
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects timestamps without an offset", () => {
    const parsed = readingSchema.safeParse({
      timestamp: "2021-09-29T16:09:15",
      count: 15
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects non-integer counts", () => {
    const parsed = readingSchema.safeParse({
      timestamp: "2021-09-29T16:09:15+01:00",
      count: 1.5
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects negative counts", () => {
    const parsed = readingSchema.safeParse({
      timestamp: "2021-09-29T16:09:15+01:00",
      count: -1
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects counts beyond MAX_SAFE_INTEGER", () => {
    const parsed = readingSchema.safeParse({
      timestamp: "2021-09-29T16:09:15+01:00",
      count: Number.MAX_SAFE_INTEGER + 1
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects non-number counts", () => {
    const parsed = readingSchema.safeParse({
      timestamp: "2021-09-29T16:09:15+01:00",
      count: "15"
    });

    expect(parsed.success).toBe(false);
  });
});

describe("payloadSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = payloadSchema.safeParse({
      id: deviceId,
      readings: [
        { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
      ]
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects missing ids", () => {
    const parsed = payloadSchema.safeParse({
      readings: [
        { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid uuids", () => {
    const parsed = payloadSchema.safeParse({
      id: "not-a-uuid",
      readings: [
        { timestamp: "2021-09-29T16:09:15+01:00", count: 15 }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects missing readings arrays", () => {
    const parsed = payloadSchema.safeParse({
      id: deviceId
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects empty readings arrays", () => {
    const parsed = payloadSchema.safeParse({
      id: deviceId,
      readings: []
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects payloads with invalid readings", () => {
    const parsed = payloadSchema.safeParse({
      id: deviceId,
      readings: [
        { timestamp: "2021-09-29T16:09:15", count: 15 }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});
