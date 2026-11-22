// I glifi come disegni senza parole: frecce a gradini (una, due, tre punte; con la barra = fino in fondo),
// archi che dicono quanto si gira, un asse con due punte che si guardano.
import * as THREE from 'three';

export function coloreGlifo(g, pal, famiglia = false) {
  if (g.fantasma && !famiglia) return pal.fantasma;
  if (g.tipo === 'T') return g.d[0] && g.d[1] ? pal.D : pal.T;
  return pal[g.tipo];
}
// mescola due colori #rrggbb: k = 0 tutto a, 1 tutto b
const mescola = (a, b, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');

export function texGlifo(g, pal, k = 1) {
  // k > 1 ingrossa i tratti: serve quando il glifo verrà ridotto a pochi pixel
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const x = cv.getContext('2d');
  const col = coloreGlifo(g, pal);
  x.translate(S / 2, S / 2);
  x.scale(S / 128, S / 128);
  x.lineCap = 'round'; x.lineJoin = 'round';

  // disco
  const pieno = pal.pieno && !g.fantasma; // disco del colore della famiglia, segno bianco, orlo d'inchiostro
  // Spento (si accende col talismano): disco pieno e opaco ma color pietra, appena tinto della sua
  // famiglia, segno inciso scuro, orlo d'inchiostro tratteggiato. Prima era quasi trasparente e
  // tutti i giudici lo trovavano troppo tenue: deve leggersi "c'è, ma non va ancora".
  const spento = pal.pieno && g.fantasma;
  const pietra = spento ? mescola(coloreGlifo(g, pal, true), '#c4c7ca', 0.7) : null;
  x.beginPath(); x.arc(0, 0, 56, 0, Math.PI * 2);
  x.fillStyle = pieno ? col : spento ? pietra : pal.fondo + (g.fantasma ? '40' : 'e6'); x.fill();
  x.lineWidth = (pieno || spento ? 7 : 5) * k; x.strokeStyle = pieno || spento ? pal.bordo : col;
  if (g.fantasma) x.setLineDash(spento ? [14, 9] : [8, 7]);
  x.stroke(); x.setLineDash([]);

  const segno = pieno ? '#ffffff' : spento ? '#4a4248' : col; // spento: segno inciso scuro sulla pietra chiara
  x.strokeStyle = segno; x.fillStyle = segno; x.lineWidth = 9 * k; x.k = k;
  if (g.tipo === 'T') freccia(x, g);
  else if (g.tipo === 'R') arco(x, g.giro);
  else if (g.tipo === 'M') asse(x, g.asse);

  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Il glifo come runa di luce (22/11, Luca: i dischi pieni sembravano segnali stradali). Niente disco
 * opaco: un alone sfumato del colore della famiglia, il segno bianco con un bagliore colorato e un
 * filo di contorno scuro della stessa tinta, che lo tiene leggibile sul cielo chiaro e sulla lastra.
 * Spento: alone grigio come fumo, segno scuro con un filo chiaro, niente bagliore.
 */
export function texGlifoEtereo(g, pal) {
  const S = 256, sc = S / 128;
  const fam = coloreGlifo(g, pal, true), spento = !!g.fantasma;
  // il segno da solo, bianco, su una tela a parte: poi si tinge e si allarga per bagliore e contorno
  const m = document.createElement('canvas'); m.width = m.height = S;
  const y = m.getContext('2d');
  y.translate(S / 2, S / 2); y.scale(sc, sc); y.lineCap = y.lineJoin = 'round';
  y.strokeStyle = y.fillStyle = '#fff'; y.lineWidth = 9; y.k = 1;
  if (g.tipo === 'T') freccia(y, g); else if (g.tipo === 'R') arco(y, g.giro); else if (g.tipo === 'M') asse(y, g.asse);
  const tinta = (c) => { const t = document.createElement('canvas'); t.width = t.height = S; const z = t.getContext('2d'); z.drawImage(m, 0, 0); z.globalCompositeOperation = 'source-in'; z.fillStyle = c; z.fillRect(0, 0, S, S); return t; };

  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d');
  // l'alone: pieno al centro, svanisce verso il bordo
  const rg = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, 60 * sc);
  const base = spento ? mescola(fam, '#c8c6cc', 0.75) : fam, hex = (a) => base + Math.round(a * 255).toString(16).padStart(2, '0');
  // (v16, Luca: «troppo chiari e trasparenti») cuore pieno del colore della famiglia fin quasi a metà,
  // poi sfuma: si legge come una sfera di luce colorata, non come un disco ritagliato
  if (spento) { rg.addColorStop(0, hex(0.85)); rg.addColorStop(0.45, hex(0.7)); rg.addColorStop(0.75, hex(0.25)); rg.addColorStop(1, hex(0)); }
  else { rg.addColorStop(0, hex(1)); rg.addColorStop(0.45, hex(0.96)); rg.addColorStop(0.62, hex(0.6)); rg.addColorStop(0.8, hex(0.2)); rg.addColorStop(1, hex(0)); }
  x.fillStyle = rg; x.fillRect(0, 0, S, S);
  // il bagliore sotto al segno: stretto e appena più chiaro del colore, per non sbiancare il cuore
  if (!spento) {
    const bg = tinta(mescola(fam, '#ffffff', 0.3));
    x.save(); x.shadowColor = mescola(fam, '#ffffff', 0.4); x.shadowBlur = 14; x.drawImage(bg, 0, 0); x.restore();
  }
  // contorno: il segno tinto, spostato tutt'intorno di qualche pixel
  const filo = tinta(spento ? '#eeeae2' : mescola(fam, '#0d0a1a', 0.55)), r = spento ? 3 : 3.6;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; x.drawImage(filo, Math.cos(a) * r, Math.sin(a) * r); }
  if (!spento) {
    x.drawImage(tinta('#ffffff'), 0, 0);
  } else x.drawImage(tinta('#4a4450'), 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/**
 * L'anello che gira attorno al glifo: un filo di luce con piccole tacche da runa e tre scintille che,
 * girando, sembrano orbitare. Spento: tratteggiato, grigio, senza scintille.
 */
export function texAnello(colore, spento = false) {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d');
  x.translate(S / 2, S / 2); x.scale(S / 128, S / 128); x.lineCap = 'round';
  const chiaro = spento ? '#b8b4c0' : mescola(colore, '#ffffff', 0.25);
  x.strokeStyle = chiaro; x.globalAlpha = 1; x.lineWidth = spento ? 2.6 : 3.8;
  if (!spento) { x.shadowColor = colore; x.shadowBlur = 10; }
  if (spento) x.setLineDash([7, 6]);
  x.beginPath(); x.arc(0, 0, 57, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
  if (!spento) {
    // tacche: a coppie, irregolari, come una scrittura che non si legge
    x.lineWidth = 2.6; x.globalAlpha = 0.85;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, l = [4, 7, 3, 5.5][i % 4];
      x.beginPath(); x.moveTo(Math.cos(a) * (57 - l), Math.sin(a) * (57 - l)); x.lineTo(Math.cos(a) * 57, Math.sin(a) * 57); x.stroke();
    }
    x.globalAlpha = 1; x.shadowBlur = 0;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4, cx = Math.cos(a) * 57, cy = Math.sin(a) * 57;
      const sg = x.createRadialGradient(cx, cy, 0, cx, cy, 7);
      sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.45, chiaro); sg.addColorStop(1, chiaro + '00');
      x.fillStyle = sg; x.beginPath(); x.arc(cx, cy, 7, 0, Math.PI * 2); x.fill();
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function punta(x, cx, cy, ang, l = 16) {
  l *= x.k || 1;
  x.save(); x.translate(cx, cy); x.rotate(ang);
  x.beginPath(); x.moveTo(l * 0.55, 0); x.lineTo(-l * 0.5, -l * 0.7); x.lineTo(-l * 0.5, l * 0.7); x.closePath(); x.fill();
  x.restore();
}

function freccia(x, g) {
  x.save();
  x.rotate(Math.atan2(g.d[1], g.d[0]));
  if (g.d[0] && g.d[1]) x.scale(0.92, 0.92);
  if (g.n === 0) {
    // fino in fondo: freccia lunga che sbatte contro una barra
    x.beginPath(); x.moveTo(-36, 0); x.lineTo(18, 0); x.stroke();
    punta(x, 22, 0, 0, 22);
    x.lineWidth = 8 * (x.k || 1); x.beginPath(); x.moveTo(38, -24); x.lineTo(38, 24); x.stroke();
  } else {
    // n punte una dietro l'altra
    const passo = 22, w = (g.n - 1) * passo;
    for (let i = 0; i < g.n; i++) {
      const cx = -w / 2 + i * passo + 4;
      x.beginPath(); x.moveTo(cx - 12, -20); x.lineTo(cx + 8, 0); x.lineTo(cx - 12, 20); x.stroke();
    }
  }
  x.restore();
}

function arco(x, giro) {
  const r = 30, amp = (Math.abs(giro) * Math.PI) / 180, s = Math.sign(giro);
  const a0 = giro === 180 ? Math.PI : -Math.PI / 2 - (s * amp) / 2;
  const a1 = a0 + s * amp;
  x.beginPath(); x.arc(0, 0, r, a0, a1 - s * 0.32, s < 0); x.stroke();
  punta(x, Math.cos(a1) * r, Math.sin(a1) * r, a1 + (s * Math.PI) / 2, 22);
  x.beginPath(); x.arc(0, 0, 7, 0, Math.PI * 2); x.fill(); // il perno
}

function asse(x, a) {
  x.save();
  x.rotate({ '|': 0, '-': Math.PI / 2, '/': Math.PI / 4, '\\': -Math.PI / 4 }[a]);
  x.lineWidth = 5 * (x.k || 1); x.setLineDash([9, 7]);
  x.beginPath(); x.moveTo(0, -44); x.lineTo(0, 44); x.stroke(); x.setLineDash([]);
  punta(x, -20, 0, 0, 24); punta(x, 20, 0, Math.PI, 24);
  x.restore();
}
