# Ajustar a foto da história (P75)

Pedido do Guilherme em 16/11, depois do teste com a história do pai: a foto alta (739 × 1600) virou uma faixa estreita na página. A família escolhe a posição e pode cortar.

## Na tela (editor, seção de fotos)

Cada foto ganha **Ajustar**, que abre a folha *Ajustar a foto*:

1. **Cortar:** a foto dentro de uma moldura. Quatro formatos: *Inteira* (como hoje), *Quadrada*, *Em pé* (4:5) e *Deitada* (3:2). *Aproximar* (1× a 3×) tira o que não agrega; arrastar escolhe a parte que fica, o mesmo gesto do foco da capa (P70).
2. **Onde fica** (só na 1ª foto da história): *Junto com a história* (como hoje) ou *Página inteira, ao lado*. Dica de 1 linha: "Página inteira usa 1 página a mais no livro."
3. Ação principal: **Salvar**. Depois, *Ver como fica* abre a amostra (o livro aberto mostra o resultado).

## No papel (o mesmo Typst do livro, da amostra e do Folhear)

- **Recorte:** aplicado na foto antes do Typst (sharp `extract`, em % da original). A caixa e o alerta de DPI usam o tamanho recortado.
- **Página ao lado:** a foto ocupa uma página inteira, sem número, à esquerda (par), de frente para a abertura da história, que fica à direita. Se a foto cairia numa página ímpar, entra 1 branco antes. Na amostra, sem essa regra: página 1 a foto, página 2 a história.
- Contagem de páginas, Folhear e PDF final saem da mesma renderização (T20), então o custo extra aparece antes de publicar.

## Banco

`story_photos` ganha `recorte_x/y/l/a` (% da foto, nulos = inteira, mínimo 5%) e `ao_lado`. O recorte fica por uso, não na foto: a mesma foto pode estar em outra história ou na capa. A escrita é pela RLS que já existe ("membro reordena com plano ativo"), só abrindo o update dessas colunas para `authenticated`; autor e família continuam sem acesso. `privado.conteudo_do_livro` passa a levar `recorte` e `ao_lado`. O hash da montagem muda; versões publicadas não mudam.

Migration: `supabase/migrations/20261129120000_ajustar_foto.sql`. Reversão: `supabase/reversao/20261129120000_ajustar_foto.down.sql`. As duas rodam limpas no PGlite (449 testes do banco).
