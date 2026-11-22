// Contenitore delle prove di stile: stesso quadro, stesse regole, stesse animazioni; cambia solo il pittore.
import * as THREE from 'three';
import { caricaLivello, Gioco } from './logica.js';
import { LIVELLO_PROVA, LIVELLO_FUSIONE, LIVELLO_DUE } from './livello.js';
import { STILI } from './stili.js';
import { Animatore } from './animatore.js';

const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: q.has('foto') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // oltre 1,5 sui telefoni si paga in fluidità
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const tela3d = renderer.domElement;
const tela2d = document.createElement('canvas');
const scena = document.getElementById('scena');
scena.append(tela3d, tela2d);

// L'editor dei livelli (editor.js) c'è solo quando la pagina viene dal server di sviluppo: il gioco
// pubblicato non lo carica. `bozze`: le mappe modificate e non ancora salvate (restano finché la
// pagina è aperta, anche uscendo e rientrando in un sigillo); `salvate`: l'ultima versione su disco.
const sviluppo = ['127.0.0.1', 'localhost'].includes(location.hostname);
const bozze = new Map(), salvate = new Map();
// la demo pubblicata (tutto quello che non viene dal server di sviluppo): parte dall'overworld e non ha
// la barra in alto con zone e quadri di prova (Luca, 21/11), né i tasti 1-6 che la sostituiscono
const demo = !sviluppo || q.get('demo') === '1'; // ?demo=1 per provarla anche in locale
const quadroChiesto = q.get('quadro') || (demo ? 'mondo' : 'prova');
// ?prova=grande: overworld finto a grandezza vera, solo per misurare il costo del disegno
const defLivello = q.get('prova') === 'grande'
  ? (await import('./strumenti/mondo-finto.js')).mondoFinto({ W: +q.get('w') || 96, H: +q.get('h') || 72 })
  : quadroChiesto === 'mondo' ? await caricaMappa('livelli/zona-iniziale.json')
  : { fusione: LIVELLO_FUSIONE, due: LIVELLO_DUE }[quadroChiesto] || LIVELLO_PROVA;
// le mappe disegnate in Tiled (esportate in JSON: vedi HANDOFF.md)
async function caricaMappa(url) {
  const { daTiled } = await import('./livelli/tiled.js');
  // sempre dal disco: un file cambiato fuori dalla pagina (da Claude, da Tiled, da un'altra scheda)
  // non deve tornare indietro alla versione che la pagina ricordava
  salvate.set(url, await (await fetch(url + '?v=' + document.documentElement.dataset.v + '&t=' + Date.now())).json());
  const m = bozze.get(url) || salvate.get(url);
  const def = daTiled(m);
  def.tiled = m; def.file = url; // per l'editor
  if (def.sigilli?.length) await numera(def);
  return def;
}
/**
 * I numeri dei sottolivelli (Luca, 22/11): si seguono le isole nell'ordine in cui si raggiungono (il
 * risolutore dice in quante mosse), e su ogni isola prima l'obbligatorio, poi il facoltativo. Calcolati
 * dalla mappa: se i sigilli si spostano, si rinumerano da soli. Le isole irraggiungibili vanno in fondo.
 */
async function numera(def) {
  const { esplora } = await import('./misura.js');
  const liv = caricaLivello(def), r = esplora(liv), isole = [...new Set(liv.tratti.map((t) => t.nome))];
  const quanto = (t) => (r.arrivi.has(t) ? r.arrivi.get(t).length : 1e6 + isole.indexOf(t));
  const sig = def.sigilli.map((s) => ({ s, d: quanto(liv.trattoDi(s.x, s.y)) }));
  sig.sort((a, b) => a.d - b.d || a.s.facoltativo - b.s.facoltativo);
  sig.forEach((x, i) => { x.s.numero = i + 1; });
}
/** «3 · L'ascensore», o solo il nome se il numero non c'è. */
const conNumero = (n, t) => (n ? `${n} · ${t}` : t);

const avviso = document.getElementById('avviso');
const bottoni = document.getElementById('stili');
let pittore = null, attesa = null, indice = -1, richiesta = 0;
const NOMI = { coniglio: 'Il coniglio', gatto: 'Il gatto' };
const nuovoAnim = (g) => new Animatore(g, {
  suCaduta: (chi) => { avviso.innerHTML = `${NOMI[chi] || 'Il coniglio'} è caduto. <b>Z</b> per tornare indietro.`; avviso.hidden = false; },
  suFine: () => { riprendi(); comandi(); },
  suEntra: (s) => entra(s),
  suVince: () => esci(true),
});
// il livello in corso; nei sottolivelli, quello da cui si è entrati aspetta in `pila` col suo
// pittore ancora vivo (rifare l'overworld costerebbe un secondo a ogni uscita)
let gioco = new Gioco(caricaLivello(defLivello));
gioco.def = defLivello;
let anim = nuovoAnim(gioco);
const pila = [];
let inTransito = false;

const leggi = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch { /* niente */ } };
const tasto = (i) => (i === 9 ? '0' : String(i + 1));

// con un solo stile la barra serve a scegliere la zona (tasti 1 2, ?zona=) e il quadro di prova
// (tasti 3 4 5, ?quadro=). Il quadro si cambia ricaricando: ognuno ha le sue regole e i suoi personaggi.
const ZONE_PROVA = [['iniziale', 'Prato'], ['fuoco', 'Fuoco']];
const QUADRI = [['prova', 'Prova'], ['fusione', 'Fusione'], ['due', 'In due'], ['mondo', 'Mondo']];
// una mappa può dire lei la sua zona; i bottoni la cambiano comunque, per confronto
let zona = q.get('zona') || defLivello.zona || leggi('arcipelago-zona', 'iniziale');
const quadro = quadroChiesto;
const soloUno = STILI.length < 2;
const bottone = (testo, tasto, dati, fa) => {
  const b = document.createElement('button');
  b.innerHTML = `<kbd>${tasto}</kbd>${testo}`; Object.assign(b.dataset, dati);
  b.onclick = () => { fa(); b.blur(); };
  bottoni.appendChild(b);
};
const separa = () => { const sep = document.createElement('span'); sep.className = 'sep'; bottoni.appendChild(sep); };
if (demo) { bottoni.style.display = 'none'; document.querySelectorAll('.solo-sviluppo').forEach((e) => { e.style.display = 'none'; }); }
else if (soloUno) {
  ZONE_PROVA.forEach(([id, nome], i) => bottone(nome, i + 1, { z: id }, () => scegliZona(id)));
  separa();
  QUADRI.forEach(([id, nome], i) => bottone(nome, i + 3, { q: id }, () => scegliQuadro(id)));
}
function scegliZona(id) { zona = id; scrivi('arcipelago-zona', id); scegli(Math.max(0, indice)); }
function scegliQuadro(id) { const u = new URL(location.href); u.searchParams.set('quadro', id); u.searchParams.set('zona', zona); location.href = u; }
if (!soloUno) STILI.forEach((s, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<kbd>${tasto(i)}</kbd>${s.nome}`;
  b.onclick = () => { scegli(i); b.blur(); };
  bottoni.appendChild(b);
});

function misura() {
  // sui telefoni innerWidth può allargarsi insieme a una tela troppo larga: si misura il documento
  const w = document.documentElement.clientWidth, h = document.documentElement.clientHeight, pr = Math.min(devicePixelRatio, 2);
  renderer.setSize(w, h);
  tela2d.width = Math.round(w * pr); tela2d.height = Math.round(h * pr);
  tela2d.style.width = w + 'px'; tela2d.style.height = h + 'px';
  pittore?.dimensioni(w, h);
}

async function scegli(i, { chiuso = false } = {}) {
  const mio = ++richiesta;
  const s = STILI[i];
  const mod = await s.carica();
  if (mio !== richiesta) return;
  pittore?.dispose();
  tela3d.hidden = s.tipo !== '3d'; tela2d.hidden = s.tipo !== '2d';
  pittore = mod.crea(s.tipo === '3d' ? renderer : tela2d, gioco, anim, { zona, chiuso });
  pittore.zona = zona;
  indice = i;
  misura();
  [...bottoni.children].forEach((b, j) => b.classList.toggle('scelto', soloUno ? b.dataset.z === zona || b.dataset.q === quadro : j === i));
  document.body.dataset.stile = s.id;
  scrivi('arcipelago-stile2', s.id);
}

function esegui(m) {
  if (inTransito || inEditor) return;
  if (anim.occupato) { attesa = m; return; }
  anim.riproduci(m === 'cambia' ? gioco.cambia() : gioco.muovi(...m));
}
// con due personaggi si passa dall'uno all'altro (spazio, Tab o il pulsante)
const bCambia = document.getElementById('cambia');
bCambia.onclick = () => { esegui('cambia'); bCambia.blur(); };
function riprendi() { if (attesa) { const a = attesa; attesa = null; esegui(a); } }
function annulla() { if (inTransito) return; attesa = null; anim.interrompi(); gioco.annulla(); anim.sincronizza(); avviso.hidden = !gioco.stato.caduto; comandi(); }
function ricomincia() { if (inTransito) return; attesa = null; anim.interrompi(); gioco.ricomincia(); anim.sincronizza(); avviso.hidden = true; comandi(); }

// I sottolivelli. Si entra salendo su un sigillo chiuso: si chiude il sipario di nuvole, si carica il
// quadro e lo si apre. Si esce arrivando alla meta (il sigillo si spegne e ci si ritrova sopra) o con
// Esc (si torna dove si era, e l'overworld è com'era).
const bEsci = document.getElementById('esci');
const aiutoEsci = document.getElementById('aiuto-esci');
function comandi() {
  const due = gioco.stato.personaggi.length > 1;
  bCambia.hidden = !due; document.getElementById('aiuto-cambia').hidden = !due;
  bEsci.hidden = aiutoEsci.hidden = !pila.length;
  bModifica.hidden = aiutoModifica.hidden = !sviluppo || !gioco.def?.tiled || inTransito;
  // su un sigillo già risolto lo si può rigiocare (Invio o il pulsante)
  const sotto = gioco.sigilloSotto?.();
  bRigioca.hidden = aiutoRigioca.hidden = !sotto || inTransito;
  if (sotto) { const t = titoloDi(sotto.livello); bRigioca.textContent = t ? `Rigioca «${conNumero(sotto.numero, t)}»` : 'Rigioca'; }
  // dentro un sottolivello il suo nome resta in un angolo
  luogo.textContent = pila.length ? conNumero(pila.at(-1).sigillo.numero, gioco.liv.titolo || '') : ''; luogo.hidden = !pila.length;
}
const bRigioca = document.getElementById('rigioca'), aiutoRigioca = document.getElementById('aiuto-rigioca');
const luogo = document.getElementById('luogo'), cartiglio = document.getElementById('cartiglio');
// i nomi dei sottolivelli, letti dai loro file la prima volta che servono (per il pulsante Rigioca)
const titoli = new Map();
function titoloDi(livello) {
  if (!titoli.has(livello)) {
    titoli.set(livello, null);
    caricaMappa(`livelli/sottolivelli/${livello}.json`).then((d) => { titoli.set(livello, d.titolo); comandi(); }).catch(() => {});
  }
  return titoli.get(livello);
}
/** Il nome del sottolivello in grande, mentre si apre il sipario; poi sfuma. */
let tCartiglio = 0;
function mostraCartiglio(titolo, facoltativo, numero) {
  if (!titolo) return;
  cartiglio.querySelector('.nome').textContent = titolo;
  cartiglio.querySelector('.sotto').textContent = [numero ? 'Sigillo ' + numero : '', facoltativo ? 'facoltativo' : ''].filter(Boolean).join(' · ');
  cartiglio.classList.add('visto');
  tCartiglio = setTimeout(() => cartiglio.classList.remove('visto'), 2600);
}
function rigioca() { const s = gioco.sigilloSotto(); if (s && !anim.occupato) entra(s); }
async function entra(sigillo) {
  if (inTransito || !pittore?.chiudiSipario) return;
  inTransito = true; attesa = null; avviso.hidden = true;
  try {
    const [def] = await Promise.all([caricaMappa(`livelli/sottolivelli/${sigillo.livello}.json`), pittore.chiudiSipario()]);
    pila.push({ gioco, anim, pittore, sigillo });
    gioco = new Gioco(caricaLivello(def)); gioco.def = def; anim = nuovoAnim(gioco);
    pittore = null; // quello dell'overworld resta vivo in pila
    await scegli(indice, { chiuso: true });
    titoli.set(sigillo.livello, gioco.liv.titolo);
    comandi();
    // il nome compare a sipario mezzo aperto: sulle nuvole ancora chiuse, bianco su bianco, non si leggeva
    const t = gioco.liv.titolo, sp = pittore.sipario;
    const aspetta = () => { if (sp.k < 0.5) mostraCartiglio(t, sigillo.facoltativo, sigillo.numero); else if (sp.k > 0 && pila.length) tCartiglio = setTimeout(aspetta, 50); };
    tCartiglio = setTimeout(aspetta, 50);
    await pittore.apriSipario();
  } catch (err) {
    console.error(err);
    avviso.textContent = 'Questo sigillo non si apre.'; avviso.hidden = false;
    anim.interrompi(); await pittore?.apriSipario?.();
  } finally { inTransito = false; comandi(); }
}
async function esci(vinto = false) {
  if (inTransito || !pila.length || (!vinto && gioco.stato.vinto)) return;
  inTransito = true; attesa = null; avviso.hidden = true;
  cartiglio.classList.remove('visto'); clearTimeout(tCartiglio);
  try {
    await pittore.chiudiSipario();
    pittore.dispose();
    const su = pila.pop();
    ({ gioco, anim, pittore } = su);
    anim.interrompi(); // il coniglio era rimasto sul sigillo per l'animazione: torna dove dice la logica
    // la prima volta il sigillo si spegne e ci si ritrova sopra; rigiocandolo si è già lì: solo il saltello
    if (vinto) anim.riproduci(gioco.risolti.has(su.sigillo.livello) ? [{ tipo: 'risolto' }] : gioco.risolvi(su.sigillo.livello));
    if (pittore.zona !== zona) { pittore.dispose(); pittore = null; await scegli(indice, { chiuso: true }); }
    else { pittore.sipario.k = 1; misura(); }
    comandi();
    await pittore.apriSipario();
  } finally { inTransito = false; comandi(); }
  if (vinto) fineDemo();
}
bEsci.onclick = () => { esci(); bEsci.blur(); };

// ---- la fine della demo (Luca, 21/11): quando tutti gli obbligatori delle isole della demo sono
// risolti, un foglio con la percentuale (sigilli risolti su quelli delle isole della demo) e l'elenco
// isola per isola. Torna una seconda volta solo arrivando al 100%. Dal 22/11 c'è anche l'approdo.
const ISOLE_DEMO = [['casa', 'La casa'], ['frutteto', 'Il frutteto'], ['radura', 'La radura'], ['pietre', 'Le pietre'], ['approdo', "L'approdo"]];
const fine = document.getElementById('fine');
let fineVista = false, centoVisto = false;
async function fineDemo(forza = false) {
  if ((!demo && !forza) || pila.length) return;
  const sig = [...gioco.liv.sigilli.values()].map((s) => ({ s, isola: gioco.liv.trattoDi(s.x, s.y) })).filter((x) => ISOLE_DEMO.some(([id]) => id === x.isola));
  if (!sig.length) return;
  const fatto = (x) => gioco.risolti.has(x.s.livello), fatti = sig.filter(fatto).length, tutti = fatti === sig.length;
  if (!forza) {
    if (!sig.filter((x) => !x.s.facoltativo).every(fatto)) return;
    if (tutti ? centoVisto : fineVista) return;
  }
  fineVista = true; if (tutti) centoVisto = true;
  // i nomi dei sottolivelli si leggono dai loro file: quelli mai visti vanno caricati prima
  await Promise.all(sig.filter((x) => !titoloDi(x.s.livello)).map((x) => caricaMappa(`livelli/sottolivelli/${x.s.livello}.json`).then((d) => titoli.set(x.s.livello, d.titolo)).catch(() => {})));
  fine.querySelector('.cento').textContent = Math.round((fatti / sig.length) * 100) + '%';
  fine.querySelector('.quanti').textContent = tutti ? `Tutti gli ${sig.length} sigilli risolti` : `${fatti} sigilli risolti su ${sig.length}`;
  const t = fine.querySelector('table'); t.textContent = '';
  for (const [id, nome] of ISOLE_DEMO) {
    const qui = sig.filter((x) => x.isola === id).sort((a, b) => a.s.facoltativo - b.s.facoltativo);
    if (!qui.length) continue;
    const r = t.insertRow(); r.insertCell().textContent = nome;
    const c = r.insertCell();
    qui.forEach((x, i) => {
      const e = document.createElement('span'); e.className = fatto(x) ? 'si' : 'no';
      e.textContent = (fatto(x) ? '✓ ' : '○ ') + conNumero(x.s.numero, titoloDi(x.s.livello) || x.s.livello);
      if (i) c.append(document.createElement('br'));
      c.append(e);
    });
  }
  fine.hidden = false; requestAnimationFrame(() => fine.classList.add('visto'));
}
document.getElementById('fine-continua').onclick = () => { fine.classList.remove('visto'); fine.hidden = true; };
document.getElementById('fine-reset').onclick = () => { const u = new URL(location.href); u.searchParams.set('quadro', 'mondo'); location.replace(u); };

// ---- l'editor
const bModifica = document.getElementById('modifica'), aiutoModifica = document.getElementById('aiuto-modifica');
let editore = null, inEditor = false;
async function apriEditor() {
  if (!sviluppo || inTransito || inEditor || !gioco.def?.tiled) return;
  if (!editore) {
    const { Editore } = await import('./editor.js');
    editore = new Editore({ suGioca: (m) => chiudiEditor(m), versione: document.documentElement.dataset.v });
    editore.suSalvato = (f, m) => { salvate.set(f, JSON.parse(JSON.stringify(m))); bozze.delete(f); titoli.delete(f.replace(/^.*\//, '').replace(/\.json$/, '')); };
  }
  attesa = null; anim.interrompi(); inEditor = true; avviso.hidden = true; cartiglio.classList.remove('visto');
  const f = gioco.def.file;
  // si rilegge dal disco prima di aprire: se il file è cambiato e non ci sono modifiche in sospeso, si
  // lavora su quello nuovo (e si rigioca quello nuovo), non su una copia vecchia rimasta in memoria
  try { salvate.set(f, await (await fetch(f + '?t=' + Date.now())).json()); } catch { /* resta quella che c'è */ }
  if (!bozze.has(f) && JSON.stringify(salvate.get(f)) !== JSON.stringify(gioco.def.tiled)) {
    avviso.textContent = 'Il livello era cambiato sul disco: ora si gioca e si modifica la versione nuova.'; avviso.hidden = false;
    setTimeout(() => { avviso.hidden = true; }, 3000);
  }
  editore.apri(bozze.get(f) || salvate.get(f) || gioco.def.tiled, f, { pulita: salvate.get(f) || gioco.def.tiled });
}
/** Dall'editor si torna a giocare la mappa com'è adesso (salvata o no): il coniglio resta dov'era se può. */
async function chiudiEditor(m) {
  const { daTiled } = await import('./livelli/tiled.js');
  const f = gioco.def.file;
  if (JSON.stringify(m) !== JSON.stringify(salvate.get(f))) bozze.set(f, m); else bozze.delete(f);
  let def;
  try { def = daTiled(m); } catch (err) {
    inEditor = false; avviso.textContent = 'Questa mappa non si può giocare: ' + err.message; avviso.hidden = false; return;
  }
  def.tiled = m; def.file = f;
  const vecchio = gioco, io = vecchio.stato.personaggi[vecchio.stato.attivo];
  gioco = new Gioco(caricaLivello(def), { risolti: vecchio.risolti }); gioco.def = def;
  for (const t of vecchio.esplorati) gioco.esplorati.add(t);
  const p = gioco.stato.personaggi[0];
  if (gioco.calpestabile(io.x, io.y) && !gioco.sigilloIn(io.x, io.y) && !gioco.lastraIn(io.x, io.y)) {
    Object.assign(p, { x: io.x, y: io.y, verso: io.verso, tratto: gioco.liv.trattoDi(io.x, io.y) });
    if (p.tratto) gioco.esplorati.add(p.tratto);
  }
  anim = nuovoAnim(gioco);
  pittore?.dispose(); pittore = null;
  inEditor = false;
  await scegli(indice);
  comandi();
}
bModifica.onclick = () => { apriEditor(); bModifica.blur(); };
bRigioca.onclick = () => { rigioca(); bRigioca.blur(); };
comandi();

const DIR = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
addEventListener('keydown', (e) => {
  if (inEditor || !e.key) return; // i tasti li prende l'editor; un evento senza tasto non vale
  if (!fine.hidden) { if (e.key === 'Escape' || e.key === 'Enter') document.getElementById('fine-continua').click(); return; }
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (DIR[k]) { e.preventDefault(); if (!e.repeat || !anim.occupato) esegui(DIR[k]); }
  else if (k === 'z' || k === 'Backspace') { e.preventDefault(); annulla(); }
  else if (k === 'r') ricomincia();
  else if (k === 'Escape') esci();
  else if (k === 'e' && sviluppo) apriEditor();
  else if (k === 'Enter') { e.preventDefault(); rigioca(); }
  else if ((k === ' ' || k === 'Tab') && gioco.stato.personaggi.length > 1) { e.preventDefault(); if (!e.repeat) esegui('cambia'); }
  else if (!demo && soloUno && /^[1-2]$/.test(k)) scegliZona(ZONE_PROVA[+k - 1][0]);
  else if (!demo && soloUno && /^[3-6]$/.test(k)) scegliQuadro(QUADRI[+k - 3][0]);
  else if (/^[0-9]$/.test(k)) { const i = k === '0' ? 9 : +k - 1; if (STILI[i]) scegli(i); }
});
// sul telefono: uno scorrimento = un passo (mai "tocca e ci va da solo": il percorso conta);
// due dita = zoom. Un gesto che ha usato due dita non vale mai come passo.
const dita = new Map();
let inizioTocco = null, pizzico = null;
const distanza = () => { const [a, b] = [...dita.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
scena.addEventListener('pointerdown', (e) => {
  dita.set(e.pointerId, [e.clientX, e.clientY]);
  if (dita.size === 1) inizioTocco = [e.clientX, e.clientY];
  if (dita.size === 2) { inizioTocco = null; pizzico = { d: distanza(), zoom: anim.zoom }; }
});
scena.addEventListener('pointermove', (e) => {
  if (!dita.has(e.pointerId)) return;
  dita.set(e.pointerId, [e.clientX, e.clientY]);
  if (pizzico && dita.size === 2) anim.zoom = Math.min(2.2, Math.max(0.6, pizzico.zoom * (pizzico.d / Math.max(10, distanza()))));
});
const fineTocco = (e) => {
  dita.delete(e.pointerId);
  if (dita.size < 2) pizzico = null;
  if (!inizioTocco || e.type !== 'pointerup') { if (!dita.size) inizioTocco = null; return; }
  const dx = e.clientX - inizioTocco[0], dy = e.clientY - inizioTocco[1]; inizioTocco = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  esegui(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
};
scena.addEventListener('pointerup', fineTocco);
scena.addEventListener('pointercancel', fineTocco);
scena.style.touchAction = 'none';
addEventListener('wheel', (e) => { anim.zoom = Math.min(2.2, Math.max(0.6, anim.zoom * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: true });
addEventListener('resize', misura);
document.getElementById('annulla').onclick = annulla;
document.getElementById('ricomincia').onclick = ricomincia;
// la demo da capo (chiesto da Luca il 21/11): si riparte dalla casa dell'overworld, coi sigilli chiusi
// e le isole da scoprire. Oggi i progressi non si salvano, quindi basta ricaricare la pagina.
document.getElementById('reset-demo').onclick = () => {
  if (!confirm('Ricominciare la demo da capo? I sigilli risolti tornano chiusi.')) return;
  const u = new URL(location.href); u.searchParams.set('quadro', 'mondo'); location.replace(u);
};
document.getElementById('versione').textContent = 'prova ' + document.documentElement.dataset.v;

const iniziale = q.get('stile') ?? leggi('arcipelago-stile2', 'lowpoly');
scegli(Math.max(0, STILI.findIndex((s) => s.id === iniziale || String(STILI.indexOf(s)) === iniziale)));

// Il disegno costa (Luca, 21/11: la demo aperta teneva la scheda video al 70% e la ventola accesa).
// Si disegna a ogni fotogramma solo mentre succede qualcosa: per 2,5 s dopo un tocco, un tasto, il
// mouse, o dopo la fine di un'animazione (le nuvole che si aprono finiscono dopo). Poi, a scena ferma,
// 20 fotogrammi al secondo per la vita d'ambiente (farfalle, scintille, glifi che respirano); dopo 12 s
// senza niente ci si ferma del tutto, e il primo input fa ripartire. ?fps=pieno disegna sempre.
let prima = performance.now(), ultimoInput = prima, ultimaAttivita = prima, ultimoDisegno = -1e9;
const sveglia = () => { ultimoInput = performance.now(); };
for (const tipo of ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart', 'resize', 'focus']) addEventListener(tipo, sveglia, { passive: true });
document.addEventListener('visibilitychange', sveglia);
const sempre = q.get('fps') === 'pieno';
renderer.setAnimationLoop((ora) => {
  if (inEditor) { prima = ora; return; } // sotto l'editor il 3D non si disegna
  if (anim.occupato || inTransito) ultimaAttivita = ora;
  const calma = ora - Math.max(ultimoInput, ultimaAttivita);
  const intervallo = sempre || calma < 2500 ? 0 : calma < 12000 ? 1000 / 20 : Infinity;
  if (ora - ultimoDisegno < intervallo - 4) return;
  const dt = Math.min(0.05, (ora - prima) / 1000); prima = ora; ultimoDisegno = ora;
  anim.aggiorna(dt);
  pittore?.rendi(dt);
});

// per il collaudo
window.__arc = { get gioco() { return gioco; }, apriEditor, get editore() { return editore; }, bozze, salvate, get anim() { return anim; }, pila, STILI, renderer, scegli, entra, esci, get inTransito() { return inTransito; },
  muovi: (dx, dy) => esegui([dx, dy]), fineDemo, cambia: () => esegui('cambia'), annulla, ricomincia, get pittore() { return pittore; } };
