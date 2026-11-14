# Decisão: domínio da plataforma

Data: 2026-11-09 · Status: **decidido** (Guilherme, no prompt 3)

## Decisão

O domínio é **`ecoa-memorias.com.br`** (com hífen):

- App: `app.ecoa-memorias.com.br`
- QR impresso: `ouvir.ecoa-memorias.com.br/{código}`
- E-mail: `Ecoa Memórias <acesso@ecoa-memorias.com.br>`

## Por quê

- É o domínio já verificado no Resend (região us-east-1, envio habilitado desde 30/10/2026).
- O PRD citava `ecoamemorias.com.br` (sem hífen), mas esse domínio não estava registrado nem verificado em lugar nenhum.

## Consequência irreversível

O subdomínio do QR vai impresso nos livros. A partir da primeira página de amostra (26/12/2026), `DOMINIO_QR` **nunca muda**. Se um dia o domínio principal mudar, `ouvir.ecoa-memorias.com.br` continua apontando para o player.

## Pendências

- [x] `app.` apontando para a Vercel (CNAME no registro.br).
- [ ] `ouvir.`: CNAME `ouvir` → `fb39d318f8d07408.vercel-dns-017.com.` no registro.br (prompt 10, passo do Guilherme).
- [ ] Pagar o domínio por vários anos (o registro.br aceita até 10) e anotar o titular e quem herda o acesso.
- [ ] Conferir a renovação automática do domínio no registro.br: deixar vencer apaga os QR impressos.
