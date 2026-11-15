// A capa aberta de capa dura (prompt 13): dobra | verso | canal | lombada | canal | frente | dobra.
// Papel impresso 4x0; as cores da capa são CMYK. O texto da família vem do dados.json (T43).
#import "/comum.typ": *
#let d = json("/dados.json")

#let c = d.cor.cmyk
#let fundo = cmyk(c.at(0) * 1%, c.at(1) * 1%, c.at(2) * 1%, c.at(3) * 1%)
#let tinta = if d.cor.claro { cmyk(0%, 0%, 0%, 0%) } else { preto }

#set document(title: d.titulo)
#set page(width: mm(d.w), height: mm(d.h), margin: 0pt, fill: fundo)
#set text(font: "Newsreader", lang: "pt", region: "br", hyphenate: false, fill: tinta)
#set par(justify: false, leading: 0.25em, spacing: 0.5em)

#let titulo-capa = text(size: 30pt, weight: "semibold")[#d.titulo]
#let largura-frente = d.papelaoL - 2 * d.margem
#let x-frente = d.frenteX + d.margem
#let y-topo = d.dobra + d.margem

// Frente: foto num retângulo, título (até 3 linhas) e subtítulo.
#place(top + left, dx: mm(x-frente), dy: mm(y-topo), block(width: mm(largura-frente), {
  if d.foto != none {
    image(d.foto.arquivo, width: mm(d.foto.larguraMm), height: mm(d.foto.alturaMm), fit: "cover")
    v(10mm)
  } else {
    v(40mm)
  }
  titulo-capa
  if d.subtitulo != none {
    v(5mm)
    text(size: 14pt, style: "italic")[#d.subtitulo]
  }
}))

// As linhas que o título ocupa na capa, medidas aqui mesmo: o que quebra em 3 na prévia quebra
// igual no papel.
#context {
  let um = measure(block(width: mm(largura-frente), text(size: 30pt, weight: "semibold")[Xg])).height
  let todo = measure(block(width: mm(largura-frente), titulo-capa)).height
  let ent = 0.25 * 30pt
  let linhas = calc.round((todo + ent) / (um + ent))
  [#metadata(linhas) <linhas-titulo>]
}

// Lombada: título e autor girados, só se ela tiver largura para isso.
#if d.lombada >= d.lombadaMinTexto {
  let comprimento = d.papelaoA - 2 * d.margem
  let cx = d.lombadaX + d.lombada / 2
  let cy = d.dobra + d.papelaoA / 2
  let texto = {
    text(size: 11pt, weight: "semibold")[#d.titulo]
    if d.autor != none {
      h(8pt)
      text(size: 9.5pt)[#d.autor]
    }
  }
  place(top + left, dx: mm(cx - comprimento / 2), dy: mm(cy - d.lombada / 2),
    rotate(90deg, origin: center, box(width: mm(comprimento), height: mm(d.lombada), align(center + horizon, context {
      let w = measure(texto).width
      if w > mm(comprimento) { scale(mm(comprimento) / w * 100%, origin: center, texto) } else { texto }
    }))))
}

// Verso: só a marca, pequena, no pé.
#place(top + left, dx: mm(d.versoX), dy: mm(d.dobra + d.papelaoA - d.margem - 4), block(width: mm(d.papelaoL), align(center, text(size: 8pt, tracking: 0.08em)[#d.marca])))

// Guias: só na prévia da tela, nunca no PDF da gráfica. Dobras, canais e lombada.
#if d.guias {
  let g = 0.4pt + luma(128).transparentize(35%)
  place(top + left, dx: mm(d.dobra), dy: 0pt, line(angle: 90deg, length: mm(d.h), stroke: g))
  place(top + left, dx: mm(d.w - d.dobra), dy: 0pt, line(angle: 90deg, length: mm(d.h), stroke: g))
  place(top + left, dx: 0pt, dy: mm(d.dobra), line(length: mm(d.w), stroke: g))
  place(top + left, dx: 0pt, dy: mm(d.h - d.dobra), line(length: mm(d.w), stroke: g))
  place(top + left, dx: mm(d.lombadaX), dy: 0pt, line(angle: 90deg, length: mm(d.h), stroke: g))
  place(top + left, dx: mm(d.lombadaX + d.lombada), dy: 0pt, line(angle: 90deg, length: mm(d.h), stroke: g))
}
