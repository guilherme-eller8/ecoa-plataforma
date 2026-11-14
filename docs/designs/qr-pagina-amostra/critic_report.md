# Revisão crítica de segurança (egm:egm-design, Sonnet) — v1

Resumo do relatório (íntegra na conversa da sessão do prompt 10, 13/11/2026). Veredito: não aprovar ainda; corrigir 1 a 5 antes de imprimir qualquer página.

1. **Alto:** o recorte antigo continua servido quando a história muda (ex.: gravação inteira antes da divisão = ceia inteira); nada limita a duração do recorte; arquivo antigo órfão; bucket próprio para `qr/`.
2. **Alto:** 30/min por IP não segura força bruta (IPv6, proxies) e castiga CGNAT; separar erros de acertos, /64 no IPv6, teto global, firewall da Vercel, decidir dígito verificador, usar o IP que a Vercel sobrescreve.
3. **Médio:** toda consulta escreve no banco; `qr_aberto` conta robôs e prévias do WhatsApp; limpar por cron; medir o *Ouvir*, uma vez por hora.
4. **Alto:** ffmpeg lendo upload não confiável: SSRF por playlist, metadados (GPS) no arquivo público; baixar para /tmp, `-protocol_whitelist file`, demuxer forçado, `-map_metadata -1`, limites.
5. **Alto:** o responsável não consegue desligar um QR; sem caminho de exclusão LGPD; `criar_qr` devolve QR desligado.
6. **Médio:** teste estático do autor é a única barreira com a chave secreta; `has_table_privilege` não vê grant por coluna; `message_id` abre porta pública antes do prompt 12; política restritiva `using (false)`.
7. **Médio:** PDF liberado sem o áudio pronto; `HTTPS://` em maiúsculas pode não virar link em leitores antigos (testar matriz de aparelhos); domínio por 10 anos e sucessão; T21/PRD sem hífen.
8. **Médio:** juntar trechos com intervalo < 2 s inclui segmento de outra história; folga nas pontas invade a vizinha.
9. **Médio:** lock depois da leitura; `servico_qr_audio_pronto` sem o mesmo lock; `unique_violation` genérico; co-facilitador criando QR.
10. **Baixo:** ativos do Next no host `ouvir.`; player na origem do `app.`; `filename` sem escape; `Cache-Control: private, no-store`.
11. **Baixo:** segredo próprio para a chave de rede; a promessa sobre IP deve citar os logs da plataforma.
