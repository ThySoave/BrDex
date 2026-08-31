# BrDex

App mobile de coleção e marketplace de cartas Pokémon TCG para o mercado brasileiro.

## O problema

Colecionador brasileiro de TCG administra a coleção em planilha e negocia em grupo de WhatsApp.
Não sabe quanto vale o que tem, descobre tarde quando um preço cai, e a troca depende de
confiar em quem nunca viu. Os apps existentes são feitos para o mercado americano: preço em
dólar, catálogo desatualizado para o que circula aqui, nenhuma noção de comunidade local.

## O que o BrDex faz

- **Catálogo e álbum** — catálogo completo sincronizado, busca no servidor com debounce e
  paginação infinita; o usuário marca o que tem e monta o álbum
- **Scanner de carta** — reconhecimento por foto para adicionar à coleção sem digitar
- **Preço colaborativo** — valor de mercado formado pelas vendas registradas pela própria
  comunidade, com alerta push quando o preço de uma carta acompanhada se move
- **Wishlist com match** — cruza o que você quer com o que os outros têm sobrando e abre chat
- **Meetups** — encontros presenciais para troca, resolvendo a desconfiança da troca remota
- **Notícias** e **selo de verificado** para reputação
- Exportação da coleção em PDF

## Arquitetura

```
app/            Expo Router — rotas por arquivo, grupos (auth) e (tabs)
src/features/   um módulo por domínio: collection, pricing, social, meetups,
                scanner, wishlist, news, notifications, premium, auth
src/lib/        cliente Supabase e utilitários compartilhados
supabase/
  migrations/   23+ migrations versionadas
  functions/    edge functions: sync-catalog, sync-prices, recognize-card,
                fetch-news, send-push
```

**Stack:** React Native + Expo (Expo Router, Notifications, Image Picker, Print),
TypeScript, Supabase (Postgres, Auth, Edge Functions em Deno), Jest.

**Decisões que valem comentário:**

- *Preço colaborativo em vez de scraping* — o valor sai das vendas que os próprios usuários
  registram. Sem dependência de fonte externa que pode cair ou bloquear, e o dado reflete o
  que o mercado brasileiro realmente pratica.
- *Edge functions para o trabalho pesado* — sincronização de catálogo e preços roda agendada
  no servidor, não no aparelho. O app abre rápido e não gasta bateria do usuário.
- *Row Level Security no banco* — as regras de quem vê o quê, incluindo bloqueio entre
  usuários, vivem no Postgres. O cliente não é a fronteira de segurança.

## Testes

79 arquivos de teste cobrindo regras de coleção, precificação, match de wishlist e
permissões. `npm test`

## Status

Em desenvolvimento ativo — 177 commits. Cada fase é planejada em `docs/` antes de virar código.

---

Feito por [Thyago Soave](https://linkedin.com/in/thyago-soave-correa).
Projeto pessoal, sem vínculo com The Pokémon Company. Nenhuma arte de carta é distribuída
neste repositório.
