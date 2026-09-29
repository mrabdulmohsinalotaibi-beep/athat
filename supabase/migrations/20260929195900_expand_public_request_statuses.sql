-- Keep inbound electronic forms compatible with all workflow statuses used by RequestsInbox.
-- This migration is intentionally additive so it also fixes databases where the original
-- public portal migration has already been applied.

ALTER TABLE public.public_requests
  DROP CONSTRAINT IF EXISTS public_requests_status_check;

ALTER TABLE public.public_requests
  ADD CONSTRAINT public_requests_status_check
  CHECK (
    status IN (
      'جديد',
      'قيد المعالجة',
      'تم التحويل لمقابلة',
      'تم التحويل لإحالة',
      'تم التحويل لحالة',
      'مغلق'
    )
  );

CREATE INDEX IF NOT EXISTS public_requests_user_status_created_idx
  ON public.public_requests (user_id, status, created_at DESC);
