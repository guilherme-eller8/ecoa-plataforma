// O miolo do livro (prompt 13): folha de rosto, dedicatória, sumário, histórias, mensagens da
// família, páginas em branco até o múltiplo da gráfica e colofão. A5 + 3 mm de sangria.
#import "/comum.typ": *
#let d = json("/dados.json")

#show: doc => configurar(d.g, d.livro.titulo, doc)

// Folha de rosto e verso em branco. Sem número de página.
#page(footer: none)[
  #v(1fr)
  #align(center)[
    #block(width: 100%, text(size: 30pt, weight: "semibold", hyphenate: false)[#d.livro.titulo])
    #if d.livro.subtitulo != none {
      v(6mm)
      text(size: 14pt, style: "italic", fill: suave)[#d.livro.subtitulo]
    }
  ]
  #v(1fr)
  #if d.livro.autor != none {
    align(center, text(size: 13pt, tracking: 0.06em)[#d.livro.autor])
  }
  #v(14mm)
]
#page(footer: none)[]

// Dedicatória (se houver) e verso em branco.
#if d.livro.dedicatoria.len() > 0 {
  page(footer: none)[
    #v(30%)
    #align(center, block(width: 80%, text(size: 12.5pt, style: "italic")[
      #for p in d.livro.dedicatoria [#p #parbreak()]
    ]))
  ]
  page(footer: none)[]
}

// Sumário: abre na página ímpar (as páginas da frente vêm em pares).
#page(footer: none)[
  #block(text(size: 20pt, weight: "semibold")[#d.rotulos.sumario])
  #v(6mm)
  #set outline.entry(fill: repeat[#h(2pt).#h(2pt)])
  #outline(title: none, depth: 1, indent: 0pt)
]

// Histórias: cada uma abre numa página nova, par ou ímpar (Q1).
#for h in d.historias {
  pagebreak(weak: true)
  historia(h, d.modo)
}

// Mensagens da família: abrem na ímpar; mensagem curta não quebra entre páginas.
#if d.mensagens.len() > 0 {
  abrir-na-impar()
  [#metadata(none) <sem-numero>]
  [#show heading: none
   #heading(level: 1, outlined: true)[#d.rotulos.mensagens]]
  block(text(size: 22pt, weight: "semibold", hyphenate: false)[#d.rotulos.mensagens])
  v(8mm)
  for (i, m) in d.mensagens.enumerate() {
    if i > 0 {
      v(7mm)
      line(length: 100%, stroke: 0.4pt + fio)
      v(7mm)
    }
    let corpo = {
      let cabecalho = {
        text(size: 13pt, weight: "semibold", hyphenate: false)[#m.nome]
        h(6pt)
        text(size: 10pt, style: "italic", fill: suave)[#m.relacao]
      }
      let lateral = {
        if m.foto != none { foto-fixa(m.foto, d.modo) }
        if m.qr != none {
          if m.foto != none { v(3mm) }
          qr-com-legenda(m.qr)
        }
      }
      if m.foto != none or m.qr != none {
        grid(
          columns: (1fr, mm(calc.max(if m.foto != none { m.foto.larguraMm } else { 0 }, if m.qr != none { m.qr.caixaMm } else { 0 }))),
          column-gutter: 6mm,
          { cabecalho; v(2mm); paragrafos(m.paragrafos) },
          lateral,
        )
      } else {
        cabecalho
        v(2mm)
        paragrafos(m.paragrafos)
      }
    }
    let palavras = m.paragrafos.map(p => p.split(" ").len()).sum(default: 0)
    block(breakable: palavras > 150, width: 100%, corpo)
  }
}

// Brancos até o múltiplo da gráfica, antes do colofão.
#for _ in range(d.brancos) {
  page(footer: none)[]
}

// Colofão na última página.
#page(footer: none)[
  #v(1fr)
  #align(center)[
    #text(size: 10pt, fill: suave)[#d.rotulos.colofao]
    #linebreak()
    #text(size: 9pt, fill: suave)[#d.colofao.linha]
  ]
  #v(6mm)
]
