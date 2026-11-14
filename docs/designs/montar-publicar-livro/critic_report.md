# Revisão de segurança (egm:egm-design, Sonnet), prompt 13 v1

Veredito: aprovar com ajustes (1, 2 e 5 antes de aplicar no Supabase).

1. Alta. `publicar_livro` conferia só a `rev` de `book_layouts`: mudanças em mensagens (`no_livro`, editar, arquivar) e história nova pronta entravam congeladas sem a pessoa ver; `montagem_salvar` sem trava. Correção: hash do conteúdo mostrado + `for update`.
2. Alta. Player de mensagem não olha estado: mensagem retirada (spam, LGPD) segue tocando em público e não se apaga. Correção: arquivada = desativado.
3. Média. `duracao_s` da mensagem vem do aparelho e era o teto do recorte: QR preso em "preparando". Correção: duração medida pelo servidor; suspeita sai sem QR.
4. Média. ffmpeg e sharp passam a ler arquivo anônimo. Correção: `-f` explícito, `-protocol_whitelist file`; sharp com `limitInputPixels` e `failOn`.
5. Média. `privado.*` security definer sem checagem (conteudo_do_livro, qr_inserir) protegidas só por `from public`. Correção: revoke de todos os papéis + teste.
6. Média. Contagem e prévia sem teto no servidor. Correção: rate limit no banco, cache por hash.
7. Média. 15 min expira job ainda em retentativa; pasta órfã. Correção: prazo maior; apagar pasta quando o pronto devolve false; varredura.
8. Média. QR vivo depois do PDF congelado (edição muda o recorte; responsável desliga). Correção: prompt 14 reconfere; documentar.
9. Baixa. Erro do Typst/mupdf pode levar texto ao Inngest. Correção: código fixo; foto por nome local; teste.
10. Baixa. Reversão: trava ignora `book_layouts`; bucket apagado antes e com arquivos; recortes órfãos. Correção: bucket por último, documentar.
11. Baixa. Lock antes da permissão; falha conta no teto diário. Correção: permissão antes; contar só não falhou.
12. Baixa. Sem teste de contrato das colunas lidas de `book_exports`. Correção: teste.
