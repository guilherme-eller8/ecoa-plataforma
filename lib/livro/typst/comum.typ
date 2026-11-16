// Peças comuns do miolo e da página de amostra (prompt 13, T43, T52).
// Todo texto da família vem do dados.json e entra como dado, nunca como código Typst.
// Texto e QR em 100% preto (K): tons só de K, para a gráfica não misturar quatro tintas.
#let mm(x) = x * 1mm
#let K(p) = cmyk(0%, 0%, 0%, p * 1%)
#let preto = K(100)
#let suave = K(70)
#let fio = K(30)

// A página do miolo: A5 com a sangria; margem interna maior (a capa dura abre menos).
#let pagina(g, rodape: auto) = (
  width: mm(g.paginaL),
  height: mm(g.paginaA),
  fill: K(0),
  margin: (
    top: mm(g.sangria + g.cabeca),
    bottom: mm(g.sangria + g.pe),
    inside: mm(g.sangria + g.interna),
    outside: mm(g.sangria + g.externa),
  ),
)

// Sem número nas páginas marcadas com <sem-numero> (aberturas e brancos criados para abrir na ímpar).
#let numero-de-pagina = context {
  let n = here().page()
  if query(<sem-numero>).any(e => e.location().page() == n) { none } else {
    align(center, text(size: 9pt, fill: suave)[#counter(page).display()])
  }
}

// Abre a próxima página na ímpar. Se a página atual fecha numa ímpar, a seguinte é par: cria o
// branco aqui, marcado para ficar sem número.
#let abrir-na-impar() = {
  pagebreak(weak: true)
  context if calc.even(here().page()) {
    // O espaço de 1 pt faz a página existir (uma página só com metadata é descartada).
    [#metadata(none) <sem-numero>]
    v(1pt)
    pagebreak()
  }
}

#let configurar(g, titulo, corpo) = {
  set document(title: titulo)
  set page(..pagina(g), footer: numero-de-pagina, footer-descent: 30%)
  set text(font: "Newsreader", size: g.corpo * 1pt, lang: "pt", region: "br", hyphenate: true, fill: preto)
  set par(justify: true, leading: 0.65em, spacing: 0.65em)
  corpo
}

// O QR desenhado como curva em K: um laço por linha, uma faixa por sequência de módulos escuros.
// A marca registra página e posição (em pt, a partir do canto da página com a sangria) de cada
// QR; o servidor recorta aquele quadrado do PDF e lê por software.
#let qr-desenho(q) = {
  let n = q.modulos
  let m = mm(q.ladoMm) / n
  let mg = q.margemModulos * m
  let partes = ()
  for (y, linha) in q.linhas.enumerate() {
    let x = 0
    while x < n {
      if linha.at(x) == "1" {
        let ini = x
        while x < n and linha.at(x) == "1" { x += 1 }
        partes += (
          curve.move((ini * m, y * m)),
          curve.line((x * m, y * m)),
          curve.line((x * m, (y + 1) * m)),
          curve.line((ini * m, (y + 1) * m)),
          curve.close(),
        )
      } else { x += 1 }
    }
  }
  box(width: mm(q.caixaMm), height: mm(q.caixaMm), fill: K(0))[
    #place(top + left, dx: mg, dy: mg, curve(fill: preto, stroke: none, ..partes))
  ]
}

#let qr-com-legenda(q) = context {
  let p = here().position()
  [#metadata((codigo: q.codigo, pagina: p.page, x: p.x.pt(), y: p.y.pt(), lado: mm(q.caixaMm).pt())) <qr>]
  block(width: mm(q.caixaMm), breakable: false, {
    qr-desenho(q)
    v(-1mm)
    align(center, {
      text(size: 7pt, fill: suave)[#q.aponte]
      linebreak()
      text(size: 8pt, tracking: 0.08em)[#q.impresso]
    })
  })
}

// Foto numa caixa de tamanho fixo (a mesma na contagem e no PDF). Na contagem, um cinza.
#let foto-fixa(f, modo) = {
  if modo == "contagem" {
    rect(width: mm(f.larguraMm), height: mm(f.alturaMm), fill: luma(230), stroke: none)
  } else {
    image(f.arquivo, width: mm(f.larguraMm), height: mm(f.alturaMm), fit: "cover")
  }
}

#let paragrafos(lista) = {
  for (i, p) in lista.enumerate() {
    par(first-line-indent: if i == 0 { 0em } else { 1.2em }, p)
  }
}

// O capítulo de uma história: ano, título, QR ao lado do título, fotos e texto. Usado pelo
// livro e pela página de amostra (uma fonte só). `cortado` só na amostra.
#let historia(h, modo, cortado: false, continua: "") = {
  // O título aparece no sumário; o título visível é o do cabeçalho abaixo.
  [#show heading: none
   #heading(level: 1, outlined: true)[#h.titulo]]
  if h.fotos.len() > 0 {
    align(center, foto-fixa(h.fotos.first(), modo))
    v(6mm)
  }
  let titulo = {
    if h.ano != none {
      text(size: 9pt, tracking: 0.12em, fill: suave)[#str(h.ano)]
      v(1mm, weak: true)
    }
    // Título nunca justificado: em 2 linhas a justificação abria buracos entre as palavras.
    block({
      set par(justify: false)
      text(size: 22pt, weight: "semibold", hyphenate: false)[#h.titulo]
    })
  }
  if h.qr != none {
    grid(
      columns: (1fr, mm(h.qr.caixaMm)),
      column-gutter: 6mm,
      align: (left + bottom, left + top),
      titulo,
      qr-com-legenda(h.qr),
    )
  } else {
    titulo
  }
  v(5mm)
  paragrafos(h.paragrafos)
  if cortado {
    v(3mm)
    align(right, text(style: "italic", fill: suave)[#continua])
  }
  for f in h.fotos.slice(calc.min(1, h.fotos.len())) {
    v(5mm)
    align(center, foto-fixa(f, modo))
  }
}
