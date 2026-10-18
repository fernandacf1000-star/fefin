-- Norte owns its records. No FeFin table, trigger or historical row is changed.
create table public.norte_cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  dia_fechamento integer not null check (dia_fechamento between 1 and 31),
  dia_vencimento integer not null check (dia_vencimento between 1 and 31),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create table public.norte_lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  descricao text not null,
  valor numeric not null default 0,
  tipo text not null default 'despesa' check (tipo in ('despesa','receita')),
  categoria text not null default 'despesa',
  categoria_macro text,
  subcategoria text,
  subcategoria_pais text,
  data date not null default current_date,
  mes_referencia text not null check (mes_referencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  forma_pagamento text check (forma_pagamento in ('credito','dinheiro')),
  cartao_id uuid,
  pago boolean not null default false,
  pago_por text not null default 'voce',
  is_parcelado boolean not null default false,
  parcela_atual integer,
  parcela_total integer,
  parcelamento_id uuid,
  created_at timestamptz not null default now(),
  constraint norte_own_card foreign key (cartao_id,user_id) references public.norte_cartoes(id,user_id),
  constraint norte_installments check (not is_parcelado or (parcela_atual is not null and parcela_total is not null and parcela_atual >= 1 and parcela_total >= parcela_atual and parcelamento_id is not null))
);
alter table public.norte_cartoes enable row level security;
alter table public.norte_lancamentos enable row level security;
revoke all on public.norte_cartoes,public.norte_lancamentos from public,anon;
grant select,insert,update,delete on public.norte_cartoes,public.norte_lancamentos to authenticated;
grant all on public.norte_cartoes,public.norte_lancamentos to service_role;
create policy norte_cards_select on public.norte_cartoes for select to authenticated using ((select auth.uid())=user_id);
create policy norte_cards_insert on public.norte_cartoes for insert to authenticated with check ((select auth.uid())=user_id);
create policy norte_cards_update on public.norte_cartoes for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy norte_cards_delete on public.norte_cartoes for delete to authenticated using ((select auth.uid())=user_id);
create policy norte_entries_select on public.norte_lancamentos for select to authenticated using ((select auth.uid())=user_id);
create policy norte_entries_insert on public.norte_lancamentos for insert to authenticated with check ((select auth.uid())=user_id);
create policy norte_entries_update on public.norte_lancamentos for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy norte_entries_delete on public.norte_lancamentos for delete to authenticated using ((select auth.uid())=user_id);
create index norte_cards_user_idx on public.norte_cartoes(user_id);
create index norte_entries_history_idx on public.norte_lancamentos(user_id,created_at desc,id);
create index norte_entries_installments_idx on public.norte_lancamentos(user_id,parcelamento_id) where parcelamento_id is not null;
create index norte_entries_card_idx on public.norte_lancamentos(cartao_id,user_id);
-- Independent setup from the two card identifiers explicitly supplied for Norte.
-- No historical transactions or category memory are copied from FeFin.
insert into public.norte_cartoes(id,user_id,nome,dia_fechamento,dia_vencimento) values
('86e2aca7-ac75-4dfc-93bc-8036d8a6eddf','3b2ffd9c-6122-4128-9474-9bf796410e94','Master',22,1),
('749d8b20-7c2c-48a9-9601-dd7035c33cd5','3b2ffd9c-6122-4128-9474-9bf796410e94','Visa',10,17);
