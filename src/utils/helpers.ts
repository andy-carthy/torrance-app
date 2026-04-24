import type { Exception } from '../types';

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export function getStats(excs: Exception[]) {
  return {
    total: excs.length,
    resolved: excs.filter(e => e.status === "resolved").length,
    errors: excs.filter(e => e.severity === "error" && e.status === "open").length,
    warnings: excs.filter(e => e.severity === "warning" && e.status === "open").length,
    status: excs.filter(e => e.severity === "error" && e.status === "open").length === 0 ? "READY" : "BLOCKED"
  };
}
