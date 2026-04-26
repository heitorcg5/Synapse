CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_embeddings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    inbox_item_id UUID NOT NULL,
    summary_id UUID,
    knowledge_item_id UUID,
    embedding vector(768) NOT NULL, -- Ollama nomic-embed-text uses 768 dimensions by default.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (inbox_item_id) REFERENCES inbox_items(id) ON DELETE CASCADE
);

CREATE INDEX ON knowledge_embeddings USING hnsw (embedding vector_l2_ops);
CREATE INDEX idx_knowledge_embeddings_user ON knowledge_embeddings(user_id);
