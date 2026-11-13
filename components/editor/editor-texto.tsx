"use client";

// Texto editável da história (prompt 8), com Tiptap. Cada parágrafo carrega id, segmentos de
// origem (fontes) e se foi editado à mão; o grifo "Confira" é uma marca que sai sozinha
// quando qualquer letra do trecho muda. Tocar numa frase avisa quem usa (para o botão Ouvir);
// tocar num grifo abre o motivo. Design: docs/designs/editor-historias.md, seção 4.
import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { UndoRedo } from "@tiptap/extensions";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  novoId,
  type AtributosConfira,
  type DocTiptap,
} from "@/lib/editor/conteudo";
import { fraseEm } from "@/lib/editor/ouvir";

export type FraseTocada = {
  fontes: number[];
  frase: string;
  // Posição na tela (px, relativa à janela) do começo e do fim da linha da frase.
  topo: number;
  base: number;
  esquerda: number;
};

export type ApiDoTexto = {
  tirarGrifo: (id: string) => void;
  /** emitir = false: troca o texto sem avisar mudança (ex.: depois de aceitar uma proposta). */
  definir: (doc: DocTiptap, opcoes?: { emitir?: boolean }) => void;
  documento: () => DocTiptap | null;
};

/** Prompt 9: trecho selecionado (para "Revisar"). Posições em UTF-16 dentro do parágrafo. */
export type Selecao =
  | {
      dentro: true;
      paragrafo: string;
      inicio: number;
      fim: number;
      trecho: string;
      base: number;
      esquerda: number;
    }
  | { dentro: false; base: number; esquerda: number };

const unir = (a: unknown, b: unknown) =>
  [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])]
    .filter((n): n is number => Number.isInteger(n))
    .sort((x, y) => x - y);

const ParagrafoEcoa = Paragraph.extend({
  addAttributes() {
    return {
      pid: {
        default: null,
        keepOnSplit: false,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-pid"),
        renderHTML: (a: { pid?: string | null }) =>
          a.pid ? { "data-pid": a.pid } : {},
      },
      fontes: { default: [], keepOnSplit: true, rendered: false },
      editado: { default: false, keepOnSplit: false, rendered: false },
    };
  },
  addKeyboardShortcuts() {
    // Juntar dois parágrafos (Backspace no começo, Delete no fim) une as fontes dos dois.
    // Devolve false: o Tiptap segue e faz a junção normal.
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;
        if (!empty || $from.parentOffset !== 0 || $from.depth !== 1)
          return false;
        const i = $from.index(0);
        if (i === 0) return false;
        const anterior = state.doc.child(i - 1);
        const pos = $from.before(1) - anterior.nodeSize;
        editor.view.dispatch(
          state.tr.setNodeMarkup(pos, undefined, {
            ...anterior.attrs,
            fontes: unir(anterior.attrs.fontes, $from.parent.attrs.fontes),
          }),
        );
        return false;
      },
      Delete: ({ editor }) => {
        const { state } = editor;
        const { $from, empty } = state.selection;
        if (
          !empty ||
          $from.depth !== 1 ||
          $from.parentOffset !== $from.parent.content.size
        )
          return false;
        const i = $from.index(0);
        if (i >= state.doc.childCount - 1) return false;
        const seguinte = state.doc.child(i + 1);
        editor.view.dispatch(
          state.tr.setNodeMarkup($from.before(1), undefined, {
            ...$from.parent.attrs,
            fontes: unir($from.parent.attrs.fontes, seguinte.attrs.fontes),
          }),
        );
        return false;
      },
    };
  },
});

const Confira = Mark.create({
  name: "confira",
  inclusive: false,
  addAttributes() {
    return {
      id: { default: "", rendered: false },
      tipo: { default: "fato", rendered: false },
      origem: { default: "verificador", rendered: false },
      motivo: { default: "", rendered: false },
      trecho: { default: "", rendered: false },
    };
  },
  parseHTML() {
    return [{ tag: "mark[data-confira]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes, { "data-confira": "" }), 0];
  },
});

// Depois de cada mudança: id único em todo parágrafo, e grifo cujo texto mudou sai.
const Arrumar = Extension.create({
  name: "arrumar",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("ecoa-arrumar"),
        appendTransaction(transacoes, _antes, estado) {
          if (!transacoes.some((t) => t.docChanged)) return null;
          const tr = estado.tr;
          const vistos = new Set<string>();
          estado.doc.forEach((no, pos) => {
            if (no.type.name !== "paragraph") return;
            const pid = no.attrs.pid as string | null;
            if (!pid || vistos.has(pid)) {
              const novo = novoId();
              vistos.add(novo);
              tr.setNodeMarkup(pos, undefined, { ...no.attrs, pid: novo });
            } else vistos.add(pid);
          });
          const tipo = estado.schema.marks.confira;
          const grifos = new Map<
            string,
            { texto: string; trecho: string; partes: [number, number][] }
          >();
          estado.doc.descendants((no, pos) => {
            if (!no.isText) return;
            const m = no.marks.find((x) => x.type === tipo);
            if (!m) return;
            const g = grifos.get(m.attrs.id) ?? {
              texto: "",
              trecho: m.attrs.trecho as string,
              partes: [],
            };
            g.texto += no.text ?? "";
            g.partes.push([pos, pos + no.nodeSize]);
            grifos.set(m.attrs.id, g);
          });
          for (const g of grifos.values())
            if (g.texto !== g.trecho)
              for (const [de, ate] of g.partes) tr.removeMark(de, ate, tipo);
          return tr.docChanged || tr.steps.length ? tr : null;
        },
      }),
    ];
  },
});

type Props = {
  inicial: DocTiptap;
  editavel: boolean;
  aoMudar: () => void;
  aoAtividade: () => void;
  aoTocarFrase: (f: FraseTocada | null) => void;
  aoTocarGrifo: (g: AtributosConfira) => void;
  aoMudarParagrafo: (fontes: number[]) => void;
  aoSelecionar?: (s: Selecao | null) => void;
};

const CLASSES_DO_TEXTO =
  "font-livro text-livro-20 text-tinta leading-relaxed outline-none focus-visible:outline-none min-h-40 " +
  "[&_p+p]:mt-5 [&_mark]:bg-polen-2 [&_mark]:text-tinta [&_mark]:rounded-sm " +
  "[&_mark]:underline [&_mark]:decoration-dotted [&_mark]:decoration-floresta/60 " +
  "[&_mark]:underline-offset-4 [&_mark]:box-decoration-clone [&_mark]:cursor-pointer";

const nada = () => () => {};

/**
 * O Tiptap só nasce no navegador (ele sorteia ids ao criar o editor). Até lá, o mesmo texto
 * aparece parado, com a mesma tipografia: nada pula na tela.
 */
export const EditorTexto = forwardRef<ApiDoTexto, Props>(
  function EditorTexto(props, ref) {
    const noNavegador = useSyncExternalStore(
      nada,
      () => true,
      () => false,
    );
    if (!noNavegador)
      return (
        <div className={CLASSES_DO_TEXTO}>
          {props.inicial.content.map((p, i) => (
            <p key={i}>
              {(p.content ?? []).map((t, j) =>
                t.marks?.length ? <mark key={j}>{t.text}</mark> : t.text,
              )}
            </p>
          ))}
        </div>
      );
    return <EditorVivo {...props} ref={ref} />;
  },
);

const EditorVivo = forwardRef<ApiDoTexto, Props>(function EditorVivo(
  {
    inicial,
    editavel,
    aoMudar,
    aoAtividade,
    aoTocarFrase,
    aoTocarGrifo,
    aoMudarParagrafo,
    aoSelecionar,
  },
  ref,
) {
  // Os avisos mudam a cada render; o editor guarda a função do momento.
  const avisos = useRef({
    aoMudar,
    aoAtividade,
    aoTocarFrase,
    aoTocarGrifo,
    aoMudarParagrafo,
    aoSelecionar,
  });
  useEffect(() => {
    avisos.current = {
      aoMudar,
      aoAtividade,
      aoTocarFrase,
      aoTocarGrifo,
      aoMudarParagrafo,
      aoSelecionar,
    };
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [Document, ParagrafoEcoa, Text, UndoRedo, Confira, Arrumar],
    content: inicial,
    editable: editavel,
    editorProps: {
      attributes: {
        class: CLASSES_DO_TEXTO,
        "aria-label": "Texto da história",
        spellcheck: "true",
        autocapitalize: "sentences",
      },
      handleClick(view, pos) {
        const $pos = view.state.doc.resolve(pos);
        const grifo = view.state.doc
          .nodeAt(pos)
          ?.marks.find((m) => m.type.name === "confira");
        const antes = $pos.nodeBefore?.marks.find(
          (m) => m.type.name === "confira",
        );
        const m = grifo ?? antes;
        if (m) {
          avisos.current.aoTocarFrase(null);
          avisos.current.aoTocarGrifo(m.attrs as AtributosConfira);
          return false;
        }
        const p = $pos.parent;
        if (p.type.name !== "paragraph" || !p.textContent) {
          avisos.current.aoTocarFrase(null);
          return false;
        }
        const frase = fraseEm(p.textContent, $pos.parentOffset);
        const inicio = view.coordsAtPos($pos.start() + frase.inicio);
        const aqui = view.coordsAtPos(pos);
        avisos.current.aoTocarFrase({
          fontes: (p.attrs.fontes as number[]) ?? [],
          frase: frase.texto,
          topo: aqui.top,
          base: aqui.bottom,
          esquerda: Math.min(inicio.left, aqui.left),
        });
        return false;
      },
      handleKeyDown() {
        avisos.current.aoAtividade();
        avisos.current.aoTocarFrase(null);
        return false;
      },
    },
    onUpdate() {
      avisos.current.aoMudar();
    },
    onSelectionUpdate({ editor: e }) {
      const { $from, $to, empty, from, to } = e.state.selection;
      const p = $from.depth >= 1 ? $from.node(1) : null;
      avisos.current.aoMudarParagrafo(
        (p?.attrs.fontes as number[] | undefined) ?? [],
      );
      if (!avisos.current.aoSelecionar) return;
      if (empty || !p) return avisos.current.aoSelecionar(null);
      const fim = e.view.coordsAtPos(to);
      const comeco = e.view.coordsAtPos(from);
      const esquerda = Math.min(comeco.left, fim.left);
      // Dentro de um parágrafo só: o texto do parágrafo é só texto, então a posição dentro
      // dele é a mesma contagem do JavaScript (UTF-16).
      if (
        $from.depth !== 1 ||
        $to.depth !== 1 ||
        $from.before(1) !== $to.before(1)
      )
        return avisos.current.aoSelecionar({
          dentro: false,
          base: fim.bottom,
          esquerda,
        });
      const trecho = p.textContent.slice($from.parentOffset, $to.parentOffset);
      if (!trecho.trim()) return avisos.current.aoSelecionar(null);
      avisos.current.aoSelecionar({
        dentro: true,
        paragrafo: (p.attrs.pid as string) ?? "",
        inicio: $from.parentOffset,
        fim: $to.parentOffset,
        trecho,
        base: fim.bottom,
        esquerda,
      });
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable !== editavel)
      editor.setEditable(editavel, false); // sem aviso de mudança: nada a salvar
  }, [editor, editavel]);

  useImperativeHandle(
    ref,
    (): ApiDoTexto => ({
      tirarGrifo(id) {
        if (!editor) return;
        const tipo = editor.schema.marks.confira;
        const tr = editor.state.tr;
        editor.state.doc.descendants((no, pos) => {
          if (
            no.isText &&
            no.marks.some((m) => m.type === tipo && m.attrs.id === id)
          )
            tr.removeMark(pos, pos + no.nodeSize, tipo);
        });
        editor.view.dispatch(tr);
      },
      definir(doc, opcoes) {
        editor?.commands.setContent(doc, {
          emitUpdate: opcoes?.emitir ?? true,
        });
      },
      documento() {
        return editor ? (editor.getJSON() as DocTiptap) : null;
      },
    }),
    [editor],
  );

  return <ConteudoDoEditor editor={editor} />;
});

function ConteudoDoEditor({ editor }: { editor: Editor | null }) {
  return <EditorContent editor={editor} />;
}
