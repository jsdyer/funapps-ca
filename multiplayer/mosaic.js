(() => {
  'use strict';

  const PALETTE = [
    { name: 'Pine', hex: '#315b45' },
    { name: 'Lake', hex: '#41748f' },
    { name: 'Maple', hex: '#b54d3c' },
    { name: 'Amber', hex: '#d9a03f' },
    { name: 'Lilac', hex: '#9c7da9' },
    { name: 'Fern', hex: '#8b9d5a' },
    { name: 'Charcoal', hex: '#343b3f' }
  ];
  const PAPER = '#f7f3e7';

  function element(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text) item.textContent = text;
    return item;
  }

  function button(className, text, listener) {
    const item = element('button', className, text);
    item.type = 'button';
    item.addEventListener('click', listener);
    return item;
  }

  function colorClass(color) {
    return color === null ? 'mosaic-empty' : 'mosaic-color-' + color;
  }

  function cellLabel(index, size, color) {
    const row = Math.floor(index / size) + 1;
    const column = index % size + 1;
    const name = color === null ? 'empty' : PALETTE[color].name;
    return 'Row ' + row + ', column ' + column + ': ' + name;
  }

  function makeImage(game) {
    const canvas = document.createElement('canvas');
    const square = 48;
    canvas.width = canvas.height = game.size * square;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    game.cells.forEach((color, index) => {
      context.fillStyle = color === null ? PAPER : PALETTE[color].hex;
      const x = (index % game.size) * square;
      const y = Math.floor(index / game.size) * square;
      context.fillRect(x, y, square, square);
    });
    return new Promise((resolve, reject) => canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed.'));
    }, 'image/png'));
  }

  async function downloadImage(game) {
    const blob = await makeImage(game);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cabin-mosaic.png';
    document.body.append(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function mount(container, initial, { paint, clear, end }) {
    let current = initial;
    let selectedColor = 0;
    let activeCell = 0;
    let painting = false;
    let confirming = null;
    let exporting = false;
    let renderedCells = [];
    const { size } = initial.game;

    const heading = element('h2', '', 'Cabin Mosaic');
    heading.tabIndex = -1;
    const instructions = element('p', 'room-note mosaic-instructions',
      'Pick a colour and paint a square. Use arrow keys to move around the board, then press Enter or Space to paint.');
    instructions.id = 'mosaic-instructions';
    const palette = element('div', 'mosaic-palette');
    palette.setAttribute('role', 'group');
    palette.setAttribute('aria-label', 'Brush colours');
    const colors = PALETTE.map((_, index) => index).concat(null);
    const brushes = colors.map(color => {
      const name = color === null ? 'Eraser' : PALETTE[color].name;
      const brush = button('mosaic-brush', '', () => {
        selectedColor = color;
        updateBrushes();
      });
      const chip = element('span', 'mosaic-chip ' + colorClass(color));
      chip.setAttribute('aria-hidden', 'true');
      if (color === null) chip.textContent = '×';
      brush.append(chip, element('span', '', name));
      palette.append(brush);
      return brush;
    });

    function updateBrushes() {
      brushes.forEach((brush, index) => brush.setAttribute('aria-pressed', String(colors[index] === selectedColor)));
    }

    const board = element('div', 'mosaic-board');
    board.setAttribute('role', 'grid');
    board.setAttribute('aria-label', 'Shared pixel art board');
    board.setAttribute('aria-describedby', instructions.id);
    const cells = [];
    for (let row = 0; row < size; row++) {
      const rowElement = element('div', 'mosaic-row');
      rowElement.setAttribute('role', 'row');
      for (let column = 0; column < size; column++) {
        const index = row * size + column;
        const wrapper = element('div', 'mosaic-gridcell');
        wrapper.setAttribute('role', 'gridcell');
        const cell = button('mosaic-cell', '', () => void paintCell(index));
        cell.tabIndex = index === activeCell ? 0 : -1;
        cell.dataset.cell = String(index);
        cell.addEventListener('focus', () => setActiveCell(index));
        wrapper.append(cell);
        rowElement.append(wrapper);
        cells.push(cell);
      }
      board.append(rowElement);
    }

    function setActiveCell(index) {
      cells[activeCell].tabIndex = -1;
      activeCell = index;
      cells[activeCell].tabIndex = 0;
    }

    board.addEventListener('keydown', event => {
      if (event.target.dataset.cell === undefined || event.altKey || event.metaKey) return;
      const column = activeCell % size;
      let next = activeCell;
      switch (event.key) {
        case 'ArrowLeft': if (column > 0) next--; break;
        case 'ArrowRight': if (column < size - 1) next++; break;
        case 'ArrowUp': if (next >= size) next -= size; break;
        case 'ArrowDown': if (next < cells.length - size) next += size; break;
        case 'Home': next = event.ctrlKey ? 0 : next - column; break;
        case 'End': next = event.ctrlKey ? cells.length - 1 : next + size - 1 - column; break;
        default: return;
      }
      event.preventDefault();
      cells[next].focus();
    });

    async function paintCell(index) {
      if (!current.connected || current.busy || painting || current.game.cells[index] === selectedColor) return;
      painting = true;
      try {
        await paint(current.game, index, selectedColor);
      } finally {
        painting = false;
      }
    }

    const controls = element('div', 'game-control-row');
    const exportStatus = element('p', 'room-note mosaic-export-status');
    exportStatus.setAttribute('role', 'status');
    const save = button('room-button primary', 'Download PNG', async () => {
      if (exporting) return;
      exporting = true;
      save.disabled = true;
      exportStatus.textContent = '';
      try {
        await downloadImage(current.game);
        exportStatus.textContent = 'Your PNG is ready.';
      } catch {
        exportStatus.textContent = 'The PNG could not be created in this browser.';
      } finally {
        exporting = false;
        save.disabled = false;
      }
    });
    const clearButton = button('room-button secondary', 'Clear board', () => openConfirmation('clear'));
    const endButton = button('room-button secondary', 'Close mosaic', () => openConfirmation('end'));
    const confirmation = element('div', 'mosaic-confirm');
    const confirmationText = element('p', 'room-note');
    const confirmButton = button('room-button secondary', 'Confirm', () => {
      const choice = confirming;
      closeConfirmation();
      if (!current.isHost || !current.connected || current.busy) return;
      if (choice === 'clear') void clear(current.game);
      if (choice === 'end') void end(current.game);
    });
    const cancelButton = button('room-button secondary', 'Cancel', closeConfirmation);
    confirmation.append(confirmationText, confirmButton, cancelButton);
    controls.append(save, clearButton, endButton, confirmation);

    function openConfirmation(choice) {
      confirming = choice;
      confirmationText.textContent = choice === 'clear'
        ? 'Erase everyone’s pixels? You can download the mosaic first.'
        : 'Close this mosaic for everyone? You can download it first.';
      confirmButton.textContent = choice === 'clear' ? 'Erase mosaic' : 'Close mosaic';
      confirmation.hidden = false;
      cancelButton.focus();
    }

    function closeConfirmation() {
      const previous = confirming;
      confirming = null;
      confirmation.hidden = true;
      if (previous === 'clear' && !clearButton.disabled) clearButton.focus();
      if (previous === 'end' && !endButton.disabled) endButton.focus();
    }

    function update(next) {
      current = next;
      const art = current.game.cells;
      const canPaint = current.connected && !current.busy;
      cells.forEach((cell, index) => {
        const color = art[index];
        if (renderedCells[index] !== color) {
          cell.className = 'mosaic-cell ' + colorClass(color);
          cell.setAttribute('aria-label', cellLabel(index, size, color));
        }
        if (cell.getAttribute('aria-disabled') !== String(!canPaint)) {
          cell.setAttribute('aria-disabled', String(!canPaint));
        }
      });
      renderedCells = art;
      const canManage = current.isHost && canPaint;
      clearButton.hidden = endButton.hidden = !current.isHost;
      clearButton.disabled = !canManage || art.every(color => color === null);
      endButton.disabled = !canManage;
      confirmButton.disabled = !canManage || (confirming === 'clear' && clearButton.disabled);
      if (!current.isHost) confirming = null;
      confirmation.hidden = !confirming;
    }

    container.append(heading, instructions, palette, board, controls, exportStatus);
    updateBrushes();
    update(initial);
    return { heading, update };
  }

  window.CabinMosaic = { mount };
})();
