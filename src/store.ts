export type Reading = {
  timestamp: string;
  count: number;
};

export class DuplicateTimestampError extends Error {
  readonly epoch: number;

  constructor(epoch: number) {
    super("Duplicate timestamp in payload");
    this.name = "DuplicateTimestampError";
    this.epoch = epoch;
  }
}

type DeviceAggregate = {
  latestTimestampIso?: string;
  latestEpoch?: number;
  totalCount: number;
  readingsByEpoch: Map<number, number>;
};

export class ReadingStore {
  private devices = new Map<string, DeviceAggregate>();

  addReadings(deviceId: string, readings: Reading[]): number {
    let stored = 0;
    let device = this.devices.get(deviceId);
    const seenEpochs = new Set<number>();

    for (const reading of readings) {
      const epoch = Date.parse(reading.timestamp);
      if (Number.isNaN(epoch)) {
        continue;
      }

      if (seenEpochs.has(epoch)) {
        throw new DuplicateTimestampError(epoch);
      }
      seenEpochs.add(epoch);

      // Create a device record only after a valid reading so empty/invalid payloads don't create state.
      if (!device) {
        device = this.createDevice(deviceId);
      }

      // Use epoch millis to normalize offsets and treat (deviceId, timestamp) as the dedupe key.
      if (device.readingsByEpoch.has(epoch)) {
        continue;
      }

      device.readingsByEpoch.set(epoch, reading.count);
      device.totalCount += reading.count;
      stored += 1;

      if (device.latestEpoch === undefined || epoch > device.latestEpoch) {
        device.latestEpoch = epoch;
        // Return a canonical ISO timestamp to avoid offset ambiguity.
        device.latestTimestampIso = new Date(epoch).toISOString();
      }
    }

    return stored;
  }

  getLatestTimestamp(deviceId: string): string | undefined {
    return this.devices.get(deviceId)?.latestTimestampIso;
  }

  getCumulativeCount(deviceId: string): number | undefined {
    const device = this.devices.get(deviceId);
    if (!device) {
      return undefined;
    }
    return device.totalCount;
  }

  private createDevice(deviceId: string): DeviceAggregate {
    const created: DeviceAggregate = {
      totalCount: 0,
      readingsByEpoch: new Map()
    };
    this.devices.set(deviceId, created);
    return created;
  }
}
