// Il quadro di prova: due isole, la lastra a T da portare dall'altra parte
// e la zattera-spola del disegno (si apre dall'isola di destra).
// Glifi: T traslazione (d = direzione, n = passi, 0 = fino in fondo), R rotazione (giro 90 / -90 / 180),
// M simmetria (asse | - \ /). fantasma: glifo spento, si accende col talismano.
export const LIVELLO_PROVA = {
  mappa: [
    '................',
    '.......p.....##t',
    '###......f..####',
    'b##.........####',
    '####.........###',
    '####.........###',
    '###..........###',
    't##.....o.......',
    '................',
    '................',
  ],
  coniglio: [1, 4],
  // colori di plastilina: tenuti lontani dai colori delle famiglie di glifi (blu, arancio, viola, verde)
  lastre: [
    { colore: '#c2ccd8', celle: [[4, 4], [5, 4], [6, 4], [5, 5]] },
    { colore: '#ddb59a', celle: [[11, 5], [12, 5]] },
    // la ciambella: solo un esempio di forma col buco, per ora non si raggiunge
    { colore: '#e6c9d6', celle: [[5, 7], [6, 7], [7, 7], [5, 8], [7, 8], [5, 9], [6, 9], [7, 9]] },
  ],
  glifi: [
    { x: 5, y: 4, tipo: 'T', d: [1, 0], n: 0 },
    { x: 5, y: 5, tipo: 'T', d: [1, 0], n: 0 },
    { x: 11, y: 5, tipo: 'T', d: [-1, 0], n: 0 },
    { x: 11, y: 4, tipo: 'R', giro: 90 },
    { x: 9, y: 4, tipo: 'R', giro: 180 },
    { x: 10, y: 3, tipo: 'M', asse: '|' },
    { x: 10, y: 5, tipo: 'T', d: [1, -1], n: 2 },
    { x: 7, y: 6, tipo: 'T', d: [0, -1], n: 3 },
    { x: 5, y: 8, tipo: 'T', d: [-1, 0], n: 1 },
    { x: 12, y: 8, tipo: 'M', asse: '/' },
    { x: 7, y: 3, tipo: 'R', giro: -90, fantasma: true },
  ],
};

// Il quadro della fusione: la lastra sabbia scivola fino a toccare l'altra sabbia e si impastano;
// solo fuse arrivano all'isola di destra (da sola, la piccola sbatterebbe contro la grande).
// Sotto, la lastra grigia scende sul fuoco, che ne brucia la casella di mezzo: restano due pezzi.
export const LIVELLO_FUSIONE = {
  mappa: [
    '...............',
    '###........####',
    '###........###t',
    '###........####',
    'b##............',
    '###............',
    't##.f..........',
    '...............',
    '...............',
  ],
  coniglio: [2, 2],
  lastre: [
    { colore: '#ddb59a', celle: [[3, 2], [4, 2]] },
    { colore: '#ddb59a', celle: [[8, 2], [8, 3]] },
    { colore: '#c2ccd8', celle: [[3, 5], [4, 5], [5, 5]] },
  ],
  glifi: [
    { x: 3, y: 2, tipo: 'T', d: [1, 0], n: 0 },
    { x: 7, y: 2, tipo: 'T', d: [1, 0], n: 0 },
    { x: 3, y: 5, tipo: 'T', d: [0, 1], n: 1 },
  ],
};

// Il quadro in due. Il gatto e il coniglio si fanno da ostacolo (dal via, il coniglio non può
// scendere: c'è il gatto). In alto: uno sale sulla lastra grigia, l'altro entra sul glifo e la lastra
// li porta tutti e due a destra. In basso: la simmetria rovescia la riga di sotto della lastra rosa;
// chi ci sta sopra cade, chi sta sulla riga del glifo (l'asse) resta.
export const LIVELLO_DUE = {
  mappa: [
    '..............',
    '..............',
    '###.......####',
    '###.......####',
    '###.......####',
    '###...........',
    '######........',
    '######........',
    '..............',
    '..............',
  ],
  coniglio: [2, 3],
  gatto: [2, 4],
  lastre: [
    { colore: '#c2ccd8', celle: [[3, 2], [4, 2], [3, 3], [4, 3]] },
    { colore: '#e6c9d6', celle: [[6, 6], [7, 6], [6, 7], [7, 7]] },
  ],
  glifi: [
    { x: 4, y: 3, tipo: 'T', d: [1, 0], n: 0 },
    { x: 7, y: 6, tipo: 'M', asse: '-' },
  ],
};
