// Sugestão de pergunta (P29, prompt 7): a história parece responder uma pergunta pendente.
// Dois botões de 1 toque. Só apresentação: quem decide o que acontece é quem usa.
import { Botao } from "./botao";

export function SugestaoDePergunta({
  pergunta,
  aoAceitar,
  aoIgnorar,
  ocupado = false,
}: {
  pergunta: string;
  aoAceitar: () => void;
  aoIgnorar: () => void;
  ocupado?: boolean;
}) {
  return (
    <div className="bg-polen-2 flex flex-col gap-3 rounded-2xl p-4">
      <p className="text-ui-15 text-tinta-2">
        Parece responder:{" "}
        <span className="font-livro text-livro-20 text-tinta">{pergunta}</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Botao variante="secundario" disabled={ocupado} onClick={aoAceitar}>
          Marcar como respondida
        </Botao>
        <Botao variante="texto" disabled={ocupado} onClick={aoIgnorar}>
          Ignorar
        </Botao>
      </div>
    </div>
  );
}
