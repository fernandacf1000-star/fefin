-- Norte only: group id for monthly recurring entries. No FeFin table is touched.
alter table public.norte_lancamentos add column if not exists recorrencia_id uuid;
create index if not exists norte_entries_recurrence_idx
  on public.norte_lancamentos(user_id, recorrencia_id) where recorrencia_id is not null;
