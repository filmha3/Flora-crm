-- Lets an agent clear («پاک کردن») their own handled visit requests.
-- Run once in Supabase → SQL Editor. Until it runs, the app falls back to
-- marking the request status = 'dismissed' (hidden from the list).
drop policy if exists "owner deletes visit requests" on public.visit_requests;
create policy "owner deletes visit requests" on public.visit_requests
  for delete using (auth.uid() = user_id);
