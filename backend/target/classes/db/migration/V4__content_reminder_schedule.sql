DO $$
BEGIN
    IF to_regclass('public.contents') IS NOT NULL THEN
        ALTER TABLE public.contents
            ADD COLUMN IF NOT EXISTS notification_reminder_at TIMESTAMPTZ;

        ALTER TABLE public.contents
            ADD COLUMN IF NOT EXISTS reminder_notified_at TIMESTAMPTZ;

        CREATE INDEX IF NOT EXISTS idx_contents_due_reminders
            ON public.contents (notification_reminder_at)
            WHERE notifications_enabled = TRUE AND reminder_notified_at IS NULL;
    END IF;
END $$;
