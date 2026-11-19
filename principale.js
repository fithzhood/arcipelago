// Contenitore delle prove di stile: stesso quadro, stesse regole, stesse animazioni; cambia solo il pittore.
import * as THREE from 'three';
import { caricaLivello, Gioco } from './logica.js';
import { LIVELLO_PROVA } from './livello.js';
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

const gioco = new Gioco(caricaLivello(LIVELLO_PROVA));
const avviso = document.getElementById('avviso');
const bottoni = document.getElementById('stili');
let pittore = null, attesa = null, indice = -1, richiesta = 0;
const anim = new Animatore(gioco, { suCaduta: () => { avviso.hidden = false; }, suFine: () => riprendi() });

const leggi = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const scrivi = (k, v) => { try { localStorage.setItem(k, v); } catch { /* niente */ } };
const tasto = (i) => (i === 9 ? '0' : String(i + 1));

STILI.forEach((s, i) => {
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

async function scegli(i) {
  const mio = ++richiesta;
  const s = STILI[i];
  const mod = await s.carica();
  if (mio !== richiesta) return;
  pittore?.dispose();
  tela3d.hidden = s.tipo !== '3d'; tela2d.hidden = s.tipo !== '2d';
  pittore = mod.crea(s.tipo === '3d' ? renderer : tela2d, gioco, anim);
  indice = i;
  misura();
  [...bottoni.children].forEach((b, j) => b.classList.toggle('scelto', j === i));
  document.body.dataset.stile = s.id;
  scrivi('arcipelago-stile2', s.id);
}

function esegui([dx, dy]) {
  if (anim.occupato) { attesa = [dx, dy]; return; }
  anim.riproduci(gioco.muovi(dx, dy));
}
function riprendi() { if (attesa) { const a = attesa; attesa = null; esegui(a); } }
function annulla() { attesa = null; anim.interrompi(); gioco.annulla(); anim.sincronizza(); avviso.hidden = !gioco.stato.caduto; }
function ricomincia() { attesa = null; anim.interrompi(); gioco.ricomincia(); anim.sincronizza(); avviso.hidden = true; }

const DIR = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (DIR[k]) { e.preventDefault(); if (!e.repeat || !anim.occupato) esegui(DIR[k]); }
  else if (k === 'z' || k === 'Backspace') { e.preventDefault(); annulla(); }
  else if (k === 'r') ricomincia();
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
document.getElementById('versione').textContent = 'prova ' + document.documentElement.dataset.v;

const iniziale = q.get('stile') ?? leggi('arcipelago-stile2', 'lowpoly');
scegli(Math.max(0, STILI.findIndex((s) => s.id === iniziale || String(STILI.indexOf(s)) === iniziale)));

let prima = performance.now();
renderer.setAnimationLoop((ora) => {
  const dt = Math.min(0.05, (ora - prima) / 1000); prima = ora;
  anim.aggiorna(dt);
  pittore?.rendi(dt);
});

// per il collaudo
window.__arc = { gioco, anim, STILI, scegli, muovi: (dx, dy) => esegui([dx, dy]), annulla, ricomincia, get pittore() { return pittore; } };
