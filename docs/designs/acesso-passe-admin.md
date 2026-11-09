# Acesso, passe, admin e registro de uso

- **Autor:** Guilherme Eller (com Claude)
- **Status:** Proposto
- **Data:** 2026-11-09
- **Origem:** [concepts brief](./acesso-passe-admin/concepts_brief.md) · PRD: Papéis e permissões, M1, M10 (onda 1), Modelo de dados

---

## Visão geral

Este design cobre o prompt 3 do PRD: a catraca da plataforma. Na onda 1, a Ecoa recebe o Pix e ativa o passe no `/admin`. Ativar cria o livro, cria o responsável e manda o e-mail de acesso. O responsável entra com Google ou com link por e-mail e vê a home vazia do livro. O passe dura 12 meses; vencido, o livro fica em somente leitura. Toda ação relevante vira uma linha em `events`.

## O problema

Hoje não existe banco, login nem forma de liberar acesso. Sem isso, nenhum dos prompts seguintes (configuração, gravação, IA) tem onde guardar dados nem como separar uma família da outra. A separação entre famílias precisa ser garantida pelo banco (RLS), porque um erro de código numa tela não pode expor o livro de outra família.

## Objetivos

1. O admin ativa um passe informando só o e-mail do responsável (e, se quiser, o nome do autor). Em menos de 1 minuto o e-mail chega.
2. O responsável entra com Google ou link por e-mail e cai direto na home do seu livro.
3. Um responsável não lê, não altera e não apaga nada de outro livro. Provado por teste automático que roda em `npm test`.
4. Ninguém fora do servidor muda estado ou vencimento do passe, nem do próprio livro.
5. Passe vencido bloqueia escrita no banco mesmo que o job diário atrase.
6. `registrarEvento(quem, papel, ação, livro)` é a única porta de escrita em `events` no código da aplicação.
7. O admin consegue responder "quem acessou o livro X ontem e o que fez" com uma consulta.

## Não objetivos

- Convite e limite de co-facilitadores (prompt 11). A tabela já aceita o papel.
- Uso do link do autor (prompt 5). Aqui só a tabela e o hash do token.
- Painel de aderência (prompt 15). Aqui só o registro.
- Pagamento automático (prompt 14).
- Design system completo (prompt 2). Aqui só 3 componentes mínimos.

## Perguntas em aberto

- **Vínculo Google ↔ conta criada pelo admin.** O admin cria o usuário com e-mail confirmado; quando a pessoa entra com Google usando o mesmo e-mail, o Supabase deve vincular as duas identidades ao mesmo usuário. Verificado no aceite. Se falhar, o responsável usa o link por e-mail e abrimos uma tarefa.
- **Responsável sem conta Google** (e-mail corporativo ou Hotmail): entra pelo link por e-mail. Aceitável na onda 1.

## Jornadas críticas (CUJs)

### CUJ 1: Ativar um passe
- **Dado** que o admin está logado e o Pix foi confirmado,
- **Quando** ele informa `ana@exemplo.com` e "Jair" e toca em *Ativar passe*,
- **Então** um livro `ativo` com vencimento em 12 meses é criado, Ana vira responsável, o e-mail "Seu livro está pronto" chega, a linha aparece no topo da lista e o evento `passe_ativado` é registrado.

### CUJ 2: Primeiro acesso com Google
- **Dado** que Ana recebeu o e-mail,
- **Quando** ela toca em *Abrir meu livro* e depois em *Entrar com Google*,
- **Então** ela cai em `/livro/<id>` com "O livro do Jair" e uma frase de estado vazio, e o evento `entrou` é registrado com papel `responsavel`.

### CUJ 3: Entrar por link
- **Dado** que Ana não usa Google,
- **Quando** ela digita o e-mail em `/entrar` e toca em *Receber link*,
- **Então** a tela responde "Se este e-mail tiver um livro, o link chega em instantes"; o e-mail chega; o link abre a home do livro (vale 1 hora).

### CUJ 4: Passe vence
- **Dado** um livro com `passe_vence_em` no passado,
- **Quando** o job das 06:00 roda (ou mesmo antes dele),
- **Então** qualquer escrita do responsável no livro é recusada pelo banco; depois do job, o estado mostra `somente_leitura`, a home mostra o selo "Somente leitura" e o evento `passe_vencido` é registrado com ator `sistema`.

### CUJ 5: Renovar e reenviar
- **Dado** um livro vencido ou perto de vencer,
- **Quando** o admin toca em *Renovar* e confirma,
- **Então** o vencimento passa a ser o maior entre hoje e o vencimento atual, mais 12 meses, e o estado volta a `ativo`. *Reenviar acesso* manda de novo o e-mail de acesso.

### CUJ 6: Alguém sem livro entra
- **Dado** uma pessoa com Google que não é responsável de nenhum livro,
- **Quando** ela entra,
- **Então** vê "Seu acesso ainda não foi ativado" e nada mais.

## Plano técnico

```text
Celular/Computador
  │
  ├─ /entrar ── Google ──► Supabase Auth ──► /auth/callback (troca código por sessão)
  │          └─ e-mail ─► Server Action ─► generateLink (chave secreta) ─► Resend
  │                                          link ─► /auth/confirmar (verifyOtp)
  │                                                     │
  │                                    registrarEvento('entrou') ◄─┘
  ├─ /            → lê sessão → 1 livro: /livro/<id> · vários: lista · nenhum: "acesso não ativado"
  ├─ /livro/<id>  → lê o livro com a sessão do usuário (RLS decide)
  └─ /admin       → guard (role=admin no token) → admin_listar_livros() (confere de novo no banco)
                    Ativar/Renovar/Reenviar → Server Action → chave secreta → funções SQL atômicas
                                                             → Resend → registrarEvento

Banco (Supabase, sa-east-1)
  books · book_members · author_access · events   (RLS ligada em todas)
  privado.*  funções de checagem (fora da API)
  pg_cron 09:00 UTC → privado.vencer_passes()
```

### Quem pode o quê no banco

| Tabela | anon | authenticated (membro) | authenticated (admin) | service_role (servidor) |
| --- | --- | --- | --- | --- |
| `books` | nada | lê os seus; altera só `autor_*` e só com passe ativo | lê todos | tudo |
| `book_members` | nada | lê os do seu livro | lê todos | tudo |
| `author_access` | nada | lê os do seu livro, **sem** `token_hash` | lê todos, sem `token_hash` | tudo |
| `events` | nada | nada | lê todos | tudo |

Ninguém além do servidor insere, altera ou apaga membros, links e eventos. Apagar livro não tem policy (só o servidor, por pedido formal de LGPD).

**Admin** é quem tem `app_metadata.role = 'admin'` no token. O usuário não consegue editar `app_metadata` (só a chave secreta), diferente de `user_metadata`, que ele edita. Marcar o admin é um `update` SQL feito uma vez.

### Passe

- Estados: `pendente` (existe para a onda 2, quando o livro nascer antes do pagamento), `ativo`, `somente_leitura`.
- `livro_editavel(livro)` = estado `ativo` **e** `passe_vence_em > agora`. Toda policy de escrita dos próximos prompts usa essa função. Este prompt já a aplica no `update` de `books`.
- Na tela, o estado mostrado é o efetivo: `ativo` com vencimento passado aparece como somente leitura.
- Job: `pg_cron` todo dia às 09:00 UTC (06:00 em Brasília) chama `privado.vencer_passes()`, que muda o estado e grava `passe_vencido` com ator `sistema` na mesma instrução.

### Login

- **Google:** `signInWithOAuth` com `redirectTo = <url do app>/auth/callback`. A rota troca o código por sessão (`exchangeCodeForSession`), registra `entrou` e redireciona para `/`.
- **Link por e-mail:** Server Action valida o e-mail (zod), procura o usuário com `admin_usuario_por_email`. Só envia se ele for membro de algum livro ou admin, e no máximo 3 vezes em 10 minutos (contado em `events`, ação `link_enviado`). A resposta na tela é sempre a mesma, para não revelar quem tem livro. O link é gerado por `auth.admin.generateLink({ type: 'magiclink' })`; usamos o `hashed_token` para montar `<url do app>/auth/confirmar?token_hash=…&type=magiclink`, e essa rota chama `verifyOtp`. Como o link aponta direto para o app, não depende da lista de redirects do Supabase.
- **Sessão:** `@supabase/ssr` com cookies. `proxy.ts` (nome novo do middleware no Next 16, roda em Node) renova a sessão a cada requisição e manda quem não tem sessão de `/admin` e `/livro/*` para `/entrar`.
- **Next 16 com `cacheComponents`:** ler cookies ou `params` fora de `<Suspense>` é erro de build. Cada página tem uma casca estática e um componente assíncrono dentro de `<Suspense>` que lê a sessão.
- **URL do app** para links: `APP_URL`, senão `https://$VERCEL_BRANCH_URL`, senão `http://localhost:3000`.

### E-mails (Resend, remetente `Ecoa Memórias <acesso@ecoa-memorias.com.br>`)

- **Acesso** (ativar e reenviar): assunto "O livro do Jair está pronto para começar" (sem nome do autor: "Seu livro de memórias está pronto"). Botão *Abrir meu livro* → `/entrar` (não expira). Linha secundária: "Ou entre direto por este link (vale 1 hora)" com link mágico.
- **Link de entrada:** assunto "Seu link para entrar na Ecoa". Botão *Entrar* com o link mágico.
- HTML simples, texto em Newsreader com fallback Georgia, versão em texto puro. Templates em código, testados por snapshot do texto.

### Eventos

`registrarEvento({ quem, papel, acao, livro, detalhes })`:

- `quem`: id do usuário (ou do link do autor no prompt 5; `null` para sistema).
- `papel`: `responsavel | cofacilitador | autor | familia | admin | sistema`.
- `acao`: lista fechada em código: `entrou`, `link_enviado`, `passe_ativado`, `passe_renovado`, `acesso_reenviado`, `passe_vencido`, e as já previstas no PRD `gravou`, `editou`, `sugeriu`, `gerou`. Nova ação = uma linha nesse arquivo.
- `livro`: id ou `null` (admin entrando sem livro).
- Valida com zod, grava com a chave secreta, nunca derruba a ação principal: se falhar, escreve no log do servidor e segue.
- `entrou` é registrado uma vez por login (callback e confirmar), uma linha por livro de que a pessoa é membro; admin sem livro gera uma linha com livro `null`.

Consulta do M10 ("quem acessou o livro X ontem"): `select e.criado_em, e.ator_tipo, u.email, e.acao from events e left join auth.users u on u.id = e.ator_id where e.book_id = X and e.criado_em >= current_date - 1 and e.criado_em < current_date order by 1;` (fica documentada; a tela vem no prompt 15).

### Telas

Régua do CLAUDE.md: uma ação principal por tela, poucas palavras, celular primeiro. Interface em `font-ui`, nome do livro em `font-livro`.

| Rota | Ação principal | Conteúdo |
| --- | --- | --- |
| `/entrar` | *Entrar com Google* | Marca, título "Entre no seu livro", link discreto "Prefiro receber um link por e-mail" que revela o campo |
| `/` | — | Redireciona; ou lista de livros (2+); ou "Seu acesso ainda não foi ativado" |
| `/livro/[id]` | *Começar* (desativado, "em breve", até o prompt 4) | "O livro do Jair" e uma frase de estado vazio; selo "Somente leitura" se vencido |
| `/admin` | *Ativar passe* | Formulário (e-mail, nome do autor) no topo; lista com e-mail, autor, estado, vence em; *Renovar* (pede confirmação) e *Reenviar acesso* por linha |

Para o gate de design (as telas com login não abrem sem Supabase no ambiente de teste), cada tela é um componente puro que recebe dados por props. A rota `/previa/[tela]` mostra esses componentes com dados falsos e só existe quando o build roda com `ECOA_PREVIA=1`; sem isso, responde 404.

## Alternativas consideradas

### A: Vercel Cron para o job diário
- **Prós:** código em TypeScript, logs na Vercel.
- **Contras:** rota pública com segredo, mais uma variável, depende de rede entre Vercel e Supabase.
- **Motivo:** Rejeitada pelo autor: pg_cron roda dentro do banco, sem rede nem segredo.

### B: Fila (Trigger.dev)
- **Motivo:** Rejeitada pelo autor: a escolha da fila ainda aguarda OK e entra no prompt 6.

### C: SMTP do Supabase apontado para o Resend
- **Prós:** zero código de envio.
- **Contras:** texto do e-mail no painel, fora do Git; sem controle do limite de envio; o e-mail de acesso do admin teria que ser outro caminho de qualquer jeito.
- **Motivo:** Rejeitada pelo autor: `generateLink` + Resend mantém os dois e-mails no código.

### D: Testes de RLS contra o Supabase real ou Supabase CLI com Docker
- **Contras:** rede, segredos e Docker; `npm test` deixaria de rodar em qualquer máquina.
- **Motivo:** Rejeitada pelo autor: PGlite roda as mesmas migrations em WebAssembly. Risco aceito: o shim do `auth` imita o Supabase; a verificação final roda no projeto real (`get_advisors` e teste manual).

### E: Tabela `admins`
- **Motivo:** Rejeitada pelo autor: `app_metadata.role` já vem no token e não é editável pelo usuário.

## Requisitos não funcionais

- **Segurança:** RLS nas 4 tabelas; permissão por coluna; funções de checagem fora da API (`privado`), `security definer` com `search_path` vazio; funções de admin executáveis só pela chave secreta (a lista do admin confere o papel dentro do banco). Chave secreta só no servidor (`server-only`), nunca com `NEXT_PUBLIC_`. Token do autor só como SHA-256.
- **LGPD:** banco em sa-east-1. Eventos guardam ids, não nomes; e-mail só em `auth.users`.
- **Reversão:** cada migration tem o SQL de reversão em `supabase/reversao/`. A reversão da primeira apaga dados; só serve antes de haver famílias reais.
- **Custo:** plano grátis do Supabase (2º projeto ativo da organização) e do Resend.

## SQL de subida

### `supabase/migrations/20261109120000_acesso_e_passe.sql`

```sql
-- 20261109120000_acesso_e_passe.sql
-- Livros, membros, link do autor e registro de eventos, com RLS.

-- Funções auxiliares ficam fora do schema exposto pela API.
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated, service_role;

create type public.passe_estado as enum ('pendente', 'ativo', 'somente_leitura');
create type public.papel_membro as enum ('responsavel', 'cofacilitador');
create type public.parentesco as enum ('pai', 'mãe', 'avô', 'avó', 'tio', 'tia', 'outro');
create type public.ator_tipo as enum ('responsavel', 'cofacilitador', 'autor', 'familia', 'admin', 'sistema');

create table public.books (
  id uuid primary key default gen_random_uuid(),
  autor_nome text check (autor_nome is null or char_length(btrim(autor_nome)) between 1 and 120),
  autor_apelido text check (autor_apelido is null or char_length(autor_apelido) <= 60),
  autor_parentesco public.parentesco,
  autor_foto_path text,
  passe_estado public.passe_estado not null default 'pendente',
  passe_ativado_em timestamptz,
  passe_vence_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint books_passe_datas check (
    passe_estado = 'pendente'
    or (passe_ativado_em is not null and passe_vence_em > passe_ativado_em)
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

-- Quem é quem
create function privado.eh_admin() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin', false)
$$;

create function privado.eh_membro(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members m
    where m.book_id = p_book and m.user_id = (select auth.uid())
  )
$$;

create function privado.eh_responsavel(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members m
    where m.book_id = p_book and m.user_id = (select auth.uid()) and m.papel = 'responsavel'
  )
$$;

-- Ativo e dentro do prazo. Vale mesmo se o job diário atrasar.
create function privado.livro_editavel(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.books b
    where b.id = p_book and b.passe_estado = 'ativo' and b.passe_vence_em > now()
  )
$$;

revoke all on all functions in schema privado from public;
grant execute on function
  privado.eh_admin(), privado.eh_membro(uuid), privado.eh_responsavel(uuid), privado.livro_editavel(uuid)
  to authenticated, service_role;

-- RLS em toda tabela
alter table public.books enable row level security;
alter table public.book_members enable row level security;
alter table public.author_access enable row level security;
alter table public.events enable row level security;

-- O Supabase concede tudo a anon/authenticated por padrão. Aqui só o necessário.
revoke all on public.books, public.book_members, public.author_access, public.events from anon, authenticated;
grant select on public.books to authenticated;
grant update (autor_nome, autor_apelido, autor_parentesco, autor_foto_path) on public.books to authenticated;
grant select on public.book_members to authenticated;
grant select (id, book_id, criado_em, criado_por, revogado_em) on public.author_access to authenticated;
grant select on public.events to authenticated;
grant all on public.books, public.book_members, public.author_access, public.events to service_role;

create policy "membro ou admin lê o livro" on public.books
  for select to authenticated
  using (privado.eh_membro(id) or (select privado.eh_admin()));

create policy "membro edita o livro com passe ativo" on public.books
  for update to authenticated
  using (privado.eh_membro(id) and privado.livro_editavel(id))
  with check (privado.eh_membro(id) and privado.livro_editavel(id));

create policy "membro ou admin lê os membros" on public.book_members
  for select to authenticated
  using (privado.eh_membro(book_id) or (select privado.eh_admin()));

create policy "membro ou admin lê o link do autor" on public.author_access
  for select to authenticated
  using (privado.eh_membro(book_id) or (select privado.eh_admin()));

create policy "admin lê os eventos" on public.events
  for select to authenticated
  using ((select privado.eh_admin()));

-- Operações do admin: atômicas, só pelo servidor (service_role).
create function public.admin_ativar_passe(p_responsavel uuid, p_autor_nome text, p_meses integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  insert into public.books (autor_nome, passe_estado, passe_ativado_em, passe_vence_em)
  values (nullif(btrim(p_autor_nome), ''), 'ativo', now(), now() + make_interval(months => p_meses))
  returning id into v_livro;
  insert into public.book_members (book_id, user_id, papel)
  values (v_livro, p_responsavel, 'responsavel');
  return v_livro;
end $$;

-- Renovar soma a partir do maior entre hoje e o vencimento atual: renovar cedo não perde dias.
create function public.admin_renovar_passe(p_livro uuid, p_meses integer)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_vence timestamptz;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  update public.books
  set passe_estado = 'ativo',
      passe_ativado_em = coalesce(passe_ativado_em, now()),
      passe_vence_em = greatest(now(), coalesce(passe_vence_em, now())) + make_interval(months => p_meses)
  where id = p_livro
  returning passe_vence_em into v_vence;
  if v_vence is null then
    raise exception 'livro não encontrado: %', p_livro;
  end if;
  return v_vence;
end $$;

create function public.admin_usuario_por_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1
$$;

-- Lista do admin: também confere o papel dentro do banco.
create function public.admin_listar_livros()
returns table (
  id uuid,
  autor_nome text,
  passe_estado public.passe_estado,
  passe_vence_em timestamptz,
  criado_em timestamptz,
  responsavel_email text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.eh_admin() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  return query
    select b.id, b.autor_nome, b.passe_estado, b.passe_vence_em, b.criado_em, u.email::text
    from public.books b
    left join public.book_members m on m.book_id = b.id and m.papel = 'responsavel'
    left join auth.users u on u.id = m.user_id
    order by b.criado_em desc;
end $$;

revoke all on function
  public.admin_ativar_passe(uuid, text, integer),
  public.admin_renovar_passe(uuid, integer),
  public.admin_usuario_por_email(text),
  public.admin_listar_livros()
  from public, anon, authenticated;
grant execute on function
  public.admin_ativar_passe(uuid, text, integer),
  public.admin_renovar_passe(uuid, integer),
  public.admin_usuario_por_email(text)
  to service_role;
grant execute on function public.admin_listar_livros() to authenticated, service_role;
```

### `supabase/migrations/20261109120100_job_vencer_passes.sql`

```sql
-- 20261109120100_job_vencer_passes.sql
-- Todo dia às 06:00 de Brasília (09:00 UTC), passes vencidos viram somente leitura.

create function privado.vencer_passes() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_total integer;
begin
  with vencidos as (
    update public.books
    set passe_estado = 'somente_leitura'
    where passe_estado = 'ativo' and passe_vence_em <= now()
    returning id
  )
  insert into public.events (book_id, ator_tipo, acao)
  select id, 'sistema', 'passe_vencido' from vencidos;
  get diagnostics v_total = row_count;
  return v_total;
end $$;
revoke all on function privado.vencer_passes() from public, anon, authenticated;

-- O pg_cron existe no Supabase e não existe no PGlite dos testes.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('vencer-passes', '0 9 * * *', 'select privado.vencer_passes()');
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
    perform cron.unschedule(jobid) from cron.job where jobname = 'vencer-passes';
  end if;
end $$;
drop function if exists privado.vencer_passes();
-- A extensão pg_cron fica instalada: outras rotinas podem usá-la.
```

### `supabase/reversao/20261109120000_acesso_e_passe.down.sql`

```sql
-- Reverte 20261109120000_acesso_e_passe.sql
-- ATENÇÃO: apaga livros, membros, links do autor e eventos. Só antes de haver dados reais.
drop function if exists public.admin_listar_livros();
drop function if exists public.admin_usuario_por_email(text);
drop function if exists public.admin_renovar_passe(uuid, integer);
drop function if exists public.admin_ativar_passe(uuid, text, integer);
drop table if exists public.events;
drop table if exists public.author_access;
drop table if exists public.book_members;
drop table if exists public.books;
drop function if exists privado.livro_editavel(uuid);
drop function if exists privado.eh_responsavel(uuid);
drop function if exists privado.eh_membro(uuid);
drop function if exists privado.eh_admin();
drop function if exists privado.tocar_atualizado_em();
drop schema if exists privado;
drop type if exists public.ator_tipo;
drop type if exists public.parentesco;
drop type if exists public.papel_membro;
drop type if exists public.passe_estado;
```

Esse SQL já rodou no PGlite (rascunho, fora do repositório) com estes resultados: o responsável A lê só o próprio livro; `update` e `delete` no livro B afetam 0 linhas ou são negados; mudar `passe_vence_em` do próprio livro é negado; ler `token_hash` é negado; `anon` não lê nada; quem tem `role=admin` em `user_metadata` (editável) não vira admin; livro vencido recusa edição antes do job; o job muda 1 livro e grava o evento; renovar cedo soma ao vencimento atual; a reversão deixa o schema `public` vazio.

---

## Plano de implementação detalhado

### Arquivos

#### 1. `supabase/migrations/20261109120000_acesso_e_passe.sql` e `20261109120100_job_vencer_passes.sql` (criar)
- **Escopo:** schema. Conteúdo exatamente o da seção "SQL de subida".

#### 2. `supabase/reversao/*.down.sql` (criar)
- **Escopo:** reversão. Conteúdo da seção "SQL de reversão". Fora de `migrations/` para a CLI do Supabase não aplicá-los.

#### 3. `supabase/tests/auth-shim.sql` (criar)
- **Escopo:** teste. Cria papéis `anon`, `authenticated`, `service_role` (este com `bypassrls`), schema `auth` com `auth.users (id, email, raw_app_meta_data)`, `auth.jwt()` lendo `request.jwt.claims`, `auth.uid()` lendo `sub`, e os privilégios padrão que o Supabase dá em `public`.

#### 4. `supabase/tests/banco.ts` (criar)
- **Escopo:** utilitário de teste. `criarBanco()` abre um PGlite em memória, aplica o shim e todas as migrations em ordem de nome; `como(db, papel, claims, fn)` roda `fn` numa transação com `set local role` e `request.jwt.claims`; `tenta(tx, sql)` usa savepoint e devolve `{ linhas, afetadas }` ou `{ erro }`.

#### 5. `supabase/tests/rls.test.ts` (criar)
- **Escopo:** Vitest. Livros A (responsável A) e B (responsável B), link do autor e evento em B. Casos:
  - A lê só o livro A; `select` de B devolve 0 linhas em `books`, `book_members`, `author_access`.
  - A não altera B (0 linhas) e não apaga B (negado) em cada tabela; `insert` em `book_members`, `author_access`, `events` negado.
  - A não muda `passe_estado`, `passe_vence_em`, `passe_ativado_em` do próprio livro (negado).
  - A não lê `token_hash` (negado); lê as outras colunas do link do próprio livro.
  - A não lê `events`; admin lê.
  - A não executa `admin_ativar_passe`, `admin_renovar_passe`, `admin_usuario_por_email`, `privado.vencer_passes`; `admin_listar_livros` dá "acesso negado" para A e devolve 2 linhas para o admin.
  - `role=admin` em `user_metadata` não dá acesso de admin.
  - `anon` não lê nenhuma das 4 tabelas.
  - Livro vencido com estado ainda `ativo`: A não altera `autor_nome` (0 linhas).
  - Toda tabela do schema `public` tem RLS ligada (consulta em `pg_class.relrowsecurity`): pega tabela futura esquecida.
  - Reversão: aplicar os `.down.sql` deixa `public` sem tabelas.

#### 6. `supabase/tests/passe.test.ts` (criar)
- **Escopo:** Vitest no PGlite. `admin_ativar_passe` cria livro ativo com vencimento em 12 meses e 1 responsável; recusa meses fora de 1–36. `admin_renovar_passe` em livro vencido: vence ≈ agora + 12 meses e estado `ativo`; em livro com 3 meses restantes: vence ≈ vencimento atual + 12 meses. `privado.vencer_passes()` muda só os vencidos e grava 1 evento `passe_vencido` por livro.

#### 7. `lib/config.ts` e `lib/config.test.ts` (modificar)
- `DOMINIO_APP = "app.ecoa-memorias.com.br"`, `DOMINIO_QR = "ouvir.ecoa-memorias.com.br"`, novos `EMAIL_REMETENTE = "Ecoa Memórias <acesso@ecoa-memorias.com.br>"`, `LINK_EMAIL_LIMITE = 3`, `LINK_EMAIL_JANELA_MIN = 10`. O teste passa a conferir o domínio com hífen.

#### 8. `docs/prd.md` (modificar)
- Troca `ecoamemorias.com.br` por `ecoa-memorias.com.br` nas 4 menções.

#### 9. `.env.example` (modificar)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `APP_URL` (opcional), `ECOA_PREVIA` (só para o gate de design). Remove `ANON_KEY` e `SERVICE_ROLE_KEY` legadas.

#### 10. `lib/env.ts` (criar)
- zod: `envPublico()` (URL e chave publicável) e `envServidor()` (mais chave secreta e Resend, com `server-only`). Erro claro: "Falta SUPABASE_SECRET_KEY no .env.local". `urlDoApp()` com a ordem `APP_URL` → `VERCEL_BRANCH_URL` → localhost.

#### 11. `lib/supabase/servidor.ts`, `lib/supabase/navegador.ts`, `lib/supabase/admin.ts`, `lib/supabase/proxy.ts` (criar)
- `servidor`: `createServerClient` com `cookies()` do `next/headers`. `navegador`: `createBrowserClient`. `admin`: `createClient` com a chave secreta, `server-only`, sem persistir sessão. `proxy`: `atualizarSessao(request)` no padrão do `@supabase/ssr` (getClaims para renovar) e devolve `{ resposta, temSessao }`.
- `lib/supabase/tipos.ts`: tipos gerados pelo `generate_typescript_types` do projeto real.

#### 12. `proxy.ts` (criar, raiz)
- Chama `atualizarSessao`; se a rota começa com `/admin` ou `/livro` e não há sessão, redireciona para `/entrar`. `matcher` exclui `_next/static`, `_next/image`, `favicon.ico` e arquivos com extensão.

#### 13. `lib/sessao.ts` (criar)
- `server-only`. `usuarioAtual()` → `{ id, email, ehAdmin }` ou `null`, via `getClaims()`. `exigirAdmin()` → usuário ou `notFound()`. `livrosDoUsuario()` → lista `{ id, autor_nome, papel, passe_estado, passe_vence_em }` com a sessão do usuário (RLS decide).

#### 14. `lib/passe.ts` e `lib/passe.test.ts` (criar)
- Função pura `estadoEfetivo({ passe_estado, passe_vence_em }, agora)` → `pendente | ativo | somente_leitura` e `podeEscrever(...)`. Testes: ativo no prazo, ativo vencido, somente leitura, pendente, vencimento exatamente agora.

#### 15. `lib/eventos-acoes.ts` e `lib/eventos.ts` e `lib/eventos.test.ts` (criar)
- `ACOES` (tupla `as const`) e `PAPEIS`. `registrarEvento(entrada, cliente = clienteAdmin())`: valida com zod, faz `insert` em `events`, devolve `{ ok: true }` ou `{ ok: false }` e loga o erro sem dados pessoais. Teste com cliente falso: grava o formato certo; ação fora da lista não grava; falha do banco não lança.

#### 16. `lib/tokens.ts` e `lib/tokens.test.ts` (criar)
- `gerarToken()` → 16 bytes aleatórios em base64url; `hashToken(token)` → SHA-256 em hex (64 caracteres); `compararHash(a, b)` com `timingSafeEqual`. Testes: tamanho, unicidade em 1000 gerações, hash estável e compatível com o `check` da tabela.

#### 17. `lib/email/enviar.ts`, `lib/email/modelos.ts`, `lib/email/modelos.test.ts` (criar)
- `modelos`: `emailAcesso({ autorNome, urlEntrar, urlLinkMagico })` e `emailLinkEntrada({ urlLinkMagico })` → `{ assunto, html, texto }`, com escape de HTML no nome do autor. `enviar`: `server-only`, Resend com `EMAIL_REMETENTE`; devolve `{ ok }` sem lançar. Testes: assunto com e sem nome do autor, links presentes, nome com `<script>` escapado.

#### 18. `lib/acesso.ts` (criar)
- `server-only`. `gerarLinkMagico(email)` → URL `/auth/confirmar?...` a partir do `hashed_token`. `enviarAcesso(livroId)` → busca e-mail do responsável e nome do autor com a chave secreta, gera link, envia o e-mail de acesso.

#### 19. `app/entrar/page.tsx`, `app/entrar/formulario-entrar.tsx`, `app/entrar/acoes.ts` (criar)
- Página estática com o componente cliente. Google: `createBrowserClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <origem>/auth/callback } })`. Server Action `pedirLink(email)`: zod, `admin_usuario_por_email`, checa membro/admin, checa limite em `events`, envia, `registrarEvento('link_enviado')`, resposta sempre igual. Mostra erro de login quando a URL tem `?erro=1`.

#### 20. `app/auth/callback/route.ts` e `app/auth/confirmar/route.ts` (criar)
- `callback`: `exchangeCodeForSession(code)`; `confirmar`: `verifyOtp({ type: 'magiclink', token_hash })`. Ambos registram `entrou` para cada livro do usuário (ou livro `null` se admin sem livro) e redirecionam para `/`; em erro, para `/entrar?erro=1`.

#### 21. `app/page.tsx` (modificar) e `app/livro/[id]/page.tsx` (criar)
- `/`: casca + `<Suspense>` com componente que lê a sessão: sem sessão → `/entrar`; 1 livro → `/livro/<id>`; 2+ → lista; 0 → `TelaSemAcesso`. `/livro/[id]`: lê o livro com a sessão (RLS); não encontrado → `notFound()`; renderiza `TelaLivroVazio`.

#### 22. `app/admin/page.tsx`, `app/admin/acoes.ts`, `app/admin/formulario-ativar.tsx`, `app/admin/linha-livro.tsx` (criar)
- Página: `<Suspense>` + `exigirAdmin()` + `admin_listar_livros()` com a sessão. Ações (todas começam por `exigirAdmin()` e validam com zod):
  - `ativarPasse({ email, autorNome })`: acha ou cria o usuário (`auth.admin.createUser({ email, email_confirm: true })`), `admin_ativar_passe(usuario, autorNome, DURACAO_PASSE_MESES)`, `enviarAcesso`, `registrarEvento('passe_ativado', papel admin, livro)`. Se o e-mail falhar, o passe fica ativo e a tela diz "Passe ativado, mas o e-mail não saiu. Use Reenviar."
  - `renovarPasse(livroId)`: `admin_renovar_passe(livroId, DURACAO_PASSE_MESES)`, evento `passe_renovado`.
  - `reenviarAcesso(livroId)`: `enviarAcesso`, evento `acesso_reenviado`.
  - Todas chamam `revalidatePath('/admin')` (ou `refresh`, conforme docs do Next 16 lidas na implementação).

#### 23. `components/telas/*.tsx` (criar)
- `TelaEntrar`, `TelaSemAcesso`, `TelaLivroVazio`, `TelaListaLivros`, `TelaAdmin`: componentes puros, só props.

#### 24. `components/ui/botao.tsx`, `campo.tsx`, `estado-vazio.tsx` (criar)
- Botão principal e secundário (alvo de toque ≥ 48 px, foco visível), campo com rótulo, estado vazio (frase + ação). Tokens de `app/globals.css`.

#### 25. `app/previa/[tela]/page.tsx` e `lib/previa.ts` (criar)
- Se `process.env.ECOA_PREVIA !== '1'`, `notFound()`. Senão, renderiza a tela pedida com dados falsos de `lib/previa.ts`.

#### 26. `e2e/home.spec.ts` (modificar) e `e2e/entrar.spec.ts` (criar)
- `/` sem sessão → `/entrar`; `/entrar` tem um botão "Entrar com Google" e o link de e-mail revela o campo; `/admin` e `/livro/x` sem sessão → `/entrar`; `/previa/entrar` → 404 sem `ECOA_PREVIA`. O e2e roda sem Supabase real (variáveis falsas no `webServer` do Playwright).

#### 27. `playwright.config.ts` (modificar)
- `webServer.env` com URL e chaves falsas para o build não falhar sem `.env.local`.

#### 28. `docs/setup/supabase-google-resend.md` (criar)
- Passo a passo: Google Cloud (tela de consentimento externa, cliente OAuth Web, origem e redirect `https://<ref>.supabase.co/auth/v1/callback`); Supabase (Auth → Providers → Google; URL Configuration com Site URL e `http://localhost:3000/**`, `https://*.vercel.app/**`); Resend (API key só de envio, domínio já verificado); `.env.local`; variáveis na Vercel; marcar admin: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '…';`; consulta do M10.

#### 29. `package.json` (modificar)
- Dependências já instaladas: `@supabase/supabase-js`, `@supabase/ssr`, `resend`, `server-only`; dev `@electric-sql/pglite`.

### Ordem

1. Migrations + shim + testes de RLS e passe (vermelho → verde no PGlite).
2. `lib/*` puros com testes.
3. Clientes Supabase, proxy, sessão, rotas de auth.
4. Telas, prévia, admin.
5. Projeto Supabase real: criar, aplicar migrations, `get_advisors`, gerar tipos.
6. Gates e guia de setup.

### Plano de verificação

- **Build:** `npm run build`.
- **Unidade e RLS:** `npm test` (inclui PGlite).
- **Lint e formato:** `npm run lint`, `npm run format`.
- **E2E:** `npm run test:e2e`.
- **Design:** `ECOA_PREVIA=1 npm run build && npm run start`, `npm run taste:lint`, `npm run taste:inspect` em 390, 768 e 1440 px para `/entrar` e `/previa/*`.
- **Banco real:** `get_advisors` (segurança) sem alerta novo; `cron.job` com `vencer-passes`.
- **Aceite manual (preview da Vercel, celular):** ativar → e-mail → Google → home vazia; conferir o evento `entrou` com a consulta do M10.

---

*Rascunhado com EGM*
