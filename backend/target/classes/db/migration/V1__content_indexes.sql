DO $$
BEGIN
    IF to_regclass('public.contents') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_contents_user_uploaded_at
            ON public.contents (user_id, uploaded_at DESC);
        CREATE INDEX IF NOT EXISTS idx_contents_user_status_uploaded_at
            ON public.contents (user_id, status, uploaded_at DESC);
        CREATE INDEX IF NOT EXISTS idx_contents_user_source_url
            ON public.contents (user_id, source_url);
    END IF;
END $$;
