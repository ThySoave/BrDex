-- Fase 18: foto própria da carta.
-- Bucket público: leitura direto pela URL pública; escrita restrita por policy
-- à pasta do próprio usuário (<user_id>/...).
insert into storage.buckets (id, name, public)
values ('card-photos', 'card-photos', true)
on conflict (id) do nothing;

create policy "users upload their own card photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
