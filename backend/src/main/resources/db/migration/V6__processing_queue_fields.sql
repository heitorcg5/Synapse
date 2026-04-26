-- Add retry_count and last_error to processing_jobs table to support the persistent queue

ALTER TABLE processing_jobs ADD COLUMN retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE processing_jobs ADD COLUMN last_error TEXT;
