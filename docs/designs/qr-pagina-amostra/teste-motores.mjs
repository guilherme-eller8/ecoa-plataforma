// Teste de 1 dia do prompt 10 (Typst × Paged.js). Cópia do script rodado na sessão, para reproduzir.
// Precisa, numa pasta à parte: npm i @myriaddreamin/typst-ts-node-compiler@0.7.0 pagedjs@0.4.3 qrcode@1.5.4 jsqr@1.4.0 mupdf@1.28.6,
// as fontes estáticas da Newsreader em ./f2 e o Playwright do repositório. Resultados: qr-pagina-amostra.md, seção 4.
// Teste de 1 dia: a mesma página (título, ano, foto, texto, QR) em Typst e em HTML + Paged.js.
// Mede tempo, confere tamanho da página, fontes embutidas e decodifica o QR do PDF rasterizado.
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { performance } from "node:perf_hooks";
import QRCode from "qrcode";
import jsQR from "jsqr";
import * as mupdf from "mupdf";
import { chromium } from "/home/user/ecoa-plataforma/node_modules/playwright/index.mjs";
import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";

const D = new URL(".", import.meta.url).pathname;
const OUT = D + "out/";
mkdirSync(OUT, { recursive: true });

const URL_QR = "https://ouvir.ecoa-memorias.com.br/7KQ2M9XA";
const CODIGO = "7KQ2 M9XA";
const TITULO = "O trem para Guarapari";
const ANO = "1962";
const PARAGRAFOS = [
  "A gente saía de Belo Horizonte ainda de madrugada. Minha mãe acordava todo mundo às quatro, com o café já passado e o pão com manteiga embrulhado no guardanapo de pano. Eram seis filhos, e cada um carregava a sua trouxa.",
  "O trem era da Vitória a Minas. Lembro do barulho dele chegando na estação, aquele chiado comprido, e do meu pai contando as crianças na plataforma: um, dois, três… sempre faltava o Zé, que tinha ido ver a locomotiva de perto.",
  "A viagem levava o dia inteiro. A gente comia farofa de frango, jogava porrinha com os outros passageiros e dormia encostado na janela. Quando o trem descia a serra, o ar mudava. Minha mãe dizia que era o cheiro do mar chegando, e eu acreditava.",
  "Em Guarapari ficávamos na casa da tia Lurdes, a duas quadras da praia da Areia Preta. O médico tinha dito que a areia fazia bem para o reumatismo do meu pai, e ele passava a manhã enterrado até o pescoço, rindo da gente.",
];

// ── foto de teste: 2480 × 1600 px (21 cm a 300 DPI), gerada no Chromium ──────
async function fotoDeTeste(browser) {
  const p = await browser.newPage({ viewport: { width: 2480, height: 1600 } });
  await p.setContent(`<canvas id=c width=2480 height=1600></canvas><script>
    const c=document.getElementById('c').getContext('2d');
    const g=c.createLinearGradient(0,0,2480,1600);g.addColorStop(0,'#c9b48a');g.addColorStop(1,'#4d5b66');
    c.fillStyle=g;c.fillRect(0,0,2480,1600);
    for(let i=0;i<4000;i++){c.fillStyle='rgba(0,0,0,'+Math.random()*0.08+')';c.fillRect(Math.random()*2480,Math.random()*1600,Math.random()*60,Math.random()*60);}
    c.fillStyle='#2b2b2b';c.fillRect(300,900,1900,260);c.fillStyle='#e8e0cc';for(let x=360;x<2150;x+=180)c.fillRect(x,940,120,90);
  </script><style>body{margin:0}</style>`);
  const buf = await p.locator("#c").screenshot({ type: "jpeg", quality: 90 });
  await p.close();
  writeFileSync(OUT + "foto.jpg", buf);
  return buf;
}

const qrSvg = await QRCode.toString(URL_QR, { type: "svg", errorCorrectionLevel: "Q", margin: 4, color: { dark: "#000000", light: "#ffffff" } });
writeFileSync(OUT + "qr.svg", qrSvg);
const qrInfo = QRCode.create(URL_QR, { errorCorrectionLevel: "Q" });

// ── Typst ────────────────────────────────────────────────────────────────────
function fonteTypst() {
  const esc = (s) => s.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `
#set document(title: "${esc(TITULO)}")
#set page(width: 216mm, height: 216mm, margin: (top: 3mm + 20mm, bottom: 3mm + 18mm, inside: 3mm + 20mm, outside: 3mm + 18mm), fill: white)
#set text(font: "Newsreader", size: 10.5pt, lang: "pt", region: "br", hyphenate: true, fill: rgb("#1c1917"))
#set par(justify: true, leading: 0.62em, first-line-indent: 1.2em, spacing: 0.62em)
// foto sangrando no topo: começa fora da página (3 mm de sangria) e ocupa a largura toda
#place(top + left, dx: -(3mm + 20mm), dy: -(3mm + 20mm), image("foto.jpg", width: 216mm, height: 74mm, fit: "cover"))
#v(74mm - 20mm - 3mm + 9mm)
#text(size: 9pt, tracking: 0.12em, fill: rgb("#78716c"))[${ANO}]
#v(1mm)
#text(size: 22pt, weight: "semibold")[${esc(TITULO)}]
#v(4mm)
${PARAGRAFOS.map((p, i) => (i === 0 ? "#par(first-line-indent: 0em)[" + esc(p) + "]" : esc(p))).join("\n\n")}
#place(bottom + right, dx: 0mm, dy: 12mm, box(width: 24mm)[
  #align(center)[
    #image("qr.svg", width: 24mm)
    #v(-1.5mm)
    #text(size: 7pt, fill: rgb("#57534e"))[aponte e ouça] \\
    #text(size: 8pt, tracking: 0.08em)[${CODIGO}]
  ]
])
`;
}

function typst(n = 1) {
  const t0 = performance.now();
  const compiler = NodeCompiler.create({ workspace: OUT, fontArgs: [{ fontPaths: [D + "f2"] }] });
  const tCriar = performance.now() - t0;
  const tempos = [];
  let pdf;
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    pdf = compiler.pdf({ mainFileContent: fonteTypst() });
    tempos.push(performance.now() - t);
  }
  writeFileSync(OUT + "typst.pdf", pdf);
  return { tCriar, tempos };
}

// ── HTML + Paged.js num Chromium sem tela ────────────────────────────────────
function html() {
  const font = (peso, estilo, arq) => `@font-face{font-family:Newsreader;font-weight:${peso};font-style:${estilo};src:url(data:font/ttf;base64,${readFileSync(D + "f2/" + arq).toString("base64")})}`;
  const foto = readFileSync(OUT + "foto.jpg").toString("base64");
  return `<!doctype html><html lang=pt-BR><head><meta charset=utf-8><style>
${font(400, "normal", "Newsreader-Regular.ttf")}${font(600, "normal", "Newsreader-SemiBold.ttf")}${font(400, "italic", "Newsreader-Italic.ttf")}
@page { size: 210mm 210mm; bleed: 3mm; margin: 20mm 18mm 18mm 20mm; }
body { font-family: Newsreader; font-size: 10.5pt; line-height: 1.42; color: #1c1917; hyphens: auto; }
.foto { display:block; margin: -23mm 0 0 -23mm; width: 216mm; height: 74mm; object-fit: cover; }
.cab { margin-top: 9mm; }
.ano { font-size: 9pt; letter-spacing: .12em; color: #78716c; }
h1 { font-size: 22pt; font-weight: 600; margin: 1mm 0 4mm; line-height: 1.15; }
p { margin: 0 0 .3em; text-align: justify; text-indent: 1.2em; } p:first-of-type { text-indent: 0; }
.qr { position: absolute; right: 0; bottom: 0; width: 24mm; text-align: center; font-size: 7pt; color: #57534e; }
.qr svg { width: 24mm; height: 24mm; display: block; } .qr b { display:block; font-size: 8pt; font-weight: 400; color: #1c1917; letter-spacing: .08em; }
.pagina { position: relative; height: 170mm; overflow: hidden; break-inside: avoid; }
</style></head><body><div class=pagina>
<img class=foto src="data:image/jpeg;base64,${foto}">
<div class=cab><div class=ano>${ANO}</div><h1>${TITULO}</h1></div>
${PARAGRAFOS.map((p) => `<p>${p}</p>`).join("")}
<div class=qr>${qrSvg}aponte e ouça<b>${CODIGO}</b></div>
</div>
<script>window.PagedConfig={auto:true,after:()=>{window.pronto=true}}</script>
<script>${readFileSync(D + "node_modules/pagedjs/dist/paged.polyfill.min.js", "utf8")}</script>
</body></html>`;
}

async function paged(browser, n = 1) {
  const tempos = [];
  let pdf;
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    const p = await browser.newPage();
    await p.setContent(html());
    await p.waitForFunction(() => window.pronto === true, null, { timeout: 30000 });
    pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
    await p.close();
    tempos.push(performance.now() - t);
  }
  writeFileSync(OUT + "paged.pdf", pdf);
  return { tempos };
}

// ── conferência: tamanho, páginas, fontes, QR decodificado do PDF ────────────
function conferir(arq) {
  const doc = mupdf.Document.openDocument(readFileSync(OUT + arq), "application/pdf");
  const pag = doc.loadPage(0);
  const [x0, y0, x1, y1] = pag.getBounds();
  const mm = (pt) => ((pt / 72) * 25.4).toFixed(1);
  const fontes = new Set();
  const pdfdoc = doc.asPDF?.() ?? doc;
  // fontes: percorre os recursos da página
  try {
    const res = pdfdoc.findPage(0).get("Resources").get("Font");
    res.forEach((v) => {
      const f = v.resolve();
      const desc = f.get("FontDescriptor").isNull() ? f.get("DescendantFonts").get(0).get("FontDescriptor") : f.get("FontDescriptor");
      const emb = ["FontFile", "FontFile2", "FontFile3"].some((k) => !desc.get(k).isNull());
      fontes.add(`${f.get("BaseFont").asName()}${emb ? " (embutida)" : " (NÃO embutida)"}`);
    });
  } catch (e) { fontes.add("? " + e.message); }
  const caixas = ["MediaBox", "TrimBox", "BleedBox"].map((k) => `${k}:${pdfdoc.findPage(0).get(k).isNull() ? "—" : "sim"}`).join(" ");
  const resultados = {};
  for (const dpi of [300, 150, 72]) {
    const pix = pag.toPixmap(mupdf.Matrix.scale(dpi / 72, dpi / 72), mupdf.ColorSpace.DeviceRGB, true);
    if (dpi === 150) writeFileSync(OUT + arq.replace(".pdf", ".png"), pix.asPNG());
    const r = jsQR(new Uint8ClampedArray(pix.getPixels()), pix.getWidth(), pix.getHeight());
    resultados[dpi] = r?.data === URL_QR ? "ok" : r ? "ERRADO " + r.data : "não leu";
  }
  return { paginas: doc.countPages(), tamanho: `${mm(x1 - x0)} × ${mm(y1 - y0)} mm`, caixas, fontes: [...fontes], qr: resultados, kb: Math.round(statSync(OUT + arq).size / 1024) };
}

const browser = await chromium.launch();
await fotoDeTeste(browser);
const ty = typst(10);
const tB0 = performance.now();
const b2 = await chromium.launch();
const tLancar = performance.now() - tB0;
const pg = await paged(b2, 5);
await b2.close();
await browser.close();

const fmt = (a) => a.map((x) => Math.round(x)).join(", ");
console.log("QR: versão", qrInfo.version, "módulos", qrInfo.modules.size, "→ módulo de", ((24 * (1 - 8 / (qrInfo.modules.size + 8))) / qrInfo.modules.size).toFixed(2), "mm em 24 mm com margem");
console.log("Typst  criar compilador:", Math.round(ty.tCriar), "ms · compilações (ms):", fmt(ty.tempos));
console.log("Paged  lançar Chromium:", Math.round(tLancar), "ms · gerações (ms):", fmt(pg.tempos));
console.log("typst.pdf", conferir("typst.pdf"));
console.log("paged.pdf", conferir("paged.pdf"));
