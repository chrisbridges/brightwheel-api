export type Reading = {
  timestamp: string;
  count: number;
};

type DeviceAggregate = {
  latestTimestamp?: string;
  latestEpoch?: number;
  totalCount: number;
  readingsByTimestamp: Map<string, number>;
};

export class ReadingStore {
  private devices = new Map<string, DeviceAggregate>();

  addReadings(deviceId: string, readings: Reading[]): number {
    let stored = 0;
    const device = this.getOrCreate(deviceId);

    for (const reading of readings) {
      if (device.readingsByTimestamp.has(reading.timestamp)) {
        continue;
      }

      const epoch = Date.parse(reading.timestamp);
      if (Number.isNaN(epoch)) {
        continue;
      }

      device.readingsByTimestamp.set(reading.timestamp, reading.count);
      device.totalCount += reading.count;
      stored += 1;

      if (device.latestEpoch === undefined || epoch > device.latestEpoch) {
        device.latestEpoch = epoch;
        device.latestTimestamp = reading.timestamp;
      }
    }

    return stored;
  }

  getLatestTimestamp(deviceId: string): string | undefined {
    return this.devices.get(deviceId)?.latestTimestamp;
  }

  getCumulativeCount(deviceId: string): number | undefined {
    const device = this.devices.get(deviceId);
    if (!device) {
      return undefined;
    }
    return device.totalCount;
  }

  private getOrCreate(deviceId: string): DeviceAggregate {
    const existing = this.devices.get(deviceId);
    if (existing) {
      return existing;
    }

    const created: DeviceAggregate = {
      totalCount: 0,
      readingsByTimestamp: new Map()
    };
    this.devices.set(deviceId, created);
    return created;
  }
}
