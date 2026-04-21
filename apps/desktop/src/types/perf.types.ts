export interface CpuCoreMetric {
  core: number;
  usage: number;
}

export interface PerfMetrics {
  cpuCores: CpuCoreMetric[];
  cpuTotal: number;
  memory: {
    totalKb: number;
    availableKb: number;
    usedKb: number;
    usedPct: number;
  };
  network: {
    rxBps: number;
    txBps: number;
  };
  battery: {
    level: number;
    temperature: number;
    charging: boolean;
  };
  cpuTemp: number | null;
  cpuTempSource?: string | null;
  timestamp: number;
}
