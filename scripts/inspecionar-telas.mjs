#!/usr/bin/env node
// Gate de design: roda o inspetor da skill design-taste-frontend em cada tela,
// em 390, 768 e 1440 px, com as regras de tela de app. Screenshots em
// .taste-skill/inspect/<tela>/. Precisa do build rodando (npm run start).
//
//   npm run taste:inspect                 → todas as telas
//   npm run taste:inspect -- autor        → só uma
import { spawnSync } from "node:child_process";

const BASE = process.env.TASTE_BASE ?? "http://localhost:3000";
const TELAS = {
  responsavel: "/styleguide/responsavel",
  autor: "/styleguide/autor",
  styleguide: "/styleguide",
  entrar: "/styleguide/entrar",
  livro: "/styleguide/livro",
  admin: "/styleguide/admin",
  "configurar-quem": "/styleguide/configurar-quem",
  "configurar-perguntas": "/styleguide/configurar-perguntas",
  "configurar-fotos": "/styleguide/configurar-fotos",
  kit: "/styleguide/kit",
  perguntas: "/styleguide/perguntas",
  "perguntas-causos": "/styleguide/perguntas-causos",
  "perguntas-enquete": "/styleguide/perguntas-enquete",
  familia: "/styleguide/familia",
  "familia-causo": "/styleguide/familia-causo",
  "nova-historia": "/styleguide/nova-historia",
  "nova-historia-arquivos": "/styleguide/nova-historia-arquivos",
  audios: "/styleguide/audios",
  "audios-vazia": "/styleguide/audios-vazia",
  "gravar-conversa": "/styleguide/gravar-conversa",
  "gravar-conversa-pergunta": "/styleguide/gravar-conversa-pergunta",
  "autor-primeira": "/styleguide/autor-primeira",
  "autor-inicio": "/styleguide/autor-inicio",
  "autor-inicio-vazio": "/styleguide/autor-inicio-vazio",
  "autor-gravar": "/styleguide/autor-gravar",
  "autor-invalido": "/styleguide/autor-invalido",
  compartilhar: "/styleguide/compartilhar",
  "compartilhar-livros": "/styleguide/compartilhar-livros",
  "nova-enquete": "/styleguide/nova-enquete",
  "nova-enquete-etapa": "/styleguide/nova-enquete-etapa",
  "nova-enquete-revisar": "/styleguide/nova-enquete-revisar",
  "livro-com-historias": "/styleguide/livro-com-historias",
  historias: "/styleguide/historias",
  "historias-vazia": "/styleguide/historias-vazia",
  historia: "/styleguide/historia",
  configuracoes: "/styleguide/configuracoes",
  "configuracoes-vazia": "/styleguide/configuracoes-vazia",
  "audios-situacao": "/styleguide/audios-situacao",
  "admin-processamento": "/styleguide/admin-processamento",
  // Prompt 15
  "admin-aderencia": "/styleguide/admin-aderencia",
  "admin-aderencia-vazia": "/styleguide/admin-aderencia-vazia",
  "admin-aderencia-livro": "/styleguide/admin-aderencia-livro",
  "admin-evals": "/styleguide/admin-evals",
  "admin-evals-vazio": "/styleguide/admin-evals-vazio",
  "admin-evals-adocao": "/styleguide/admin-evals-adocao",
  "admin-evals-adocao-vazia": "/styleguide/admin-evals-adocao-vazia",
  "inicio-admin": "/styleguide/inicio-admin",
  "admin-erros": "/styleguide/admin-erros",
  "admin-erros-vazio": "/styleguide/admin-erros-vazio",
  // Prompt 7
  dividir: "/styleguide/dividir",
  "dividir-confirmada": "/styleguide/dividir-confirmada",
  "livro-conferir": "/styleguide/livro-conferir",
  "historia-sugestao": "/styleguide/historia-sugestao",
  "historia-sem-fala": "/styleguide/historia-sem-fala",
  // Prompt 8
  editor: "/styleguide/editor",
  "editor-trava": "/styleguide/editor-trava",
  "editor-pronta": "/styleguide/editor-pronta",
  versoes: "/styleguide/versoes",
  "editor-ia": "/styleguide/editor-ia",
  "editor-proposta": "/styleguide/editor-proposta",
  "editor-diferenca": "/styleguide/editor-diferenca",
  "gravar-mais": "/styleguide/gravar-mais",
  // Prompt 10
  player: "/styleguide/player",
  "player-preparando": "/styleguide/player-preparando",
  "player-nao-encontrado": "/styleguide/player-nao-encontrado",
  "player-digitar": "/styleguide/player-digitar",
  "editor-amostra": "/styleguide/editor-amostra",
  "editor-amostra-preparando": "/styleguide/editor-amostra-preparando",
  "editor-amostra-falhou": "/styleguide/editor-amostra-falhou",
  "editor-ajustar-foto": "/styleguide/editor-ajustar-foto",
  // Prompt 11
  mensagem: "/styleguide/mensagem",
  "mensagem-gravar": "/styleguide/mensagem-gravar",
  "mensagem-conferir": "/styleguide/mensagem-conferir",
  "mensagem-enviada": "/styleguide/mensagem-enviada",
  mensagens: "/styleguide/mensagens",
  "mensagens-vazia": "/styleguide/mensagens-vazia",
  pessoas: "/styleguide/pessoas",
  "pessoas-vazia": "/styleguide/pessoas-vazia",
  "pessoas-cofacilitador": "/styleguide/pessoas-cofacilitador",
  "configurar-ajuda": "/styleguide/configurar-ajuda",
  convite: "/styleguide/convite",
  "convite-outro-email": "/styleguide/convite-outro-email",
  "convites-pendentes": "/styleguide/convites-pendentes",
  "editor-grupo": "/styleguide/editor-grupo",
  compartilhada: "/styleguide/compartilhada",
  "compartilhada-indisponivel": "/styleguide/compartilhada-indisponivel",
  "perguntas-lembrar": "/styleguide/perguntas-lembrar",
  "resumo-sair": "/styleguide/resumo-sair",
  // Prompt 13
  "montar-conteudo": "/styleguide/montar-conteudo",
  "montar-conteudo-vazia": "/styleguide/montar-conteudo-vazia",
  "montar-conteudo-riscada": "/styleguide/montar-conteudo-riscada",
  "montar-capa": "/styleguide/montar-capa",
  "montar-conferir": "/styleguide/montar-conferir",
  "montar-conferir-vermelho": "/styleguide/montar-conferir-vermelho",
  "montar-conferir-acima-80": "/styleguide/montar-conferir-acima-80",
  "montar-conferir-cofacilitador": "/styleguide/montar-conferir-cofacilitador",
  "versao-gerando": "/styleguide/versao-gerando",
  "versao-pronta": "/styleguide/versao-pronta",
  "versao-falhou": "/styleguide/versao-falhou",
  // P72
  folhear: "/styleguide/folhear",
  "folhear-vazio": "/styleguide/folhear-vazio",
};

// Exceção do PRD (Design e experiência, regras do autor): a pergunta para o autor tem no
// mínimo 28 px, mesmo quando passa de duas linhas. O inspetor trata isso como título longo.
const PERGUNTA_DO_AUTOR = new Set(["autor-inicio", "autor-gravar"]);

// Telas com a folha inferior aberta: é um diálogo de verdade, que pode flutuar (regra heavy-shadow).
const COM_FOLHA_ABERTA = new Set([
  "editor-grupo",
  "editor-amostra",
  "editor-amostra-preparando",
  "editor-amostra-falhou",
  "editor-ajustar-foto",
]);

const escolhidas = process.argv.slice(2).filter((a) => a in TELAS);
let falhou = false;

for (const nome of escolhidas.length ? escolhidas : Object.keys(TELAS)) {
  console.log(`\n━━ ${nome} (${TELAS[nome]}) ━━`);
  const r = spawnSync(
    process.execPath,
    [
      ".claude/skills/design-taste-frontend/scripts/inspect.mjs",
      BASE + TELAS[nome],
      "--app",
      "--allow",
      PERGUNTA_DO_AUTOR.has(nome)
        ? "palette-cream,headline-lines"
        : COM_FOLHA_ABERTA.has(nome)
          ? "palette-cream,heavy-shadow"
          : "palette-cream",
      "--out",
      `.taste-skill/inspect/${nome}`,
    ],
    { stdio: "inherit" },
  );
  if (r.status !== 0) falhou = true;
}

process.exit(falhou ? 1 : 0);
