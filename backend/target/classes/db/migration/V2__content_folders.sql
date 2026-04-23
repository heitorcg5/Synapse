DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.content_folders (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_content_folders_user_name
        ON public.content_folders (user_id, name);

    IF to_regclass('public.contents') IS NOT NULL THEN
        ALTER TABLE public.contents
            ADD COLUMN IF NOT EXISTS folder_id UUID;

        CREATE INDEX IF NOT EXISTS idx_contents_folder_id
            ON public.contents (folder_id);

        ALTER TABLE public.contents
            DROP CONSTRAINT IF EXISTS fk_contents_folder_id;

        ALTER TABLE public.contents
            ADD CONSTRAINT fk_contents_folder_id
                FOREIGN KEY (folder_id)
                    REFERENCES public.content_folders (id)
                    ON DELETE SET NULL;
    END IF;
END $$;
