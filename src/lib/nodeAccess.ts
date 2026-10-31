import type { Lease, NodeLock } from "./useRoom";

/** UI guards complement the database's operation authorization. */
export function nodeBlocked(id: string, leases: Record<string, Lease>, locks: Record<string, NodeLock>, session: string, canOverride: (lock: NodeLock) => boolean, geometry = true): boolean {
  const lease = leases[id];
  if (lease && lease.holder_session !== session) return true;
  const lock = locks[id];
  return !!lock && !canOverride(lock) && (geometry || lock.mode === "full");
}