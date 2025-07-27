const socket = io();

function sendRichText() {
  const input = document.getElementById('richInput');
  const html = input.innerHTML.trim();
  if (html !== '') {
    socket.emit('send_message', { type: 'html', content: html });
    input.innerHTML = '';
  }
}

function highlightSelection() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const span = document.createElement("span");
  span.style.backgroundColor = "yellow";
  range.surroundContents(span);
}

function sendImage() {
  const fileInput = document.getElementById('imgInput');
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    socket.emit('send_message', { type: 'image', content: base64 });
  };
  reader.readAsDataURL(file);
}

socket.on('receive_message', function(data) {
  const chat = document.getElementById('chat');
  const item = document.createElement('div');

  if (data.type === 'html') {
    item.innerHTML = data.content;
  } else if (data.type === 'image') {
    const img = document.createElement('img');
    img.src = data.content;
    item.appendChild(img);
  }

  chat.appendChild(item);
});

// === Collaborative Annotation Tool ===
let drawing = false;
let lastX = 0, lastY = 0;
let penColor = '#00fff7';
let penSize = 3; 
let tool = 'pen';
const canvas = document.getElementById('annotationCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('penColor');
const sizePicker = document.getElementById('penSize');  

function setTool(selected) {
  tool = selected;
}

colorPicker.addEventListener('input', function() {
  penColor = this.value;
});

sizePicker.addEventListener('input', function () {
  penSize = parseInt(this.value);
});

canvas.addEventListener('mousedown', (e) => {
  drawing = true;
  [lastX, lastY] = getCanvasCoords(e);
});
canvas.addEventListener('mouseup', () => { drawing = false; });
canvas.addEventListener('mouseout', () => { drawing = false; });
canvas.addEventListener('mousemove', draw);

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return [
    (e.clientX - rect.left) * scaleX,
    (e.clientY - rect.top) * scaleY
  ];
}

function draw(e) {
  if (!drawing) return;
  const [x, y] = getCanvasCoords(e);
  ctx.strokeStyle = penColor;
  ctx.lineWidth = penSize;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  // Emit drawing data for real-time sync
  socket.emit('draw', { from: [lastX, lastY], to: [x, y], color: penColor, size:penSize });
  [lastX, lastY] = [x, y];
}

function fillCanvasBackground() {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#23234d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  fillCanvasBackground();
  socket.emit('clear_canvas');
}

function sendCanvas() {
  const dataURL = canvas.toDataURL('image/png');
  socket.emit('send_message', { type: 'image', content: dataURL });
}

// Receive drawing from others
socket.on('draw', function(data) {
  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.size || 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(data.from[0], data.from[1]);
  ctx.lineTo(data.to[0], data.to[1]);
  ctx.stroke();
});

socket.on('clear_canvas', function() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  fillCanvasBackground();
});

// Theme toggle logic
const toggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  toggle.checked = true;
}

toggle.addEventListener('change', function () {
  if (this.checked) {
    document.body.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
});

// Fill background on page load
fillCanvasBackground();
