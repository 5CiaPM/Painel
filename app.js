import { firebaseConfig, usarFirebase } from "./firebase-config.js";

/* ================= utilidades ================= */
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBR = (iso) => iso.split("-").reverse().join("/");
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const DIAS = ["dom","seg","ter","qua","qui","sex","sáb"];
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function toast(html, ms = 4500) {
  const t = $("#toast");
  t.innerHTML = html;
  t.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("on"), ms);
}

/* ================= armazenamento ================= */
// Dois modos com a mesma interface: Firestore (nuvem) ou localStorage (local).
function criarStoreLocal() {
  const subs = {};
  const ler = (c) => { try { return JSON.parse(localStorage.getItem("painel:" + c)) || []; } catch { return []; } };
  const gravar = (c, v) => { try { localStorage.setItem("painel:" + c, JSON.stringify(v)); } catch { toast("Não foi possível salvar neste navegador."); } };
  const emitir = (c) => (subs[c] || []).forEach((cb) => cb(ler(c)));
  return {
    modo: "local",
    subscribe(c, cb) { (subs[c] ||= []).push(cb); cb(ler(c)); },
    async add(c, obj) { const l = ler(c); l.push({ id: crypto.randomUUID(), ...obj }); gravar(c, l); emitir(c); },
    async update(c, id, patch) { gravar(c, ler(c).map((x) => (x.id === id ? { ...x, ...patch } : x))); emitir(c); },
    async remove(c, id) { gravar(c, ler(c).filter((x) => x.id !== id)); emitir(c); },
    async getMeta(k) { return localStorage.getItem("painel:meta:" + k); },
    async setMeta(k, v) { localStorage.setItem("painel:meta:" + k, v); },
  };
}

async function criarStoreFirebase() {
  const V = "10.14.1", base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js"),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const store = {
    modo: "nuvem",
    auth, A,
    subscribe(c, cb) {
      F.onSnapshot(F.collection(db, c), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => toast("Erro ao ler dados: " + esc(e.code || e.message)));
    },
    add: (c, obj) => F.addDoc(F.collection(db, c), obj),
    update: (c, id, patch) => F.updateDoc(F.doc(db, c, id), patch),
    remove: (c, id) => F.deleteDoc(F.doc(db, c, id)),
    async getMeta(k) { const s = await F.getDoc(F.doc(db, "config", k)); return s.exists() ? s.data().v : null; },
    setMeta: (k, v) => F.setDoc(F.doc(db, "config", k), { v }),
  };
  return store;
}

/* ================= dados iniciais (da planilha) ================= */
const SEED_ANIV = [
  [3, 11, "SD CAROLI"], [6, 11, "CB TRINDADE"], [7, 11, "CB GUEDES"], [20, 11, "SD JÉSSICA"],
  [21, 11, "SD MATHEUS"], [28, 11, "CB GUILHERME"], [28, 11, "CB EVANDRO"], [28, 11, "CB AUGUSTO"],
];
const SEED_NOTAS = ["Planilha TDS todo dia 09", "Disk denúncia", "Preencher mensalmente — Qualidade", "Levantamento"];

async function semear(store) {
  if (await store.getMeta("seed")) return;
  await Promise.all([
    ...SEED_ANIV.map(([dia, mes, nome]) => store.add("aniversariantes", { dia, mes, nome, ultimoOk: 0 })),
    ...SEED_NOTAS.map((texto) => store.add("notas", { texto })),
  ]);
  await store.setMeta("seed", "1");
}

/* ================= estado ================= */
let store;
const S = { lembretes: [], aniv: [], notas: [] };
const V = { ano: new Date().getFullYear(), mes: new Date().getMonth(), dia: null };

/* ================= botões de link ================= */
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch {}
  const ta = document.createElement("textarea");
  ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand("copy"); } catch {}
  ta.remove(); return ok;
}

async function abrir(b) {
  if (!b.url) return;
  if (b.tipo === "web") { window.open(b.url, "_blank", "noopener"); return; }
  // Navegadores bloqueiam file:// e \\servidor a partir de páginas https:// — copiamos o caminho.
  const ok = await copiar(b.url);
  toast(ok
    ? `Caminho copiado — cole no Explorador de Arquivos (Ctrl+L)<code>${esc(b.url)}</code>`
    : `Copie o caminho manualmente:<code>${esc(b.url)}</code>`, 7000);
}

function montarLinks() {
  const L = window.PAINEL_LINKS || { grupos: [], icones: [] };
  const ic = $("#icones");
  L.icones.forEach((i) => {
    const b = document.createElement("button");
    b.className = "icone"; b.title = i.rotulo; b.setAttribute("aria-label", i.rotulo);
    b.innerHTML = `<img src="${esc(i.img)}" alt="">`;
    b.onclick = () => abrir(i);
    ic.appendChild(b);
  });
  const g = $("#grupos");
  L.grupos.forEach((grp) => {
    const t = document.createElement("div"); t.className = "grupo-t"; t.textContent = grp.titulo; g.appendChild(t);
    const w = document.createElement("div"); w.className = "botoes"; g.appendChild(w);
    grp.botoes.forEach((b) => {
      const el = document.createElement("button");
      el.className = "botao" + (b.cor === "#00B050" ? " verde" : b.cor === "#0070C0" ? " azulp3" : "");
      el.textContent = b.rotulo;
      if (!b.url) { el.disabled = true; el.title = "Sem link definido (edite links.js)"; }
      else { el.title = b.tipo === "web" ? b.url : "Copia o caminho: " + b.url; el.onclick = () => abrir(b); }
      w.appendChild(el);
    });
  });
}

/* ================= agenda ================= */
const dtLembrete = (l) => new Date(`${l.data}T${l.hora || "00:00"}`);
const vencido = (l) => !l.ok && dtLembrete(l) <= new Date();

function renderAlertasAgenda() {
  const box = $("#alertasAgenda");
  const venc = S.lembretes.filter(vencido).sort((a, b) => dtLembrete(a) - dtLembrete(b));
  box.innerHTML = venc.map((l) => `
    <div class="alerta-item" role="alert">
      <span>🔔</span><span class="quando">${dataBR(l.data)} ${esc(l.hora)}</span>
      <span class="txt">${esc(l.texto)}</span>
      <button class="btn ok" data-ok="${esc(l.id)}">OK</button>
    </div>`).join("");
}

function renderCalendario() {
  $("#mesTitulo").textContent = `${MESES[V.mes]} de ${V.ano}`;
  const cal = $("#cal");
  const hoje = ymd(new Date());
  const primeiro = new Date(V.ano, V.mes, 1).getDay();
  const total = new Date(V.ano, V.mes + 1, 0).getDate();
  let h = DIAS.map((d) => `<div class="dow">${d}</div>`).join("");
  for (let i = 0; i < primeiro; i++) h += `<div class="dia vazio"></div>`;
  for (let d = 1; d <= total; d++) {
    const key = `${V.ano}-${pad(V.mes + 1)}-${pad(d)}`;
    const ls = S.lembretes.filter((l) => l.data === key);
    const pend = ls.some(vencido);
    const dots = ls.slice(0, 3).map((l) => `<i class="${!l.ok && vencido(l) ? "pend" : ""}"></i>`).join("");
    h += `<button class="dia${key === hoje ? " hoje" : ""}${key === V.dia ? " sel" : ""}${pend ? " alerta" : ""}" data-dia="${key}" aria-label="${d} de ${MESES[V.mes]}${ls.length ? ", " + ls.length + " compromisso(s)" : ""}"><span class="n">${d}</span><span class="pt">${dots}</span></button>`;
  }
  cal.innerHTML = h;
}

function renderLista() {
  const ul = $("#listaLembretes");
  const prefixo = `${V.ano}-${pad(V.mes + 1)}`;
  let ls = S.lembretes.filter((l) => (V.dia ? l.data === V.dia : l.data.startsWith(prefixo)));
  ls.sort((a, b) => dtLembrete(a) - dtLembrete(b));
  $("#listaTitulo").textContent = V.dia ? `Compromissos de ${dataBR(V.dia)}` : "Compromissos do mês";
  $("#limparFiltro").hidden = !V.dia;
  ul.innerHTML = ls.length ? ls.map((l) => {
    const venc = vencido(l);
    return `<li class="${l.ok ? "feito" : ""}${venc ? " piscando" : ""}">
      <span class="quando">${dataBR(l.data).slice(0, 5)} ${esc(l.hora)}</span>
      <span class="txt">${esc(l.texto)}</span>
      ${l.ok ? "✓" : venc ? `<button class="btn ok" data-ok="${esc(l.id)}">OK</button>` : ""}
      <button class="x" data-del-lem="${esc(l.id)}" aria-label="Excluir compromisso" title="Excluir">×</button></li>`;
  }).join("") : `<li class="vazio">Nenhum compromisso${V.dia ? " neste dia" : " neste mês"}.</li>`;
}

function renderNotas() {
  const ul = $("#listaNotas");
  ul.innerHTML = S.notas.length ? S.notas.map((n) => `<li><span class="txt">${esc(n.texto)}</span>
    <button class="x" data-del-nota="${esc(n.id)}" aria-label="Excluir lembrete fixo" title="Excluir">×</button></li>`).join("")
    : `<li class="vazio">Sem lembretes fixos.</li>`;
}

/* ================= aniversariantes ================= */
// Pisca a partir do dia do aniversário (e até 3 dias depois, caso o painel não tenha sido aberto) até clicar em OK.
const JANELA_DIAS = 3;
function ocorrencia(a, hoje) {
  const cands = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]
    .map((y) => new Date(y, a.mes - 1, a.dia));
  // aniversário "ativo": ocorrência entre hoje-JANELA e hoje
  const ativo = cands.find((d) => { const df = Math.round((hoje - d) / 864e5); return df >= 0 && df <= JANELA_DIAS; });
  if (ativo) return { data: ativo, ativo: a.ultimoOk !== ativo.getFullYear() };
  const prox = cands.find((d) => d > hoje);
  return { data: prox, ativo: false };
}

function renderAniv() {
  const hoje = startOfDay(new Date());
  const itens = S.aniv.map((a) => ({ a, ...ocorrencia(a, hoje) }))
    .sort((x, y) => (y.ativo - x.ativo) || (Math.abs(x.data - hoje) - Math.abs(y.data - hoje)) || x.a.nome.localeCompare(y.a.nome));
  $("#listaAniv").innerHTML = itens.length ? itens.map(({ a, data, ativo }) => {
    const ehHoje = data.getTime() === hoje.getTime();
    return `<li class="${ativo ? "piscando" : ""}${ehHoje ? " hoje-anv" : ""}">
      <span class="quando">${pad(a.dia)}/${pad(a.mes)}</span><span class="txt">${esc(a.nome)}</span>
      ${ativo ? `<button class="btn ok" data-ok-aniv="${esc(a.id)}" data-ano="${data.getFullYear()}">OK</button>` : ""}
      <button class="x" data-del-aniv="${esc(a.id)}" aria-label="Excluir aniversariante" title="Excluir">×</button></li>`;
  }).join("") : `<li class="vazio">Nenhum aniversariante cadastrado.</li>`;
  return itens.filter((i) => i.ativo).length;
}

/* ================= render geral / título piscando ================= */
let tituloTimer = null;
const TITULO = document.title;
function piscarTitulo(n) {
  if (n && !tituloTimer) {
    let on = false;
    tituloTimer = setInterval(() => { on = !on; document.title = on ? `🔔 (${n}) ALERTA — Painel` : TITULO; }, 1000);
  } else if (!n && tituloTimer) { clearInterval(tituloTimer); tituloTimer = null; document.title = TITULO; }
}

function renderTudo() {
  renderAlertasAgenda(); renderCalendario(); renderLista(); renderNotas();
  const na = renderAniv();
  piscarTitulo(S.lembretes.filter(vencido).length + na);
}

/* ================= eventos ================= */
function ligarEventos() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    const d = t.dataset;
    if (d.ok) store.update("lembretes", d.ok, { ok: true });
    else if (d.okAniv) store.update("aniversariantes", d.okAniv, { ultimoOk: Number(d.ano) });
    else if (d.delLem && confirm("Excluir este compromisso?")) store.remove("lembretes", d.delLem);
    else if (d.delAniv && confirm("Excluir este aniversariante?")) store.remove("aniversariantes", d.delAniv);
    else if (d.delNota) store.remove("notas", d.delNota);
    else if (d.dia) {
      V.dia = V.dia === d.dia ? null : d.dia;
      if (V.dia) $("#lemData").value = V.dia;
      renderCalendario(); renderLista();
    }
  });

  $("#mesAnt").onclick = () => { V.mes--; if (V.mes < 0) { V.mes = 11; V.ano--; } V.dia = null; renderTudo(); };
  $("#mesProx").onclick = () => { V.mes++; if (V.mes > 11) { V.mes = 0; V.ano++; } V.dia = null; renderTudo(); };
  $("#mesHoje").onclick = () => { const n = new Date(); V.ano = n.getFullYear(); V.mes = n.getMonth(); V.dia = null; renderTudo(); };
  $("#limparFiltro").onclick = () => { V.dia = null; renderCalendario(); renderLista(); };

  $("#formLembrete").onsubmit = async (e) => {
    e.preventDefault();
    const data = $("#lemData").value, hora = $("#lemHora").value, texto = $("#lemTexto").value.trim();
    if (!data || !hora || !texto) return;
    await store.add("lembretes", { data, hora, texto, ok: false });
    $("#lemTexto").value = "";
    toast(`Agendado para ${dataBR(data)} às ${esc(hora)}.`, 2500);
  };
  $("#formNota").onsubmit = async (e) => {
    e.preventDefault();
    const texto = $("#notaTexto").value.trim(); if (!texto) return;
    await store.add("notas", { texto }); $("#notaTexto").value = "";
  };
  $("#formAniv").onsubmit = async (e) => {
    e.preventDefault();
    const dia = Number($("#anDia").value), mes = Number($("#anMes").value), nome = $("#anNome").value.trim();
    if (!nome || dia < 1 || dia > 31 || mes < 1 || mes > 12) return;
    await store.add("aniversariantes", { dia, mes, nome, ultimoOk: 0 });
    $("#anNome").value = ""; $("#anDia").value = ""; $("#anMes").value = "";
  };
}

function relogio() {
  const n = new Date();
  $("#hora").textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
  $("#dataExtenso").textContent = n.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

/* ================= inicialização ================= */
async function iniciar() {
  const hoje = ymd(new Date());
  $("#lemData").value = hoje;
  $("#lemHora").value = "08:00";
  montarLinks(); ligarEventos(); relogio(); setInterval(relogio, 1000);

  await semear(store).catch((e) => console.warn("seed", e));
  store.subscribe("lembretes", (l) => { S.lembretes = l; renderTudo(); });
  store.subscribe("aniversariantes", (l) => { S.aniv = l; renderTudo(); });
  store.subscribe("notas", (l) => { S.notas = l; renderTudo(); });

  // reavalia alertas a cada 15 s e ao voltar para a aba
  setInterval(renderTudo, 15000);
  document.addEventListener("visibilitychange", () => !document.hidden && renderTudo());
}

async function main() {
  const modo = $("#modo");
  if (!usarFirebase) {
    store = criarStoreLocal();
    modo.textContent = "Modo local (sem nuvem)"; modo.className = "chip local";
    modo.title = "Configure firebase-config.js para salvar na nuvem";
    return iniciar();
  }
  store = await criarStoreFirebase();
  modo.textContent = "Nuvem · Firebase"; modo.className = "chip nuvem";
  const { A, auth } = store;
  let ligado = false;
  $("#sair").hidden = false;
  $("#sair").onclick = () => A.signOut(auth);
  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault(); $("#loginErro").textContent = "";
    try { await A.signInWithEmailAndPassword(auth, $("#loginEmail").value.trim(), $("#loginSenha").value); }
    catch { $("#loginErro").textContent = "E-mail ou senha inválidos."; }
  };
  A.onAuthStateChanged(auth, (u) => {
    $("#login").hidden = !!u;
    if (u && !ligado) { ligado = true; iniciar(); }
    if (!u && ligado) location.reload();
  });
}
main().catch((e) => { console.error(e); toast("Erro ao iniciar: " + esc(e.message || e), 8000); });
