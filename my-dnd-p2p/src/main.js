
import { P2PConnection } from './p2p/connection.js';
import { EventBus } from './utils/eventBus.js';
import { setupLayout } from './ui/layout.js';
import { createCharacterPanel } from './ui/panels/character.js';
import { createChatPanel } from './ui/panels/chat.js';
import { createMapPanel } from './ui/panels/map.js';

// Helper: split a string into chunks of given size
function splitString(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

// Buffer for incoming image chunks: { [fileId]: { total, received: [], chunks: [] } }
const imageBuffers = {};

const p2p = new P2PConnection();
const connectBtn = document.getElementById('connect-btn');
const statusIndicator = document.getElementById('status-indicator');
const modeSelect = document.getElementById('p2p-mode');

// Affiche le modal de signaling et renvoie la réponse collée (ou null si annulé)
function showSignalModal(offer) {
  return new Promise(resolve => {
    const modal = document.getElementById('signal-modal');
    const offerTextarea = document.getElementById('offer-text');
    const answerTextarea = document.getElementById('answer-text');
    const confirmBtn = document.getElementById('signal-confirm');
    const cancelBtn = document.getElementById('signal-cancel');

    offerTextarea.value = offer;
    answerTextarea.value = '';
    modal.classList.remove('hidden');

    function cleanup() {
      modal.classList.add('hidden');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
    }

    function onConfirm() {
      const answer = answerTextarea.value.trim();
      cleanup();
      resolve(answer);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

async function handleConnect() {
  const mode = modeSelect.value;
  if (mode === 'offer') {
    // Caller flow
    const offer = await p2p.createOffer();
    const answer = await showSignalModal(offer);
    if (!answer) return alert('Answer not provided');
    await p2p.receiveAnswer(answer);
    // Set indicator to orange (signaling in progress)
    statusIndicator.classList.remove('bg-red-500','bg-green-500');
    statusIndicator.classList.add('bg-orange-500');
  } else {
    // Callee flow
    // Ask user to paste OFFER
    const offer = await showSignalModal(''); // empty offer textarea editable
    if (!offer) return alert('Offer not provided');
    const answer = await p2p.receiveOffer(offer);
    // Show generated answer for copy
    await showSignalModal(answer);
    // Set indicator to orange (signaling in progress)
    statusIndicator.classList.remove('bg-red-500','bg-green-500');
    statusIndicator.classList.add('bg-orange-500');
  }
  // After exchange, mark as connected
  statusIndicator.classList.replace('bg-orange-500','bg-green-500');
  document.getElementById('signal-modal').classList.add('hidden');

  // When DataChannel opens, update indicator to green and hide signaling modal
  p2p.dataChannel.onopen = () => {
    statusIndicator.classList.replace('bg-orange-500','bg-green-500');
    document.getElementById('signal-modal').classList.add('hidden');
    // Notify panels that P2P is connected to sync current state
    EventBus.emit('p2p:connected');
  };
  p2p.dataChannel.onclose = () => {
    statusIndicator.classList.replace('bg-green-500','bg-red-500');
  };
}

connectBtn.addEventListener('click', handleConnect);

// Global incoming P2P messages router (mark remote)
// Enhanced: emit progress event on image chunk receive
p2p.onMessage(({ channel, payload }) => {
  switch (channel) {
    case 'map:image-chunk': {
      const { fileId, index, total, chunk } = payload;
      if (!imageBuffers[fileId]) {
        imageBuffers[fileId] = { total, received: 0, chunks: [] };
      }
      const buf = imageBuffers[fileId];
      if (!buf.chunks[index]) {
        buf.chunks[index] = chunk;
        buf.received++;
        // Emit progress event
        const percent = Math.floor((buf.received / buf.total) * 100);
        EventBus.emit('map:imageProgress', { percent, fileId });
      }
      if (buf.received === total) {
        const dataUrl = buf.chunks.join('');
        delete imageBuffers[fileId];
        console.log('[P2P RECV] map:image full, emitting');
        EventBus.emit('map:imageChange', { dataUrl, local: false });
        // Signal completion
        EventBus.emit('map:imageProgress', { percent: 100, fileId });
      }
      break;
    }
    case 'chat':
      EventBus.emit('chat:receive', payload);
      break;
    case 'map:image':
      console.log('[P2P RECV] map:image', payload.dataUrl?.slice(0,50));
      EventBus.emit('map:imageChange', { ...payload, local: false });
      break;
    case 'map:token':
      EventBus.emit('map:tokenMove', { ...payload, local: false });
      break;
    case 'map:color':
      EventBus.emit('map:colorChange', { ...payload, local: false });
      break;
  }
});

// Generic tabbed container factory
function createTabbedContainer(container, createContentFn, label) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bg-white rounded shadow h-full flex flex-col';

  // Tab navigation bar
  const nav = document.createElement('div');
  nav.className = 'flex items-center border-b px-2 py-1 overflow-x-auto space-x-2';

  // "Add tab" button
  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.className = 'ml-auto px-2 py-1 bg-blue-500 text-white rounded';
  nav.append(addBtn);

  // Content area for tab panels
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 relative';

  let tabIndex = 0;
  function addTab() {
    tabIndex++;
    // Tab button
    const tabBtn = document.createElement('button');
    tabBtn.textContent = `${label} ${tabIndex}`;
    tabBtn.className = 'px-2 py-1 rounded';
    nav.insertBefore(tabBtn, addBtn);

    // Panel content
    const panel = createContentFn(`${label.toLowerCase()}-${tabIndex}`);
    panel.style.display = 'none';
    panel.classList.add('absolute', 'inset-0', 'w-full', 'h-full');
    contentArea.append(panel);

    // Tab click handler
    tabBtn.addEventListener('click', () => {
      contentArea.querySelectorAll(':scope > *').forEach(c => (c.style.display = 'none'));
      panel.style.display = 'block';
      nav.querySelectorAll('button').forEach(b => b.classList.remove('bg-blue-200'));
      tabBtn.classList.add('bg-blue-200');
    });

    // Activate first tab
    if (tabIndex === 1) tabBtn.click();
  }

  addBtn.addEventListener('click', addTab);
  addTab();

  wrapper.append(nav, contentArea);
  container.append(wrapper);
}

// Initialize layout
const root = document.getElementById('app');
const { left, right } = setupLayout(root);

// Create tabbed panels in each section
createTabbedContainer(left, createCharacterPanel, 'Character');
createTabbedContainer(left, createChatPanel, 'Chat');
createTabbedContainer(right, createMapPanel, 'Map');

// Relay chat messages over P2P
EventBus.on('chat:send', msg => {
  p2p.send({ channel: 'chat', payload: msg });
});


// Copy text from modal textareas
const copyOfferBtn = document.getElementById('copy-offer-btn');
const copyAnswerBtn = document.getElementById('copy-answer-btn');

copyOfferBtn.addEventListener('click', () => {
  const text = document.getElementById('offer-text').value;
  navigator.clipboard.writeText(text).then(() => {
    copyOfferBtn.textContent = 'Copied!';
    setTimeout(() => { copyOfferBtn.textContent = 'Copy'; }, 1000);
  });
});

copyAnswerBtn.addEventListener('click', () => {
  const text = document.getElementById('answer-text').value;
  navigator.clipboard.writeText(text).then(() => {
    copyAnswerBtn.textContent = 'Copied!';
    setTimeout(() => { copyAnswerBtn.textContent = 'Copy'; }, 1000);
  });
});

// Paste buttons for Offer and Answer
const pasteOfferBtn = document.getElementById('paste-offer-btn');
pasteOfferBtn.addEventListener('click', async () => {
  const text = await navigator.clipboard.readText();
  document.getElementById('offer-text').value = text;
});

const pasteAnswerBtn = document.getElementById('paste-answer-btn');
pasteAnswerBtn.addEventListener('click', async () => {
  const text = await navigator.clipboard.readText();
  document.getElementById('answer-text').value = text;
});

// Send map image in chunks when local upload occurs
EventBus.on('map:imageChange', ({ local, ...data }) => {
  if (!local) return;
  const fileId = crypto.randomUUID();
  const chunks = splitString(data.dataUrl, 16000);
  chunks.forEach((chunk, index) => {
    p2p.send({
      channel: 'map:image-chunk',
      payload: { fileId, index, total: chunks.length, chunk }
    });
  });
});
EventBus.on('map:tokenMove', ({ local, ...data }) => {
  if (local) p2p.send({ channel: 'map:token', payload: data });
});
EventBus.on('map:colorChange', ({ local, ...data }) => {
  if (local) p2p.send({ channel: 'map:color', payload: data });
});