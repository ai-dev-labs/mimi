# 002: Enhanced Search Relevance

## Status
Proposed

## Summary
Improve memory retrieval accuracy by refining vector search logic, implementing entity-based boosting, and optimizing similarity score calculations.

## Motivation
Current search results return low similarity scores (often negative) and frequently appear unrelated to the user's query. This is likely due to the use of L2 distance for scoring and a lack of semantic boosting for key entities.

## Requirements (EARS Format)

### Ubiquitous
- The SearchEngine shall use the same embedding model for queries as was used for storing memories.

### Event-driven
- When a search is initiated, the SearchEngine shall use Cosine similarity to rank memories.
- When a search is initiated, the SearchEngine shall normalize similarity scores to a 0.0 to 1.0 range.

### Unwanted Behavior
- If the embedding provider fails, the SearchEngine shall log a warning and return an empty result set.
- If the database table does not exist, the SearchEngine shall return an empty result set without throwing an error.

### State-driven
- While a `boostEntity` is provided, the SearchEngine shall resolve the entity name to an ID and increase the score of memories associated with that entity ID.

### Optional Features
- Where a `minScore` threshold is provided, the SearchEngine shall exclude results with a score below the threshold.

## Detailed Design

### 1. Vector Search Optimization
- Update `Repository.searchMemories` to use the `.metric("cosine")` in LanceDB queries.
- Update `SearchEngine.search` to handle similarity scores correctly (Cosine similarity in LanceDB returns 1.0 for perfect match and -1.0 for opposite, distance is $1 - similarity$).
- Wait, LanceDB's `metric("cosine")` actually returns the **Cosine Distance**, which is $1 - Cosine Similarity$.
- So `score = 1 - distance` is correct for Cosine Distance.

### 2. Entity Boosting
- In `SearchEngine.search`, if `boostEntity` is provided:
  - Query the `entities` table for an entity matching the name (case-insensitive).
  - If found, retrieve its `id`.
  - For each search result, if `r.entityIds` contains the boosted entity ID, multiply its score by a boost factor (e.g., 1.2).

### 3. Consistency
- Ensure `SearchEngine` and `PipelineEngine` use a consistent logic for selecting the embedding provider.

## Drawbacks
- Entity lookup adds an extra database query per search if boosting is used.
- Boosting might slightly favor older memories if entity associations are more frequent there.

## Alternatives
- Use an LLM for reranking (more accurate but slower and more expensive).
- Use hybrid search (vector + keyword), but LanceDB's keyword search setup is more complex.

## Unresolved Questions
- What is the optimal boost factor for entities?
- Should we support multiple boosted entities?
