import { describe, it, expect, vi } from "vitest";
import { SearchEngine } from "./engine";

vi.mock("../storage/repository", () => ({
  Repository: vi.fn().mockImplementation(() => ({
    searchMemories: vi.fn().mockResolvedValue([
      {
        id: "1",
        content: "match 1",
        type: "raw",
        metadata: '{"project": "p1"}',
        _distance: 0.1,
      },
      {
        id: "2",
        content: "match 2",
        type: "raw",
        metadata: '{"project": "p2"}',
        _distance: 0.2,
      },
    ]),
  })),
}));

vi.mock("../ai/factory", () => ({
  LLMFactory: vi.fn().mockImplementation(() => ({
    getProvider: vi.fn().mockImplementation(() => ({
      embed: vi.fn().mockResolvedValue([0.1, 0.2]),
    })),
  })),
}));

describe("SearchEngine", () => {
  const config: any = { providers: { local: {} } };

  it("should search memories and return processed results", async () => {
    const engine = new SearchEngine(config);
    const results = await engine.search("query");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].memoryId).toBe("1");
    expect(results[0].score).toBeCloseTo(0.95);
  });

  it("should filter results by metadata", async () => {
    const engine = new SearchEngine(config);
    const results = await engine.search("query", { project: "p1" });

    expect(results.every((r) => r.metadata.project === "p1")).toBe(true);
    expect(results.length).toBe(1);
  });
});
