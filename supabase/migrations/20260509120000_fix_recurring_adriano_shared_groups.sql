create extension if not exists pgcrypto;

create or replace function public.ensure_recurring_shared_group_per_occurrence()
returns trigger
language plpgsql
as $$
declare
  matched_shared_group_id text;
begin
  if new.tipo = 'despesa'
     and new.recorrente = true
     and new.recorrencia_pai_id is not null
     and (new.adriano = true or new.shared_group_id is not null or new.shared_role is not null)
  then
    select l.shared_group_id
      into matched_shared_group_id
    from public.lancamentos l
    where l.user_id = new.user_id
      and l.tipo = 'despesa'
      and l.recorrente = true
      and l.recorrencia_pai_id = new.recorrencia_pai_id
      and l.data = new.data
      and l.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and l.shared_group_id is not null
      and l.adriano is distinct from new.adriano
    order by l.created_at desc
    limit 1;

    new.shared_group_id := coalesce(matched_shared_group_id, gen_random_uuid()::text);

    if new.adriano = true then
      new.shared_role := 'adriano';
      new.subcategoria_pais := 'Adriano';
    else
      new.shared_role := 'principal';
      if new.subcategoria_pais = 'Adriano' then
        new.subcategoria_pais := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_recurring_shared_group_per_occurrence on public.lancamentos;
create trigger trg_ensure_recurring_shared_group_per_occurrence
before insert or update of shared_group_id, shared_role, recorrencia_pai_id, data, adriano, recorrente
on public.lancamentos
for each row
execute function public.ensure_recurring_shared_group_per_occurrence();

with recurring_shared as (
  select shared_group_id
  from public.lancamentos
  where shared_group_id is not null
    and recorrente = true
  group by shared_group_id
  having count(distinct data) > 1
), occurrence_groups as (
  select
    user_id,
    recorrencia_pai_id,
    data,
    shared_group_id as old_shared_group_id,
    gen_random_uuid()::text as new_shared_group_id
  from public.lancamentos
  where shared_group_id in (select shared_group_id from recurring_shared)
    and recorrente = true
  group by user_id, recorrencia_pai_id, data, shared_group_id
)
update public.lancamentos l
set shared_group_id = og.new_shared_group_id,
    shared_role = case when l.adriano then 'adriano' else 'principal' end,
    subcategoria_pais = case when l.adriano then 'Adriano' else nullif(l.subcategoria_pais, 'Adriano') end
from occurrence_groups og
where l.user_id = og.user_id
  and l.recorrencia_pai_id = og.recorrencia_pai_id
  and l.data = og.data
  and l.shared_group_id = og.old_shared_group_id
  and l.recorrente = true;

with principal_pairs as (
  select p.user_id, p.shared_group_id, p.recorrencia_pai_id
  from public.lancamentos p
  where p.recorrente = true
    and p.adriano = false
    and p.shared_group_id is not null
    and p.recorrencia_pai_id is not null
)
update public.lancamentos a
set recorrencia_pai_id = p.recorrencia_pai_id
from principal_pairs p
where a.user_id = p.user_id
  and a.shared_group_id = p.shared_group_id
  and a.adriano = true
  and a.recorrente = true
  and a.recorrencia_pai_id is distinct from p.recorrencia_pai_id;
