// Pixel art fatta a mano (il coniglio) o generata a regola (piastrelle, alberi, fuoco, glifi).
// Ogni funzione restituisce una tela piccola, da ingrandire senza filtro.
import { casuale } from './forme.js';
import { texGlifo } from './glifi.js';

const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const COLORI = { o: '#3a2c3a', w: '#fbf6ee', s: '#d6ccc2', p: '#f2a0b0', e: '#2a2230', W: '#ffffff' };
const CONIGLIO = {
  giu: [
    '................', '....oo....oo....', '...owwo..owwo...', '...owpo..opwo...', '...owpo..opwo...', '...owwoooowwo...',
    '..owwwwwwwwwwo..', '..owewwwwwwewo..', '..owwwwppwwwwo..', '..oswwwwwwwwso..', '...oswwwwwwso...', '..owwwwwwwwwwo..',
    '.owwwwwwwwwwwwo.', '.oswwwwwwwwwwso.', '..osswwwwwwsso..', '...oooo..oooo...'],
  su: [
    '................', '....oo....oo....', '...owwo..owwo...', '...owwo..owwo...', '...owwo..owwo...', '...owwoooowwo...',
    '..owwwwwwwwwwo..', '..owwwwwwwwwwo..', '..owwwwwwwwwwo..', '..oswwwwwwwwso..', '...oswwwwwwso...', '..owwwwwwwwwwo..',
    '.owwwwwWWwwwwwo.', '.oswwwWWWWwwwso.', '..osswwWWwwsso..', '...oooo..oooo...'],
  destra: [
    '................', '.....oo.........', '....owwo........', '....owpwo.......', '.....owpwo......', '......owwwo.....',
    '.....owwwwwo....', '....owwwwewwo...', '....owwwwwwwpo..', '....oswwwwwwo...', '..ooswwwwwwo....', '.owwwwwwwwwwo...',
    'oWWwwwwwwwwwwo..', 'oWwwwwwwwwwwso..', '.osswwwwwwsso...', '..oooo...oooo...'],
};

function daMappa(righe, colori = COLORI) {
  const c = tela(righe[0].length, righe.length), g = c.getContext('2d');
  righe.forEach((r, y) => [...r].forEach((ch, x) => { if (colori[ch]) { g.fillStyle = colori[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
function specchiata(c) {
  const d = tela(c.width, c.height), g = d.getContext('2d');
  g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
  return d;
}

/** I quattro lati del coniglio: giu (verso chi guarda), su, destra, sinistra. */
export function coniglio() {
  const destra = daMappa(CONIGLIO.destra);
  return { giu: daMappa(CONIGLIO.giu), su: daMappa(CONIGLIO.su), destra, sinistra: specchiata(destra) };
}
/** Quale lato mostrare, dalla direzione in cui guarda (angolo ry come nell'animatore). */
export function lato(ry) {
  const dx = Math.sin(ry), dz = Math.cos(ry);
  if (Math.abs(dz) >= Math.abs(dx)) return dz > 0 ? 'giu' : 'su';
  return dx > 0 ? 'destra' : 'sinistra';
}

/** Cerchio pieno a pixel con contorno e luce da sinistra in alto. */
function palla(g, cx, cy, r, chiaro, scuro, bordo) {
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = Math.hypot(x + 0.5, y + 0.5);
    if (d > r + 0.9) continue;
    g.fillStyle = d > r - 0.1 ? bordo : (x + y < -r * 0.5 ? chiaro : x + y > r * 0.4 ? scuro : chiaro);
    if (d <= r + 0.9 && d > r - 0.1) g.fillStyle = bordo;
    else if (x + y > r * 0.3) g.fillStyle = scuro;
    else g.fillStyle = chiaro;
    g.fillRect(cx + x, cy + y, 1, 1);
  }
}

export function albero() {
  const c = tela(20, 26), g = c.getContext('2d');
  g.fillStyle = '#3a2c3a'; g.fillRect(8, 15, 4, 10);
  g.fillStyle = '#7a4e30'; g.fillRect(9, 15, 2, 9); g.fillStyle = '#5a3820'; g.fillRect(10, 16, 1, 8);
  palla(g, 10, 9, 8, '#4caa48', '#2f7a3a', '#1f3a2a');
  g.fillStyle = '#7ad064'; [[6, 5], [7, 5], [6, 6], [9, 3], [10, 3]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  return c;
}
export function cespuglio() {
  const c = tela(16, 12), g = c.getContext('2d');
  palla(g, 5, 7, 4, '#4caa48', '#2f7a3a', '#1f3a2a'); palla(g, 10, 6, 5, '#55b450', '#2f7a3a', '#1f3a2a');
  return c;
}
export function pilastro() {
  const c = tela(12, 26), g = c.getContext('2d');
  g.fillStyle = '#3a2c3a'; g.fillRect(1, 2, 10, 24);
  g.fillStyle = '#e6dccb'; g.fillRect(2, 3, 8, 22); g.fillStyle = '#c4b8a4'; g.fillRect(7, 3, 3, 22);
  g.fillStyle = '#a89c88'; for (let y = 6; y < 24; y += 5) g.fillRect(2, y, 8, 1);
  g.fillStyle = '#3a2c3a'; g.fillRect(0, 0, 12, 3); g.fillStyle = '#efe6d6'; g.fillRect(1, 1, 10, 1);
  return c;
}
/** Tre fotogrammi di fiamma. */
export function fiamme() {
  return [0, 1, 2].map((f) => {
    const c = tela(12, 14), g = c.getContext('2d'), rnd = casuale(40 + f);
    for (let y = 0; y < 14; y++) {
      const w = Math.max(0, Math.round((y / 13) * 5 + (rnd() - 0.5) * 2));
      for (let x = 6 - w; x < 6 + w; x++) { g.fillStyle = y > 9 ? '#c83a1a' : Math.abs(x - 5.5) < w * 0.45 && y > 3 ? '#ffd84a' : '#ff7a20'; g.fillRect(x, y, 1, 1); }
    }
    return c;
  });
}
/** Piastrella d'erba 16×16: base, ciuffi chiari e scuri, un po' diversa per ogni casella. */
export function erba(seme, alt) {
  const c = tela(16, 16), g = c.getContext('2d'), rnd = casuale(seme);
  g.fillStyle = alt ? '#6fb84a' : '#78c250'; g.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 14; i++) { g.fillStyle = rnd() < 0.5 ? '#5ea23e' : '#92d466'; g.fillRect(Math.floor(rnd() * 15), Math.floor(rnd() * 15), 1, rnd() < 0.5 ? 2 : 1); }
  return c;
}
export function pietra(alt) {
  const c = tela(16, 16), g = c.getContext('2d'), rnd = casuale(alt ? 8 : 9);
  g.fillStyle = '#5a4a3e'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = alt ? '#e2d3b0' : '#ebdfc0'; g.fillRect(1, 1, 14, 14);
  g.fillStyle = '#f8f0dc'; g.fillRect(1, 1, 14, 1); g.fillRect(1, 1, 1, 14);
  g.fillStyle = '#c4b28c'; g.fillRect(1, 14, 14, 1); g.fillRect(14, 1, 1, 14);
  for (let i = 0; i < 6; i++) { g.fillStyle = '#d4c4a0'; g.fillRect(2 + Math.floor(rnd() * 11), 2 + Math.floor(rnd() * 11), 1, 1); }
  return c;
}
export function terra(seme) {
  const c = tela(16, 16), g = c.getContext('2d'), rnd = casuale(seme);
  g.fillStyle = '#8a5e3c'; g.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 18; i++) { g.fillStyle = rnd() < 0.5 ? '#74492c' : '#a0744e'; g.fillRect(Math.floor(rnd() * 15), Math.floor(rnd() * 15), 2, 1); }
  return c;
}
export function roccia(seme) {
  const c = tela(16, 16), g = c.getContext('2d'), rnd = casuale(seme);
  g.fillStyle = '#7d6a5c'; g.fillRect(0, 0, 16, 16);
  for (let i = 0; i < 14; i++) { g.fillStyle = rnd() < 0.5 ? '#6a584c' : '#94806e'; g.fillRect(Math.floor(rnd() * 14), Math.floor(rnd() * 15), 3, 1); }
  return c;
}

/** Un glifo ridotto a lato×lato pixel, con i colori riportati alla tavolozza (niente sfumature). */
export function glifo(g, pal, latoPx = 14) {
  const t = texGlifo(g, pal, 1.9), c = tela(latoPx, latoPx), x = c.getContext('2d');
  x.drawImage(t.image, 0, 0, latoPx, latoPx); t.dispose();
  const d = x.getImageData(0, 0, latoPx, latoPx), p = d.data;
  const tav = [pal.fondo, g.fantasma ? pal.fantasma : (g.tipo === 'T' && g.d[0] && g.d[1] ? pal.D : pal[g.tipo])].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 110) { p[i + 3] = 0; continue; }
    let best = tav[0], bd = 1e9;
    for (const q of tav) { const dd = (q[0] - p[i]) ** 2 + (q[1] - p[i + 1]) ** 2 + (q[2] - p[i + 2]) ** 2; if (dd < bd) { bd = dd; best = q; } }
    p[i] = best[0]; p[i + 1] = best[1]; p[i + 2] = best[2]; p[i + 3] = g.fantasma ? 150 : 255;
  }
  x.putImageData(d, 0, 0);
  return c;
}
