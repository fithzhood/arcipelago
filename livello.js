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
  lastre: [
    [[4, 4], [5, 4], [6, 4], [5, 5]],
    [[11, 5], [12, 5]],
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
