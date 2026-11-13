import "server-only";
import type {
  AcoesAudios,
  AcoesConfiguracao,
  AcoesFotos,
  AcoesKit,
  AcoesPerguntas,
} from "@/lib/livro/tipos";
import * as a from "./acoes";

// Liga as server actions ao livro da página (bind no servidor: o id não vem do navegador
// como argumento solto, e cada ação confere de novo a sessão).
export function acoesDoLivro(id: string) {
  const configuracao: AcoesConfiguracao = {
    salvarQuem: a.salvarQuem.bind(null, id),
    salvarPerguntas: a.salvarPerguntas.bind(null, id),
    marcarPasso: a.marcarPasso.bind(null, id),
  };
  const fotos: AcoesFotos = {
    prepararFotos: a.prepararFotos.bind(null, id),
    registrarFotos: a.registrarFotos.bind(null, id),
  };
  const perguntas: AcoesPerguntas = {
    adicionarDoBanco: a.adicionarDoBanco.bind(null, id),
    adicionarPropria: a.adicionarPropria.bind(null, id),
    mudarEstado: a.mudarEstado.bind(null, id),
    apagar: a.apagar.bind(null, id),
    virarPergunta: a.virarPergunta.bind(null, id),
    porNaEnquete: a.porNaEnquete.bind(null, id),
    urlDoAudio: a.urlDoAudio.bind(null, id),
    abrirEnquete: a.abrirEnquete.bind(null, id),
    encerrarEnquete: a.encerrarEnquete.bind(null, id),
    salvarDaEnquete: a.salvarDaEnquete.bind(null, id),
    removerVotos: a.removerVotos.bind(null, id),
    pegarLinkDoAutor: a.pegarLinkDoAutor.bind(null, id),
  };
  const kit: AcoesKit = {
    pegarLinkDaFamilia: a.pegarLinkDaFamilia.bind(null, id),
    trocarLinkDaFamilia: a.trocarLinkDaFamilia.bind(null, id),
    pegarLinkDoAutor: a.pegarLinkDoAutor.bind(null, id),
    trocarLinkDoAutor: a.trocarLinkDoAutor.bind(null, id),
  };
  const audios: AcoesAudios = {
    prepararAudios: a.prepararAudios.bind(null, id),
    reassinarAudio: a.reassinarAudio.bind(null, id),
    confirmarAudio: a.confirmarAudio.bind(null, id),
  };
  return { configuracao, fotos, perguntas, kit, audios };
}
