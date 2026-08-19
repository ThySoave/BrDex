create function public.set_progress(uid uuid)
returns table (set_id text, set_name text, owned bigint, total bigint)
language sql stable security definer set search_path = public
as $$
  select c.set_id,
         c.set_name,
         count(distinct uc.catalog_card_id) as owned,
         (select count(*) from public.cards_catalog t where t.set_id = c.set_id) as total
  from public.user_cards uc
  join public.cards_catalog c on c.id = uc.catalog_card_id
  where uc.user_id = uid
  group by c.set_id, c.set_name
  order by c.set_name;
$$;
