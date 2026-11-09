# Configuração: Supabase, Google, Resend e Vercel

Guia do prompt 3. Leva uns 30 minutos, na ordem abaixo. Nada aqui pede segredo no chat: chaves vão só no painel de cada serviço e no `.env.local`.

**Já feito pelo Claude:**
- Projeto Supabase `ecoa-plataforma`, região São Paulo (sa-east-1), ref `dhmjaeauhzfniqncmiof`.
- As 2 migrations aplicadas, o job diário `vencer-passes` agendado e o advisor de segurança sem alertas.

URL do projeto: `https://dhmjaeauhzfniqncmiof.supabase.co`

---

## 1. Vercel: criar o projeto

A integração da Vercel com o GitHub ainda não enxerga este repositório, então este passo é manual.

1. Em vercel.com, **Add New → Project**.
2. Em "Import Git Repository", clique em **Adjust GitHub App Permissions** e libere o repositório `guilherme-eller8/ecoa-plataforma`.
3. Importe com o nome **`ecoa-plataforma`**. O framework é detectado como Next.js; não mude nada no build.
4. Antes de clicar em Deploy, abra **Environment Variables** e cadastre estas 4, marcando **Production** e **Preview**:

| Nome | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dhmjaeauhzfniqncmiof.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API Keys → aba "Publishable and secret API keys" → `default` (começa com `sb_publishable_`) |
| `SUPABASE_SECRET_KEY` | mesma tela → **Secret keys** → crie uma chamada `vercel` (começa com `sb_secret_`). Nunca no chat, nunca com `NEXT_PUBLIC_` |
| `RESEND_API_KEY` | do passo 3 abaixo (chave `app-plataforma`) |

5. Deploy. Depois, em **Deployments**, abra o deploy do branch `claude/gracious-hypatia-1rdyrv` e copie o domínio que termina em `.vercel.app` (ex.: `ecoa-plataforma-git-claude-…-guilhermeeller7-gmailcoms-projects.vercel.app`). Ele é a **URL do preview** usada nos passos seguintes.

> O preview fica atrás do login da Vercel (Deployment Protection). No celular, entre na Vercel uma vez no mesmo navegador.

## 2. Google Cloud: credencial de login

1. Em console.cloud.google.com, crie o projeto **Ecoa Plataforma**.
2. **APIs e serviços → Tela de consentimento OAuth**:
   - tipo **Externo**;
   - nome do app: **Ecoa Memórias**;
   - e-mail de suporte: o seu;
   - domínio autorizado: `supabase.co`;
   - escopos: só os padrões (`email`, `profile`, `openid`).
   - Publique o app ("Em produção"): em teste, só e-mails cadastrados conseguem entrar.
3. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**:
   - nome: `Supabase ecoa-plataforma`;
   - **URIs de redirecionamento autorizados:** `https://dhmjaeauhzfniqncmiof.supabase.co/auth/v1/callback`.
4. Copie o **Client ID** e o **Client Secret**. Eles vão direto no Supabase, no passo 4.

Ative a **verificação em 2 etapas** na sua conta Google. Ela é a conta de admin, que vê o e-mail de todas as famílias.

## 3. Resend: chaves

O domínio `ecoa-memorias.com.br` já está verificado. Em resend.com → **API Keys**, crie duas chaves com permissão **Sending access**, restritas ao domínio `ecoa-memorias.com.br`:

- `app-plataforma`: vai na Vercel e no `.env.local` (e-mail de acesso que o admin dispara).
- `supabase-smtp`: vai no SMTP do Supabase (e-mail de link de entrada).

Duas chaves para poder trocar uma sem derrubar a outra.

## 4. Supabase: Auth

No painel do projeto `ecoa-plataforma`:

### 4.1 Cadastro fechado
**Authentication → Sign In / Providers:**
- **Allow new users to sign up: desligado.** Só o admin cria contas. Isso fecha o golpe de alguém criar `ana@…` antes do passe ser ativado.
- **Email:** ligado. **Confirm email:** ligado.
- **Google:** ligado. Cole o Client ID e o Client Secret do passo 2.

### 4.2 URLs
**Authentication → URL Configuration:**
- **Site URL:** `https://app.ecoa-memorias.com.br` (até o domínio apontar, use a URL do preview).
- **Redirect URLs**, só estas 3 e sem curinga de domínio:
  - `http://localhost:3000/**`
  - `https://app.ecoa-memorias.com.br/**`
  - `https://<URL do preview>/**`

> Não use `https://*.vercel.app/**`: aceitaria o site de qualquer pessoa na Vercel, e um atacante desviaria o login para lá.

### 4.3 SMTP pelo Resend
**Authentication → Emails → SMTP Settings → Enable custom SMTP:**

| Campo | Valor |
| --- | --- |
| Sender email | `acesso@ecoa-memorias.com.br` |
| Sender name | `Ecoa Memórias` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a chave `supabase-smtp` do Resend |

Em **Authentication → Rate Limits**, deixe os limites de e-mail no padrão. Eles seguram quem tentar disparar e-mails em massa.

### 4.4 Modelo do e-mail "Magic Link"
**Authentication → Emails → Templates → Magic Link:**

**Subject:** `Seu link para entrar na Ecoa`

**Body:**

```html
<div style="background:#f5efe4;padding:40px 20px;font-family:Georgia,serif;color:#26211d;">
  <div style="max-width:480px;margin:0 auto;">
    <p style="font-size:26px;line-height:1.3;margin:0 0 16px;">Entre no seu livro.</p>
    <p style="font-size:18px;line-height:1.5;margin:0 0 28px;">Toque no botão para entrar. O link vale 1 hora.</p>
    <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email"
       style="display:inline-block;background:#1f3d33;color:#fffdf8;font-family:Arial,sans-serif;font-size:17px;text-decoration:none;padding:16px 28px;border-radius:999px;">Entrar</a>
    <p style="font-size:14px;line-height:1.5;color:#6e6259;margin:32px 0 0;">Se você não pediu este link, ignore este e-mail.<br>Ecoa Memórias</p>
  </div>
</div>
```

O link leva para `/auth/confirmar`, que mostra um botão *Entrar*. Só o toque usa o link, então os antivírus de e-mail que abrem links sozinhos não o gastam.

### 4.5 Validade do link
**Authentication → Sign In / Providers → Email → Email OTP Expiration:** `3600` (1 hora).

## 5. Sua conta de admin

1. **Authentication → Users → Add user → Create new user:**
   - e-mail: `guilherme.eller7@gmail.com`;
   - **Auto Confirm User** marcado;
   - sem senha.
2. No **SQL Editor**, rode o comando abaixo (ou peça ao Claude para rodar):

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where email = 'guilherme.eller7@gmail.com';
```

3. Entre pela URL do preview com Google. O papel de admin vale a partir desse login. Se já estava logado, saia e entre de novo.

## 6. Rodar no computador (opcional)

Copie `.env.example` para `.env.local`, preencha as mesmas 4 variáveis do passo 1 e rode `npm run dev`. Os testes (`npm test`) não precisam de nada disso: usam um banco em memória.

## 7. Aceite no celular

1. Abra `https://<URL do preview>/admin` e entre com Google.
2. **Ativar passe** com um e-mail seu que não seja o de admin, de preferência um Gmail, e "Jair" como autor. Confirme.
3. O e-mail "O livro do Jair está pronto para começar" chega. Toque em **Abrir meu livro**, depois em **Entrar com Google**, com essa conta.
4. Aparece "O livro do Jair", com o estado vazio.
5. Teste negativo: em outra aba anônima, entre com um Google que ninguém cadastrou. Deve voltar com "Este e-mail ainda não tem um livro."

Depois, rode a consulta da seção 8 e confira o evento `entrou`.

## 8. SQL de manutenção

**Quem acessou o livro X ontem (M10):**

```sql
select e.criado_em at time zone 'America/Sao_Paulo' as quando, e.ator_tipo, u.email, e.acao
from public.events e
left join auth.users u on u.id = e.ator_id
where e.book_id = '<id do livro>'
  and e.criado_em >= (current_date - 1)::timestamp at time zone 'America/Sao_Paulo'
  and e.criado_em <  current_date::timestamp at time zone 'America/Sao_Paulo'
order by e.criado_em;
```

**Trocar o responsável (e-mail digitado errado):** crie o usuário certo como no passo 5.1, depois:

```sql
select public.admin_trocar_responsavel(
  '<id do livro>',
  (select id from auth.users where email = 'email.certo@exemplo.com')
);
```

**Tirar alguém do admin:**

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where email = '…';
```

Vale quando o token da pessoa expira (até 1 hora). Para cortar na hora: Authentication → Users → a pessoa → **Sign out user**.

**Ver o job diário:** `select jobname, schedule, active from cron.job;`
