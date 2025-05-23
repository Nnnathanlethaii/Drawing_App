const canvas           = document.getElementById('drawCanvas');
const ctx              = canvas.getContext('2d');
const toolSelect       = document.getElementById('toolSelect');
const colorPicker      = document.getElementById('colorPicker');
const brushSize        = document.getElementById('brushSize');
const eraserSize       = document.getElementById('eraserSize');
const clearBtn         = document.getElementById('clearBtn');
const saveBtn          = document.getElementById('saveBtn');
const undoBtn          = document.getElementById('undoBtn');
const bgImageInput     = document.getElementById('bgImageInput');
const presetColors     = document.getElementById('presetColors');
const addImageInput    = document.getElementById('addImageInput');
const imageScaleSelect = document.getElementById('imageScaleSelect');

let imageToInsert = null;

// undo stack
const undoStack = [];
const MAX_UNDO  = 20;

// Resize canvas and preserve content
function resizeCanvas() {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.putImageData(data, 0, 0);
  ctx.lineCap = 'round';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Load saved drawing
window.addEventListener('load', () => {
  const saved = localStorage.getItem('savedDrawing');
  if (saved) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = saved;
  }
});

// Save for undo
function saveState() {
  if (undoStack.length >= MAX_UNDO) undoStack.shift();
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

// Undo handler
undoBtn.addEventListener('click', () => {
  if (!undoStack.length) return;
  const state = undoStack.pop();
  ctx.putImageData(state, 0, 0);
});

// Clear canvas
clearBtn.addEventListener('click', () => {
  saveState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Save to PNG + localStorage
saveBtn.addEventListener('click', () => {
  const dataURL = canvas.toDataURL();
  localStorage.setItem('savedDrawing', dataURL);
  const link = document.createElement('a');
  link.download = 'my-drawing.png';
  link.href = dataURL;
  link.click();
});

// Preset colors
presetColors.addEventListener('click', e => {
  if (e.target.classList.contains('color-swatch')) {
    colorPicker.value = e.target.dataset.color;
  }
});

// Background image loader
bgImageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      saveState();
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// Drawing logic
let drawing    = false;
let startX     = 0;
let startY     = 0;
let savedImage = null;

function getXY(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    return [
      e.touches[0].clientX - rect.left,
      e.touches[0].clientY - rect.top
    ];
  } else {
    return [e.clientX - rect.left, e.clientY - rect.top];
  }
}

function startDraw(e) {
  saveState();
  drawing = true;
  [startX, startY] = getXY(e);
  savedImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function stopDraw(e) {
  if (!drawing) return;
  drawing = false;
  if (toolSelect.value !== 'freehand' && toolSelect.value !== 'eraser') {
    drawShape(e);
  }
}

function draw(e) {
  if (!drawing) return;

  const [x, y] = getXY(e);

  if (toolSelect.value === 'freehand' || toolSelect.value === 'eraser') {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x, y);

    if (toolSelect.value === 'eraser') {
      ctx.lineWidth = eraserSize.value;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.lineWidth = brushSize.value;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = colorPicker.value;
    }

    ctx.stroke();
    [startX, startY] = [x, y];

  } else {
    // shape preview
    ctx.globalCompositeOperation = 'source-over';
    ctx.putImageData(savedImage, 0, 0);
    drawShape(e);
  }
}

function drawShape(e) {
  const [x, y] = getXY(e);
  ctx.beginPath();
  ctx.strokeStyle = colorPicker.value;
  ctx.lineWidth   = brushSize.value;

  switch (toolSelect.value) {
    case 'line':
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      break;
    case 'rect':
      ctx.rect(startX, startY, x - startX, y - startY);
      break;
    case 'circle':
      const radius = Math.hypot(x - startX, y - startY);
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      break;
  }
  ctx.stroke();
}

// Image-insertion logic
addImageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      imageToInsert = img;
      alert('Image loaded! Choose scale and click to place.');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

canvas.addEventListener('click', e => {
  if (!imageToInsert) return;
  const [x, y] = getXY(e);
  saveState();
  const scale = parseFloat(imageScaleSelect.value);
  const w     = imageToInsert.width * scale;
  const h     = imageToInsert.height * scale;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(imageToInsert, x, y, w, h);
  imageToInsert = null;
});

// Attach drawing listeners
['mousedown','touchstart'].forEach(evt => canvas.addEventListener(evt, startDraw));
['mousemove','touchmove'].forEach(evt => canvas.addEventListener(evt, draw));
['mouseup','mouseout','touchend'].forEach(evt => canvas.addEventListener(evt, stopDraw));
