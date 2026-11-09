# Acesso, plano, admin e registro de uso

- **Autor:** Guilherme Eller (com Claude)
- **Status:** Aprovado e implementado (aceite feito em 09/11/2026)
- **Data:** 2026-11-09
- **Origem:** [concepts brief](./acesso-plano-admin/concepts_brief.md) · PRD: Papéis e permissões, M1, M10 (onda 1), Modelo de dados
- **Revisões:** [segurança](./acesso-plano-admin/critic_report.md) · [zoom out](./acesso-plano-admin/zoom_out_report.md) · [prontidão](./acesso-plano-admin/implementation_readiness_report.md) · [resolução](./acesso-plano-admin/resolucao.md)

---

## Visão geral

Este design cobre o prompt 3 do PRD: a catraca da plataforma. Na onda 1, a Ecoa recebe o Pix e ativa o plano no `/admin`. Ativar cria o livro, cria a conta do responsável e manda o e-mail de acesso. O responsável entra com Google ou com link por e-mail e vê a home vazia do livro. O plano dura 12 meses; vencido, o livro fica em somente leitura. Cada abertura do livro e cada ação do admin vira uma linha em `events`.

## O problema

Hoje não existe banco, login nem forma de liberar acesso. Sem isso, nenhum prompt seguinte (configuração, gravação, IA) tem onde guardar dados nem como separar uma família da outra. A separação precisa ser garantida pelo banco (RLS) e pela configuração do login: um erro numa tela, ou alguém criando conta antes do dono, não pode abrir o livro de outra família.

## Objetivos

1. O admin ativa um plano informando o e-mail do responsável (e, se quiser, o nome do autor), confirma o e-mail numa segunda tela, e o e-mail de acesso sai na hora. Verificação: manual no aceite.
2. O responsável entra com Google ou link por e-mail e cai direto na home do seu livro.
3. Um responsável não lê, não altera e não apaga nada de outro livro. Verificação: `supabase/tests/rls.test.ts` em `npm test`.
4. Só o admin cria contas. Ninguém se cadastra sozinho, nem por senha. Verificação: configuração no painel (guia de setup) e teste manual no aceite.
5. Ninguém fora do servidor muda estado ou vencimento do plano, nem do próprio livro. Verificação: teste de RLS.
6. Plano vencido bloqueia escrita feita com a sessão do usuário, mesmo que o job diário atrase. Verificação: teste de RLS.
7. `registrarEvento` é a única porta de escrita em `events` no código TypeScript. Verificação: teste que procura `from("events")` fora de `lib/eventos.ts`. Exceção declarada: o job `privado.vencer_planos()`, que grava em SQL.
8. "Quem acessou o livro X ontem e o que fez" responde com uma consulta. Verificação: consulta documentada, conferida no aceite.

## Não objetivos

- Convite e limite de co-facilitadores (prompt 11). A tabela já aceita o papel.
- Uso do link do autor (prompt 5): aqui só a tabela. Geração e hash do token entram no prompt 5.
- Apelido, parentesco e foto do autor (prompt 4, com o formulário).
- Painel de aderência (prompt 15).
- Pagamento automático (prompt 14).
- Design system (prompt 2). Aqui, 3 componentes mínimos; o gate de design para no PASS, sem polir telas que o prompt 2 vai refazer.
- Lista de livros para quem tem mais de um: sem caso real na onda 1 (abre o mais recente).

## Perguntas em aberto

Nenhuma.

- ~~**Google com cadastro desligado.**~~ **Resolvida no aceite (09/11/2026):** com "Allow new users to sign up" desligado, a conta criada pelo admin (só e-mail) entrou com Google, e o Supabase vinculou a identidade Google à conta existente (provedores `email` e `google`). Um Google não cadastrado não criou conta. O plano B não é necessário.

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Estranho cria `ana@…` antes do admin e herda o livro | Cadastro público e login por senha desligados; `ativarPlano` recusa conta com identidade diferente de `email`/`google` |
| Redirect de login para domínio de terceiro (`*.vercel.app` de outra pessoa) | Lista de redirects só com URLs exatas do app e do branch de preview |
| E-mail digitado errado entrega o livro a um estranho | Tela de confirmação com o e-mail em destaque; `admin_trocar_responsavel` |
| Scanner de e-mail (Outlook, antivírus) queima o link de uso único | Link abre uma página com o botão *Entrar*; só o clique (POST) consome o token |
| Bombardeio de e-mails pelo `signInWithOtp` público | Limites de Auth do Supabase (documentados no setup); `shouldCreateUser: false` |
| Descobrir quem tem livro pelo tempo de resposta | Envio em `after()`; resposta imediata e igual para todos |
| Código futuro com a chave secreta ignora o plano vencido | Regra escrita aqui: escrita do usuário usa o cliente da sessão; quem usar a chave secreta chama `livro_editavel` antes |
| Grants padrão do Supabase voltam em tabelas e funções novas | Teste genérico: nenhum grant de tabela para `anon`; nenhuma função executável por `anon`; só as funções da lista executáveis por `authenticated`; RLS ligada em toda tabela |
| Conta Google do admin comprometida | Admin lê o e-mail de todos. Mitigação na onda 1: verificação em 2 etapas na conta Google; MFA no Supabase fica para a onda 2 |
| Resend fora do ar na ativação | Plano fica ativo; a tela diz "Plano ativado, mas o e-mail não saiu. Use Reenviar." |
| Shim do PGlite diferente do Supabase real | `get_advisors` no projeto real e teste manual de leitura cruzada no aceite |

## Jornadas críticas (CUJs)

### CUJ 1: Ativar um plano
- **Dado** que o admin está logado e o Pix foi confirmado,
- **Quando** ele digita `ana@exemplo.com` e "Jair", toca em *Ativar plano*, vê "Ativar para **ana@exemplo.com**?" e confirma,
- **Então** um livro `ativo` com vencimento em 12 meses é criado, Ana vira responsável, o e-mail "O livro do Jair está pronto para começar" é enviado, a linha aparece no topo da lista e o evento `plano_ativado` é registrado. Dois toques rápidos não criam dois livros (botão desativado durante o envio).

### CUJ 2: Primeiro acesso com Google
- **Dado** que Ana recebeu o e-mail,
- **Quando** ela toca em *Abrir meu livro* e depois em *Entrar com Google*,
- **Então** ela cai em `/livro/<id>` com "O livro do Jair" e uma frase de estado vazio, e o evento `entrou` é registrado com papel `responsavel`.

### CUJ 3: Entrar por link
- **Dado** que Ana não usa Google,
- **Quando** ela digita o e-mail em `/entrar` e toca em *Receber link*,
- **Então** a tela responde na hora "Se este e-mail tiver um livro, o link chega em instantes"; o e-mail chega; o link abre uma página com o botão *Entrar*; o toque abre a home do livro.

### CUJ 4: Plano vence
- **Dado** um livro com `plano_vence_em` no passado,
- **Quando** o job das 06:00 roda (ou mesmo antes dele),
- **Então** qualquer escrita de Ana no livro é recusada pelo banco; a home mostra o selo "Somente leitura"; depois do job o estado gravado é `somente_leitura` e existe o evento `plano_vencido` com ator `sistema`.

### CUJ 5: Renovar, reenviar, trocar responsável
- **Quando** o admin toca em *Renovar* e depois em *Confirmar +12 meses*, o vencimento vira o maior entre hoje e o vencimento atual, mais 12 meses, e o estado volta a `ativo`.
- *Reenviar acesso* manda de novo o e-mail de acesso.
- Trocar o responsável é um comando SQL documentado no guia (sem tela na onda 1).

### CUJ 6: Alguém sem livro tenta entrar
- **Dado** uma pessoa com Google cujo e-mail o admin não cadastrou,
- **Quando** ela toca em *Entrar com Google*,
- **Então** volta para `/entrar` com "Este e-mail ainda não tem um livro." e nenhuma conta é criada.

## Plano técnico

```text
Celular/Computador
  │
  ├─ /entrar ── Google ──► Supabase Auth ──► /auth/callback (troca o código por sessão) ──► /
  │          └─ e-mail ─► Server Action ─► after(signInWithOtp, shouldCreateUser=false)
  │                        Supabase envia pelo SMTP do Resend: link → /auth/confirmar?token_hash=…
  │                        /auth/confirmar mostra [Entrar] ─POST─► verifyOtp ──► /
  │
  ├─ proxy.ts     renova a sessão; sem sessão em /, /livro/*, /admin → /entrar
  ├─ /            1 livro ou mais → /livro/<mais recente>; nenhum → "acesso não ativado"
  ├─ /livro/<id>  lê o livro com a sessão (RLS) → tela vazia; after(registrarEvento 'entrou', 1 por dia)
  └─ /admin       exigirAdmin() (app_metadata.role) → cliente com chave secreta
                    lista: admin_listar_livros()
                    Ativar/Renovar/Reenviar → funções SQL atômicas → Resend → registrarEvento

Banco (Supabase, sa-east-1)
  books · book_members · author_access · events   (RLS ligada em todas)
  privado.eh_membro · privado.livro_editavel       (fora da API)
  pg_cron 09:00 UTC → privado.vencer_planos()
```

### Quem pode o quê no banco

| Tabela | anon | authenticated (membro do livro) | service_role (servidor) |
| --- | --- | --- | --- |
| `books` | nada | lê o seu; altera só `autor_nome` e só com plano ativo e no prazo | tudo |
| `book_members` | nada | lê os do seu livro | tudo |
| `author_access` | nada | lê os do seu livro, **sem** `token_hash` | tudo |
| `events` | nada | nada | tudo |

Um usuário logado sem livro (inclusive o admin, com a própria sessão) não lê nada. O admin trabalha só pelo servidor: `exigirAdmin()` confere `app_metadata.role = 'admin'` no token (só a chave secreta edita `app_metadata`; `user_metadata` o próprio usuário edita e não conta) e então usa o cliente com a chave secreta. Funções `admin_*` só executam com a chave secreta.

**Regra para os próximos prompts:** escrita iniciada pelo usuário usa o cliente da sessão, para a RLS valer. Código que escreve com a chave secreta (jobs, admin) chama `privado.livro_editavel` antes, quando a escrita for de conteúdo do livro.

### Plano

- Estados: `pendente` (para a onda 2, quando o livro nascer antes do pagamento), `ativo`, `somente_leitura`.
- `livro_editavel(livro)` = `ativo` **e** `plano_vence_em > agora`. Toda policy de escrita futura usa essa função. Neste prompt, ela já vale no `update` de `books`.
- Na tela, o estado é o efetivo (`estadoEfetivo` em `lib/plano.ts`): `ativo` vencido aparece como somente leitura.
- Um `update` com o plano vencido devolve 0 linhas, sem erro; a tela decide pela leitura prévia do livro (achou + `estadoEfetivo`), não pelo número de linhas.
- Job: `pg_cron` às 09:00 UTC (06:00 em Brasília) chama `privado.vencer_planos()`, que muda o estado e grava `plano_vencido` com ator `sistema` na mesma instrução.

### Login

- **Configuração do Supabase (guia de setup):**
  - "Allow new users to sign up" desligado: só o admin cria contas, com `auth.admin.createUser({ email, email_confirm: true })`, sem senha.
  - Provedores ligados: Email (link mágico) e Google.
  - SMTP próprio apontando para o Resend.
  - Modelo do e-mail "Magic Link" em português, com o link `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`.
  - Validade do link ("Email OTP Expiration") em 3600 s.
  - Limites de Auth no padrão.
  - Redirects permitidos só com URLs exatas:
    - `http://localhost:3000/**`
    - `https://app.ecoa-memorias.com.br/**`
    - a URL do branch de preview `https://<projeto>-git-<branch>-<time>.vercel.app/**`
- **Google:** `signInWithOAuth({ provider: "google", options: { redirectTo: origin + "/auth/callback" } })`. `/auth/callback` aceita só `code` (não aceita `next` nem outro destino), chama `exchangeCodeForSession` e redireciona para `/`. Se o Supabase recusar (e-mail sem conta), volta para `/entrar?erro=sem_livro`. Outro erro: `/entrar?erro=falhou`.
  - **Plano B, se o vínculo com cadastro desligado falhar:** religar o cadastro; o callback chama `signOut` e apaga a conta recém-criada quando o usuário não for membro de nenhum livro nem admin.
- **Link por e-mail:** a Server Action `pedirLink` valida o e-mail (zod), agenda `after(() => supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: origin + "/auth/confirmar" } }))` e responde na hora `{ ok: true, mensagem: "Se este e-mail tiver um livro, o link chega em instantes." }`. O erro de e-mail desconhecido é ignorado. O limite de envio é o do Supabase Auth.
- **`/auth/confirmar`:** página (não rota GET que consome o token). Mostra *Entrar* num formulário com `token_hash` escondido. A Server Action `confirmar` chama `verifyOtp({ type: "email", token_hash })` e redireciona para `/`. Token inválido ou vencido: "Este link já foi usado ou venceu" e o botão *Pedir outro link*.
- **Sessão:** `@supabase/ssr` com cookies. `proxy.ts` (nome do middleware no Next 16, roda em Node) renova a sessão com `getClaims()` e aplica `decidirRota(caminho, temSessao)`: sem sessão em `/`, `/livro/*` ou `/admin*` → `/entrar`; com sessão em `/entrar` → `/`.
- **Next 16 com `cacheComponents`:** ler cookies, `params` ou `searchParams` fora de `<Suspense>` quebra o build. `notFound()` e `redirect()` dentro de `<Suspense>` respondem 200 (meta tag), por isso redirects de sessão ficam no proxy e checagens que precisam de 404 de verdade (`/styleguide` sem `ECOA_PREVIA`) ficam no topo da página, fora do `<Suspense>`.
- **URL do app** (`urlDoApp()`):
  - `APP_URL`, se definida;
  - senão, `https://` mais `DOMINIO_APP` quando `VERCEL_ENV=production`;
  - senão, `https://` mais `VERCEL_BRANCH_URL`;
  - senão, `http://localhost:3000`.

  No navegador, o login usa `window.location.origin`.

### E-mails

- **Acesso** (ativar e reenviar), enviado pelo Resend a partir do código. Remetente `Ecoa Memórias <acesso@ecoa-memorias.com.br>`. Assunto "O livro do Jair está pronto para começar"; sem nome do autor, "Seu livro de memórias está pronto". Uma frase e o botão *Abrir meu livro* → `urlDoApp() + "/entrar"` (não expira). HTML simples em Georgia, mais versão em texto puro. Nome do autor escapado.
- **Link de entrada:** enviado pelo Supabase via SMTP do Resend, modelo no painel (texto no guia de setup, versionado no repositório). Assunto "Seu link para entrar na Ecoa".

### Eventos

Assinatura única, em `lib/eventos.ts`:

```ts
registrarEvento({ quem, papel, acao, livro, detalhes? })
// quem → events.ator_id (uuid | null)
// papel → events.ator_tipo
// acao → events.acao (lista fechada em lib/eventos-acoes.ts)
// livro → events.book_id (uuid | null)
// detalhes → events.detalhes (só ids e números; nunca e-mail, nome ou texto livre)
```

- Ações agora: `entrou`, `plano_ativado`, `plano_renovado`, `acesso_reenviado`, `plano_vencido` (só o job grava). Já previstas no PRD: `gravou`, `editou`, `sugeriu`, `gerou`.
- Opção `umaVezPorDia: true`: antes de gravar, procura o mesmo `ator_id`, `acao` e `book_id` desde a meia-noite de Brasília; se existir, não grava. Uma corrida rara pode gerar 2 linhas no mesmo dia, o que é aceitável.
- Grava com a chave secreta. Nunca derruba a ação principal: em falha, `console.error` só com a ação e os ids, e devolve `{ ok: false }`.
- **`entrou`** é gravado quando o livro é aberto (`/livro/[id]`, via `after()`), uma vez por pessoa, livro e dia, com o papel do membro. É isso que responde o M10. O login em si não gera evento.
- Ações do admin: papel `admin`, `quem` = id do admin, `livro` = livro afetado.

Consulta do M10, no editor SQL do Supabase (a tela vem no prompt 15):

```sql
select e.criado_em at time zone 'America/Sao_Paulo' as quando, e.ator_tipo, u.email, e.acao
from public.events e
left join auth.users u on u.id = e.ator_id
where e.book_id = '<id do livro>'
  and e.criado_em >= (current_date - 1)::timestamp at time zone 'America/Sao_Paulo'
  and e.criado_em <  current_date::timestamp at time zone 'America/Sao_Paulo'
order by e.criado_em;
```

### Telas

Uma ação principal por tela, poucas palavras, celular primeiro. Interface em `font-ui`, nome do livro em `font-livro`.

| Rota | Ação principal | Conteúdo |
| --- | --- | --- |
| `/entrar` | *Entrar com Google* | Marca, "Entre no seu livro", link discreto "Prefiro receber um link por e-mail" que revela campo e *Receber link*; mensagem de erro conforme `?erro=` |
| `/auth/confirmar` | *Entrar* | "Toque para entrar no seu livro" |
| `/` | — | Redireciona para o livro mais recente, ou "Seu acesso ainda não foi ativado" |
| `/livro/[id]` | *Começar* (desativado, "em breve", até o prompt 4) | "O livro do Jair" (ou "Seu livro") e uma frase; selo "Somente leitura" se vencido |
| `/admin` | *Ativar plano* | Formulário (e-mail, nome do autor) → confirmação com o e-mail em destaque; lista com e-mail, autor, estado efetivo, vence em; por linha *Renovar* (dois passos) e *Reenviar acesso* |

**Ligação entre telas e ações:** cada tela é um componente de apresentação em `components/telas/`, que recebe dados e, quando há formulário, a Server Action por prop (`acao: (estado, formData) => Promise<Resultado>`). Os formulários são componentes cliente com `useActionState`. Todas as actions devolvem `type Resultado = { ok: boolean; mensagem: string }`. Para o gate de design, `/styleguide/[tela]` renderiza as mesmas telas com dados falsos e actions falsas. Ela só existe com `ECOA_PREVIA=1`, checado no topo da página; sem isso, 404 de verdade. O prompt 2 amplia essa rota.

## Alternativas consideradas

### A: Vercel Cron para o job diário
- **Prós:** TypeScript, logs na Vercel.
- **Contras:** rota pública protegida por segredo, mais uma variável, e depende de rede entre Vercel e Supabase.
- **Motivo:** pg_cron roda dentro do banco, sem rede nem segredo; a regra `livro_editavel` cobre um atraso do job.

### B: Fila (Trigger.dev)
- **Contras:** dependência nova, deploy separado e conta a mais, tudo para uma única instrução SQL por dia.
- **Motivo:** a fila entra no prompt 6, quando houver trabalho de minutos.

### C: Link mágico próprio (`generateLink` + Resend)
- **Prós:** modelo do e-mail no código.
- **Contras:** reimplementa a busca do usuário, o limite de envio (que ficaria contornável pelo `signInWithOtp` público de qualquer jeito) e um segundo modelo de e-mail.
- **Motivo:** o `signInWithOtp` nativo com SMTP do Resend tira uma função SQL e a lógica de limite. O modelo fica no painel, com cópia versionada no guia.

### D: Testes de RLS contra o Supabase real, ou Supabase CLI com Docker
- **Contras:** rede, segredos e Docker; `npm test` deixaria de rodar em qualquer máquina.
- **Motivo:** PGlite roda as mesmas migrations em WebAssembly. O SQL deste documento já rodou nele. Risco do shim tratado na tabela de riscos.

### E: Tabela `admins` ou leitura do admin pela RLS
- **Contras:** duas formas de o admin ler dados e um token no navegador que lê tudo pela API pública.
- **Motivo:** `app_metadata.role` no token mais a chave secreta no servidor: um caminho só, e a RLS fica só para membros.

## Requisitos não funcionais

- **Segurança:** coberta em "Quem pode o quê" e "Riscos e mitigações". Chave secreta só no servidor (`server-only`), nunca com `NEXT_PUBLIC_`.
- **LGPD:** banco em sa-east-1. `events` guarda ids, não nomes; e-mail só em `auth.users`.
- **Reversão:** cada migration tem o SQL de reversão em `supabase/reversao/`. A reversão da primeira apaga dados; só serve antes de haver famílias reais.
- **Custo:** plano grátis do Supabase (2º projeto ativo da organização) e do Resend.

## SQL de subida

> **Nome atualizado (09/11/2026):** depois do aceite, "passe" virou **"plano"** em todo o produto, a pedido do Guilherme ("passe" podia ser mal interpretado). O SQL abaixo já mostra os nomes novos. Os arquivos das duas primeiras migrations mantêm os nomes originais (`passe_*`) porque são histórico do banco; a troca foi aplicada pela migration `20261109150000_passe_vira_plano.sql`.


### `supabase/migrations/20261109120000_acesso_e_passe.sql`

```sql
-- 20261109120000_acesso_e_passe.sql
-- Livros, membros, link do autor e registro de eventos, com RLS.
-- Admin não lê pelo banco com a própria sessão: o servidor confere o papel e usa a chave secreta.

-- Funções auxiliares ficam fora do schema exposto pela API.
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated, service_role;
-- Função nova nasce sem EXECUTE para PUBLIC (padrão do Postgres). O ajuste por schema não
-- consegue tirar o padrão global, por isso a revogação é global para o dono das migrations.
-- Em public, o Supabase continua concedendo a anon/authenticated: cada função revoga à mão.
alter default privileges revoke execute on functions from public;

create type public.plano_estado as enum ('pendente', 'ativo', 'somente_leitura');
create type public.papel_membro as enum ('responsavel', 'cofacilitador');
create type public.ator_tipo as enum ('responsavel', 'cofacilitador', 'autor', 'familia', 'admin', 'sistema');

create table public.books (
  id uuid primary key default gen_random_uuid(),
  autor_nome text check (autor_nome is null or char_length(btrim(autor_nome)) between 1 and 120),
  plano_estado public.plano_estado not null default 'pendente',
  plano_ativado_em timestamptz,
  plano_vence_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint books_plano_datas check (
    plano_estado = 'pendente'
    or (plano_ativado_em is not null and plano_vence_em > plano_ativado_em)
  )
);

create table public.book_members (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel public.papel_membro not null,
  criado_em timestamptz not null default now(),
  unique (book_id, user_id)
);
create unique index book_members_um_responsavel on public.book_members (book_id) where papel = 'responsavel';
create index book_members_usuario on public.book_members (user_id);

create table public.author_access (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null,
  revogado_em timestamptz
);
create unique index author_access_um_ativo on public.author_access (book_id) where revogado_em is null;

-- detalhes: só ids e números. Nunca e-mail, nome ou texto livre.
create table public.events (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  book_id uuid references public.books (id) on delete set null,
  ator_tipo public.ator_tipo not null,
  ator_id uuid,
  acao text not null check (acao ~ '^[a-z_]{2,40}$'),
  detalhes jsonb not null default '{}'::jsonb
);
create index events_livro_data on public.events (book_id, criado_em desc);
create index events_ator_data on public.events (ator_id, criado_em desc);

-- atualizado_em automático
create function privado.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
create trigger books_atualizado_em before update on public.books
  for each row execute function privado.tocar_atualizado_em();

create function privado.eh_membro(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members m
    where m.book_id = p_book and m.user_id = (select auth.uid())
  )
$$;

-- Ativo e dentro do prazo. Vale mesmo se o job diário atrasar.
-- Toda escrita feita com a chave secreta precisa chamar esta função explicitamente.
create function privado.livro_editavel(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.books b
    where b.id = p_book and b.plano_estado = 'ativo' and b.plano_vence_em > now()
  )
$$;

revoke all on all functions in schema privado from public;
grant execute on function privado.eh_membro(uuid), privado.livro_editavel(uuid) to authenticated, service_role;

-- RLS em toda tabela
alter table public.books enable row level security;
alter table public.book_members enable row level security;
alter table public.author_access enable row level security;
alter table public.events enable row level security;

-- O Supabase concede tudo a anon/authenticated por padrão. Aqui só o necessário.
revoke all on public.books, public.book_members, public.author_access, public.events from anon, authenticated;
grant select on public.books to authenticated;
grant update (autor_nome) on public.books to authenticated;
grant select on public.book_members to authenticated;
grant select (id, book_id, criado_em, criado_por, revogado_em) on public.author_access to authenticated;
grant all on public.books, public.book_members, public.author_access, public.events to service_role;
-- events: nenhuma permissão para anon/authenticated. Só o servidor lê e grava.

create policy "membro lê o livro" on public.books
  for select to authenticated
  using (privado.eh_membro(id));

create policy "membro edita o livro com plano ativo" on public.books
  for update to authenticated
  using (privado.eh_membro(id) and privado.livro_editavel(id))
  with check (privado.eh_membro(id) and privado.livro_editavel(id));

create policy "membro lê os membros do livro" on public.book_members
  for select to authenticated
  using (privado.eh_membro(book_id));

create policy "membro lê o link do autor do livro" on public.author_access
  for select to authenticated
  using (privado.eh_membro(book_id));

-- Operações do admin: atômicas, só pelo servidor (service_role).
create function public.admin_ativar_plano(p_responsavel uuid, p_autor_nome text, p_meses integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  insert into public.books (autor_nome, plano_estado, plano_ativado_em, plano_vence_em)
  values (nullif(btrim(p_autor_nome), ''), 'ativo', now(), now() + make_interval(months => p_meses))
  returning id into v_livro;
  insert into public.book_members (book_id, user_id, papel)
  values (v_livro, p_responsavel, 'responsavel');
  return v_livro;
end $$;

-- Renovar soma a partir do maior entre hoje e o vencimento atual: renovar cedo não perde dias.
create function public.admin_renovar_plano(p_livro uuid, p_meses integer)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_vence timestamptz;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  update public.books
  set plano_estado = 'ativo',
      plano_ativado_em = coalesce(plano_ativado_em, now()),
      plano_vence_em = greatest(now(), coalesce(plano_vence_em, now())) + make_interval(months => p_meses)
  where id = p_livro
  returning plano_vence_em into v_vence;
  if v_vence is null then
    raise exception 'livro não encontrado: %', p_livro;
  end if;
  return v_vence;
end $$;

-- Troca o responsável (e-mail digitado errado na ativação).
create function public.admin_trocar_responsavel(p_livro uuid, p_novo uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.book_members where book_id = p_livro and papel = 'responsavel';
  insert into public.book_members (book_id, user_id, papel) values (p_livro, p_novo, 'responsavel')
  on conflict (book_id, user_id) do update set papel = 'responsavel';
end $$;

create function public.admin_usuario_por_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1
$$;

create function public.admin_listar_livros()
returns table (
  id uuid,
  autor_nome text,
  plano_estado public.plano_estado,
  plano_vence_em timestamptz,
  criado_em timestamptz,
  responsavel_email text
)
language sql stable security definer set search_path = '' as $$
  select b.id, b.autor_nome, b.plano_estado, b.plano_vence_em, b.criado_em, u.email::text
  from public.books b
  left join public.book_members m on m.book_id = b.id and m.papel = 'responsavel'
  left join auth.users u on u.id = m.user_id
  order by b.criado_em desc
$$;

revoke all on function
  public.admin_ativar_plano(uuid, text, integer),
  public.admin_renovar_plano(uuid, integer),
  public.admin_trocar_responsavel(uuid, uuid),
  public.admin_usuario_por_email(text),
  public.admin_listar_livros()
  from public, anon, authenticated;
grant execute on function
  public.admin_ativar_plano(uuid, text, integer),
  public.admin_renovar_plano(uuid, integer),
  public.admin_trocar_responsavel(uuid, uuid),
  public.admin_usuario_por_email(text),
  public.admin_listar_livros()
  to service_role;
```

### `supabase/migrations/20261109120100_job_vencer_passes.sql`

```sql
-- 20261109120100_job_vencer_passes.sql
-- Todo dia às 06:00 de Brasília (09:00 UTC), planos vencidos viram somente leitura.

create function privado.vencer_planos() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_total integer;
begin
  with vencidos as (
    update public.books
    set plano_estado = 'somente_leitura'
    where plano_estado = 'ativo' and plano_vence_em <= now()
    returning id
  )
  insert into public.events (book_id, ator_tipo, acao)
  select id, 'sistema', 'plano_vencido' from vencidos;
  get diagnostics v_total = row_count;
  return v_total;
end $$;
revoke all on function privado.vencer_planos() from public, anon, authenticated;

-- O pg_cron existe no Supabase e não existe no PGlite dos testes.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('vencer-planos', '0 9 * * *', 'select privado.vencer_planos()');
  end if;
end $$;
```

## SQL de reversão

### `supabase/reversao/20261109120100_job_vencer_passes.down.sql` (rodar primeiro)

```sql
-- Reverte 20261109120100_job_vencer_passes.sql
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'vencer-planos';
  end if;
end $$;
drop function if exists privado.vencer_planos();
-- A extensão pg_cron fica instalada: outras rotinas podem usá-la.
```

### `supabase/reversao/20261109120000_acesso_e_passe.down.sql`

```sql
-- Reverte 20261109120000_acesso_e_passe.sql
-- ATENÇÃO: apaga livros, membros, links do autor e eventos. Só antes de haver dados reais.
drop function if exists public.admin_listar_livros();
drop function if exists public.admin_usuario_por_email(text);
drop function if exists public.admin_trocar_responsavel(uuid, uuid);
drop function if exists public.admin_renovar_plano(uuid, integer);
drop function if exists public.admin_ativar_plano(uuid, text, integer);
drop table if exists public.events;
drop table if exists public.author_access;
drop table if exists public.book_members;
drop table if exists public.books;
drop function if exists privado.livro_editavel(uuid);
drop function if exists privado.eh_membro(uuid);
drop function if exists privado.tocar_atualizado_em();
alter default privileges grant execute on functions to public;
drop schema if exists privado;
drop type if exists public.ator_tipo;
drop type if exists public.papel_membro;
drop type if exists public.plano_estado;
```

### `supabase/tests/auth-shim.sql` (só para os testes, imita o Supabase)

```sql
-- Imita o que o Supabase já tem antes das nossas migrations.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key,
  email varchar(255) unique,
  raw_app_meta_data jsonb not null default '{}'::jsonb
);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
```

**Já rodou no PGlite** (rascunho fora do repositório), com estes resultados:

- O responsável A lê só o próprio livro. `update` em B afeta 0 linhas; `delete` em B e `insert` em `books` são negados.
- Mudar `plano_vence_em` do próprio livro é negado.
- Ler `events` e `token_hash` é negado. `admin_*` com a sessão de A, ou com `anon`, é negado.
- Usuário logado sem livro, e o admin com a própria sessão, leem 0 linhas.
- Livro vencido recusa edição antes do job. O job muda 1 livro e grava o evento.
- Renovar cedo soma ao vencimento atual. `admin_trocar_responsavel` troca o responsável.
- `anon` tem 0 grants de tabela. Só `eh_membro` e `livro_editavel` são executáveis por `authenticated`. Função nova em `privado` nasce sem EXECUTE.
- A reversão deixa `public` vazio.

---

## Plano de implementação detalhado

### Ordem

1. Migrations, reversões, shim e testes de banco (PGlite).
2. `vitest.config.mts`, `lib/` puros e seus testes.
3. **Parada 2 (depois do seu OK):** criar o projeto `ecoa-plataforma` em sa-east-1, aplicar as migrations, rodar `get_advisors` e gerar `lib/supabase/tipos.ts`. Até aqui os clientes não usam o tipo genérico; ele entra nesse passo.
4. Clientes Supabase, `proxy.ts`, sessão, rotas de auth.
5. Telas, `/styleguide`, admin.
6. Gates, guia de setup, decisão de domínio.

### Arquivos

#### Banco

1. **`supabase/migrations/20261109120000_acesso_e_passe.sql`, `supabase/migrations/20261109120100_job_vencer_passes.sql` (criar).** Conteúdo exato das seções de SQL. Aplicados no projeto real com `apply_migration`, com `name` igual ao nome do arquivo sem extensão (`20261109120000_acesso_e_passe`), para o histórico bater com a CLI.
2. **`supabase/reversao/20261109120100_job_vencer_passes.down.sql`, `supabase/reversao/20261109120000_acesso_e_passe.down.sql` (criar).** Conteúdo da seção de reversão. Ficam fora de `migrations/` para a CLI não aplicá-los.
3. **`supabase/tests/auth-shim.sql` (criar).** Conteúdo exato da seção do shim.
4. **`supabase/tests/banco.ts` (criar).** Funções:
   - `criarBanco()`: abre um PGlite em memória, aplica o shim e as migrations em ordem de nome, e devolve o banco.
   - `como(db, papel, claims, fn)`: roda `fn` numa transação com `set local role` e `set_config('request.jwt.claims', …, true)`.
   - `tenta(tx, sql)`: usa savepoint e devolve `{ linhas, afetadas }` ou `{ erro }`.
   - `reverter(db)`: aplica os `.down.sql` em ordem inversa.
5. **`supabase/tests/rls.test.ts` (criar).** Livros A e B (responsáveis A e B), usuário X sem livro, link do autor e evento em B. Casos:
   - **A:**
     - Lê só o livro A em `books`, `book_members` e `author_access`.
     - Em B: `update` afeta 0 linhas; `delete` é negado, em cada tabela.
     - `insert` em `books`, `book_members`, `author_access` e `events` é negado.
     - Não muda `plano_estado`, `plano_vence_em` nem `plano_ativado_em` do próprio livro.
     - `token_hash` é negado; as outras colunas do link do próprio livro, ok.
     - `events` é negado.
     - Livro A vencido com estado `ativo`: `update autor_nome` afeta 0 linhas.
   - **X sem livro, e X com `app_metadata.role = admin`:** 0 linhas nas 3 tabelas.
   - **`anon`:** negado nas 4 tabelas e nas funções `admin_*`.
   - **Funções:** todas as `admin_*` e `privado.vencer_planos` negadas para `authenticated`.
   - **Genéricos:**
     - Toda tabela de `public` tem RLS ligada.
     - `anon` não tem grant de tabela em `public`.
     - Nenhuma função de `public` ou `privado` é executável por `anon`.
     - As funções executáveis por `authenticated` são exatamente `privado.eh_membro` e `privado.livro_editavel`.
   - **Reversão:** deixa `public` sem tabelas.
6. **`supabase/tests/plano.test.ts` (criar).** No PGlite:
   - **`admin_ativar_plano`:** cria livro ativo que vence em 12 meses, com 1 responsável; recusa meses 0 e 37.
   - **`admin_renovar_plano`:**
     - vencido: vence em ≈ agora + 12 meses e o estado vira `ativo`;
     - faltando 3 meses: vence em ≈ vencimento atual + 12 meses;
     - id inexistente: erro.
   - **`admin_trocar_responsavel`:** troca o responsável.
   - **`privado.vencer_planos()`:** muda só os vencidos e grava 1 evento `plano_vencido` por livro.

#### Configuração e bibliotecas

7. **`vitest.config.mts` (modificar).** Acrescentar `resolve.alias: { "server-only": "server-only/empty.js" }` e incluir `supabase/tests/**/*.test.ts`.
8. **`lib/config.ts`, `lib/config.test.ts` (modificar).**
   - `DOMINIO_APP = "app.ecoa-memorias.com.br"` e `DOMINIO_QR = "ouvir.ecoa-memorias.com.br"`.
   - Novo `EMAIL_REMETENTE = "Ecoa Memórias <acesso@ecoa-memorias.com.br>"`.
   - O teste confere o domínio com hífen.
9. **`docs/decisoes/dominio.md` (criar), `docs/prd.md` (modificar).**
   - A decisão registra que o domínio é `ecoa-memorias.com.br`, verificado no Resend, e que o QR nunca muda depois do dia 26/12.
   - No PRD, trocar todas as ocorrências de `ecoamemorias.com.br`.
   - Commit separado: `docs: decide domínio ecoa-memorias.com.br`.
10. **`.env.example` (modificar).**
    - Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `APP_URL` (opcional), `ECOA_PREVIA` (só para o gate de design).
    - `ANTHROPIC_API_KEY` continua.
    - Saem `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, as legadas.
11. **`lib/env-publico.ts` (criar).** Lê `process.env.NEXT_PUBLIC_SUPABASE_URL` e `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` literalmente e valida com zod. Erro: "Falta NEXT_PUBLIC_SUPABASE_URL no .env.local".
12. **`lib/env-servidor.ts`, `lib/env-servidor.test.ts` (criar).**
    - `server-only`.
    - `envServidor()` lê a chave secreta e `RESEND_API_KEY`.
    - `urlDoApp(env = process.env)` segue a ordem da seção Login.
    - Testes: os 4 casos de `urlDoApp`.
13. **`lib/supabase/navegador.ts`, `lib/supabase/servidor.ts`, `lib/supabase/admin.ts` (criar).**
    - **`navegador`:** `createBrowserClient` com `env-publico`.
    - **`servidor`:** `createServerClient` com `await cookies()` (`getAll`/`setAll`, este dentro de `try` para Server Components).
    - **`admin`:** `server-only`; `createClient` com a chave secreta e `auth: { persistSession: false, autoRefreshToken: false }`.
14. **`lib/supabase/tipos.ts` (criar no passo 3).** Saída de `generate_typescript_types`; os 3 clientes passam a usar `<Database>`.
15. **`lib/rotas.ts`, `lib/rotas.test.ts` (criar).**
    - `decidirRota(caminho, temSessao)` devolve `null` ou o destino do redirect.
    - Testes:
      - `/`, `/livro/x` e `/admin` sem sessão → `/entrar`;
      - `/entrar` com sessão → `/`;
      - `/auth/confirmar` e `/styleguide/x` → `null`.
16. **`proxy.ts` (criar, raiz).**
    - Cria o `createServerClient` com os cookies da requisição e da resposta (padrão do `@supabase/ssr`), chama `getClaims()` e aplica `decidirRota`.
    - `matcher` exclui `_next/static`, `_next/image`, `favicon.ico` e caminhos com extensão.
17. **`lib/sessao.ts` (criar).** `server-only`. Funções:
    - **`usuarioAtual()`:** `{ id, email, ehAdmin }` ou `null`, via `getClaims()`; `ehAdmin = claims.app_metadata?.role === "admin"`.
    - **`exigirAdmin()`:** devolve o usuário, ou chama `notFound()`. Nas páginas, é usada no topo, fora do `<Suspense>`.
    - **`livroMaisRecente(usuarioId)`:** `book_members` filtrado por `user_id` com join em `books`, ordenado por `criado_em desc`, limite 1, com o cliente da sessão.
18. **`lib/plano.ts`, `lib/plano.test.ts` (criar).**
    - `estadoEfetivo({ plano_estado, plano_vence_em }, agora)` e `podeEscrever(...)`.
    - Testes: ativo no prazo, ativo vencido, somente leitura, pendente e vencimento igual a agora.
19. **`lib/eventos-acoes.ts` (criar).** `ACOES` e `PAPEIS` como tuplas `as const`.
20. **`lib/eventos.ts`, `lib/eventos.test.ts` (criar).**
    - `registrarEvento(entrada, opcoes?, cliente = clienteAdmin())`, com a assinatura da seção Eventos.
    - Testes com cliente falso:
      - grava as colunas certas;
      - ação fora da lista não grava;
      - `umaVezPorDia` não grava duas vezes;
      - falha do banco devolve `{ ok: false }` sem lançar.
21. **`lib/eventos-porta-unica.test.ts` (criar).** Lê `app/`, `lib/` e `components/` e falha se encontrar `from("events")` fora de `lib/eventos.ts`.
22. **`lib/email/modelos.ts`, `lib/email/modelos.test.ts`, `lib/email/enviar.ts` (criar).**
    - **`emailAcesso({ autorNome, urlEntrar })`:** devolve `{ assunto, html, texto }`.
    - **`enviar`:** `server-only`, usa o Resend com `EMAIL_REMETENTE` e devolve `{ ok }` sem lançar.
    - **Testes:**
      - os dois assuntos;
      - o link presente;
      - nome com `<script>` escapado;
      - nenhuma chave no corpo.
23. **`lib/acesso.ts` (criar).** `server-only`.
    - `enviarAcesso(livroId)`: lê o responsável em `book_members`, o e-mail com `auth.admin.getUserById`, o autor em `books`, e envia `emailAcesso` com `urlDoApp() + "/entrar"`.
    - `identidadeAceitavel(usuario)`: só identidades `email`/`google`, e nenhuma senha definida. Testada em `lib/acesso.test.ts`.

#### Telas e rotas

24. **`components/ui/botao.tsx`, `components/ui/campo.tsx`, `components/ui/estado-vazio.tsx` (criar).**
    - Botão principal e secundário: altura ≥ 48 px, foco visível, `disabled` com `aria-busy` durante o envio.
    - Campo com rótulo visível.
    - Estado vazio: frase e ação.
25. **`components/telas/tela-entrar.tsx`, `tela-confirmar.tsx`, `tela-sem-acesso.tsx`, `tela-livro-vazio.tsx`, `tela-admin.tsx` (criar).** Apresentação pura, com dados e actions por props, conforme a seção Telas. Componentes cliente apenas onde há formulário.
    - `tela-admin` inclui o formulário de ativar com o passo de confirmação.
    - Cada linha tem *Renovar* em dois passos (o 1º toque troca o botão por *Confirmar +12 meses*) e *Reenviar acesso*.
26. **`app/entrar/page.tsx`, `app/entrar/acoes.ts` (criar).**
    - A página é estática. Um componente cliente dentro de `<Suspense>` lê `useSearchParams().get("erro")` (`sem_livro` ou `falhou`) e renderiza `TelaEntrar`.
    - Google: `createBrowserClient().auth.signInWithOAuth(...)`.
    - `acoes.ts` contém `pedirLink`, conforme a seção Login.
    - A lógica fica em `prepararPedidoDeLink(formData)`, pura, testada em `app/entrar/acoes.test.ts`: e-mail inválido devolve erro de formato; qualquer e-mail válido devolve a mesma mensagem.
27. **`app/auth/callback/route.ts` (criar).** Route Handler GET, como descrito em Login.
28. **`app/auth/confirmar/page.tsx`, `app/auth/confirmar/acoes.ts` (criar).** Página com `<Suspense>` que lê `searchParams.token_hash` e renderiza `TelaConfirmar`. A action `confirmar` chama `verifyOtp` e `redirect("/")`; em erro, devolve `{ ok: false, mensagem }`.
29. **`app/page.tsx` (modificar).** Casca mais `<Suspense>`. O componente pega `usuarioAtual()` e `livroMaisRecente()`: se achar o livro, `redirect("/livro/<id>")`; senão, renderiza `TelaSemAcesso`.
30. **`app/livro/[id]/page.tsx` (criar).**
    - Casca mais `<Suspense>`. O componente lê `params`, `usuarioAtual()` e o livro com o cliente da sessão. Não achou → `notFound()`.
    - Lê o papel em `book_members` e renderiza `TelaLivroVazio` com `estadoEfetivo`.
    - `after(() => registrarEvento({ quem, papel, acao: "entrou", livro }, { umaVezPorDia: true }))`.
31. **`app/admin/page.tsx`, `app/admin/acoes.ts` (criar).**
    - A página chama `exigirAdmin()` no topo e, dentro de `<Suspense>`, `admin_listar_livros()` com o cliente admin.
    - Toda action começa por `exigirAdmin()`, valida com zod, devolve `Resultado` e termina com `refresh()` de `next/cache`.
    - **`ativarPlano`:**
      1. Procura o e-mail com `admin_usuario_por_email`. Se existir e `identidadeAceitavel` for falsa, recusa: "Esta conta não pode ser usada. Fale com o suporte."
      2. Se não existir, cria com `createUser({ email, email_confirm: true })`.
      3. Chama `admin_ativar_plano(usuario, autorNome, DURACAO_PLANO_MESES)`.
      4. Envia o e-mail com `enviarAcesso`.
      5. Registra o evento `plano_ativado`.
    - **`renovarPlano`:** `admin_renovar_plano(livroId, DURACAO_PLANO_MESES)` e o evento `plano_renovado`.
    - **`reenviarAcesso`:** `enviarAcesso` e o evento `acesso_reenviado`.
32. **`app/styleguide/[tela]/page.tsx`, `lib/styleguide.ts` (criar).**
    - No topo, se `process.env.ECOA_PREVIA !== "1"`, chama `notFound()`.
    - `generateStaticParams` devolve `entrar`, `confirmar`, `sem-acesso`, `livro`, `livro-somente-leitura` e `admin`.
    - Renderiza a tela com os dados e as actions falsas de `lib/styleguide.ts`.

#### Testes de ponta a ponta e documentação

33. **`e2e/home.spec.ts` (substituir), `e2e/entrar.spec.ts` (criar).**
    - O teste atual (Newsreader na `/`) sai, porque a `/` virou redirect.
    - Novos testes:
      - `/` sem sessão vai para `/entrar`;
      - `/entrar` tem um único botão principal, "Entrar com Google", e a fonte Newsreader carregada na marca;
      - o link de e-mail revela o campo; enviar mostra a mensagem igual;
      - `/admin` e `/livro/x` sem sessão vão para `/entrar`;
      - `/styleguide/entrar` responde 404 (`response.status()`);
      - `/auth/confirmar?token_hash=x` mostra o botão *Entrar* sem consumir nada.
    - Roda contra um servidor sem `ECOA_PREVIA` e sem Supabase real.
34. **`playwright.config.ts` (modificar).** `webServer.env` com `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_teste`, `SUPABASE_SECRET_KEY=sb_secret_teste`, `RESEND_API_KEY=re_teste` e `ECOA_PREVIA=` vazio. `reuseExistingServer: false`, para não aproveitar um servidor de prévia aberto.
35. **`docs/setup/supabase-google-resend.md` (criar).** Passo a passo:
    - **Google Cloud:** tela de consentimento externa; cliente OAuth "Aplicativo da Web" com redirect `https://<ref>.supabase.co/auth/v1/callback`.
    - **Supabase:**
      - Auth → Sign In / Providers: cadastro desligado, Google ligado com Client ID e Secret, Email ligado.
      - URL Configuration: Site URL e as 3 URLs exatas.
      - SMTP: `smtp.resend.com`, porta 465, usuário `resend`, senha = API key do Resend, remetente `acesso@ecoa-memorias.com.br`.
      - Modelo "Magic Link" em português (texto completo no guia).
      - "Email OTP Expiration" em 3600.
    - **Resend:** criar uma API key só de envio.
    - **Ambiente:** `.env.local` e as variáveis na Vercel, com `APP_URL` só no ambiente de preview.
    - **SQL de manutenção:**
      - marcar admin: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '…';` (vale no próximo login);
      - trocar o responsável: `select public.admin_trocar_responsavel('<livro>', '<usuário>');`;
      - consulta do M10.
    - Ligar a verificação em 2 etapas na conta Google do admin.

### Plano de verificação

- `npm run build`, `npm run lint`, `npm test` (inclui PGlite) e `npm run test:e2e`, nesta ordem. O e2e roda antes de qualquer servidor de prévia.
- **Gate de design:**
  1. Rodar `ECOA_PREVIA=1 npm run build && ECOA_PREVIA=1 npm run start`.
  2. Rodar `npm run taste:lint`.
  3. Rodar `node .claude/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:3000/styleguide/<tela> --allow palette-cream` para cada uma das 6 telas, acrescentando `--app` em `admin`.
  4. Corrigir todo FAIL e parar no PASS.
- **Banco real:**
  - `get_advisors` (segurança) sem alerta;
  - `select jobname, schedule from cron.job` com `vencer-planos`;
  - teste manual: com a sessão de uma conta sem livro, a API REST devolve 0 linhas em `books`.
- **Aceite (preview da Vercel, no celular):**
  1. Ativar o plano para o e-mail do Guilherme.
  2. O e-mail chega.
  3. *Abrir meu livro* → *Entrar com Google* → home vazia.
  4. A consulta do M10 mostra `entrou`.
  5. Um e-mail Google não cadastrado volta com "Este e-mail ainda não tem um livro."

---

_Rascunhado com EGM_
