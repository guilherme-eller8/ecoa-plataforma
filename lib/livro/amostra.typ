// Página de amostra (prompt 10, T43). 21 × 21 cm + 3 mm de sangria em cada lado.
// Todo texto da família vem de dados.json e entra como dado, nunca como código Typst.
#let d = json("/dados.json")
#let sangria = 3mm

#set document(title: d.titulo)
#set page(
  width: 210mm + 2 * sangria,
  height: 210mm + 2 * sangria,
  margin: (top: sangria + 20mm, bottom: sangria + 18mm, left: sangria + 20mm, right: sangria + 18mm),
  fill: white,
)
#set text(font: "Newsreader", size: 10.5pt, lang: "pt", region: "br", hyphenate: true, fill: rgb("#1c1917"))
#set par(justify: true, leading: 0.62em, spacing: 0.62em)

#if d.foto != none {
  align(center, image("/foto.jpg", height: d.foto * 1mm))
  v(7mm)
}

#grid(
  columns: (1fr, d.qr.caixa * 1mm),
  column-gutter: 8mm,
  align: (left + bottom, center + top),
  [
    #if d.ano != none [
      #text(size: 9pt, tracking: 0.12em, fill: rgb("#78716c"))[#str(d.ano)]
      #v(1mm, weak: true)
    ]
    #block(text(size: 22pt, weight: "semibold", hyphenate: false)[#d.titulo])
  ],
  [
    #image("/qr.svg", width: d.qr.caixa * 1mm)
    #v(-1mm)
    #text(size: 7pt, fill: rgb("#57534e"))[#d.qr.aponte] \
    #text(size: 8pt, tracking: 0.08em)[#d.qr.codigo]
  ],
)
#v(5mm)

#for (i, p) in d.paragrafos.enumerate() {
  par(first-line-indent: if i == 0 { 0em } else { 1.2em }, p)
}
#if d.cortado {
  v(3mm)
  align(right, text(style: "italic", fill: rgb("#57534e"))[#d.continua])
}
