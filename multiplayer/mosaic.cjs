'use strict';

const SIZE = 12;
const COLOUR_COUNT = 7;

function startMosaic() {
  return { kind: 'mosaic', phase: 'playing', size: SIZE, cells: Array(SIZE ** 2).fill(null), revision: 0 };
}

function viewMosaic(mosaic) {
  return { ...mosaic, cells: [...mosaic.cells] };
}

function updateMosaic(mosaic, action) {
  if (action.type === 'clear-mosaic') {
    if (mosaic.cells.every(colour => colour === null)) return false;
    mosaic.cells.fill(null);
  } else {
    const { cell, color } = action;
    if (!Number.isInteger(cell) || cell < 0 || cell >= mosaic.cells.length) {
      throw new Error('Choose a square on the mosaic.');
    }
    if (color !== null && (!Number.isInteger(color) || color < 0 || color >= COLOUR_COUNT)) {
      throw new Error('Choose a colour or the eraser.');
    }
    if (mosaic.cells[cell] === color) return false;
    mosaic.cells[cell] = color;
  }
  mosaic.revision++;
  return true;
}

module.exports = { startMosaic, viewMosaic, updateMosaic };
