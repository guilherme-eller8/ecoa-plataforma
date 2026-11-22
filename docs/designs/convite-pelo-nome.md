# Convite pelo nome e boas-vindas com duas portas

Prompt avulso de 22/11/2026, pedido do Guilherme. Mexe em schema, RLS e link sem login: EGM em duas sessões (T28). Esta é a sessão 1: vai até o design aprovado.

Decisões novas propostas: **P81** (convite pelo nome, substitui em parte P59), **P82** (boas-vindas com duas portas, substitui em parte P79 item 2) e **T59** (schema). Ver seção 10.

## 1. Problema, hipótese e o que está em jogo

- **Problema:** para convidar um irmão, o responsável precisa saber o e-mail dele. Em família, quase ninguém sabe o e-mail do outro; todo mundo tem o WhatsApp.
- **Hipótese:** convidar só com o nome e mandar o link no WhatsApp aumenta a taxa *convite enviado → aceito*. Quem recebe sabe o próprio Gmail.
- **Evidência hoje:** a dor do próprio Guilherme, sem observação de família. **Métrica:** `convidou` → `convite_aceito` → 1ª gravação do co-facilitador em 7 dias (`events`). **Critério de revisão:** se em 10 convites pelo nome menos da metade virar aceito, o atrito não era o e-mail.
- **O que está em jogo:** P59 prendeu o convite ao e-mail para que um link repassado no grupo não desse acesso a ninguém mais. Co-facilitador tem acesso total, inclusive ao capítulo surpresa (P21). Este design aceita um risco novo (seção 6) e o contém.

**Restrição que molda o desenho:** o cadastro público está desligado no Supabase (`shouldCreateUser: false`; `signup_disabled` em `app/auth/callback/route.ts`). Só entra quem tem conta criada pela Ecoa (`contaParaEmail`, `lib/acesso.ts`). Por isso o convidado **digita o próprio e-mail na página do convite**: o servidor cria a conta dele e prende o convite a esse e-mail. Daí em diante é o fluxo de P59 que já existe (login Google ou link por e-mail, `meus_convites`, `aceitar_convite`). O cadastro continua fechado.

## 2. Escopo

**Entra**
1. *Convidar* pede só o **nome** (até 30 letras). Nenhum e-mail sai da Ecoa: o convite vai pelo WhatsApp do responsável (P9) ou por *Copiar mensagem*.
2. `/convite/{token}` sem sessão: "Oi, {nome}! {Quem} chamou você para o livro de {autor}." Campo *Seu e-mail do Google* → *Continuar* → botão *Entrar com Google* (e *Receber link por e-mail* como alternativa).
3. `/convite/{token}` com sessão: *Aceitar como {e-mail}*, em 1 toque.
4. Errou o e-mail: dá para trocar enquanto o convite não foi aceito, até 3 vezes.
5. Aceitou → **`/livro/{id}/bemvindo`**: *Gravar uma conversa com {autor}* (principal) e *Deixar sua mensagem para {autor}, em segredo* (secundária, abre o `/m`).
6. Aceito → e-mail ao responsável: "{Nome} entrou no livro como {e-mail}. Não é {nome}? Remova em *Quem ajuda*."
7. *Quem ajuda* mostra o convite pendente pelo nome ("Maria · ainda não entrou").

**Fica de fora**
- Abrir o cadastro público.
- Aprovação do responsável antes de o convidado ver o livro (opção descartada pelo Guilherme).
- Mudar o callback do Google para voltar ao convite (continua sem parâmetro de redirect; a home já mostra o convite por `meus_convites`).
- Convites antigos por e-mail: continuam valendo como estão; não ganham troca de e-mail.

## 3. Decisões que preciso de você

| # | Pergunta | Recomendação |
| --- | --- | --- |
| Q1 | Validade do link pelo nome | **7 dias**, igual hoje (`CONVITE_VALIDADE_DIAS`). |
| Q2 | Quantas trocas de e-mail | **3** (`CONVITE_TROCAS_EMAIL`). Corrige erro de digitação sem virar fábrica de contas. |
| Q3 | Campo de e-mail some de *Convidar*? | **Sim**, um campo só (nome). Menos uma decisão para o responsável. |
| Q4 | Avisar o responsável no aceite por e-mail | **Sim**, é a principal defesa do risco aceito (seção 6). |

## 4. Como funciona

### 4.1 Convidar (responsável)

1. *Quem ajuda* → *Convidar* → campo *Nome de quem vai ajudar* → *Criar convite*.
2. A ação `convidar` (`app/livro/[id]/pessoas/acoes.ts`) valida o nome com `nomeSeguro` (`lib/convite/textos.ts`), sorteia o `id`, deriva o token (`tokenDoLink("convite", id, versao)`) e chama `servico_criar_convite_nome`. Sem `contaParaEmail` e sem `enviarEmail` neste passo.
3. A folha mostra *Mandar no WhatsApp* (principal) e *Copiar mensagem*. Texto: "Oi, {nome}! Chamei você para me ajudar no livro de memórias de {autor}. Abra o link e entre com o seu Gmail: {url}. O link é só seu, não repasse no grupo."
4. Registra `convidou` com `{ convite_id }` (já existe).

### 4.2 Abrir o link (convidado)

`/convite/{token}` mantém `noindex`, `no-referrer`, `no-store` e página dinâmica (T47). `servico_ler_convite` passa a devolver também `nome` e `email_definido` (boolean); o e-mail continua saindo só mascarado.

| Estado | Tela |
| --- | --- |
| Inválido, vencido, cancelado ou aceito | "Este convite não vale mais. Peça um novo a quem convidou." (como hoje) |
| Sem sessão, convite pelo nome | Campo *Seu e-mail do Google* → *Continuar* (ação `definirEmailDoConvite`) → "Pronto. Entre com b•••@gmail.com." + *Entrar com Google* + *Receber link por e-mail* + *Usar outro e-mail* (se houver troca sobrando) |
| Sem sessão, convite por e-mail (antigo) | Como hoje: *Entrar para aceitar* |
| Com sessão, convite pelo nome ainda sem e-mail, ou com o e-mail da sessão | *Aceitar como fulana@gmail.com* (ação `aceitarPeloLink`) |
| Com sessão e convite preso a outro e-mail | Como hoje: "Este convite é para b•••@…" + *Usar este e-mail* (troca, se houver sobrando) |

**`definirEmailDoConvite(token, email)`** (servidor, sem sessão):
1. zod no e-mail; hash do token.
2. `servico_pode_definir_email(hash, email)` (stable, só confere). Falhou → frase do erro, nada criado.
3. `contaParaEmail(email)`. `recusada` → mesma resposta de sucesso, nada gravado (sem oráculo de contas, como em P59).
4. `servico_definir_email_convite(hash, email)`. Falhou e a conta foi `criada` agora → `auth.admin.deleteUser`.
5. *Receber link por e-mail* reaproveita a ação de `/entrar` (mesmos limites).

**`aceitarPeloLink(token)`** (com sessão): `servico_definir_email_convite(hash, e-mail confirmado da sessão)` e, em seguida, `aceitar_convite(convite)` (sem mudança: confere o e-mail da sessão). Redireciona para `/livro/{id}/bemvindo`.

Depois do login pelo Google o callback continua indo para `/`, que já mostra "Você foi convidado…" com *Aceitar* (`meus_convites` acha pelo e-mail). *Aceitar* da home passa a ir para `/bemvindo`.

### 4.3 Boas-vindas (`/livro/[id]/bemvindo`, membro)

- Título (`font-livro`): "Que bom ter você no livro de {autor}".
- **Principal:** *Gravar uma conversa com {autor}* → `/livro/{id}/historias/gravar?bemvindo=1` (a oferta da tela inicial de P79 continua lá).
- **Secundária:** *Deixar sua mensagem para {autor}, em segredo* → ação `abrirMinhaMensagem(livro)`: usa o link `/m` ativo (`linkDeMensagens`) ou gera o primeiro pelo mesmo caminho de `pegarLink` (`app/livro/[id]/mensagens/acoes.ts`; P65 deixa qualquer membro gerar o primeiro) e redireciona para ele.
- Linha de apoio sob a secundária: "{Autor} só ouve quando o livro chegar."
- *Ver o livro* como link de texto no rodapé.
- Estado vazio não se aplica (sempre há as duas portas). Somente leitura (plano vencido): só *Ver o livro*.

### 4.4 Aviso ao responsável

Depois de `aceitar_convite` dar certo, a ação manda `emailConviteAceito` (`lib/email/modelos.ts`) ao responsável: assunto fixo "Alguém entrou no seu livro de memórias"; corpo "{Nome do convite} entrou no livro de {autor} como {e-mail completo}. Não é {nome}? Remova em Quem ajuda." com botão para `/livro/{id}/pessoas`. Nomes por `nomeSeguro`. Falha no envio não desfaz o aceite (registra `erro_servidor`, T53).

### 4.5 Eventos (`lib/eventos-acoes.ts`)

- `convite_email_definido` `{ convite_id }`, gravado pelo banco (`ator_tipo = 'sistema'`, sem ator).
- `convidou`, `convite_aceito`, `convite_cancelado`: sem mudança.

## 5. Telas (gate de design)

- `pessoas-convidar` (folha só com o nome), `pessoas` com pendente pelo nome.
- `convite-nome` (pede e-mail), `convite-nome-pronto` (entrar), `convite-sessao` (aceitar como), `convite-outro-email`.
- `bemvindo`.
- Régua: uma ação principal por tela; 390/768/1440; dica de 1 linha só em `convite-nome` ("É o e-mail que você usa no celular").

## 6. Segurança

| Ameaça | Defesa |
| --- | --- |
| **Link repassado no grupo (risco novo, aceito)** | Quem definir o e-mail primeiro fica com o convite. Contenção: uso único; 7 dias; aviso por e-mail ao responsável com o e-mail completo de quem entrou; remover (P60) desliga tudo na próxima requisição; o texto do WhatsApp diz "não repasse". **Janela de exposição:** entre o aceite indevido e a remoção, a pessoa vê histórias e mensagens. Aceito pelo Guilherme em 22/11/2026 |
| Sequestro do convite pendente (outra pessoa troca o e-mail antes do aceite) | Até 3 trocas; o responsável vê na lista "Maria · b•••@gmail.com, ainda não entrou" e pode cancelar e refazer |
| Fábrica de contas pelo link | Conta só é criada depois de `servico_pode_definir_email` passar; até 3 trocas por convite; 3 por e-mail em 24 h (`max_convites_por_email_dia`, agora contado em `email_definido_em`); 10 convites por livro e por responsável em 24 h (já existe). Contas sem livro: risco já aceito até o prompt 15 |
| Oráculo de contas | `recusada` responde igual a sucesso. `ja_membro` só aparece para quem tem o link e diz que o e-mail já está **neste** livro |
| Token na URL | 132 bits, só o hash no banco (T6, T25); página `no-store`, `no-referrer`; o token nunca vai para o callback do Google |
| Nome de pessoa na URL | Não: o nome só sai na página, vindo do banco |
| Convidado escapa do teto de 5 | Pendente pelo nome conta no teto como hoje; `aceitar_convite` confere de novo com o livro travado |
| Autor | `porta_autor` não ganha grant; `/bemvindo` exige membro; o `/m` continua só de escrita (P65) |
| Responsável antigo | `convite_valido` continua exigindo que quem convidou ainda seja o responsável |

## 7. SQL

- Subida: `supabase/migrations/20261130120000_convite_pelo_nome.sql`
- Reversão: `supabase/reversao/20261130120000_convite_pelo_nome.down.sql`
- `lib/config.ts`: `CONVITE_TROCAS_EMAIL = 3` (espelhado em `privado.convite_trocas_email()`; `config-banco.test.ts`).

### Subida

```sql
-- Convite pelo nome (P81, T59): o convidado define o próprio e-mail pelo link.

-- 1. Tabela
alter table public.book_invites alter column email drop not null;
alter table public.book_invites drop constraint book_invites_email_check;
alter table public.book_invites
  add constraint book_invites_email_check check (
    email is null or (email = lower(btrim(email)) and char_length(email) between 6 and 254
                      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  add column nome text check (nome is null or (nome = btrim(nome) and char_length(nome) between 1 and 30)),
  add column email_trocas smallint not null default 0 check (email_trocas between 0 and 10),
  add column email_definido_em timestamptz,
  add constraint book_invites_quem check (email is not null or nome is not null),
  add constraint book_invites_aceito_com_email check (aceito_em is null or email is not null);
create index book_invites_email_definido on public.book_invites (email, email_definido_em desc)
  where email_definido_em is not null;

grant select (nome, email_trocas, email_definido_em) on public.book_invites to authenticated;

create function privado.convite_trocas_email() returns smallint
language sql immutable set search_path = '' as $$ select 3::smallint $$;

-- 2. Criar pelo nome: as regras de conferir_convite sem as do e-mail.
create function privado.conferir_convite_nome(p_livro uuid, p_usuario uuid, p_nome text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m
                 where m.book_id = p_livro and m.user_id = p_usuario and m.papel = 'responsavel') then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then raise exception 'livro_fechado'; end if;
  if p_nome is null or p_nome <> btrim(p_nome) or char_length(p_nome) not between 1 and 30 then
    raise exception 'dados_invalidos';
  end if;
  if (select count(*) from public.book_invites i
      where i.book_id = p_livro and i.criado_em > now() - interval '24 hours') >= privado.max_convites_dia()
     or (select count(*) from public.book_invites i
         where i.criado_por = p_usuario and i.criado_em > now() - interval '24 hours') >= privado.max_convites_dia() then
    raise exception 'limite_convites';
  end if;
  if (select count(*) from public.book_members m where m.book_id = p_livro and m.papel = 'cofacilitador')
     + (select count(*) from public.book_invites i where i.book_id = p_livro
          and i.aceito_em is null and i.revogado_em is null and i.expira_em > now())
     >= privado.max_cofacilitadores() then
    raise exception 'limite_cofacilitadores';
  end if;
end $$;

create function public.servico_criar_convite_nome(
  p_livro uuid, p_usuario uuid, p_id uuid, p_nome text, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.books b where b.id = p_livro for update;
  perform privado.conferir_convite_nome(p_livro, p_usuario, p_nome);
  insert into public.book_invites (id, book_id, nome, token_hash, chave_versao, criado_por, expira_em)
  values (p_id, p_livro, p_nome, p_token_hash, p_chave_versao, p_usuario,
          now() + make_interval(days => privado.convite_validade_dias()));
end $$;

-- 3. O convidado define (ou troca) o próprio e-mail pelo link.
create function privado.conferir_email_convite(p_convite uuid, p_email text) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  i public.book_invites;
begin
  select * into i from public.book_invites x where x.id = p_convite;
  if i.id is null or i.nome is null or not privado.convite_valido(i.id) then
    raise exception 'convite_invalido';
  end if;
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or char_length(p_email) not between 6 and 254 then
    raise exception 'dados_invalidos';
  end if;
  if i.email = p_email then return; end if;  -- o mesmo e-mail de novo: nada muda
  if i.email_trocas >= privado.convite_trocas_email() then raise exception 'limite_convites'; end if;
  if (select count(*) from public.book_invites x
      where x.email = p_email and x.email_definido_em > now() - interval '24 hours')
     >= privado.max_convites_por_email_dia() then
    raise exception 'limite_convites';
  end if;
  if exists (select 1 from public.book_members m join auth.users u on u.id = m.user_id
             where m.book_id = i.book_id and lower(u.email) = p_email) then
    raise exception 'ja_membro';
  end if;
  if exists (select 1 from public.book_invites x
             where x.book_id = i.book_id and x.id <> i.id and x.email = p_email
               and x.aceito_em is null and x.revogado_em is null) then
    raise exception 'convite_duplicado';
  end if;
end $$;

create function public.servico_pode_definir_email(p_token_hash text, p_email text) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'convite_invalido'; end if;
  select x.id into v_id from public.book_invites x where x.token_hash = p_token_hash;
  perform privado.conferir_email_convite(v_id, lower(btrim(p_email)));
end $$;

create function public.servico_definir_email_convite(p_token_hash text, p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  i public.book_invites;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'convite_invalido'; end if;
  select * into i from public.book_invites x where x.token_hash = p_token_hash;
  if i.id is null then raise exception 'convite_invalido'; end if;
  perform 1 from public.books b where b.id = i.book_id for update;
  select * into i from public.book_invites x where x.id = i.id for update;
  perform privado.conferir_email_convite(i.id, v_email);
  if i.email is distinct from v_email then
    update public.book_invites
    set email = v_email, email_trocas = email_trocas + 1, email_definido_em = now()
    where id = i.id;
    insert into public.events (book_id, ator_tipo, ator_id, acao, detalhes)
    values (i.book_id, 'sistema', null, 'convite_email_definido', jsonb_build_object('convite_id', i.id));
  end if;
  return i.id;
end $$;

-- 4. Leitura da página: + nome e se o e-mail já foi definido. Muda o retorno: drop e create.
drop function public.servico_ler_convite(text);
create function public.servico_ler_convite(p_token_hash text)
returns table (convite_id uuid, book_id uuid, email text, nome text, autor text,
               criado_por uuid, estado text, trocas_restantes smallint)
language sql stable security definer set search_path = '' as $$
  select i.id, i.book_id, i.email, i.nome, coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome),
         i.criado_por,
         case when i.aceito_em is not null then 'aceito'
              when privado.convite_valido(i.id) then 'pendente'
              else 'vencido' end,
         greatest(privado.convite_trocas_email() - i.email_trocas, 0)::smallint
  from public.book_invites i join public.books b on b.id = i.book_id
  where p_token_hash ~ '^[0-9a-f]{64}$' and i.token_hash = p_token_hash
$$;

-- 5. Privilégios
revoke all on function privado.convite_trocas_email(), privado.conferir_convite_nome(uuid, uuid, text),
  privado.conferir_email_convite(uuid, text) from public;
revoke all on function public.servico_criar_convite_nome(uuid, uuid, uuid, text, text, smallint),
  public.servico_pode_definir_email(text, text), public.servico_definir_email_convite(text, text),
  public.servico_ler_convite(text)
from public, anon, authenticated;
grant execute on function public.servico_criar_convite_nome(uuid, uuid, uuid, text, text, smallint),
  public.servico_pode_definir_email(text, text), public.servico_definir_email_convite(text, text),
  public.servico_ler_convite(text)
to service_role;
```

`servico_pode_convidar` e `servico_criar_convite` (por e-mail) ficam no banco, só `service_role`, sem chamador no app: a reversão fica trivial e convites antigos não dependem delas. Removo num prompt de limpeza.

### Reversão

```sql
-- Só reverte se nenhum convite pelo nome existir sem e-mail (senão o NOT NULL falha): cancele-os antes.
revoke all on function public.servico_ler_convite(text) from service_role;
drop function public.servico_ler_convite(text);
create function public.servico_ler_convite(p_token_hash text)
returns table (convite_id uuid, book_id uuid, email text, autor text, criado_por uuid, estado text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.book_id, i.email, coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome),
         i.criado_por,
         case when i.aceito_em is not null then 'aceito'
              when privado.convite_valido(i.id) then 'pendente'
              else 'vencido' end
  from public.book_invites i join public.books b on b.id = i.book_id
  where p_token_hash ~ '^[0-9a-f]{64}$' and i.token_hash = p_token_hash
$$;
revoke all on function public.servico_ler_convite(text) from public, anon, authenticated;
grant execute on function public.servico_ler_convite(text) to service_role;

drop function public.servico_definir_email_convite(text, text);
drop function public.servico_pode_definir_email(text, text);
drop function privado.conferir_email_convite(uuid, text);
drop function public.servico_criar_convite_nome(uuid, uuid, uuid, text, text, smallint);
drop function privado.conferir_convite_nome(uuid, uuid, text);
drop function privado.convite_trocas_email();

delete from public.events where acao = 'convite_email_definido';
drop index public.book_invites_email_definido;
alter table public.book_invites
  drop constraint book_invites_aceito_com_email,
  drop constraint book_invites_quem,
  drop column email_definido_em,
  drop column email_trocas,
  drop column nome;
alter table public.book_invites drop constraint book_invites_email_check;
alter table public.book_invites
  add constraint book_invites_email_check check (email = lower(btrim(email)) and char_length(email) between 6 and 254
                                                 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
alter table public.book_invites alter column email set not null;
```

## 8. Testes

**Banco (`supabase/tests/convite-pelo-nome.test.ts`)**
1. Responsável cria pelo nome; co-facilitador não (`sem_permissao`); nome vazio ou com 31 letras (`dados_invalidos`).
2. Pendente pelo nome conta no teto de 5.
3. Definir e-mail: grava, conta troca, grava evento; o mesmo e-mail de novo não conta troca.
4. 4ª troca → `limite_convites`; 4º convite do mesmo e-mail em 24 h → `limite_convites`.
5. E-mail de membro do livro → `ja_membro`; e-mail de outro pendente do livro → `convite_duplicado`.
6. Convite vencido, cancelado, aceito ou antigo (sem nome) → `convite_invalido`.
7. Depois de definido, `aceitar_convite` só aceita a conta daquele e-mail (regra de P59 intacta); outra conta → `convite_invalido`.
8. `anon`, `authenticated` e `porta_autor` não executam nenhuma função `servico_*` nova; `authenticated` não lê `token_hash`.
9. `rls.test.ts` e `config-banco.test.ts` com as novidades.

**Unidade:** `nomeSeguro` no nome do convite; texto do WhatsApp; `mascararEmail`; montagem do estado da tela de convite (5 estados da tabela 4.2).

**E2E (styleguide):** convidar pelo nome → folha com WhatsApp; convite pede e-mail → pronto para entrar; com sessão → aceitar como; bem-vindo com as duas portas e destinos.

## 9. Ordem de entrega (sessão 2)

1. Mostrar o SQL (seção 7) e esperar o OK; aplicar; tipos só do que mudou em `lib/supabase/tipos.ts`.
2. Testes do banco.
3. `lib/convite` (estado da tela, texto do WhatsApp), ações `convidar`, `definirEmailDoConvite`, `aceitarPeloLink`, `abrirMinhaMensagem`, e-mail `emailConviteAceito`.
4. Telas e styleguide; gate de design.
5. Gate de fim de tarefa; conferir `/convite/{token}` e `/livro/{id}/bemvindo` no deploy de prévia.

## 10. Decisões novas para registrar depois do OK

- **P81** Convite pelo nome: o responsável digita só o nome e manda o link pelo WhatsApp; o convidado define o próprio e-mail no link (até 3 trocas antes de aceitar) e entra pelo Google ou por link; quem definir primeiro fica com o convite; o responsável recebe e-mail com o e-mail de quem entrou e pode remover. Substitui em parte P59 (o convite continua preso a um e-mail no aceite, mas quem define é o convidado).
- **P82** Aceitou o convite → *Boas-vindas* com duas portas: *Gravar uma conversa com {autor}* (principal) e *Deixar sua mensagem, em segredo* (abre o `/m`). Substitui em parte P79 item 2 (antes caía direto em *Gravar conversa*).
- **T59** `book_invites` ganha `nome`, `email_trocas`, `email_definido_em`; `email` vira opcional até o convidado defini-lo; funções `servico_criar_convite_nome`, `servico_pode_definir_email`, `servico_definir_email_convite`; `servico_ler_convite` devolve nome e trocas restantes.

## 11. Fora desta versão (anotado)

- Voltar do Google direto para o convite (precisa de `next` assinado no callback).
- Remover as funções de convite por e-mail que ficaram sem chamador.
- Medir o funil `convidou → convite_email_definido → convite_aceito → 1ª gravação` no admin.

## 12. Revisão

(preenchida depois dos revisores)
