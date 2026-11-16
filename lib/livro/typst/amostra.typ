// Página de amostra (prompt 10, T43; A5 desde o prompt 13): a mesma função de capítulo do livro.
// Todo texto da família vem de dados.json e entra como dado, nunca como código Typst.
#import "/comum.typ": *
#let d = json("/dados.json")

#show: doc => configurar(d.g, d.historia.titulo, doc)
#set page(footer: none)
#historia(d.historia, "final", cortado: d.cortado, continua: d.continua, paridade: false)
