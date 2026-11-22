# Convite pelo nome e boas-vindas com duas portas

Prompt avulso de 22/11/2026, pedido do Guilherme. Mexe em schema, RLS e link sem login: EGM em duas sessões (T28). **Aprovado pelo Guilherme em 22/11/2026**, com as recomendações da seção 3 e o risco da seção 6 aceito. Sessão 2 constrói a partir daqui. Versão 2, depois da revisão (seção 12).

Decisões novas propostas: **P81** (convite pelo nome, substitui em parte P59), **P82** (boas-vindas com duas portas, substitui em parte P79 item 2) e **T59** (schema). Ver seção 10.

## 1. Problema, hipótese e o que está em jogo

- **Problema:** para convidar um irmão, o responsável precisa saber o e-mail dele. Em família quase ninguém sabe o e-mail do outro; todo mundo tem o WhatsApp.
- **Hipótese:** convidar só com o nome e mandar o link pelo WhatsApp aumenta a taxa *convite enviado → aceito*. Quem recebe sabe o próprio Gmail.
- **Evidência hoje:** a dor do próprio Guilherme, sem observação de família. **Métrica:** `convidou` → `convite_email_definido` → `convite_aceito` → 1ª gravação do co-facilitador em 7 dias (`events`). **Critério de revisão:** se em 10 convites pelo nome menos da metade virar aceito, o atrito não era o e-mail.
- **O que está em jogo:** P59 prendeu o convite ao e-mail para que um link repassado no grupo não desse acesso a mais ninguém. Co-facilitador tem acesso total, inclusive ao capítulo surpresa (P21). Este design aceita um risco novo e limitado (seção 6).

**Restrição que molda o desenho:** o cadastro público está desligado (`shouldCreateUser: false`; `signup_disabled` em `app/auth/callback/route.ts`). Só entra quem tem conta criada pela Ecoa (`contaParaEmail`, `lib/acesso.ts`). Por isso o convidado **digita o próprio e-mail na página do convite**: o servidor cria a conta e prende o convite a esse e-mail. Daí em diante é o fluxo de P59 (login Google ou link por e-mail, `meus_convites`, `aceitar_convite`). O cadastro continua fechado.

## 2. Escopo

**Entra**
1. *Convidar* pede só o **nome** (até 30 letras). Nenhum e-mail sai da Ecoa nesse passo: o convite vai pelo WhatsApp do responsável (P9) ou por *Copiar mensagem*.
2. `/convite/{token}` sem sessão: "Oi, {nome}! {Quem} chamou você para o livro de {autor}." Campo *Seu e-mail do Google* → *Continuar* → *Entrar com Google* (e *Receber link por e-mail*).
3. **Primeiro a definir fica com o convite:** depois de definido, o e-mail só pode ser trocado no mesmo aparelho (cookie de dono), até 3 correções.
4. `/convite/{token}` com sessão: *Aceitar como {e-mail}*, em 1 toque e numa transação só.
5. Aceitou → **`/livro/{id}/bemvindo`**: *Gravar uma conversa com {autor}* (principal) e *Deixar sua mensagem sem que {autor} saiba* (secundária, abre o `/m`).
6. Sempre que o e-mail de um convite é definido, o responsável recebe: "{Nome} vai entrar no livro de {autor} como {e-mail}. Não é {nome}? Cancele o convite." *Quem ajuda* mostra o e-mail completo do pendente.
7. `/entrar?erro=sem_livro` ganha a dica: "Veio de um convite? Abra o link de novo e confira o e-mail."

**Fica de fora**
- Abrir o cadastro público.
- Aprovação do responsável antes de o convidado ver o livro (descartada pelo Guilherme).
- Voltar do Google direto para o convite (callback continua sem parâmetro de redirect; a home já mostra o convite por `meus_convites`).
- Limite por IP (o projeto não tem limitador por IP; o desenho não depende dele, ver seção 6).
- Convites antigos por e-mail: valem como estão; não ganham troca de e-mail nem cookie de dono.

## 3. Decisões que preciso de você

| # | Pergunta | Recomendação |
| --- | --- | --- |
| Q1 | Validade do link pelo nome | **7 dias**, igual hoje (`CONVITE_VALIDADE_DIAS`). |
| Q2 | Correções de e-mail | **3 correções** depois da primeira definição (`CONVITE_TROCAS_EMAIL`), só no aparelho que definiu. |
| Q3 | Campo de e-mail some de *Convidar*? | **Sim**, um campo só (nome). |
| Q4 | Aviso ao responsável | **Na definição do e-mail** (antes do acesso), não no aceite. Um e-mail por definição. |

## 4. Como funciona

### 4.1 Convidar (responsável)

1. *Quem ajuda* → *Convidar* → campo *Nome de quem vai ajudar* → *Criar convite*.
2. A ação `convidar` (`app/livro/[id]/pessoas/acoes.ts`) passa a receber `nome`. Rejeita (não conserta calada) quando `nomeSeguro(entrada) !== entrada.trim()` ou o resultado é vazio: "Use só letras no nome." Sorteia o `id`, deriva o token (`tokenDoLink("convite", id, versao)`) e chama `servico_criar_convite_nome`. Sem `contaParaEmail` e sem `enviarEmail`.
3. Devolve `ConviteDaTela` com `nome` e `email: null`. A folha mostra *Mandar no WhatsApp* (principal) e *Copiar mensagem*. Texto (`lib/convite/textos.ts`): "Oi, {nome}! Chamei você para me ajudar no livro de memórias de {autor}. Abra o link e entre com o seu Gmail: {url}. O link é só seu, não repasse no grupo."
4. Registra `convidou` com `{ convite_id }` (já existe).
5. *Quem ajuda*: pendente sem e-mail → "Maria · ainda não abriu o convite"; com e-mail → "Maria · fulana@gmail.com, ainda não entrou". `lib/livro/pessoas.ts` passa a selecionar `nome`; `ConviteDaTela.email` vira `string | null` e ganha `nome: string | null` (convites antigos mostram o e-mail, como hoje).

### 4.2 Abrir o link (convidado)

`/convite/{token}` mantém `noindex`, `no-referrer`, `no-store` e página dinâmica (T47). `servico_ler_convite(hash, dono_hash)` devolve `email` (só para o servidor; o cliente recebe só `mascararEmail`), `email_definido`, `nome`, `trocas_restantes` e `e_dono` (o cookie do aparelho confere). `ConviteLido` (`lib/convite/servidor.ts`) ganha esses campos; `emailConvidado` e `emailMascarado` viram `string | null`.

| Estado (`EstadoTelaConvite`) | Quando | Tela |
| --- | --- | --- |
| `invalido` | Inválido, vencido, cancelado ou aceito | "Este convite não vale mais. Peça um novo a quem convidou." (como hoje) |
| `pedir_email` | Sem sessão, pelo nome, sem e-mail | Campo *Seu e-mail do Google* + dica "É o e-mail que você usa no celular, sem +" → *Continuar* |
| `entrar` | Sem sessão, e-mail definido, este aparelho é o dono | "Pronto. Entre com b•••@gmail.com." + *Entrar com Google* + *Receber link por e-mail* + *Corrigir o e-mail* (se houver correção sobrando) |
| `em_uso` | Sem sessão, e-mail definido, outro aparelho | "Este convite já está com outra pessoa. Se era para você, peça um novo a {quem}." |
| `entrar_antigo` | Sem sessão, convite por e-mail (antigo) | Como hoje: *Entrar para aceitar* |
| `aceitar` | Com sessão; convite sem e-mail, com o e-mail da sessão, ou do dono deste aparelho com correção sobrando | *Aceitar como fulana@gmail.com* |
| `outro_email` | Com sessão e convite preso a outro e-mail, sem ser dono | Como hoje: "Este convite é para b•••@…. Saia e entre com esse e-mail." |

**Cookie de dono.** Na primeira definição, o servidor sorteia 128 bits, grava só o hash em `book_invites.dono_hash` e põe o valor num cookie `ecoa_convite_{convite_id}` (`httpOnly`, `Secure`, `SameSite=Lax`, `Path=/convite`, validade até `expira_em`). Correção de e-mail e aceite com troca exigem esse cookie. Só com o link, depois de definido, ninguém troca.

**`definirEmailDoConvite(token, email)`** (`app/convite/acoes.ts`, sem sessão):
1. zod no e-mail; hash do token; lê o cookie de dono, se houver.
2. `servico_pode_definir_email(hash, email, dono_hash)` (stable). Devolve `'definir' | 'mesmo' | 'ignorar'` ou lança `convite_invalido`, `convite_em_uso`, `limite_trocas_email`, `limite_convites`.
3. Se `'definir'`: `contaParaEmail(email)`. `recusada` → trata como `'ignorar'`.
4. Se `'definir'`: `servico_definir_email_convite(hash, email, dono_hash_novo_ou_atual)`. Falhou e a conta foi `criada` agora → `auth.admin.deleteUser`. Deu certo: grava o cookie (se for a primeira), manda o aviso ao responsável (4.4) e, se trocou, apaga a conta do e-mail anterior quando ela não tem `last_sign_in_at`, nem `book_members`, nem outro `book_invites` com aquele e-mail (melhor esforço).
5. `'mesmo'` e `'ignorar'` respondem igual a `'definir'`: "Pronto. Entre com b•••". Para `ja_membro` (o e-mail já está no livro) isso é exatamente o que a pessoa precisa: entrar.
6. *Receber link por e-mail* chama a ação de `/entrar` com o e-mail definido, lido no servidor pelo token (nunca o valor do formulário). Mesmos limites de `/entrar`.

**`aceitarPeloLink(token)`** (`app/convite/acoes.ts`, com sessão) chama **`definir_e_aceitar_convite(hash, dono_hash)`** (grant para `authenticated`): o e-mail vem de `auth.uid()` com `email_confirmed_at`, nunca de parâmetro; trava livro e convite; define (se vazio, ou se troca com dono válido) e aceita na mesma transação. Depois: aviso ao responsável se definiu agora (4.4) e `redirect` para `/livro/{id}/bemvindo`.

**Aceitar da home** (`aceitarConvite`, `app/convite/acoes.ts`): só muda o destino do `redirect`, de `/historias/gravar?bemvindo=1` para `/livro/{id}/bemvindo`.

### 4.3 Boas-vindas (`/livro/[id]/bemvindo`, membro)

- Título (`font-livro`): "Que bom ter você no livro de {autor}".
- **Principal:** *Gravar uma conversa com {autor}* → `/livro/{id}/historias/gravar?bemvindo=1` (a oferta da tela inicial de P79 continua lá).
- **Secundária:** *Deixar sua mensagem sem que {autor} saiba*. Form action `abrirMinhaMensagem(livro)` (`app/livro/[id]/bemvindo/acoes.ts`): `const r = await pegarLink(livro)` (`app/livro/[id]/mensagens/acoes.ts`, já deixa qualquer membro gerar o primeiro link, já grava `gerou_link_mensagem`); se falhar com `sem_permissao` (corrida com outro membro), relê com `linkDeMensagens`; `redirect(url)` fora de `try`. Nunca no render (`pegarLink` chama `revalidatePath`).
- Linha de apoio sob a secundária: "{Autor} só vê no livro impresso. Quem ajuda no livro pode ler."
- *Ver o livro* como link de texto no rodapé.
- Somente leitura (plano vencido): só *Ver o livro* (`pegarLink` devolveria `FECHADO`).

### 4.4 Aviso ao responsável

Sempre que `servico_definir_email_convite` ou `definir_e_aceitar_convite` **definem ou trocam** o e-mail, a ação manda `emailConviteDefinido` (`lib/email/modelos.ts`) ao responsável. O e-mail dele vem de `auth.admin.getUserById(criado_por)`; `criado_por` nulo → não manda (o convite já é inválido nesse caso, `convite_valido`). Assunto fixo "Alguém vai entrar no seu livro de memórias". Corpo: "{Nome do convite} vai entrar no livro de {autor} como {e-mail completo}. Não é {nome}? Cancele o convite em Quem ajuda." Botão para `/livro/{id}/pessoas`. Nomes por `nomeSeguro`. `idempotencyKey: convite-email-{id}-{email_trocas}`, para clique duplo não repetir. Falha no envio não desfaz nada: grava `erro_servidor` (T53). A lista *Quem ajuda* mostra o mesmo e-mail, então o aviso não é a única fonte.

### 4.5 Eventos (`lib/eventos-acoes.ts`)

- `convite_email_definido` `{ convite_id }`, só o banco grava (`ator_tipo = 'sistema'`), na definição e em cada troca.
- `convite_aceito`: `definir_e_aceitar_convite` grava como `aceitar_convite` já grava.
- `convidou`, `convite_cancelado`: sem mudança.

### 4.6 Erros (`lib/erros-banco.ts`)

| Código | Frase |
| --- | --- |
| `convite_em_uso` (novo) | "Este convite já está com outra pessoa. Peça um novo a quem convidou." |
| `limite_trocas_email` (novo) | "Você já corrigiu o e-mail 3 vezes. Peça um novo convite a quem convidou." |
| `convite_invalido`, `limite_convites`, `limite_cofacilitadores`, `dados_invalidos`, `livro_fechado` | Já existem |

`ja_membro` e o pendente duplicado deixam de ser erro no caminho do convidado (seção 6, oráculo). O teste de `lib/erros-banco.ts` confere que todo código lançado pelas funções novas tem frase.

## 5. Telas (gate de design)

- `pessoas-convidar` (folha só com o nome), `pessoas` com pendente pelo nome (sem e-mail e com e-mail).
- `convite-pedir-email`, `convite-entrar`, `convite-em-uso`, `convite-aceitar`.
- `bemvindo` e `bemvindo-leitura`.
- `entrar` com `erro=sem_livro` (dica nova).
- Régua: uma ação principal por tela; 390/768/1440; dica de 1 linha só em `convite-pedir-email`.

## 6. Segurança

| Ameaça | Defesa |
| --- | --- |
| **Link repassado no grupo (risco novo, aceito pelo Guilherme em 22/11/2026)** | Quem definir o e-mail primeiro fica com o convite; depois disso, só o aparelho dono troca (cookie com hash no banco). Contenção: aviso ao responsável **antes** do acesso, com o e-mail completo; *Quem ajuda* mostra o mesmo e-mail; cancelar (P60) ou remover desligam tudo na próxima requisição; o texto do WhatsApp diz "não repasse". **Janela de exposição:** entre o aceite indevido e a remoção, a pessoa vê histórias e mensagens |
| Sequestro depois da definição | Fechado pelo cookie de dono: sem ele, `convite_em_uso` |
| Aceite de convite pelo nome ainda sem e-mail | `aceitar_convite` passa a usar `i.email is distinct from v_email` (hoje, com e-mail nulo, o `<>` dá NULL e só a constraint salvaria). Testado |
| Aceite com sessão não atômico | `definir_e_aceitar_convite` numa transação, e-mail tirado de `auth.uid()`, nunca de parâmetro |
| Oráculo de contas e de membros | `'definir'`, `'mesmo'` e `'ignorar'` (`ja_membro`, conta `recusada`) dão a mesma resposta. O pendente do mesmo e-mail no mesmo livro é revogado (o mais novo vale), sem erro. Sobra `limite_convites` por e-mail em 24 h: aceito (revela só que o e-mail foi usado 3 vezes hoje) |
| Sondagem sem limite | Como as respostas não dependem do e-mail, sondar não revela nada; por isso o desenho dispensa limite por IP |
| Fábrica de contas pelo link | Conta só depois da pré-checagem; 1 definição + 3 correções por convite, só no aparelho dono; 3 definições por e-mail em 24 h (`email_definido_em`, melhor esforço entre livros, sem trava global); 10 convites por livro e por responsável em 24 h. Conta do e-mail corrigido é apagada se nunca entrou e não tem livro nem convite. Restantes: risco já aceito até o prompt 15 |
| Corrida na criação da conta | Duas definições simultâneas do mesmo e-mail: a função trava livro e convite; `deleteUser` só roda se nenhum convite aponta para o e-mail. Aceito como melhor esforço |
| Funções antigas por e-mail | `servico_pode_convidar` e `servico_criar_convite` perdem o grant de `service_role` nesta migration (a reversão devolve). `conferir_convite` (com `<>` frágil para e-mail nulo) fica sem chamador |
| Token na URL | 132 bits, só o hash no banco (T6, T25); `no-store`, `no-referrer`; o token nunca vai para o callback do Google |
| Nome de pessoa na URL | Não: o nome só sai na página, vindo do banco; o cookie usa o `convite_id` |
| E-mail cru no cliente | `servico_ler_convite` é só do servidor; a página passa ao cliente só `mascararEmail`. Teste do estado da tela confere |
| Gmail com ponto ou `+alias` | Dica no campo; `sem_livro` orienta a voltar ao convite; o dono corrige o e-mail |
| Teto de 5 | Pendente pelo nome conta no teto; vários pendentes sem e-mail por livro são possíveis, contidos pelo teto e pelos 10 por dia. `definir_e_aceitar_convite` confere o teto de novo com o livro travado |
| Autor | `porta_autor` não ganha grant; `/bemvindo` exige membro; `/m` continua só de escrita (P65), com `no-referrer` |
| Responsável antigo | `convite_valido` continua exigindo que quem convidou ainda seja o responsável |

## 7. SQL

- Subida: `supabase/migrations/20261202120000_convite_pelo_nome.sql` (conferir na sessão 2 que é a mais nova).
- Reversão: `supabase/reversao/20261202120000_convite_pelo_nome.down.sql`. Reverter o app antes do banco.
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
  add column dono_hash text check (dono_hash is null or dono_hash ~ '^[0-9a-f]{64}$'),
  add constraint book_invites_quem check (email is not null or nome is not null),
  add constraint book_invites_aceito_com_email check (aceito_em is null or email is not null);
create index book_invites_email_definido on public.book_invites (email, email_definido_em desc)
  where email_definido_em is not null;

-- O responsável lê nome e quando foi definido; dono_hash e email_trocas, nunca.
grant select (nome, email_definido_em) on public.book_invites to authenticated;

create function privado.convite_trocas_email() returns smallint
language sql immutable set search_path = '' as $$ select 3::smallint $$;

-- 2. Aceitar: e-mail nulo não pode passar (antes, `<>` com NULL não disparava).
create or replace function public.aceitar_convite(p_convite uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  i record;
  v_email text;
begin
  select lower(u.email) into v_email from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'sem_permissao'; end if;
  select * into i from public.book_invites x where x.id = p_convite;
  if i.id is null or i.email is distinct from v_email then raise exception 'convite_invalido'; end if;
  perform 1 from public.books b where b.id = i.book_id for update;
  select * into i from public.book_invites x where x.id = p_convite for update;
  if i.email is distinct from v_email then raise exception 'convite_invalido'; end if;
  if i.aceito_em is not null and i.aceito_por = (select auth.uid()) then return i.book_id; end if;
  if not privado.convite_valido(i.id) then raise exception 'convite_invalido'; end if;
  if not privado.livro_editavel(i.book_id) then raise exception 'livro_fechado'; end if;
  if not exists (select 1 from public.book_members m
                 where m.book_id = i.book_id and m.user_id = (select auth.uid())) then
    if (select count(*) from public.book_members m
        where m.book_id = i.book_id and m.papel = 'cofacilitador') >= privado.max_cofacilitadores() then
      raise exception 'limite_cofacilitadores';
    end if;
    insert into public.book_members (book_id, user_id, papel)
    values (i.book_id, (select auth.uid()), 'cofacilitador');
    insert into public.events (book_id, ator_tipo, ator_id, acao, detalhes)
    values (i.book_id, 'cofacilitador', (select auth.uid()), 'convite_aceito',
            jsonb_build_object('convite_id', i.id));
  end if;
  update public.book_invites set aceito_em = now(), aceito_por = (select auth.uid()) where id = i.id;
  return i.book_id;
end $$;

-- 3. Criar pelo nome: as regras de conferir_convite sem as do e-mail.
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

-- 4. O convidado define (ou corrige) o próprio e-mail.
-- Devolve 'definir' | 'mesmo' | 'ignorar'; 'ignorar' cobre quem já está no livro.
create function privado.conferir_email_convite(p_convite uuid, p_email text, p_dono_hash text)
returns text language plpgsql stable security definer set search_path = '' as $$
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
  if i.email = p_email then return 'mesmo'; end if;
  if i.email is not null then  -- correção: só o aparelho dono, até o limite
    if p_dono_hash is null or i.dono_hash is distinct from p_dono_hash then
      raise exception 'convite_em_uso';
    end if;
    if i.email_trocas >= privado.convite_trocas_email() then raise exception 'limite_trocas_email'; end if;
  end if;
  if exists (select 1 from public.book_members m join auth.users u on u.id = m.user_id
             where m.book_id = i.book_id and lower(u.email) = p_email) then
    return 'ignorar';
  end if;
  if (select count(*) from public.book_invites x
      where x.email = p_email and x.email_definido_em > now() - interval '24 hours')
     >= privado.max_convites_por_email_dia() then
    raise exception 'limite_convites';
  end if;
  return 'definir';
end $$;

create function public.servico_pode_definir_email(p_token_hash text, p_email text, p_dono_hash text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'convite_invalido'; end if;
  select x.id into v_id from public.book_invites x where x.token_hash = p_token_hash;
  return privado.conferir_email_convite(v_id, lower(btrim(p_email)), p_dono_hash);
end $$;

-- Grava o e-mail. Na primeira definição, p_dono_hash vira o dono; nas correções, tem de bater.
create function privado.gravar_email_convite(p_convite uuid, p_email text, p_dono_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  i public.book_invites;
  v_r text;
begin
  select * into i from public.book_invites x where x.id = p_convite;
  v_r := privado.conferir_email_convite(i.id, p_email, p_dono_hash);
  if v_r <> 'definir' then return v_r; end if;
  -- O pendente mais antigo do mesmo e-mail no mesmo livro cai: vale o mais novo.
  update public.book_invites set revogado_em = now()
  where book_id = i.book_id and id <> i.id and email = p_email and aceito_em is null and revogado_em is null;
  update public.book_invites
  set email = p_email,
      email_definido_em = now(),
      email_trocas = email_trocas + case when i.email is null then 0 else 1 end,
      dono_hash = coalesce(i.dono_hash, p_dono_hash)
  where id = i.id;
  insert into public.events (book_id, ator_tipo, ator_id, acao, detalhes)
  values (i.book_id, 'sistema', null, 'convite_email_definido', jsonb_build_object('convite_id', i.id));
  return 'definir';
end $$;

create function public.servico_definir_email_convite(p_token_hash text, p_email text, p_dono_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  i public.book_invites;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'convite_invalido'; end if;
  if p_dono_hash is null or p_dono_hash !~ '^[0-9a-f]{64}$' then raise exception 'dados_invalidos'; end if;
  select * into i from public.book_invites x where x.token_hash = p_token_hash;
  if i.id is null then raise exception 'convite_invalido'; end if;
  perform 1 from public.books b where b.id = i.book_id for update;
  perform 1 from public.book_invites x where x.id = i.id for update;
  return privado.gravar_email_convite(i.id, lower(btrim(p_email)), p_dono_hash);
end $$;

-- 5. Com sessão: define (se preciso) e aceita na mesma transação. O e-mail vem da sessão.
create function public.definir_e_aceitar_convite(p_token_hash text, p_dono_hash text default null)
returns table (livro_id uuid, definiu boolean)  -- sem `book_id`: OUT params colidem com colunas
language plpgsql security definer set search_path = '' as $$
declare
  i public.book_invites;
  v_email text;
  v_r text;
begin
  select lower(u.email) into v_email from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'sem_permissao'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'convite_invalido'; end if;
  select * into i from public.book_invites x where x.token_hash = p_token_hash;
  if i.id is null then raise exception 'convite_invalido'; end if;
  perform 1 from public.books b where b.id = i.book_id for update;
  perform 1 from public.book_invites x where x.id = i.id for update;
  v_r := 'mesmo';
  if i.nome is not null and i.email is distinct from v_email then
    v_r := privado.gravar_email_convite(i.id, v_email, p_dono_hash);
    if v_r = 'ignorar' then  -- já é membro: nada a aceitar
      return query select i.book_id, false;
      return;
    end if;
  end if;
  return query select public.aceitar_convite(i.id), v_r = 'definir';
end $$;

-- 6. Leitura da página: muda o retorno, então drop e create.
drop function public.servico_ler_convite(text);
create function public.servico_ler_convite(p_token_hash text, p_dono_hash text default null)
returns table (convite_id uuid, book_id uuid, email text, nome text, autor text, criado_por uuid,
               estado text, email_definido boolean, trocas_restantes smallint, e_dono boolean)
language sql stable security definer set search_path = '' as $$
  select i.id, i.book_id, i.email, i.nome, coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome),
         i.criado_por,
         case when i.aceito_em is not null then 'aceito'
              when privado.convite_valido(i.id) then 'pendente'
              else 'vencido' end,
         i.email is not null,
         greatest(privado.convite_trocas_email() - i.email_trocas, 0)::smallint,
         i.dono_hash is not null and p_dono_hash is not null and i.dono_hash = p_dono_hash
  from public.book_invites i join public.books b on b.id = i.book_id
  where p_token_hash ~ '^[0-9a-f]{64}$' and i.token_hash = p_token_hash
$$;

-- 7. Privilégios
revoke all on function privado.convite_trocas_email(), privado.conferir_convite_nome(uuid, uuid, text),
  privado.conferir_email_convite(uuid, text, text), privado.gravar_email_convite(uuid, text, text)
from public, anon, authenticated;
revoke all on function public.servico_criar_convite_nome(uuid, uuid, uuid, text, text, smallint),
  public.servico_pode_definir_email(text, text, text), public.servico_definir_email_convite(text, text, text),
  public.servico_ler_convite(text, text), public.definir_e_aceitar_convite(text, text)
from public, anon, authenticated;
grant execute on function public.servico_criar_convite_nome(uuid, uuid, uuid, text, text, smallint),
  public.servico_pode_definir_email(text, text, text), public.servico_definir_email_convite(text, text, text),
  public.servico_ler_convite(text, text)
to service_role;
grant execute on function public.definir_e_aceitar_convite(text, text) to authenticated;
-- Convite por e-mail pelo responsável sai de uso (P81).
revoke execute on function public.servico_pode_convidar(uuid, uuid, text),
  public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint)
from service_role;
```

`aceitar_convite` é `security definer` e chamado por dentro de `definir_e_aceitar_convite`: `auth.uid()` continua sendo o da sessão, e os `for update` são reentrantes na mesma transação.

### Reversão

```sql
-- Reverter o app antes. Apaga os convites pelo nome que não chegaram a ter e-mail
-- (pendentes, vencidos ou cancelados); os aceitos ficam, sem o nome.
grant execute on function public.servico_pode_convidar(uuid, uuid, text),
  public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint)
to service_role;

drop function public.servico_ler_convite(text, text);
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

drop function public.definir_e_aceitar_convite(text, text);
drop function public.servico_definir_email_convite(text, text, text);
drop function privado.gravar_email_convite(uuid, text, text);
drop function public.servico_pode_definir_email(text, text, text);
drop function privado.conferir_email_convite(uuid, text, text);
drop function public.servico_criar_convite_nome(uuid, uuid, uuid, text, text, smallint);
drop function privado.conferir_convite_nome(uuid, uuid, text);
drop function privado.convite_trocas_email();

-- aceitar_convite volta ao texto de 20261121120000_cofacilitadores.sql (copiar na sessão 2, com `<>`).

delete from public.events where acao = 'convite_email_definido';
delete from public.book_invites where email is null;
drop index public.book_invites_email_definido;
revoke select (nome, email_definido_em) on public.book_invites from authenticated;
alter table public.book_invites
  drop constraint book_invites_aceito_com_email,
  drop constraint book_invites_quem,
  drop column dono_hash,
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
1. Responsável cria pelo nome; co-facilitador não (`sem_permissao`); nome vazio, com espaço nas pontas ou com 31 letras → `dados_invalidos`.
2. Pendente pelo nome conta no teto de 5.
3. Primeira definição: grava e-mail, `dono_hash` e evento; `email_trocas` continua 0. O mesmo e-mail de novo → `'mesmo'`, nada muda.
4. Correção sem o dono → `convite_em_uso`; com o dono, 3 correções passam e a 4ª → `limite_trocas_email`.
5. 4ª definição do mesmo e-mail em 24 h → `limite_convites`.
6. E-mail de quem já é membro → `'ignorar'`, nada gravado. Outro pendente do mesmo e-mail no livro → o antigo é revogado.
7. Convite vencido, cancelado, aceito ou antigo (sem nome) → `convite_invalido`.
8. `aceitar_convite` de convite pelo nome **sem e-mail** → `convite_invalido`; depois de definido, outra conta → `convite_invalido`; a conta certa entra.
9. `definir_e_aceitar_convite`: define e aceita de uma vez; com e-mail de outro e sem dono → `convite_em_uso`; já membro → devolve o livro sem duplicar; teto de 5 conferido.
10. `anon`, `authenticated` e `porta_autor` não executam nenhuma `servico_*` nova; `authenticated` não lê `token_hash`, `dono_hash` nem `email_trocas`; `service_role` não executa mais `servico_criar_convite`.
11. `rls.test.ts`, `config-banco.test.ts` e o teste de frases de `lib/erros-banco.ts` com as novidades.

**Unidade:** nome do convite (rejeita o que `nomeSeguro` mudaria); texto do WhatsApp; estado da tela de convite (7 estados da tabela 4.2, e-mail cru nunca no estado do cliente); `ConviteDaTela` com e sem e-mail.

**E2E (styleguide):** convidar pelo nome → folha com WhatsApp; pedir e-mail → entrar; em uso; com sessão → aceitar como; bem-vindo com as duas portas e destinos; `/entrar?erro=sem_livro` com a dica.

## 9. Ordem de entrega (sessão 2)

1. Mostrar o SQL (seção 7) e esperar o OK; aplicar; regenerar os tipos e acrescentar em `lib/supabase/tipos.ts` só o que mudou (`book_invites`, funções novas, `servico_ler_convite`).
2. Testes do banco.
3. Código (Criar / Modificar):
   - **Modificar** `lib/config.ts` (`CONVITE_TROCAS_EMAIL`), `lib/erros-banco.ts` (4.6), `lib/eventos-acoes.ts` (`convite_email_definido`, só o banco grava), `lib/convite/textos.ts` (texto do WhatsApp, validação do nome), `lib/convite/servidor.ts` (`ConviteLido`), `lib/livro/pessoas.ts` e `lib/livro/tipos.ts` (`ConviteDaTela`), `app/livro/[id]/pessoas/acoes.ts` (`convidar` pelo nome), `app/convite/acoes.ts` (`definirEmailDoConvite`, `aceitarPeloLink`, destino de `aceitarConvite`), `app/convite/[token]/page.tsx` e `components/telas/tela-convite` (`EstadoTelaConvite`), `components/telas/tela-pessoas.tsx`, `lib/email/modelos.ts` (`emailConviteDefinido`), `app/entrar` (dica de `sem_livro`).
   - **Criar** `app/livro/[id]/bemvindo/page.tsx`, `app/livro/[id]/bemvindo/acoes.ts`, `components/telas/tela-bemvindo.tsx`.
   - Atualizar `docs/mapa.md` (rota `/livro/[id]/bemvindo`).
4. Telas e styleguide; gate de design.
5. Gate de fim de tarefa; conferir `/convite/{token}` e `/livro/{id}/bemvindo` no deploy de prévia.

## 10. Decisões novas para registrar depois do OK

- **P81** Convite pelo nome: o responsável digita só o nome e manda o link pelo WhatsApp; o convidado define o próprio e-mail no link e entra pelo Google ou por link; quem define primeiro fica com o convite, e só o mesmo aparelho corrige o e-mail (até 3 vezes); o responsável recebe e-mail com o e-mail definido antes do acesso e pode cancelar ou remover. Substitui em parte P59 (o aceite continua preso a um e-mail, mas quem o define é o convidado).
- **P82** Aceitou o convite → *Boas-vindas* com duas portas: *Gravar uma conversa com {autor}* (principal) e *Deixar sua mensagem sem que {autor} saiba* (abre o `/m`). Substitui em parte P79 item 2.
- **T59** `book_invites` ganha `nome`, `email_trocas`, `email_definido_em`, `dono_hash`; `email` opcional até o convidado defini-lo; `aceitar_convite` com `is distinct from`; funções `servico_criar_convite_nome`, `servico_pode_definir_email`, `servico_definir_email_convite`, `definir_e_aceitar_convite`; `servico_ler_convite(hash, dono)`; convite por e-mail sai de uso.

## 11. Fora desta versão (anotado)

- Voltar do Google direto para o convite (precisa de `next` assinado no callback).
- Apagar as funções de convite por e-mail sem chamador.
- Funil `convidou → convite_email_definido → convite_aceito → 1ª gravação` no admin.
- Limite por IP nas ações sem login.

## 12. Revisão

Uma rodada, dois revisores em Sonnet (T28). Os dois disseram "não aprovar ainda". Tudo que bloqueava foi corrigido nesta versão.

### Segurança (`egm:egm-design`)

| # | Achado | O que mudou |
| --- | --- | --- |
| 1 | Bloqueia: vencia o último a definir, não o primeiro | Cookie de dono com hash no banco; correção só no aparelho dono (`convite_em_uso`) |
| 2 | `aceitar_convite` deixava passar e-mail nulo | `is distinct from`, conferido também depois do `for update`; teste 8 |
| 3 | Aviso tarde, só no aceite, e por um caminho só | Aviso na definição (antes do acesso), nos dois caminhos, com `idempotencyKey`; *Quem ajuda* mostra o e-mail |
| 4 | Bloqueia: reversão falhava com convite cancelado | `delete from book_invites where email is null` antes do `NOT NULL`; `events` não tem trava de delete (conferido) |
| 5 | Oráculos (`ja_membro`, duplicado, recusada) e sondagem | Mesma resposta para os três; duplicado revoga o antigo; sondar não revela nada |
| 6 | Contas órfãs e corrida | Conta do e-mail corrigido apagada se nunca usada; corrida assumida como melhor esforço |
| 7 | Funções antigas vivas com `<>` frágil; duplicado vencido | Grant de `service_role` revogado; revogação do pendente antigo ao definir |
| 8 | Aceite com sessão em duas chamadas e e-mail por parâmetro | `definir_e_aceitar_convite` atômica, e-mail de `auth.uid()` |
| 9 | Contrato de `servico_ler_convite` contraditório | Alinhado: `email` (só servidor), `email_definido`, `trocas_restantes`, `e_dono` |
| 10 | Off-by-one nas trocas | Primeira definição não conta; 3 correções de verdade |
| 11 | Gmail com ponto ou `+alias` | Dica no campo e em `sem_livro` |
| 12 | `revoke` só de `public` nas `privado.*`; "em segredo" enganoso | Revoke de `public, anon, authenticated`; texto "sem que {autor} saiba" + "Quem ajuda no livro pode ler" |

### Código (`egm:egm-codebase-details`)

| # | Achado | O que mudou |
| --- | --- | --- |
| 1 | Bloqueia: igual ao 2 da segurança | Idem |
| 2 | Bloqueia: igual ao 4 da segurança | Idem |
| 3 | Contrato da leitura | Idem ao 9 |
| 4 | Tipos e consumidores quebram com e-mail nulo | Lista de arquivos na seção 9; `ConviteLido` e `ConviteDaTela` nulos |
| 5 | Frases de erro faltando ou enganosas | Seção 4.6: `convite_em_uso`, `limite_trocas_email`; `ja_membro` e duplicado saem do caminho do convidado |
| 6 | Contagem de trocas ambígua; teto por e-mail mudou de coluna | Corrigido; `email_definido_em` declarado na seção 6 |
| 7 | Reaproveitar `pegarLink` | Seção 4.3: `pegarLink` + releitura na corrida, `redirect` fora de `try`, form action |
| 8 | Destino do aceite, `email_confirmed_at`, aviso duplicado, e-mail do responsável | Seções 4.2 e 4.4 |
| 9 | Assinatura de `convidar` e `nomeSeguro` que conserta calado | Seção 4.1: rejeita se mudaria |
| 10 | Evento em `lib/eventos-acoes.ts` | Seção 9 |
| 11 | Tela depois de `recusada` | Trata como `'ignorar'`: "Entre com…"; o login dá `sem_livro` com a dica nova |
| 12 | Timestamp da migration; pendentes sem e-mail | Conferir na sessão 2; seção 6 (teto) |
