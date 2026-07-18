// Embeddings are deliberately deferred: no provider is active until an API key
// is added. The facts/jobs vector columns exist in the schema; retrieval
// (lib/retrieval.ts) falls back to keyword/category/recency until then.
//
// To enable later: set EMBEDDINGS_PROVIDER=voyage (with VOYAGE_API_KEY) or
// EMBEDDINGS_PROVIDER=openai (with OPENAI_API_KEY), implement the provider
// below, add a vector index + match RPC migration, and backfill embeddings.

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export function getEmbeddingProvider(): EmbeddingProvider | null {
  const provider = process.env.EMBEDDINGS_PROVIDER;
  if (!provider) return null;

  // Providers are wired up when a key is chosen — failing loudly beats
  // silently returning garbage vectors.
  throw new Error(
    `EMBEDDINGS_PROVIDER="${provider}" is set but no provider is implemented yet. ` +
      `Remove the env var or implement it in lib/embeddings.ts.`,
  );
}

export function embeddingsEnabled(): boolean {
  return getEmbeddingProvider() !== null;
}
