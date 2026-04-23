DO $$
BEGIN
    IF to_regclass('public.contents') IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'contents'
              AND column_name = 'folder_id'
        )
    THEN
        CREATE INDEX IF NOT EXISTS idx_contents_user_folder_uploaded_at
            ON public.contents (user_id, folder_id, uploaded_at DESC);
    END IF;
END $$;
