import { Repository } from "../storage/repository";
import { LLMFactory } from "../ai/factory";
import { Config } from "../config/schema";
import { getDb } from "../storage/db";

export interface SearchResult {
  memoryId: string;
  content: string;
  score: number;
  type: string;
  metadata: any;
}

export class SearchEngine {
  private repo: Repository;
  private llmFactory: LLMFactory;

  constructor(private config: Config) {
    this.repo = new Repository();
    this.llmFactory = new LLMFactory(config);
  }

  async search(
    phrase: string,
    filters: any = {},
    boostEntity?: string | string[],
  ): Promise<SearchResult[]> {
    // 1. Embed query (prioritize 'local' for consistent dimension with stored data)
    const embedderName = this.config.providers["local"]
      ? "local"
      : Object.keys(this.config.providers)[0] || "default";
    const embedder = this.llmFactory.getProvider(embedderName);
    const vector = await embedder.embed(phrase);

    // 3. Vector Search
    // We request more results to allow for post-filtering
    const rawResults = await this.repo.searchMemories(vector, undefined, 50);

    // 4. Post-Process (Filter & Boost)
    let results: SearchResult[] = rawResults.map((r: any) => {
      // LanceDB 'cosine' metric returns cosine distance: 1 - cosine_similarity
      // similarity = 1 - distance
      // Distance is usually in [0, 2], so similarity is in [-1, 1]
      const similarity = 1 - (r._distance || 0);

      // Normalize to [0, 1] for better UX
      const normalizedScore = (similarity + 1) / 2;

      return {
        memoryId: r.id,
        content: r.content,
        score: normalizedScore,
        type: r.type,
        metadata:
          typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
        entityIds: r.entityIds,
      };
    });

    // Filter
    if (Object.keys(filters).length > 0) {
      results = results.filter((r) => {
        for (const [key, val] of Object.entries(filters)) {
          if (r.metadata[key] !== val) return false;
        }
        return true;
      });
    }

    // Boost by Entity
    if (boostEntity) {
      const entitiesToBoost = Array.isArray(boostEntity)
        ? boostEntity
        : [boostEntity];

      try {
        const dbConn = await getDb();
        const tableNames = await dbConn.tableNames();

        if (tableNames.includes("entities")) {
          const entityTable = await dbConn.openTable("entities");
          const boostIds = new Set<string>();

          for (const name of entitiesToBoost) {
            const matches = await entityTable
              .query()
              .where(`name = '${name.replace(/'/g, "''")}'`)
              .limit(1)
              .toArray();
            if (matches.length > 0) {
              boostIds.add(matches[0].id);
            }
          }

          if (boostIds.size > 0) {
            results = results.map((r: any) => {
              const hasBoostedEntity = r.entityIds?.some((id: string) =>
                boostIds.has(id),
              );
              if (hasBoostedEntity) {
                return { ...r, score: r.score * 1.2 };
              }
              return r;
            });
          }
        }
      } catch (e) {
        console.error("Boosting failed:", e);
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 10);
  }
}
