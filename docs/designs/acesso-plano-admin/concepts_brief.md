# Acesso, plano, admin e registro de uso

- **Autor:** Guilherme Eller (com Claude)
- **Data:** 2026-11-09

## Visão geral

Primeiro corte da plataforma com banco e login (prompt 3 do PRD). Na onda 1 o pagamento é Pix manual: a Ecoa confirma o Pix e ativa o plano no `/admin`. Ativar cria o livro, cria o responsável e manda o e-mail de acesso. O responsável entra com Google (ou link por e-mail) e vê a home vazia do livro. Desde o primeiro dia, toda ação relevante vira uma linha em `events`, para responder "quem acessou o livro X ontem e o que fez".

Quem usa: a Ecoa (admin, 1 pessoa) e o responsável (filho ou filha que comprou). Escala da onda 1: 2 famílias até 20/12; da onda 2: dezenas de livros.

## Análise

- **O maior risco não está aqui.** O PRD ordena os prompts por risco, e o risco central (qualidade do texto da IA, prompt 1) ainda não foi testado. Este prompt é infraestrutura conhecida. Não deve consumir mais de 1 sessão.
- **Furo de segurança óbvio a fechar:** se a tabela `books` aceitar `update` do responsável sem restrição de coluna, ele estende o próprio plano pela API pública do Supabase. Decisão: colunas do plano só mudam pelo servidor (permissão por coluna + funções que só a chave secreta executa).
- **O job diário pode atrasar ou falhar.** Por isso o bloqueio de escrita não depende só do estado gravado: a regra `livro_editavel` também compara `plano_vence_em` com a hora atual. O job serve para o estado ficar visível e para registrar o evento.
- **E-mail de acesso que expira é um problema real.** Link mágico vale 1 hora; o responsável pode abrir o e-mail no dia seguinte. Decisão: o botão principal do e-mail leva a `/entrar` (não expira); o link mágico é a alternativa.
- **Testes de RLS sem Docker.** O container e a máquina do Guilherme não precisam de Docker: PGlite (Postgres em WebAssembly) roda as migrations reais com um shim do schema `auth`.

## Objetivos e não objetivos

**No escopo**
- Projeto Supabase em sa-east-1, migrations de `books`, `book_members`, `author_access`, `events`, com RLS e reversão.
- Login com Google e link mágico (e-mail pelo Resend, domínio `ecoa-memorias.com.br`).
- Estados `pendente`, `ativo`, `somente_leitura`, job diário (pg_cron).
- `/admin`: listar, ativar, renovar, reenviar acesso.
- `registrarEvento` único.
- Testes de RLS entre livros.

**Fora do escopo**
- Co-facilitadores (convite, limite de 3): onda 2, prompt 11.
- Uso real do link do autor: prompt 5 (aqui só a tabela e o hash).
- Painel de aderência: prompt 15.
- Mercado Pago: prompt 14.
- Design system completo: prompt 2.

## Alternativas pesadas

- **Vercel Cron para o job diário.** Rejeitada pelo autor: exige rota pública protegida por segredo e mais uma variável; o pg_cron roda dentro do banco, sem rede.
- **Fila (Trigger.dev) para o job.** Rejeitada pelo autor: a fila ainda aguarda OK e só entra no prompt 6.
- **E-mails de login pelo SMTP do Supabase configurado com Resend.** Rejeitada pelo autor: o texto do e-mail ficaria no painel do Supabase, fora do código e do Git; gerar o link com `generateLink` e enviar pelo Resend deixa tudo versionado.
- **Testes de RLS contra o projeto Supabase real.** Rejeitada pelo autor: dependem de rede e segredos; `npm test` precisa rodar em qualquer máquina.
- **Supabase CLI local (Docker).** Rejeitada pelo autor: pesado para 4 tabelas e indisponível neste ambiente.
- **Papel de admin em tabela própria.** Rejeitada pelo autor: `app_metadata.role` já vem no token, não é editável pelo usuário e evita uma consulta por requisição.

## Decisões levadas ao draft

1. Domínio oficial `ecoa-memorias.com.br` (já verificado no Resend); remetente `acesso@ecoa-memorias.com.br`.
2. Projeto novo `ecoa-plataforma` em sa-east-1, chaves novas (`sb_publishable_…`, `sb_secret_…`).
3. Renovar soma 12 meses a partir do maior entre hoje e o vencimento atual.
4. Ativar e renovar são funções SQL atômicas executáveis só com a chave secreta.
5. `registrarEvento` é o único caminho de escrita de eventos no app; exceção documentada: o job do banco.
6. Cadastro aberto continua ligado; quem entra sem livro vê "Seu acesso ainda não foi ativado".
7. Aceite no preview da Vercel, no celular.
