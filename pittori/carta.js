// Carta ritagliata, alla Tearaway: ogni cosa è un cartoncino tagliato a forbice, con l'anima bianca
// della carta che spunta dall'orlo, la trama della carta sopra e un'ombra portata che dice quanto è
// staccato. Le caselle che si sollevano (simmetria, fuoco) allungano l'ombra.
//
// Prestazioni: le ombre sfocate costano. Isole e nuvole non si muovono, quindi si disegnano una volta
// sola in due immagini a parte (rifatte solo se cambia lo zoom o arriva una trama) e poi si copiano.
// Trame: se in texture/ ci sono le scansioni di carta (carta-fibra.jpg, cartone.jpg) si usano quelle,
// altrimenti una fibra disegnata qui.
import { Base2D } from './base2d.js';
import { texGlifo } from '../glifi.js';
import { casuale, contorniIsole } from '../forme.js';

const PAL = { T: '#2a5fc0', R: '#e07a1a', M: '#8a44c8', D: '#13906a', fantasma: '#9aa0a8', fondo: '#ffffff', pieno: true, bordo: '#2a2438' };

export function crea(tela, gioco, anim) {
  let scala = 1, ancora = null, versione = 0;
  const glifi = new Map(), strati = {}, L = gioco.liv;
  const g0 = tela.getContext('2d');

  // ── trame ──
  function fibreDisegnate() {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const g = c.getContext('2d'), rnd = casuale(9);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(60,40,20,0.07)'; g.lineWidth = 0.6 + rnd();
      const x = rnd() * 160, y = rnd() * 160, a = rnd() * 6.28, l = 4 + rnd() * 14;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    return c;
  }
  const trame = {
    fibra: { pat: g0.createPattern(fibreDisegnate(), 'repeat'), modo: 'source-over', lato: 160, celle: 1.6 },
    cartone: null,
  };
  /** Una scansione neutra (grigia/bianca) si stende sul colore in moltiplica; le scansioni si ripetono a specchio. */
  function carica(nome, file, celle) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width * 2; c.height = img.height * 2;
      const g = c.getContext('2d');
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.save(); g.translate(sx < 0 ? c.width : 0, sy < 0 ? c.height : 0); g.scale(sx, sy); g.drawImage(img, 0, 0); g.restore(); }
      trame[nome] = { pat: g0.createPattern(c, 'repeat'), modo: 'multiply', lato: c.width, celle };
      versione++;
    };
    img.src = new URL('../texture/' + file, import.meta.url).href;
  }
  carica('fibra', 'carta-fibra.jpg', 3);
  carica('cartone', 'cartone.jpg', 3);

  /** Taglio a forbice: lati spezzati in pochi tratti dritti, appena storti. */
  function forbice(pts, seme, amp) {
    const rnd = casuale(seme), out = [];
    pts.forEach(([x0, y0], i) => {
      const [x1, y1] = pts[(i + 1) % pts.length], Lg = Math.hypot(x1 - x0, y1 - y0), m = Math.max(1, Math.round(Lg / (22 * scala)));
      for (let j = 0; j < m; j++) { const t = j / m; out.push([x0 + (x1 - x0) * t + (rnd() - 0.5) * amp, y0 + (y1 - y0) * t + (rnd() - 0.5) * amp]); }
    });
    return out;
  }
  const path = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  /** Un cartoncino: ombra, anima bianca, colore, trama. `alto` = quanto è staccato dal fondo. */
  function cartoncino(g, pts, colore, seme, alto = 1, trama = 'fibra') {
    const anima = forbice(pts, seme, 2.4 * scala), viso = forbice(pts, seme + 1, 2 * scala).map(([x, y], i, a) => {
      const cx = a.reduce((s, p) => s + p[0], 0) / a.length, cy = a.reduce((s, p) => s + p[1], 0) / a.length;
      const d = Math.hypot(x - cx, y - cy) || 1, k = Math.max(0, d - 1.6 * scala) / d; return [cx + (x - cx) * k, cy + (y - cy) * k];
    });
    g.save();
    g.shadowColor = 'rgba(30,25,40,0.38)'; g.shadowBlur = (3 + alto * 5) * scala; g.shadowOffsetX = alto * 1.5 * scala; g.shadowOffsetY = (1 + alto * 3) * scala;
    g.fillStyle = '#fbf8f0'; path(g, anima); g.fill();
    g.restore();
    g.fillStyle = colore; path(g, viso); g.fill();
    const t = trame[trama] || trame.fibra;
    if (t && ancora) {
      // la trama è ancorata al mondo: non scivola quando la telecamera segue il coniglio
      const k = (ancora.T * t.celle) / t.lato;
      t.pat.setTransform(new DOMMatrix([k, 0, 0, k, ancora.x, ancora.y]));
      g.save(); path(g, viso); g.clip(); g.globalCompositeOperation = t.modo; g.fillStyle = t.pat; g.fillRect(-1e4, -1e4, 2e4, 2e4); g.restore();
    }
  }
  const ovale = (cx, cy, rx, ry, n = 16) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * 6.283) * rx, cy + Math.sin((i / n) * 6.283) * ry]);
  const fissaAncora = (b) => { const [x, y] = b.P(0, 0, 0); ancora = { x, y, T: b.T }; };

  // ── strati fermi, disegnati una volta ──
  function disegnaIsole(b, g) {
    const T = b.T, parete = T * 0.34;
    contorniIsole(L).forEach((pol, i) => {
      const pts = pol.map(([x, z]) => b.P(x, 0, z));
      const rnd = casuale(i + 4), giu = [];
      const bassi = pts.filter(([, y]) => y > Math.min(...pts.map((p) => p[1])) + 2);
      const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0])), fondo = Math.max(...bassi.map((p) => p[1]));
      for (let x = minX; x <= maxX + 1; x += T * 0.5) giu.push([x, fondo + parete + T * (0.3 + rnd() * 0.9)]);
      cartoncino(g, [[minX, fondo], [maxX, fondo], ...giu.reverse()], '#c8a07a', i * 11, 0.6, 'cartone');
      cartoncino(g, pts.map(([x, y]) => [x, y + parete]), '#e6b47e', i * 11 + 3, 0.8, 'cartone');
      cartoncino(g, pts, '#8ccc5c', i * 11 + 5, 1.3);
    });
    // pieghe del cartoncino lungo la griglia
    g.save(); g.lineWidth = 1 * scala;
    for (const { x, y, c } of L.celle) {
      if (!'#bt'.includes(c)) continue;
      const v = b.vicini(x, y), [sx, sy] = b.P(x, 0, y), h = T * b.K;
      for (const [ok, x0, y0, x1, y1] of [[v.dx, sx + T / 2, sy - h / 2, sx + T / 2, sy + h / 2], [v.giu, sx - T / 2, sy + h / 2, sx + T / 2, sy + h / 2]]) {
        if (!ok) continue;
        g.strokeStyle = 'rgba(40,80,20,0.22)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = 'rgba(255,255,230,0.3)'; g.beginPath(); g.moveTo(x0 + scala, y0 + scala); g.lineTo(x1 + scala, y1 + scala); g.stroke();
      }
    }
    g.restore();
    // scogli e basi dei pilastri
    for (const { x, y, c } of L.celle) {
      if (c !== 'o' && c !== 'p') continue;
      const [sx, sy] = b.P(x, 0, y), h = T * b.K * 0.86, w = T * 0.86, s = x * 13 + y;
      cartoncino(g, [[sx - w / 2, sy + h / 2], [sx + w / 2, sy + h / 2], [sx, sy + h / 2 + T * 0.9]], '#c8a07a', s, 0.6, 'cartone');
      cartoncino(g, [[sx - w / 2, sy - h / 2], [sx + w / 2, sy - h / 2], [sx + w / 2, sy + h / 2 + T * 0.25], [sx - w / 2, sy + h / 2 + T * 0.25]], '#dcae88', s + 1, 0.8, 'cartone');
    }
  }
  function disegnaNuvole(b, g) {
    const T = b.T;
    for (const n of b.nuvole) {
      const [sx, sy] = b.P(n.x, -0.4, n.z), rnd = casuale(n.seme), R = n.r * T, pts = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i / 5) * Math.PI, cx = sx + Math.cos(a) * R, cy = sy + Math.sin(a) * R * 0.45, r = R * (0.32 + rnd() * 0.16);
        for (let k = 0; k <= 4; k++) { const aa = a - Math.PI / 2 + (k / 4) * Math.PI; pts.push([cx + Math.cos(aa) * r, cy + Math.sin(aa) * r * 0.8]); }
      }
      cartoncino(g, pts, '#ffffff', n.seme, 2.2);
    }
  }
  /** Disegna (se serve) uno strato fermo in un'immagine sua, e lo copia sullo schermo. */
  function strato(b, g, nome, x0, z0, x1, z1, disegna) {
    const T = b.T, chiave = T.toFixed(2) + '|' + versione, pad = Math.ceil(70 * scala);
    let s = strati[nome];
    if (!s || s.chiave !== chiave) {
      const c = s?.c || document.createElement('canvas');
      c.width = Math.ceil((x1 - x0) * T + 2 * pad); c.height = Math.ceil((z1 - z0) * T * b.K + 2 * pad + T);
      const salva = [b.ox, b.oy, b.cx, b.cz];
      b.ox = pad; b.oy = pad; b.cx = x0; b.cz = z0;
      const gc = c.getContext('2d'); fissaAncora(b);
      disegna(b, gc);
      [b.ox, b.oy, b.cx, b.cz] = salva; fissaAncora(b);
      s = strati[nome] = { c, chiave };
    }
    const [sx, sy] = b.P(x0, 0, z0);
    g.drawImage(s.c, Math.round(sx - pad), Math.round(sy - pad));
  }

  return new Base2D(tela, gioco, anim, {
    K: 0.8, HY: 0.8,
    dimensioni(b) { scala = tela.width / b.w; },
    sfondo(b, g, W, H) {
      fissaAncora(b);
      g.fillStyle = '#8cc4e4'; g.fillRect(0, 0, W, H);
      const t = trame.fibra, k = (b.T * t.celle) / t.lato;
      t.pat.setTransform(new DOMMatrix([k, 0, 0, k, ancora.x, ancora.y]));
      g.save(); g.globalCompositeOperation = t.modo; g.fillStyle = t.pat; g.fillRect(0, 0, W, H); g.restore();
      strato(b, g, 'isole', -2, -2, L.W + 1, L.H + 3, disegnaIsole);
    },
    isola() { /* già nello strato delle isole */ },
    lastra(b, g, a) {
      const f = b.forma(a, 0.45, 0.24), alto = 1 + a.y * 5;
      g.globalAlpha = 1 - a.brucia;
      cartoncino(g, f.inviluppo, '#8a9cb2', a.id * 7, alto, 'cartone');
      cartoncino(g, f.sopra, a.alt ? '#b6c4d4' : '#c4d0de', a.id * 7 + 2, alto + 0.3);
      g.globalAlpha = 1;
    },
    glifo(b, g, q) {
      if (!glifi.has(q.g)) glifi.set(q.g, texGlifo(q.g, PAL).image);
      const [sx, sy] = b.P(q.g.x, q.alt, q.g.y), w = b.T * 0.72 * (1 + q.imp * 0.3), h = w * b.K;
      g.globalAlpha = q.g.fantasma ? 0.55 : 1;
      cartoncino(g, ovale(sx, sy, w / 2, h / 2, 14), '#ffffff', q.g.x * 5 + q.g.y, q.cop > 0.5 ? 0.5 : 1.6);
      g.drawImage(glifi.get(q.g), sx - w / 2, sy - h / 2, w, h);
      g.globalAlpha = 1;
    },
    decoro(b, g, d) {
      const T = b.T, [sx, sy] = b.P(d.x, 0, d.y), s = d.x * 17 + d.y * 5;
      if (d.c === 't') {
        cartoncino(g, [[sx - T * 0.06, sy], [sx + T * 0.06, sy], [sx + T * 0.04, sy - T * 0.6], [sx - T * 0.04, sy - T * 0.6]], '#a8764e', s, 1.2, 'cartone');
        cartoncino(g, ovale(sx, sy - T * 0.9, T * 0.42, T * 0.38, 9), '#3f9a4a', s + 1, 2);
        cartoncino(g, ovale(sx - T * 0.08, sy - T * 0.98, T * 0.24, T * 0.2, 7), '#5ab45a', s + 2, 2.3);
      }
      if (d.c === 'b' || d.c === 'o') { cartoncino(g, ovale(sx, sy - T * 0.12, T * 0.3, T * 0.2, 8), '#3f9a4a', s, 1.4); }
      if (d.c === 'p') {
        cartoncino(g, [[sx - T * 0.24, sy], [sx + T * 0.24, sy], [sx + T * 0.24, sy - T * 1.1], [sx - T * 0.24, sy - T * 1.1]], '#ece2d0', s, 2);
        cartoncino(g, [[sx - T * 0.3, sy - T * 1.05], [sx + T * 0.3, sy - T * 1.05], [sx + T * 0.3, sy - T * 1.22], [sx - T * 0.3, sy - T * 1.22]], '#f6eedf', s + 1, 2.3);
      }
      if (d.c === 'f') {
        const t = anim.tempo;
        cartoncino(g, ovale(sx, sy + T * 0.28, T * 0.3, T * 0.1, 8), '#4a3a44', s, 0.8);
        for (const [dx, hh, col, ph] of [[0, 0.6, '#f0602a', 0], [-0.1, 0.38, '#ffc23a', 1], [0.1, 0.42, '#ffc23a', 2]]) {
          const H = T * hh * (1 + Math.sin(t * 8 + ph) * 0.1), bx = sx + T * dx, by = sy + T * 0.26;
          cartoncino(g, [[bx - T * 0.11, by], [bx - T * 0.05, by - H * 0.55], [bx, by - H], [bx + T * 0.06, by - H * 0.5], [bx + T * 0.11, by]], col, s + ph + Math.floor(t * 8), 1.5);
        }
      }
    },
    coniglio(b, g, c) {
      const T = b.T, [sx, sy] = b.P(c.x, c.y, c.z);
      const lato = Math.sin(c.ry), fronte = Math.cos(c.ry), dir = Math.abs(lato) > 0.3 ? Math.sign(lato) : 0, hx = dir * T * 0.1;
      const alto = 1.6 + Math.max(0, c.y) * 6;
      g.save(); g.translate(sx, sy); g.rotate(c.rz); g.translate(-sx, -sy);
      for (const k of [-1, 1]) cartoncino(g, ovale(sx + hx + k * T * 0.07, sy - T * 0.6, T * 0.06, T * 0.18, 8), '#ffffff', 300 + k, alto);
      cartoncino(g, ovale(sx, sy - T * 0.2, T * 0.23, T * 0.19, 10), '#ffffff', 310, alto);
      cartoncino(g, ovale(sx + hx, sy - T * 0.41, T * 0.16, T * 0.15, 10), '#ffffff', 311, alto + 0.2);
      if (fronte > -0.3) {
        for (const k of [-1, 1]) { g.fillStyle = '#f6a8b8'; g.beginPath(); g.ellipse(sx + hx + k * T * 0.07, sy - T * 0.6, T * 0.025, T * 0.11, 0, 0, 7); g.fill(); }
        g.fillStyle = '#2a2438';
        const occhi = dir === 0 ? [-1, 1].map((k) => sx + k * T * 0.06) : [sx + hx + dir * T * 0.07];
        for (const ox of occhi) { g.beginPath(); g.arc(ox, sy - T * 0.43, T * 0.024, 0, 7); g.fill(); }
      }
      g.restore();
    },
    scheggia(b, g, s) {
      const [sx, sy] = b.P(s.x, s.y, s.z), r = b.T * 0.07;
      g.fillStyle = s.tipo === 'fuoco' ? '#f0702a' : '#c4d0de';
      g.save(); g.translate(sx, sy); g.rotate(s.giro); g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = 3 * scala; g.shadowOffsetY = 2 * scala;
      g.fillRect(-r, -r * 0.6, 2 * r, 1.2 * r); g.restore();
    },
    nuvola() { /* tutte insieme nello strato delle nuvole */ },
    sopra(b, g) { strato(b, g, 'nuvole', -8, -8, L.W + 7, L.H + 7, disegnaNuvole); },
  });
}
