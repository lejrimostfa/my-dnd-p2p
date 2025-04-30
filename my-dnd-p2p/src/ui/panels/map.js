import { EventBus } from '../../utils/eventBus.js';

export function createMapPanel(id) {
  const container = document.createElement('div');
  container.id = id;
  container.className = 'bg-white rounded shadow h-full flex flex-col';

  // Unique identifier for this peer's token
  const peerId = crypto.randomUUID();
  // Store peerId in a local constant for event handlers
  const localPeerId = peerId;

  // Header with title, upload button, and token color selector
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between px-4 py-2 border-b space-x-2';
  const title = document.createElement('h2');
  title.textContent = 'Map';
  title.className = 'text-lg font-semibold';

  const uploadBtn = document.createElement('button');
  uploadBtn.textContent = 'Upload';
  uploadBtn.className = 'px-2 py-1 bg-yellow-500 text-white rounded';
  uploadBtn.disabled = true;  // disable until P2P connected

  const colorSelect = document.createElement('select');
  ['red', 'green', 'blue', 'black'].forEach(col => {
    const opt = document.createElement('option');
    opt.value = col;
    opt.textContent = col.charAt(0).toUpperCase() + col.slice(1);
    colorSelect.append(opt);
  });
  colorSelect.value = 'red'; // default

  header.append(title, uploadBtn, colorSelect);

  // Hidden file input for image upload
  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'image/*';
  uploadInput.className = 'hidden';

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'flex-1 w-full h-full';
  const ctx = canvas.getContext('2d');

  // Loading bar overlay (hidden by default)
  const loadingContainer = document.createElement('div');
  loadingContainer.className = 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden';
  const loadingBar = document.createElement('div');
  loadingBar.className = 'w-3/4 h-4 bg-gray-300 rounded overflow-hidden';
  const loadingFill = document.createElement('div');
  loadingFill.className = 'h-full bg-green-500 w-0';
  loadingBar.append(loadingFill);
  loadingContainer.append(loadingBar);

  // State
  let bgImage = new Image();
  const tokens = {}; // id -> {x,y,r,color}
  tokens[peerId] = { x: 50, y: 50, r: 10, color: colorSelect.value };
  let isDragging = false;

  // Resize & draw
  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - header.clientHeight;
    draw();
  }
  window.addEventListener('resize', resizeCanvas);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImage.src) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    }
    Object.values(tokens).forEach(tok => {
      ctx.beginPath();
      ctx.arc(tok.x, tok.y, tok.r, 0, 2 * Math.PI);
      ctx.fillStyle = tok.color;
      ctx.fill();
    });
  }

  // Upload
  uploadBtn.addEventListener('click', () => uploadInput.click());
  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      console.log('[MAP UI] local upload image', reader.result.slice(0,50));
      bgImage = new Image();
      bgImage.onload = () => {
        draw();
        EventBus.emit('map:imageChange', { dataUrl: reader.result, local: true });
      };
      bgImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // External image (apply only remote updates)
  EventBus.on('map:imageChange', ({ dataUrl, local }) => {
    if (local) return;
    console.log('[MAP UI] apply remote image');
    bgImage = new Image();
    bgImage.onload = draw;
    bgImage.src = dataUrl;
  });

  // Color change
  colorSelect.addEventListener('change', () => {
    tokens[peerId].color = colorSelect.value;
    draw();
    EventBus.emit('map:colorChange', { id: peerId, color: colorSelect.value, local: true });
  });
  EventBus.on('map:colorChange', ({ id: tid, color, local }) => {
    if (local) return;
    if (tid === localPeerId) return;
    if (!tokens[tid]) tokens[tid] = { x: 50, y: 50, r: 10, color };
    else tokens[tid].color = color;
    draw();
  });

  // Drag token with periodic emit
  let emitInterval = null;
  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tok = tokens[peerId];
    if (Math.hypot(x - tok.x, y - tok.y) < tok.r) {
      isDragging = true;
      // start periodic emit
      emitInterval = setInterval(() => {
        const { x, y } = tokens[peerId];
        EventBus.emit('map:tokenMove', { id: peerId, x, y, local: true });
      }, 200);
    }
  });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    tokens[peerId].x = e.clientX - rect.left;
    tokens[peerId].y = e.clientY - rect.top;
    draw();
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      clearInterval(emitInterval);
      const { x, y } = tokens[peerId];
      EventBus.emit('map:tokenMove', { id: peerId, x, y, local: true });
    }
  });
  EventBus.on('map:tokenMove', ({ id: tid, x, y, local }) => {
    if (local) return;
    if (tid === localPeerId) return; // ignore our own token
    if (!tokens[tid]) tokens[tid] = { x, y, r: 10, color: 'red' };
    // ignore duplicate positions to prevent flicker
    const tok = tokens[tid];
    if (tok.x === x && tok.y === y) return;
    tok.x = x;
    tok.y = y;
    draw();
  });

  // Sync on connect
  EventBus.on('p2p:connected', () => {
    if (bgImage.src) EventBus.emit('map:imageChange', { dataUrl: bgImage.src, local: true });
    const { x, y, color } = tokens[peerId];
    EventBus.emit('map:colorChange', { id: peerId, color, local: true });
    EventBus.emit('map:tokenMove', { id: peerId, x, y, local: true });
    uploadBtn.disabled = false;  // enable upload now that DataChannel is open
  });

  // Progress bar event handler
  EventBus.on('map:imageProgress', ({ percent }) => {
    loadingContainer.classList.remove('hidden');
    loadingFill.style.width = percent + '%';
    if (percent >= 100) {
      // hide after brief delay
      setTimeout(() => loadingContainer.classList.add('hidden'), 300);
    }
  });

  // Assemble
  container.append(header, uploadInput, canvas, loadingContainer);
  setTimeout(resizeCanvas, 0);
  return container;
}