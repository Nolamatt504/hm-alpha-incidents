-- Hotel-only until Hotel Admin sends to corporate.
-- Live database already has this migration applied.

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_by uuid;

UPDATE public.incidents
SET escalated_at = COALESCE(updated_at, created_at)
WHERE status = 'sent_to_corporate'
  AND escalated_at IS NULL;

UPDATE public.incidents i
SET escalated_at = a.first_at
FROM (
  SELECT incident_id, MIN(created_at) AS first_at
  FROM public.incident_activity
  WHERE action = 'status_change'
    AND detail ILIKE '%Sent to Corporate%'
  GROUP BY incident_id
) a
WHERE i.id = a.incident_id
  AND i.escalated_at IS NULL;

CREATE OR REPLACE FUNCTION public.protect_incident_escalate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.escalated_at := NULL;
    NEW.escalated_by := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'sent_to_corporate' THEN
    IF public.get_my_role() IS DISTINCT FROM 'property_admin' THEN
      RAISE EXCEPTION 'Only Hotel Admin can send reports to corporate';
    END IF;
    NEW.escalated_at := COALESCE(OLD.escalated_at, now());
    NEW.escalated_by := COALESCE(OLD.escalated_by, auth.uid());
    RETURN NEW;
  END IF;

  NEW.escalated_at := OLD.escalated_at;
  NEW.escalated_by := OLD.escalated_by;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_protect_incident_escalate ON public.incidents;
CREATE TRIGGER trg_protect_incident_escalate
  BEFORE INSERT OR UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_incident_escalate();

DROP POLICY IF EXISTS "Corporate can see all incidents" ON public.incidents;
DROP POLICY IF EXISTS "Property users see only their hotel" ON public.incidents;
DROP POLICY IF EXISTS "incidents_select_visible" ON public.incidents;

CREATE POLICY "incidents_select_visible"
ON public.incidents
FOR SELECT
USING (
  submitted_by = auth.uid()
  OR (
    public.get_my_role() = ANY (ARRAY['property_admin'::text, 'property_hr'::text])
    AND hotel_id IS NOT NULL
    AND hotel_id = public.get_my_hotel_id()
    AND status IS DISTINCT FROM 'draft'::incident_status
  )
  OR (
    public.get_my_role() = 'corporate_admin'
    AND escalated_at IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Staff and owners can update incidents" ON public.incidents;

CREATE POLICY "Staff and owners can update incidents"
ON public.incidents
FOR UPDATE
USING (
  (
    public.get_my_role() = 'corporate_admin'
    AND escalated_at IS NOT NULL
  )
  OR (
    public.get_my_role() = ANY (ARRAY['property_admin'::text, 'property_hr'::text])
    AND hotel_id IS NOT NULL
    AND hotel_id = public.get_my_hotel_id()
  )
  OR (
    submitted_by = auth.uid()
    AND status = 'draft'::incident_status
  )
)
WITH CHECK (
  (
    public.get_my_role() = 'corporate_admin'
    AND escalated_at IS NOT NULL
  )
  OR (
    public.get_my_role() = ANY (ARRAY['property_admin'::text, 'property_hr'::text])
    AND hotel_id IS NOT NULL
    AND hotel_id = public.get_my_hotel_id()
  )
  OR (
    submitted_by = auth.uid()
    AND status = ANY (ARRAY['draft'::incident_status, 'submitted'::incident_status])
  )
);

DROP FUNCTION IF EXISTS public.get_incident_notify_emails(uuid);

CREATE OR REPLACE FUNCTION public.get_incident_notify_emails(
  p_hotel_id uuid,
  p_notify_type text DEFAULT 'new_report'
)
RETURNS TABLE(email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $fn$
  SELECT DISTINCT p.email
  FROM public.profiles p
  WHERE p.is_active IS TRUE
    AND p.email IS NOT NULL
    AND length(trim(p.email)) > 0
    AND p_notify_type = 'sent_to_corporate'
    AND p.role = 'corporate_admin';
$fn$;

GRANT EXECUTE ON FUNCTION public.get_incident_notify_emails(uuid, text) TO authenticated, service_role;
