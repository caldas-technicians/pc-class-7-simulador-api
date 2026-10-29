/* ===== Laboratorio fetch: API -> puzzle -> fetch -> hoja -> página ===== */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const S = { url: "", rows: [], cols: [], imgK: null, titleK: null, catK: null, next: null, view: [] };
let maxStep = 0;

/* ---------- navegación ---------- */
function show(n) {
  maxStep = Math.max(maxStep, n);
  document.querySelectorAll("main .panel").forEach((p, i) => p.classList.toggle("hide", i !== n));
  [...$("steps").children].forEach((li, i) => { li.className = i === n ? "on" : i <= maxStep ? "done" : ""; });
  scrollTo({ top: 0, behavior: "smooth" });
}
$("steps").addEventListener("click", (e) => { const i = [...$("steps").children].indexOf(e.target); if (i >= 0 && i <= maxStep && (i < 3 || S.rows.length)) show(i); });

/* ---------- paso 1: elegir API ---------- */
function limpiar(u) {
  u = u.trim(); if (!u) return null; if (!/^https?:/i.test(u)) u = "https://" + u;
  try { const x = new URL(u); [...x.searchParams.keys()].filter((k) => k.startsWith("utm_")).forEach((k) => x.searchParams.delete(k)); return x.toString(); } catch (_) { return null; }
}
$("go").onclick = () => {
  const u = limpiar($("url").value);
  if (!u) { $("err").textContent = "Esa URL no es válida. Ejemplo: https://thesimpsonsapi.com/api/characters"; return; }
  $("err").textContent = ""; S.url = u; $("url").value = u; initPuz(); show(1);
};

/* ---------- paso 2: puzzle de orden ---------- */
const PASOS = [
  "Abrir la URL de la API en el navegador y leer el JSON",
  "Ubicar dónde está la lista (results, data o la raíz) y qué campos trae",
  "Mostrar «Cargando…» mientras llega la respuesta",
  "Llamar fetch(URL): devuelve una promesa pendiente",
  "Primer then: comprobar response.ok y convertir con respuesta.json()",
  "Segundo then: tomar la lista de los datos ya convertidos",
  "Dentro del then: pintar los datos en la tabla",
  "catch: mostrar un mensaje si algo falló",
];
let slots, order, intentos, bloq, busy = false;
function initPuz() {
  intentos = 0; busy = false; bloq = Array(PASOS.length).fill(false); slots = Array(PASOS.length).fill(null); order = [...PASOS.keys()];
  do order.sort(() => Math.random() - 0.5); while (order.every((v, i) => v === i));
  $("fb").textContent = ""; $("fb").className = "fb"; $("toFetch").classList.add("hide"); drawPuz();
}
const pc = (i, lock) => `<div class="pc" draggable="${!lock}" data-p="${i}">${PASOS[i]}</div>`;
function drawPuz(res) {
  $("pool").innerHTML = order.filter((i) => !slots.includes(i)).map(pc).join("") || "<em>Todas las piezas están colocadas</em>";
  $("slots").innerHTML = slots.map((p, i) => `<li class="sl ${res && p !== null ? (p === i ? "ok" : "bad") : ""}" data-s="${i}">${p === null ? '<span class="ph">Suelta aquí el paso ' + (i + 1) + "</span>" : pc(p, bloq[i])}</li>`).join("");
}
$("s1").addEventListener("click", (e) => {
  const p = e.target.closest(".pc"); if (!p || busy) return; const id = +p.dataset.p, at = slots.indexOf(id);
  if (at >= 0 && bloq[at]) return;
  if (at >= 0) slots[at] = null; else { const f = slots.indexOf(null); if (f >= 0) slots[f] = id; }
  drawPuz();
});
$("s1").addEventListener("dragstart", (e) => {
  const p = e.target.closest(".pc"); if (!p) return;
  const at = slots.indexOf(+p.dataset.p); if (busy || (at >= 0 && bloq[at])) { e.preventDefault(); return; }
  e.dataTransfer.setData("text", p.dataset.p);
});
$("s1").addEventListener("dragover", (e) => { if (e.target.closest(".sl,#pool")) e.preventDefault(); });
$("s1").addEventListener("drop", (e) => {
  e.preventDefault(); const txt = e.dataTransfer.getData("text"), p = txt === "" ? NaN : +txt;
  if (busy || !Number.isInteger(p) || p < 0 || p >= PASOS.length) return;   // ignora arrastres que no son piezas
  const from = slots.indexOf(p), sl = e.target.closest(".sl");
  if (from >= 0 && bloq[from]) return;
  if (sl) { const i = +sl.dataset.s; if (bloq[i]) return; if (from >= 0) slots[from] = slots[i]; slots[i] = p; }
  else if (e.target.closest("#pool") && from >= 0) slots[from] = null;
  drawPuz();
});
$("rst").onclick = initPuz;
$("chk").onclick = () => {
  const fb = $("fb");
  if (busy) return;
  if (slots.includes(null)) { fb.className = "fb bad"; fb.textContent = "Faltan pasos por colocar."; return; }
  intentos++;
  const mal = slots.filter((p, i) => p !== i).length; drawPuz(true);
  if (!mal) { fb.className = "fb good"; fb.textContent = `¡Orden perfecto en ${intentos} intento(s)! Así se consume una API.`; $("toFetch").classList.remove("hide"); }
  else {
    fb.className = "fb bad"; fb.textContent = `${PASOS.length - mal} de ${PASOS.length} pasos en su lugar. Hay errores: todas las piezas vuelven a la lista, inténtalo de nuevo.` + (intentos >= 3 ? " Pista: todo lo que usa los datos va dentro del then." : "");
    busy = true; setTimeout(() => { slots = Array(PASOS.length).fill(null); busy = false; drawPuz(); }, 1100);
  }
};
$("toFetch").onclick = () => { $("code").textContent = codigo("datos.results  // ¿results, data o la raíz? Lo descubrimos al ejecutar"); resetRun(); show(2); };
const codigo = (ruta) => `const estado = document.getElementById("estado");
estado.textContent = "Cargando…";               // paso 3

fetch("${S.url}")                               // paso 4
  .then((respuesta) => {                        // paso 5
    if (!respuesta.ok) throw new Error(respuesta.status);
    return respuesta.json();
  })
  .then((datos) => {                            // paso 6
    const lista = ${ruta};
    pintarTabla(lista);                         // paso 7: dentro del then
  })
  .catch(() => {                                // paso 8
    estado.textContent = "No se pudo cargar.";
  });`;

/* ---------- paso 3: fetch real ---------- */
const PREF = ["results", "data", "items", "characters", "episodes", "locations", "docs", "records", "entries", "list"];
function resetRun() { $("red").classList.add("hide"); $("found").textContent = ""; $("toSheet").classList.add("hide"); document.querySelector(".state").className = "state"; }
function chip(c) { document.querySelector(".state").className = "state " + c; }
function logRed(url, est, ms, err) {
  const r = $("red"); r.classList.remove("hide");
  if (!r.children.length) r.innerHTML = '<div class="h"><span>Método</span><span>Estado</span><span>Tiempo</span><span>URL</span></div>';
  r.insertAdjacentHTML("beforeend", `<div class="${err ? "e" : ""}"><span>GET</span><span>${est}</span><span>${ms} ms</span><span>${esc(url)}${err ? "<br>⚠ " + esc(err) : ""}</span></div>`);
}
function pedir(url) {
  chip("p"); const t0 = performance.now(); let est = "—";
  return fetch(url)
    .then((r) => { est = r.status; if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then((d) => { chip("f"); logRed(url, est, Math.round(performance.now() - t0)); return d; })
    .catch((e) => { chip("r"); logRed(url, est, Math.round(performance.now() - t0), e.message === "Failed to fetch" ? "El navegador bloqueó la petición (CORS) o no hay internet. CORS no se arregla desde el front-end: se cambia de API." : e.message); throw e; });
}
function hallar(d, p = "datos", n = 0) {
  if (Array.isArray(d)) return d.length && d[0] && typeof d[0] === "object" ? [d, p] : null;
  if (!d || typeof d !== "object" || n > 2) return null;
  const ks = Object.keys(d).sort((a, b) => (PREF.includes(a) ? 0 : 1) - (PREF.includes(b) ? 0 : 1));
  for (const k of ks) { const r = hallar(d[k], p + "." + k, n + 1); if (r) return r; }
  return null;
}
function plano(o, pre = "", n = 0, out = {}) {
  for (const k in o) {
    const v = o[k], key = pre + k;
    if (Array.isArray(v)) out[key] = v.every((x) => x === null || typeof x !== "object") ? v.join(" | ") : v.length + " elementos";
    else if (v && typeof v === "object") { if (n < 1) plano(v, key + ".", n + 1, out); else out[key] = JSON.stringify(v).slice(0, 80); }
    else out[key] = v;
  }
  return out;
}
const siguiente = (d) => [d?.next, d?.info?.next, d?.paging?.next, d?.links?.next].find((x) => typeof x === "string") || null;
function leer(d) { const h = hallar(d); return h ? h : [[d], "datos (objeto único)"]; }
$("run").onclick = () => {
  resetRun(); $("found").textContent = "Cargando…";
  pedir(S.url).then((d) => {
    const [lista, ruta] = leer(d);
    S.rows = lista.map((x) => plano(x)); S.next = siguiente(d);
    S.cols = []; S.rows.slice(0, 60).forEach((r) => Object.keys(r).forEach((k) => !S.cols.includes(k) && S.cols.push(k))); S.cols = S.cols.slice(0, 14);
    detectar(); sort = { k: null, d: 1 };
    $("code").textContent = codigo(ruta === "datos" ? "datos  // la lista es la raíz" : ruta);
    $("found").textContent = `✅ Lista encontrada en «${ruta}»: ${S.rows.length} elementos · ${S.cols.length} campos · título: ${S.titleK}${S.imgK ? " · imagen: " + S.imgK : ""}${S.next ? " · hay más páginas" : ""}`;
    $("toSheet").classList.remove("hide");
  }).catch(() => { $("found").textContent = "❌ No se pudo cargar. Revisa la URL y la pestaña Red de tu navegador."; });
};

/* ---------- detección de campos ---------- */
const IMG = /image|img|portrait|photo|avatar|thumb|sprite|poster|picture|icon/i;
function detectar() {
  const R = S.rows;
  S.imgK = S.cols.find((k) => IMG.test(k) && R.some((r) => typeof r[k] === "string" && /^(https?:)?\/|\.(png|jpe?g|webp|gif|svg)/i.test(r[k]))) || null;
  S.titleK = ["name", "title", "name_english", "nombre", "username", "displayName", "role.displayName", "id"].find((k) => S.cols.includes(k)) || S.cols[0];
  const uniq = (k) => new Set(R.map((r) => r[k])).size;
  const ok = (k) => k !== S.titleK && k !== S.imgK && uniq(k) > 1 && uniq(k) <= 12 && R.every((r) => typeof r[k] !== "object");
  const pref = ["status", "gender", "type", "species", "category", "genre", "rating", "season", "role.displayName"];
  S.catK = pref.find((k) => S.cols.includes(k) && ok(k)) || S.cols.find(ok) || null;
}
function imgUrl(v) {
  if (!v || typeof v !== "string") return ""; if (/^https?:/.test(v)) return v; if (v.startsWith("//")) return "https:" + v; if (v[0] !== "/") return "";
  const u = new URL(S.url); return (/thesimpsonsapi/.test(u.host) ? "https://cdn.thesimpsonsapi.com/500" : u.origin) + v;
}

/* ---------- paso 4: hoja tipo Excel ---------- */
let sort = { k: null, d: 1 }, filtro = "";
const L = (i) => String.fromCharCode(65 + i);
const celda = (x, c) => { const v = x[c]; if (c === S.imgK && imgUrl(v)) return `<img src="${esc(imgUrl(v))}" alt="" loading="lazy">`; return v === null || v === undefined ? "<i>null</i>" : esc(v); };
function hoja() {
  const t = filtro.toLowerCase();
  let r = S.rows.filter((x) => !t || Object.values(x).some((v) => String(v).toLowerCase().includes(t)));
  if (sort.k) r = [...r].sort((a, b) => String(a[sort.k] ?? "").localeCompare(String(b[sort.k] ?? ""), "es", { numeric: true }) * sort.d);
  S.view = r;
  $("tbl").innerHTML = `<thead><tr><th class="c0"></th>${S.cols.map((c, i) => `<th class="L">${L(i)}</th>`).join("")}</tr><tr><th class="c0"></th>${S.cols.map((c, i) => `<th class="N" data-i="${i}">${esc(c)}${sort.k === c ? (sort.d > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead><tbody>${r.slice(0, 500).map((x, i) => `<tr><th class="c0">${i + 1}</th>${S.cols.map((c, j) => `<td data-i="${i}" data-j="${j}">${celda(x, c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  $("cnt").textContent = `${r.length} de ${S.rows.length} filas · ${S.cols.length} columnas`;
  $("more").disabled = !S.next; $("more").style.opacity = S.next ? 1 : 0.4;
}
$("toSheet").onclick = () => { filtro = ""; $("q").value = ""; hoja(); show(3); };
$("q").oninput = (e) => { filtro = e.target.value; hoja(); };
$("tbl").addEventListener("click", (e) => {
  const th = e.target.closest("th.N"), td = e.target.closest("td");
  if (th) { const k = S.cols[+th.dataset.i]; sort = sort.k === k ? { k, d: -sort.d } : { k, d: 1 }; hoja(); }
  else if (td) { const c = S.cols[+td.dataset.j]; $("fx").textContent = `${L(+td.dataset.j)}${+td.dataset.i + 1} · ${c} = ${S.view[+td.dataset.i][c]}`; }
});
$("more").onclick = () => {
  if (!S.next) return; $("more").textContent = "Cargando…";
  pedir(S.next).then((d) => { const [lista] = leer(d); S.rows.push(...lista.map((x) => plano(x))); S.next = siguiente(d); hoja(); })
    .catch(() => { $("cnt").textContent = "No se pudo cargar la siguiente página."; }).finally(() => { $("more").textContent = "➕ Cargar siguiente página"; });
};
function bajar(nombre, tipo, txt) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: tipo })); a.download = nombre; a.click(); }
$("csv").onclick = () => {
  const e = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  bajar("datos.csv", "text/csv;charset=utf-8", "\ufeff" + [S.cols.map(e).join(","), ...S.view.map((r) => S.cols.map((c) => e(r[c])).join(","))].join("\n"));
};
$("toGen").onclick = () => show(4);

/* ---------- paso 5: 20 diseños de página ---------- */
const F = { sys: "system-ui,sans-serif", lilita: "'Lilita One',cursive", orb: "'Orbitron',sans-serif", play: "'Playfair Display',serif", px: "'Press Start 2P',monospace", grot: "'Space Grotesk',sans-serif", fred: "'Fredoka',sans-serif", beb: "'Bebas Neue',Impact,sans-serif", mer: "'Merriweather',serif", mono: "ui-monospace,Consolas,monospace" };
const LABEL = { grid: "Cuadrícula", magazine: "Revista", polaroid: "Polaroid", list: "Lista", timeline: "Línea de tiempo", carousel: "Carrusel", masonry: "Muro", chips: "Etiquetas", flip: "Revela al pasar el mouse" };
/* [nombre, layout, fondo, texto, tarjeta, acento, fuente, radio, borde, sombra, css extra] */
const T = [
  ["Clásico claro", "grid", "#f4f6fb", "#1d2433", "#ffffff", "#2f6df6", "sys", 14, "1px solid #dfe4ee", "0 4px 14px #0001"],
  ["Springfield", "grid", "#79c8ff", "#1b1b1b", "#fff7c2", "#e0a800", "lilita", 18, "4px solid #1b1b1b", "0 6px 0 #1b1b1b"],
  ["Neón nocturno", "grid", "#0a0a1f", "#e8ecff", "#14143a", "#00f0ff", "orb", 12, "1px solid #00f0ff", "0 0 18px #00f0ff55"],
  ["Periódico", "magazine", "#efe9da", "#1a1a1a", "#fffdf5", "#b3001b", "play", 0, "1px solid #222", "none"],
  ["Retro 8-bit", "grid", "#1a1c2c", "#f4f4f4", "#333c57", "#ffcd75", "px", 0, "4px solid #f4f4f4", "6px 6px 0 #000", ".b h3{font-size:11px;line-height:1.5}.b p{font-size:8px;line-height:1.6}h1{font-size:24px}"],
  ["Polaroid", "polaroid", "#cdb892", "#2b2118", "#ffffff", "#b03a2e", "fred", 4, "0", "0 8px 18px #0004"],
  ["Lista minimal", "list", "#ffffff", "#111111", "#ffffff", "#111111", "grot", 0, "0", "none", ".it{border-bottom:1px solid #ddd!important}"],
  ["Cristal", "grid", "linear-gradient(135deg,#6a5cff,#ff7ad9)", "#ffffff", "rgba(255,255,255,.18)", "#ffffff", "fred", 22, "1px solid rgba(255,255,255,.5)", "0 8px 30px #0003", ".it{backdrop-filter:blur(10px)}.ph{color:#6a5cff!important}"],
  ["Línea de tiempo", "timeline", "#fbfaf7", "#222", "#ffffff", "#e4572e", "grot", 12, "1px solid #e6e1d8", "0 3px 10px #0001"],
  ["Carrusel", "carousel", "#101820", "#f2f2f2", "#1b2735", "#ffb703", "grot", 18, "1px solid #2c3a4d", "0 8px 20px #0006"],
  ["Muro de fotos", "masonry", "#f0f0f0", "#222", "#ffffff", "#7c3aed", "grot", 10, "0", "0 3px 12px #0002"],
  ["Tablero oscuro", "grid", "#0f172a", "#e2e8f0", "#1e293b", "#38bdf8", "grot", 10, "1px solid #334155", "none"],
  ["Etiquetas", "chips", "#fff7ed", "#431407", "#ffffff", "#ea580c", "fred", 99, "2px solid #fdba74", "none"],
  ["Cómic", "grid", "#fff3a0", "#000000", "#ffffff", "#e63946", "beb", 0, "3px solid #000", "5px 5px 0 #000", ".it:nth-child(odd){transform:rotate(-1deg)}.it:nth-child(even){transform:rotate(1deg)}h1{letter-spacing:2px}.b h3{font-size:1.4rem}"],
  ["Kawaii pastel", "grid", "#ffe4f1", "#5b2a4a", "#ffffff", "#ff6fae", "fred", 28, "3px solid #ffc2de", "0 6px 0 #ffc2de"],
  ["Dorado elegante", "magazine", "#0b0b0b", "#f3ecd8", "#171717", "#d4af37", "play", 2, "1px solid #d4af37", "none"],
  ["Terminal", "list", "#000000", "#39ff14", "#031203", "#39ff14", "mono", 0, "1px solid #39ff14", "none", ".ph{color:#000!important}"],
  ["Bosque", "masonry", "#e8f0e1", "#1f3a1f", "#fbfff7", "#2e7d32", "mer", 16, "2px solid #b7d3a8", "0 4px 0 #b7d3a8"],
  ["Océano", "flip", "linear-gradient(160deg,#00416a,#00b4d8)", "#ffffff", "#023e5a", "#90e0ef", "fred", 18, "2px solid #90e0ef", "0 8px 20px #0004"],
  ["Atardecer", "flip", "linear-gradient(160deg,#ff9a3c,#8e2de2)", "#ffffff", "#4a1d6b", "#ffe29a", "lilita", 20, "3px solid #ffe29a", "0 8px 20px #0004"],
];
const LAY = {
  grid: ".wrap{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}",
  list: ".wrap{display:flex;flex-direction:column;gap:10px}.it{display:flex;align-items:center;gap:14px}.it img,.ph{width:76px;height:76px;aspect-ratio:auto;flex:none;font-size:28px}.b{padding:8px 12px 8px 0}.b p{display:inline-block;margin-right:12px}",
  masonry: ".wrap{columns:220px;column-gap:18px}.it{break-inside:avoid;margin-bottom:18px}.it:nth-child(3n) img{aspect-ratio:3/4}.it:nth-child(3n+1) img{aspect-ratio:4/5}",
  polaroid: ".wrap{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:26px}.it{padding:12px 12px 4px;transform:rotate(-2deg);transition:.2s}.it:nth-child(even){transform:rotate(2deg)}.it:hover{transform:rotate(0) scale(1.04)}.b{text-align:center}",
  timeline: ".wrap{border-left:4px solid var(--ac);padding-left:26px;max-width:760px;display:flex;flex-direction:column;gap:18px}.it{display:flex;gap:14px;position:relative;overflow:visible}.it::before{content:'';position:absolute;left:-39px;top:22px;width:16px;height:16px;border-radius:50%;background:var(--ac)}.it img,.ph{width:110px;height:110px;aspect-ratio:auto;flex:none}",
  carousel: ".wrap{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 2px 18px}.it{flex:0 0 260px;scroll-snap-align:start}",
  chips: ".wrap{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}.it{display:flex;align-items:center;gap:8px;padding:4px 14px 4px 4px}.it img,.ph{width:38px;height:38px;aspect-ratio:auto;border-radius:50%;font-size:16px}.b{padding:0}.b h3{margin:0;font-size:.9rem}.b p{display:none}",
  magazine: ".wrap{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}.it:first-child{grid-column:span 2;grid-row:span 2}.it:first-child h3{font-size:1.8rem}",
  flip: ".wrap{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px}.it{position:relative;aspect-ratio:3/4}.it img,.ph{position:absolute;inset:0;width:100%;height:100%;aspect-ratio:auto}.b{position:absolute;inset:auto 0 0 0;background:linear-gradient(transparent,#000c);color:#fff;transition:.25s}.it:hover .b{inset:0;background:#000b;overflow:auto}.b h3{color:#fff}.b p{display:none}.it:hover .b p{display:block}",
};
/* Este script viaja DENTRO de la página generada (se serializa con toString) */
function PS(D) {
  const $ = (i) => document.getElementById(i), w = $("w"), q = $("q"), ch = $("chips"); let f = "";
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function draw() {
    const t = q.value.toLowerCase(), r = D.items.filter((i) => (!f || i.c === f) && (!t || i.s.includes(t)));
    w.innerHTML = r.map((i) => '<article class="it">' + (i.i ? '<img loading="lazy" src="' + e(i.i) + '" alt="' + e((i.t || "?")[0]) + '" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'ph\',textContent:this.alt}))">' : '<div class="ph">' + e((i.t || "?")[0]) + "</div>") + '<div class="b"><h3>' + e(i.t) + "</h3>" + i.f.map((p) => "<p><b>" + e(p[0]) + ":</b> " + e(p[1]) + "</p>").join("") + "</div></article>").join("") || "<p>Sin resultados.</p>";
    $("n").textContent = r.length + " de " + D.items.length + " registros";
  }
  if (D.cats.length) {
    ch.innerHTML = ["Todos"].concat(D.cats).map((c) => "<button>" + e(c) + "</button>").join("");
    ch.onclick = (ev) => { const b = ev.target.closest("button"); if (!b) return; f = b.textContent === "Todos" ? "" : b.textContent; [...ch.children].forEach((x) => x.classList.toggle("on", x === b)); draw(); };
    ch.firstChild.classList.add("on");
  }
  q.oninput = draw; draw();
  if (D.deco.length) {
    const box = $("deco");
    box.className = "deco banner"; document.body.insertBefore(box, document.querySelector("header")); box.innerHTML = D.deco.map((s, i) => '<img src="' + s + '" alt=""' + (i ? " hidden" : "") + ">").join("");
    let k = 0; if (D.deco.length > 1) setInterval(() => { const m = box.children; m[k].hidden = true; k = (k + 1) % m.length; m[k].hidden = false; }, 3500);
  }
}
function items() {
  const campos = S.cols.filter((c) => ![S.titleK, S.imgK, S.catK, "id"].includes(c));
  return S.rows.slice(0, 400).map((r) => ({
    t: String(r[S.titleK] ?? ""), i: S.imgK ? imgUrl(r[S.imgK]) : "", c: S.catK ? String(r[S.catK] ?? "") : "",
    f: [...(S.catK ? [S.catK] : []), ...campos].filter((c) => r[c] !== null && r[c] !== "" && r[c] !== undefined).slice(0, 4).map((c) => [c, String(r[c]).slice(0, 110)]),
    s: Object.values(r).join(" ").toLowerCase(),
  }));
}
function pagina(t) {
  const [nom, lay, bg, fg, cd, ac, fn, rad, bd, sh, ex = ""] = t, host = new URL(S.url).hostname;
  const seg = new URL(S.url).pathname.split("/").filter(Boolean).pop() || host, titulo = seg[0].toUpperCase() + seg.slice(1);
  const D = { deco, items: items(), cats: S.catK ? [...new Set(S.rows.map((r) => r[S.catK]).filter((v) => v != null && v !== ""))].map(String) : [] };
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)} · ${nom}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Orbitron:wght@700&family=Playfair+Display:wght@700&family=Press+Start+2P&family=Space+Grotesk:wght@500;700&family=Fredoka:wght@500;700&family=Bebas+Neue&family=Merriweather:wght@700&display=swap">
<style>:root{--ac:${ac}}*{box-sizing:border-box}body{margin:0;background:${bg};background-attachment:fixed;color:${fg};font-family:${F[fn]};min-height:100vh;padding:24px}
header{max-width:1100px;margin:0 auto 22px;text-align:center}h1{font-size:clamp(28px,5vw,48px);margin:0 0 6px;color:${ac}}.meta{opacity:.8;margin:0 0 14px}
#q{width:min(100%,420px);padding:12px 16px;border-radius:${Math.min(rad, 24)}px;border:${bd};background:${cd};color:${fg};font:inherit}
#chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px}#chips button{font:inherit;padding:6px 14px;border-radius:99px;border:${bd};background:${cd};color:${fg};cursor:pointer}#chips button.on{background:${ac};color:#000}
.wrap{max-width:1100px;margin:auto}.it{background:${cd};border:${bd};border-radius:${rad}px;box-shadow:${sh};overflow:hidden}
.it img,.ph{width:100%;aspect-ratio:1;object-fit:cover;display:block}.ph{display:grid;place-items:center;background:${ac};color:#000;font-size:48px}
.b{padding:12px 14px}.b h3{margin:0 0 6px;font-size:1.05rem;color:${ac}}.b p{margin:2px 0;font-size:.86rem;overflow-wrap:anywhere}footer{text-align:center;opacity:.7;margin-top:30px;font-size:.8rem}
.deco{max-width:1100px;margin:0 auto 22px}.deco.banner img{width:100%;height:clamp(140px,28vw,300px);object-fit:cover;border-radius:${rad}px;border:${bd};box-shadow:${sh};display:block}.deco.banner img[hidden]{display:none}.deco.gallery{display:flex;gap:12px;overflow-x:auto;padding:4px}.deco.gallery img{height:150px;flex:none;border-radius:${rad}px;border:${bd};box-shadow:${sh}}
${LAY[lay]}${ex}</style></head><body>
<header><h1>${esc(titulo)}</h1><p class="meta" id="n"></p><input id="q" type="search" placeholder="Buscar…"><div id="chips"></div></header>
<div id="deco"></div><main class="wrap" id="w"></main><footer>Datos de ${esc(host)} · página generada con el Laboratorio fetch</footer>
<script>(${PS})(${JSON.stringify(D).replace(/</g, "\\u003c")})<\/script></body></html>`;
}
let salida = "", temaSel = null;
const deco = [];
/* imágenes del computador: se reducen a 1000 px y se incrustan como datos en la página */
function reducir(file) {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.82));
      };
      im.onerror = () => res(null); im.src = fr.result;
    };
    fr.onerror = () => res(null); fr.readAsDataURL(file);
  });
}
function miniaturas() { $("dthumbs").innerHTML = deco.map((s, i) => `<span><img src="${s}" alt=""><button data-i="${i}" title="Quitar">✕</button></span>`).join(""); }
function regenerar() { if (temaSel !== null) { salida = pagina(T[temaSel]); $("frame").srcdoc = salida; } }
$("files").onchange = async (e) => { for (const f of [...e.target.files]) { if (deco.length >= 8) break; const u = await reducir(f); if (u) deco.push(u); } e.target.value = ""; miniaturas(); regenerar(); };
$("dthumbs").onclick = (e) => { const b = e.target.closest("button"); if (b) { deco.splice(+b.dataset.i, 1); miniaturas(); regenerar(); } };
$("themes").innerHTML = T.map((t, i) => `<button class="th" data-i="${i}" style="background:${t[2]};color:${t[3]};font-family:${F[t[6]]};border-radius:${Math.min(t[7], 16)}px"><span class="mini" style="background:${t[4]};border:${t[8]}"><i style="background:${t[5]}"></i><i style="background:${t[5]};width:55%"></i></span><b style="font-size:${t[6] === "px" ? 10 : 15}px">${i + 1}. ${t[0]}</b><small>${LABEL[t[1]]}</small></button>`).join("");
$("themes").addEventListener("click", (e) => {
  const b = e.target.closest(".th"); if (!b) return;
  temaSel = +b.dataset.i; salida = pagina(T[temaSel]); $("frame").srcdoc = salida; $("prev").classList.remove("hide"); $("prev").scrollIntoView({ behavior: "smooth" });
});
$("dl").onclick = () => bajar("pagina-" + new URL(S.url).hostname.replace(/\./g, "-") + ".html", "text/html;charset=utf-8", salida);
$("tab").onclick = () => window.open(URL.createObjectURL(new Blob([salida], { type: "text/html" })), "_blank");
show(0);
