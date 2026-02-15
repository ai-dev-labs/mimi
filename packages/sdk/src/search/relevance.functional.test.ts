import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SearchEngine } from "./engine";
import { Repository } from "../storage/repository";
import { PipelineEngine } from "../pipeline/engine";
import { setDataDir } from "../storage/db";
import path from "path";
import fs from "fs-extra";
import os from "os";

describe("Search Relevance Functional Test", () => {
  let tempDir: string;
  let config: any;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `mimi-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    setDataDir(tempDir);

    config = {
      providers: {
        local: {
          type: "local",
        }
      },
      pipeline: {}
    };
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("should return better scores with cosine similarity and entity boosting", async () => {
    const repository = new Repository();
    const pipeline = new PipelineEngine(config);
    const searchEngine = new SearchEngine(config);

    // 1. Add some memories
    const mem1 = await pipeline.process("The capital of France is Paris.");
    const mem2 = await pipeline.process("Pizza is a popular Italian dish.");
    const mem3 = await pipeline.process("Paris is known for the Eiffel Tower.");

    await repository.saveBatch(
      [...mem1.memories, ...mem2.memories, ...mem3.memories],
      [...mem1.entities, ...mem2.entities, ...mem3.entities]
    );

    // 2. Search for "Tell me about Paris"
    const results = await searchEngine.search("Tell me about Paris");
    expect(results.length).toBeGreaterThan(0);

    // 3. Search with boost
    const firstEntity = mem1.entities[0]?.name;
    if (firstEntity) {
        const boostedResults = await searchEngine.search("Tell me about Paris", {}, firstEntity);
        
        const parisResult = boostedResults.find(r => r.content.includes("Paris"));
        const pizzaResult = boostedResults.find(r => r.content.includes("Pizza"));
        
        if (parisResult && pizzaResult) {
            expect(parisResult.score).toBeGreaterThan(pizzaResult.score);
        }
    }
  });
});
