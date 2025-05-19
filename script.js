const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const toolSelect = document.getElementById('toolSelect');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const undoBtn = document.getElementById('undoBtn');
const bgImageInput = document.getElementById('bgImageInput');
const presetColors = document.getElementById('presetColors');
const addImageInput = document.getElementById('addImageInput');
let imageToInsert = null;

// undo stack
const undoStack = [];
const MAX_UNDO = 20;

// Resize canvas
function resizeCanvas() {
  // save current
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.putImageData(data, 0, 0);
  ctx.lineCap = 'round';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// load saved drawing if any
window.addEventListener('load', () => {
  const saved = localStorage.getItem('savedDrawing');
  if (saved) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = saved;
  }
});

// push state for undo
function saveState() {
  if (undoStack.length >= MAX_UNDO) undoStack.shift();
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

// apply undo
undoBtn.addEventListener('click', () => {
  if (!undoStack.length) return;
  const state = undoStack.pop();
  ctx.putImageData(state, 0, 0);
});

// clear canvas
clearBtn.addEventListener('click', () => {
  saveState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// save to PNG and localStorage
saveBtn.addEventListener('click', () => {
  const dataURL = canvas.toDataURL();
  localStorage.setItem('savedDrawing', dataURL);
  const link = document.createElement('a');
  link.download = 'my-drawing.png';
  link.href = dataURL;
  link.click();
});

// preset color clicks
presetColors.addEventListener('click', e => {
  if (e.target.classList.contains('color-swatch')) {
    colorPicker.value = e.target.dataset.color;
  }
});

// background image
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

// drawing logic
let drawing = false;
let startX = 0, startY = 0;
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
  // for shape preview
  savedImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function stopDraw(e) {
  if (!drawing) return;
  drawing = false;
  if (toolSelect.value !== 'freehand') {
    // finalize shape one last time
    drawShape(e);
  }
}

function draw(e) {
  if (!drawing) return;
  if (toolSelect.value === 'freehand') {
    const [x, y] = getXY(e);
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = brushSize.value;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x, y);
    ctx.stroke();
    [startX, startY] = [x, y];
  } else {
    // preview shape
    ctx.putImageData(savedImage, 0, 0);
    drawShape(e);
  }
}

function drawShape(e) {
  const [x, y] = getXY(e);
  ctx.strokeStyle = colorPicker.value;
  ctx.lineWidth = brushSize.value;
  ctx.beginPath();

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

addImageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      imageToInsert = img;
      alert('Image loaded! Click on the canvas to place it.');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});
canvas.addEventListener('click', e => {
  if (!imageToInsert) return;
  const [x, y] = getXY(e);
  saveState();
  const scale = 0.5; // adjust scale if image is too large
  ctx.drawImage(imageToInsert, x, y, imageToInsert.width * scale, imageToInsert.height * scale);
  imageToInsert = null; // only insert once
});


// attach listeners
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseout', stopDraw);
canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDraw);
