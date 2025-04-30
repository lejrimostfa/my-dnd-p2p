import { EventBus } from '../../utils/eventBus.js';

// Prevent duplicate initial sync per tab
let p2pInitDone = false;

// Shared tokens across all map panels
const globalTokens = {};
// Unique identifier for this peer across all map tabs
const localPeerId = crypto.randomUUID();
// Stored images per tab id
const globalImages = {};



export function createMapPanel(id) {
  const container = document.createElement('div');
  container.id = id;
  container.className = 'bg-white rounded shadow h-full flex flex-col';


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
  // If already connected, enable upload immediately
if (window.isP2PConnected) {
  uploadBtn.disabled = false;
}

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.className = 'px-2 py-1 bg-red-500 text-white rounded';
  clearBtn.disabled = true;  // no image to clear yet

  const colorSelect = document.createElement('select');
  ['red', 'green', 'blue', 'black'].forEach(col => {
    const opt = document.createElement('option');
    opt.value = col;
    opt.textContent = col.charAt(0).toUpperCase() + col.slice(1);
    colorSelect.append(opt);
  });
  colorSelect.value = 'red'; // default

  header.append(title, uploadBtn, clearBtn, colorSelect);

  // Hidden file input for image upload
  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'image/*';
  uploadInput.className = 'hidden';

  // Attach click handler after defining uploadInput
  uploadBtn.addEventListener('click', () => uploadInput.click());

  // Slider for dimming the image
  const dimmerContainer = document.createElement('div');
  dimmerContainer.className = 'px-4 py-2';
  const dimmerLabel = document.createElement('label');
  dimmerLabel.textContent = 'Dim:';
  dimmerLabel.className = 'mr-2';
  const dimmerSlider = document.createElement('input');
  dimmerSlider.type = 'range';
  dimmerSlider.min = '0';
  dimmerSlider.max = '100';
  dimmerSlider.value = '100';
  dimmerSlider.className = 'w-full';
  dimmerContainer.append(dimmerLabel, dimmerSlider);

  // Ensure global token for this peer
  if (!globalTokens[localPeerId]) {
    globalTokens[localPeerId] = { x: 50, y: 50, r: 10, color: colorSelect.value };
  }

  // Slider for token size
  const sizeContainer = document.createElement('div');
  sizeContainer.className = 'px-4 py-2';
  const sizeLabel = document.createElement('label');
  sizeLabel.textContent = 'Token Size:';
  sizeLabel.className = 'mr-2';
  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.min = '5';
  sizeSlider.max = '50';
  sizeSlider.value = globalTokens[localPeerId].r;
  sizeSlider.className = 'w-full';
  sizeContainer.append(sizeLabel, sizeSlider);

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
  let isDragging = false;
  let dimAlpha = 1;

  // Periodic map state sync (token position, size, color)
  let mapSyncIntervalId = null;
  function startMapPeriodicSync() {
    if (mapSyncIntervalId) return;
    mapSyncIntervalId = setInterval(() => {
      const tok = globalTokens[localPeerId];
      // Send token position
      EventBus.emit('map:tokenMove', { id: localPeerId, x: tok.x, y: tok.y, local: true });
      // Send size
      const size = parseInt(sizeSlider.value, 10);
      EventBus.emit('map:sizeChange', { id: localPeerId, size, local: true });
      // Send color
      const color = colorSelect.value;
      EventBus.emit('map:colorChange', { id: localPeerId, color, local: true });
    }, 1000);
  }

  // Listen for external startSync and perform initial and periodic sync
  EventBus.on('map:startSync', () => {
    // Emit initial token state on reconnect
    const tok = globalTokens[localPeerId];
    EventBus.emit('map:tokenMove', { id: localPeerId, x: tok.x, y: tok.y, local: true });
    const size = parseInt(sizeSlider.value, 10);
    EventBus.emit('map:sizeChange', { id: localPeerId, size, local: true });
    const color = colorSelect.value;
    EventBus.emit('map:colorChange', { id: localPeerId, color, local: true });
    // Start periodic map sync
    startMapPeriodicSync();
  });
  function stopMapPeriodicSync() {
    if (mapSyncIntervalId) {
      clearInterval(mapSyncIntervalId);
      mapSyncIntervalId = null;
    }
  }

  // Resize & draw
  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - header.clientHeight;
    draw();
  }
  window.addEventListener('resize', resizeCanvas);
  // Animation state for smooth token movement
  const animations = {};
  const ANIM_DURATION = 1000; // milliseconds
  let isAnimating = false;

  function animateStep(timestamp) {
    let needRedraw = false;
    for (const id in animations) {
      const anim = animations[id];
      const t = Math.min((timestamp - anim.startTime) / ANIM_DURATION, 1);
      globalTokens[id].x = anim.startX + (anim.targetX - anim.startX) * t;
      globalTokens[id].y = anim.startY + (anim.targetY - anim.startY) * t;
      needRedraw = true;
      if (t === 1) {
        delete animations[id];
      }
    }
    if (needRedraw) draw();
    if (Object.keys(animations).length > 0) {
      requestAnimationFrame(animateStep);
    } else {
      isAnimating = false;
    }
  }

  function animateToken(id, x, y) {
    const tok = globalTokens[id] || (globalTokens[id] = { x, y, r: 10, color: 'red' });
    animations[id] = {
      startX: tok.x,
      startY: tok.y,
      targetX: x,
      targetY: y,
      startTime: performance.now()
    };
    if (!isAnimating) {
      isAnimating = true;
      requestAnimationFrame(animateStep);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImage.src) {
      ctx.save();
      ctx.globalAlpha = dimAlpha;
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    Object.values(globalTokens).forEach(tok => {
      ctx.beginPath();
      ctx.arc(tok.x, tok.y, tok.r, 0, 2 * Math.PI);
      ctx.fillStyle = tok.color;
      ctx.fill();
    });
  }
  // Dimmer slider event
  dimmerSlider.addEventListener('input', () => {
    dimAlpha = dimmerSlider.value / 100;
    draw();
    console.log('[MAP UI] local dimChange emit', dimAlpha);
    EventBus.emit('map:dimChange', { id, dim: dimAlpha, local: true });
  });

  // Token size slider event
  sizeSlider.addEventListener('input', () => {
    const newR = parseInt(sizeSlider.value, 10);
    Object.values(globalTokens).forEach(tok => tok.r = newR);
    draw();
    console.log('[MAP UI] local sizeChange emit', newR);
    EventBus.emit('map:sizeChange', { id, size: newR, local: true });
  });

  // Apply remote dim changes
  EventBus.on('map:dimChange', ({ id: incomingId, dim, local }) => {
    if (local || incomingId !== id) return;
    dimAlpha = dim;
    dimmerSlider.value = dim * 100;
    draw();
  });

  // Clear button event
  clearBtn.addEventListener('click', () => {
    bgImage = new Image();
    draw();
    console.log('[MAP UI] local clear emit');
    EventBus.emit('map:clear', { local: true, id });
    clearBtn.disabled = true;   // no image to clear anymore
    uploadBtn.disabled = false; // allow new upload
  });

  // Handle remote clear
  EventBus.on('map:clear', ({ local, id: incomingId }) => {
    if (local || incomingId !== id) return;
    bgImage = new Image();
    draw();
  });

  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Store locally for new tabs
      globalImages[id] = reader.result;
      console.log('[MAP UI] local upload image', reader.result.slice(0,50));
      bgImage = new Image();
      bgImage.onload = () => {
        draw();
        console.log('[MAP UI] local imageChange emit');
        EventBus.emit('map:imageChange', { dataUrl: reader.result, local: true, id });
      };
      bgImage.src = reader.result;
      uploadBtn.disabled = true;  // disable further uploads until cleared
      clearBtn.disabled = false;  // now allow clearing this image
    };
    reader.readAsDataURL(file);
  });

  // External image (apply only remote updates)
  EventBus.on('map:imageChange', ({ dataUrl, local, id: incomingId }) => {
    if (local || incomingId !== id) return;
    // Store for future tabs
    globalImages[incomingId] = dataUrl;
    console.log('[MAP UI] apply remote image');
    bgImage = new Image();
    // Ensure canvas has correct size before drawing
    bgImage.onload = () => {
      resizeCanvas();
      draw();
    };
    bgImage.src = dataUrl;
  });
   

  // Color change
  colorSelect.addEventListener('change', () => {
    globalTokens[localPeerId].color = colorSelect.value;
    draw();
    EventBus.emit('map:colorChange', { id: localPeerId, color: colorSelect.value, local: true });
  });
  EventBus.on('map:colorChange', ({ id: tid, color, local }) => {
    if (local) return;
    if (tid === localPeerId) return;
    if (!globalTokens[tid]) globalTokens[tid] = { x: 50, y: 50, r: 10, color };
    else globalTokens[tid].color = color;
    draw();
  });

  // Drag token with periodic emit
  let emitInterval = null;
  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tok = globalTokens[localPeerId];
    if (Math.hypot(x - tok.x, y - tok.y) < tok.r) {
      isDragging = true;
      // start periodic emit
      emitInterval = setInterval(() => {
        const { x, y } = globalTokens[localPeerId];
        EventBus.emit('map:tokenMove', { id: localPeerId, x, y, local: true });
      }, 200);
    }
  });
  canvas.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    globalTokens[localPeerId].x = e.clientX - rect.left;
    globalTokens[localPeerId].y = e.clientY - rect.top;
    draw();
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      clearInterval(emitInterval);
      const { x, y } = globalTokens[localPeerId];
      console.log('[MAP UI] local tokenMove emit', { x, y });
      EventBus.emit('map:tokenMove', { id: localPeerId, x, y, local: true });
    }
  });
  EventBus.on('map:tokenMove', ({ id: tid, x, y, local }) => {
    if (local) return;
    if (tid === localPeerId) return;
    animateToken(tid, x, y);
  });

  // Sync on connect (guarded to prevent duplicate initial sync per tab)
  EventBus.on('p2p:connected', () => {
    if (p2pInitDone) return;
    p2pInitDone = true;
    if (bgImage.src) {
      EventBus.emit('map:imageChange', { id, dataUrl: bgImage.src, local: true });
    }
    const { x, y, color } = globalTokens[localPeerId];
    EventBus.emit('map:colorChange', { id: localPeerId, color, local: true });
    EventBus.emit('map:tokenMove', { id: localPeerId, x, y, local: true });
    uploadBtn.disabled = false;
    clearBtn.disabled = true;
    startMapPeriodicSync();
  });

  // Progress bar event handler
  EventBus.on('map:imageProgress', ({ percent, id: incomingId }) => {
    if (incomingId !== id) return;
    loadingContainer.classList.remove('hidden');
    loadingFill.style.width = percent + '%';
    if (percent >= 100) {
      // hide after brief delay
      setTimeout(() => loadingContainer.classList.add('hidden'), 300);
    }
  });

  // Apply remote token-size changes
  EventBus.on('map:sizeChange', ({ id: incomingId, size, local }) => {
    if (local || incomingId !== id) return;
    console.log('[MAP UI] apply remote sizeChange', size);
    Object.values(globalTokens).forEach(tok => tok.r = size);
    sizeSlider.value = size;
    draw();
  });
  

  // Assemble
  container.append(header, dimmerContainer, sizeContainer, uploadInput, canvas, loadingContainer);
  // Draw initial image if already present for this tab
  if (globalImages[id]) {
    bgImage = new Image();
    bgImage.onload = () => {
      resizeCanvas();
      draw();
    };
    bgImage.src = globalImages[id];
    clearBtn.disabled = false;
    uploadBtn.disabled = true;
  }
  // Stop periodic map sync on disconnect
  EventBus.on('p2p:disconnected', ({ local }) => {
    if (local) {
      draw();
      stopMapPeriodicSync();
    }
  });
  setTimeout(resizeCanvas, 0);
  // Ensure a valid DOM element is returned
  return container;
}