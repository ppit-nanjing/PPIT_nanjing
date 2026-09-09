-- "sensus" used to be an alias of the "reports" module (one shared page,
-- /console/reports). The per-person census view + proof (passport numbers,
-- student cards / LOA) now lives on its own page, /console/sensus, with its
-- own module key. For now only BPH + Divisi Teknologi (full admins) should
-- hold it, so drop the standalone "sensus" grant that src/db/seed.ts gave
-- Divisi Hubungan Masyarakat. A full admin can re-grant it per division from
-- /console/organization when wanted (the checkbox stays available).
--
-- No schema change - data cleanup only. Safe to run more than once.
UPDATE departments
SET admin_module_scope = array_remove(admin_module_scope, 'sensus')
WHERE 'sensus' = ANY(admin_module_scope);
