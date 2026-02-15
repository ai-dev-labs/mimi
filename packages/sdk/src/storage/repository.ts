import { getDb } from "./db";
import { Memory, Entity } from "../types";
import { MemorySchema, EntitySchema, VECTOR_DIM } from "./schema";

const MEMORY_TABLE = "memories";
const ENTITY_TABLE = "entities";

export class Repository {
  async saveBatch(memories: Memory[], entities: Entity[]) {
    const db = await getDb();

    // 1. Save Memories
    if (memories.length > 0) {
      const memoryData = memories.map((m) => ({
        id: m.id,
        content: m.content,
        type: m.type,
        vector: (m as any).vector || new Array(VECTOR_DIM).fill(0), // Placeholder if vector missing
        metadata: JSON.stringify(m.metadata),
        created_at: new Date(m.createdAt).getTime(),
        entityIds: JSON.stringify(m.entityIds || []),
      }));

      // Check if table exists, if not create, else add
      const tableNames = await db.tableNames();
      if (!tableNames.includes(MEMORY_TABLE)) {
        await db.createTable(MEMORY_TABLE, memoryData, {
          schema: MemorySchema,
        });
      } else {
        const table = await db.openTable(MEMORY_TABLE);
        await table.add(memoryData);
      }
    }

    // 2. Save Entities
    if (entities.length > 0) {
      const entityData = entities.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        description: e.description || "",
        vector: (e as any).vector || new Array(VECTOR_DIM).fill(0),
      }));

      const tableNames = await db.tableNames();
      if (!tableNames.includes(ENTITY_TABLE)) {
        await db.createTable(ENTITY_TABLE, entityData, {
          schema: EntitySchema,
        });
      } else {
        const table = await db.openTable(ENTITY_TABLE);
        // Basic deduplication could happen here, for now we append
        // Real impl should probably merge or check existence
        await table.add(entityData);
      }
    }
  }

  async searchMemories(
    vector: number[],
    filter?: string,
    limit = 10,
  ): Promise<any[]> {
    const db = await getDb();
    const tableNames = await db.tableNames();
    if (!tableNames.includes(MEMORY_TABLE)) return [];

    const table = await db.openTable(MEMORY_TABLE);
    let query = (table.search(vector) as any).distanceType("cosine").limit(limit);

    // Note: LanceDB filter syntax is SQL-like.
    // We'd need to parse our metadata filter into SQL if provided.
    // For now, simple vector search.
    if (filter) {
      query = query.where(filter);
    }

    const results = await query.toArray();
    return results.map((m: any) => {
      if (typeof m.metadata === "string") m.metadata = JSON.parse(m.metadata);
      if (typeof m.entityIds === "string")
        m.entityIds = JSON.parse(m.entityIds);
      return m;
    });
  }

  async getAll(limit = 20): Promise<any[]> {
    const db = await getDb();
    const tableNames = await db.tableNames();
    if (!tableNames.includes(MEMORY_TABLE)) return [];

    const table = await db.openTable(MEMORY_TABLE);
    // Return most recent first
    const results = await table.query().limit(limit).toArray();
    return results.map((m: any) => {
      if (typeof m.metadata === "string") m.metadata = JSON.parse(m.metadata);
      if (typeof m.entityIds === "string")
        m.entityIds = JSON.parse(m.entityIds);
      return m;
    });
  }

  async getById(id: string): Promise<any | null> {
    const db = await getDb();
    const tableNames = await db.tableNames();
    if (!tableNames.includes(MEMORY_TABLE)) return null;

    const table = await db.openTable(MEMORY_TABLE);
    const results = await table
      .query()
      .where(`id = '${id}'`)
      .limit(1)
      .toArray();

    if (results.length > 0) {
      const m = results[0];
      if (typeof m.metadata === "string") m.metadata = JSON.parse(m.metadata);
      if (typeof m.entityIds === "string") {
        try {
          m.entityIds = JSON.parse(m.entityIds);
        } catch {
          // Fallback if not valid JSON
        }
      }
      return m;
    }
    return null;
  }

  async deleteById(id: string): Promise<boolean> {
    const db = await getDb();
    const tableNames = await db.tableNames();
    if (!tableNames.includes(MEMORY_TABLE)) return false;

    const table = await db.openTable(MEMORY_TABLE);
    await table.delete(`id = '${id}'`);
    return true;
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    const db = await getDb();
    const tableNames = await db.tableNames();
    if (!tableNames.includes(MEMORY_TABLE)) return;

    const table = await db.openTable(MEMORY_TABLE);

    const formattedUpdates: any = {};
    if (updates.content !== undefined)
      formattedUpdates.content = `'${updates.content.replace(/'/g, "''")}'`;
    if (updates.type !== undefined) formattedUpdates.type = `'${updates.type}'`;
    if (updates.metadata !== undefined) {
      formattedUpdates.metadata = `'${JSON.stringify(updates.metadata).replace(/'/g, "''")}'`;
    }
    if (updates.entityIds !== undefined) {
      formattedUpdates.entityIds = `'${JSON.stringify(updates.entityIds).replace(/'/g, "''")}'`;
    }

    await table.update(formattedUpdates, { where: `id = '${id}'` });
  }
}
