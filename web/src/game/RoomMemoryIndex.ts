import type { Room } from "./roomApi";

export interface RoomRecord {
  room: Room;
  dangerScore?: number;
  tags?: readonly string[];
}

export class RoomMemoryIndex {
  private readonly recordsBySeed = new Map<number, RoomRecord>();

  addRoom(record: RoomRecord): void {
    this.recordsBySeed.set(record.room.seed, record);
  }

  findByTitle(query: string): RoomRecord[] {
    const normalizedQuery = query.toLowerCase();
    return this.all().filter((record) => record.room.name.toLowerCase().includes(normalizedQuery));
  }

  findByTag(tag: string): RoomRecord[] {
    return this.all().filter((record) => record.tags?.includes(tag) ?? false);
  }

  mostDangerous(n?: number): RoomRecord[] {
    const sorted = this.all().sort((a, b) => (b.dangerScore ?? 0) - (a.dangerScore ?? 0));
    return n === undefined ? sorted : sorted.slice(0, n);
  }

  recent(n: number): RoomRecord[] {
    return this.all().slice(-n).reverse();
  }

  summarizeTrail(): string {
    const records = this.all();
    const dangerousCount = records.filter((record) => (record.dangerScore ?? 0) > 0).length;
    const lastTitle = records.length > 0 ? records[records.length - 1].room.name : "none";
    return `${records.length} rooms · ${dangerousCount} dangerous · last: ${lastTitle}`;
  }

  get size(): number {
    return this.recordsBySeed.size;
  }

  all(): RoomRecord[] {
    return Array.from(this.recordsBySeed.values());
  }
}
