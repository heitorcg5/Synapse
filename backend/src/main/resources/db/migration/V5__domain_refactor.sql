-- 1. Rename main tables
ALTER TABLE contents RENAME TO inbox_items;
ALTER TABLE inbox_items RENAME COLUMN uploaded_at TO captured_at;

ALTER TABLE content_folders RENAME TO inbox_folders;

ALTER TABLE content_tags RENAME TO inbox_item_tags;
ALTER TABLE inbox_item_tags RENAME COLUMN content_id TO inbox_item_id;

-- 2. Rename foreign keys
ALTER TABLE analysis_results RENAME COLUMN content_id TO inbox_item_id;
ALTER TABLE summaries RENAME COLUMN content_id TO inbox_item_id;

ALTER TABLE user_notifications RENAME COLUMN content_id TO inbox_item_id;
ALTER TABLE user_notifications RENAME COLUMN related_content_id TO related_inbox_item_id;

-- 3. Fix processing_jobs
-- It has both content_id and inbox_item_id. Migrate data to inbox_item_id and drop content_id.
UPDATE processing_jobs SET inbox_item_id = content_id WHERE inbox_item_id IS NULL;
ALTER TABLE processing_jobs DROP COLUMN content_id;

-- 4. Clean up knowledge_items
-- Remove the redundant JSON array column for links, relying instead on knowledge_relations table
ALTER TABLE knowledge_items DROP COLUMN linked_item_ids;

-- 5. Rename indexes created in earlier migrations to reflect new naming conventions
ALTER INDEX IF EXISTS idx_contents_user_uploaded_at RENAME TO idx_inbox_items_user_captured_at;
ALTER INDEX IF EXISTS idx_contents_user_status_uploaded_at RENAME TO idx_inbox_items_user_status_captured_at;
ALTER INDEX IF EXISTS idx_contents_user_source_url RENAME TO idx_inbox_items_user_source_url;
ALTER INDEX IF EXISTS idx_contents_user_folder_uploaded_at RENAME TO idx_inbox_items_user_folder_captured_at;
