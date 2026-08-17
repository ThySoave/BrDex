# BrDex — App de Coleção e Mercado de Cartas Pokémon TCG

Data: 2026-08-16
Status: Aprovado para planejamento de implementação

## Contexto e problema

O mercado brasileiro de cartas Pokémon TCG não tem uma fonte confiável de preço real de
mercado — colecionadores hoje se baseiam em achismo ou em preço gringo (TCGplayer, em dólar,
mercado diferente). O BrDex resolve dois problemas ao mesmo tempo:

1. **Inventário pessoal**: o usuário cadastra a coleção física dele (raridade, estado de
   conservação, idioma, quanto pagou/vendeu) e enxerga tudo num álbum digital, sem precisar
   carregar as cartas fisicamente.
2. **Preço de mercado real e rede de colecionadores**: o agregado do que os usuários registram
   forma um preço de mercado brasileiro, e uma lista de desejos permite que colecionadores se
   encontrem pra trocar ou vender entre si.

O app **não processa pagamento nem garante a transação** — ele só conecta pessoas com o mesmo
hobby. A negociação em si (forma de pagamento, entrega) é responsabilidade dos usuários, com
aviso claro disso na tela de chat. No futuro, pode-se considerar integrar um meio de pagamento
seguro (ex: Mercado Pago), mas isso viraria efetivamente um marketplace — está fora de escopo
agora.

## Fases de construção

O escopo completo é construído desde já, mas em 4 fases sequenciais — cada uma sozinha já é
utilizável e testável antes de ligar a próxima:

1. **Fase 1 — Conta + Catálogo + Álbum pessoal.** Cadastro (email/senha + Google), sincronização
   do catálogo (Pokémon TCG API), cadastro de cartas do usuário, álbum visual.
2. **Fase 2 — Gráfico de valor + Preço colaborativo.** Histórico de valor da coleção ao longo do
   tempo; preço de mercado calculado a partir do que os usuários registram, com preço de
   referência internacional (TCGplayer, só para cartas em inglês) como âncora inicial.
3. **Fase 3 — Wishlist + Match + Chat.** Lista de desejos, notificação automática de match, chat
   interno. **Denúncia e bloqueio de usuário são obrigatórios nesta fase, não uma melhoria
   posterior** — nenhuma versão do módulo social vai ao ar sem esses dois recursos.
4. **Fase 4 — Monetização.** Assinatura premium + links de afiliado.

Recursos adicionais (compartilhamento social, progresso de coleção por set, notificação de
lançamento de set novo, feed de notícias, calendário de encontros locais, scanner de carta por
foto, exportação em PDF, selo de verificado) entram nas fases acima conforme detalhado na seção
de Recursos.

## Arquitetura técnica

- **App**: React Native + Expo — um código único para iOS e Android.
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime). Row Level Security (RLS) em toda
  tabela com dado de usuário — cada usuário só lê/escreve o que é seu, exceto os campos que ele
  mesmo marcou como públicos.
- **Autenticação**: email/senha + Google OAuth via Supabase Auth.
- **Sincronização de catálogo**: job periódico (Supabase Edge Function agendada) busca da
  Pokémon TCG API e mantém uma cópia própria. O app nunca depende da API externa em tempo real —
  só o job de sincronização depende.
- **Preços de referência internacional**: job periódico separado, só para cartas em inglês,
  puxando da TCGplayer (via programa oficial de API/parceiro deles — a ser confirmado
  formalmente antes da Fase 2, ver Riscos) e convertendo para R$ na hora de gravar.
- **Chat**: Supabase Realtime (canais), sem servidor de mensageria adicional.
- **Notícias**: agregador RSS de fontes públicas (site oficial Pokémon, blogs de TCG, notícias de
  lançamento de sets) — mostra título/resumo e link para a fonte original, nunca reproduz o
  conteúdo inteiro.

### Por que essa arquitetura (e não outras)

Consideramos 3 abordagens:

- **A. Monólito modular no Supabase (escolhida).** Um app, um backend, organizado em módulos
  internos independentes (catálogo/inventário, preços, social) que ligam em fases sem precisar
  re-arquitetar nada. O Postgres do Supabase aguenta centenas de milhares de usuários com os
  índices certos — é o padrão certo pra esse tamanho de time.
- **B. Backend separado por domínio** (serviços distintos para catálogo/preços/social). Mais
  "correto" para escala gigante, mas cria complexidade real (múltiplos bancos, sincronização
  entre eles) sem benefício no estágio atual. Descartada por prematura.
- **C. Cliente-pesado, backend fino** (app busca tudo direto da Pokémon TCG API, sem espelhar
  nada). Mais simples de começar, mas quebra o recurso mais valioso da ideia: o preço
  colaborativo só funciona se o dado de todo mundo passa por um lugar central pra ser cruzado.
  Descartada.

## Modelo de dados (tabelas principais)

- **users** — perfil, gerenciado pelo Supabase Auth.
- **cards_catalog** — catálogo oficial sincronizado da Pokémon TCG API: nome, número, edição,
  raridade, artwork, imagem oficial. Um registro por carta, independente de idioma — a mesma
  arte/número é a mesma carta em qualquer idioma.
- **user_cards** — a carta de um usuário: referência ao catálogo, **idioma da cópia física**
  (EN/PT/JP/outros), estado de conservação (escala fixa, ver abaixo), preço pago/vendido, foto
  opcional (senão usa a imagem oficial do catálogo), e status: `guardada` / `à venda` /
  `disponível para troca`. Só cartas com status diferente de `guardada` aparecem na busca de
  outros usuários.
- **price_reference** — preço de referência externo, chave por `(carta, idioma)`, fonte e data.
  Populado hoje só para `idioma = EN` via TCGplayer. Cartas em PT e JP não têm fonte externa —
  ver Riscos.
- **price_community** — preço de mercado calculado a partir das transações que os próprios
  usuários registram, também chaveado por `(carta, idioma)` — nunca misturando mercados de
  idiomas diferentes. Calcula mediana/faixa; valores muito fora da faixa (outliers) são marcados
  e excluídos do cálculo, sem verificação manual no lançamento.
- **wishlist** — cartas que o usuário quer, por `(carta, idioma opcional)`.
- **matches** — gerado automaticamente quando uma `user_cards` com status à venda/troca bate com
  uma `wishlist` de outro usuário; dispara notificação para os dois.
- **conversations** / **messages** — chat entre dois usuários, normalmente iniciado a partir de
  um match.
- **reports** / **blocks** — denúncia de usuário e bloqueio, parte obrigatória da Fase 3 (ver
  Fluxos).

Escala de estado de conservação (fixa, não é texto livre): baseada em escala simplificada estilo
PSA — poucas opções pré-definidas (ex: Mint, Quase Nova, Excelente, Boa, Jogada, Danificada), com
descrição de cada uma na tela de cadastro. Padroniza os dados de preço entre usuários.

## Fluxos principais

**Cadastro de carta.** Usuário busca no catálogo sincronizado → escolhe a carta (raridade/edição
já vêm do catálogo) → define idioma, estado de conservação, preço pago, foto opcional → define
status (guardada/à venda/troca).

**Preço colaborativo.** Toda carta registrada com preço entra no cálculo de `price_community`
daquele `(carta, idioma)`. Cartas em inglês também mostram o preço de referência da TCGplayer
lado a lado, claramente rotulado como "referência internacional" — nunca misturado com o preço
comunitário brasileiro.

**Wishlist → Match → Chat.** Usuário marca carta desejada → sistema cruza automaticamente com
`user_cards` de outros usuários com status à venda/troca → notifica os dois lados → chat interno
para combinar. Aviso fixo na tela de chat: a negociação (pagamento, entrega) é por conta dos
usuários, o app não garante nem participa da transação.

**Denúncia e bloqueio (obrigatório desde o lançamento do módulo social).** Qualquer usuário pode
denunciar outro a partir do chat ou do perfil; denúncia registra motivo e contexto. Usuário
bloqueado para de aparecer em buscas/matches do denunciante e não consegue mais iniciar
conversa. Sem isso, o módulo de chat/match não vai ao ar — não é um recurso a mais, é pré-
requisito de lançamento da Fase 3.

## Recursos adicionais

**Grátis (motor de crescimento — não faz sentido travar isso atrás de assinatura):**
- Compartilhamento social: gera uma imagem da coleção ou de uma carta rara para postar em redes.
- Notificação de lançamento de set novo (usa a sincronização de catálogo que já existe).
- Feed de notícias do mundo Pokémon na tela inicial (agregador RSS, título + resumo + link).
- Calendário de encontros/feiras de troca locais.
- Reputação básica (histórico de negociações visível) — travar isso atrás de paywall
  prejudicaria a segurança de todos, não só de quem paga.

**Premium (recursos com custo real de operação ou valor claro de "pago por isso"):**
- Scanner de carta por foto (câmera com reconhecimento de imagem) — tem custo de processamento
  por uso, é o recurso de maior "uau" do produto.
- Progresso de coleção por set ("você tem 87 de 102 cartas dessa edição").
- Exportar coleção em PDF (documentação útil para seguro em caso de furto/perda).
- Selo de verificado / prioridade nos resultados de busca.
- Cartas ilimitadas no inventário (grátis tem limite, número a definir).
- Alertas de preço ("avise quando essa carta passar de X").
- Histórico completo do gráfico de valor da coleção (grátis mostra um recorte menor).

## Monetização

1. **Assinatura premium** (mensal, valor de referência ~R$ 9,90) — pilar principal de receita,
   alinhado com quem usa o app pra valer.
2. **Links de afiliado** para marketplaces (TCGplayer, lojas parceiras BR) quando o usuário quer
   comprar uma carta que falta — receita passiva, zero infraestrutura extra, não conflita com o
   app não processar venda.
3. **Direção futura (não construída agora, mas o modelo de dados já suporta):** vender acesso via
   API ao banco de preços colaborativo para lojas físicas e serviços de grading, uma vez que
   haja volume real de dados. Como `price_community` já é uma tabela estruturada e não texto
   livre, isso é só expor um endpoint novo depois — não exige replanejar a arquitetura.

## Riscos conhecidos e decisões conscientes

- **Cold start de preço em PT e JP é mais lento.** Nenhum dos dois tem fonte de referência
  externa no lançamento — só o dado colaborativo dos próprios usuários brasileiros. Decisão
  consciente: tentamos usar a PriceCharting API para preço de cartas japonesas, mas os termos de
  uso deles proíbem expor os dados a qualquer app acessível ao público sem acordo comercial
  explícito (o plano pago disponível, ~US$ 6/mês, só cobre uso interno). Sem esse acordo, PT e JP
  ficam sem âncora externa por enquanto — zero risco jurídico, cold start mais lento só nesses
  dois idiomas.
- **Licenciamento da TCGplayer precisa ser confirmado formalmente** antes da Fase 2 ir ao ar —
  eles têm um programa oficial de API voltado para apps de terceiros mostrarem preço, mas isso
  precisa ser verificado por escrito, não assumido.
- **App não processa pagamento nem garante a transação** — mitigado por aviso explícito na tela
  de chat; qualquer meio de pagamento seguro (ex: Mercado Pago) é decisão de fase futura, e
  transformaria o produto num marketplace de verdade (fora de escopo agora).
- **Preço colaborativo sem verificação de comprovante no lançamento** — qualquer usuário pode
  registrar um preço; mitigado por marcação estatística de outliers (mediana/faixa), não por
  exigir prova de transação. Decisão consciente para não criar atrito no cadastro.

## Fora de escopo (nesta fase)

- Processar pagamento ou garantir a transação entre usuários.
- Verificação/moderação manual de preços registrados.
- Backend separado por domínio (arquitetura B) — só revisitar se surgir problema real de escala.
- Venda de API do banco de preços — modelo de dados já suporta, mas não construído agora.
