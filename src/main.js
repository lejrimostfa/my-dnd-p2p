
import { EventBus } from './utils/eventBus.js';
import { setupLayout } from './ui/layout.js';
import { createCharacterPanel } from './ui/panels/character.js';
import { createChatPanel } from './ui/panels/chat.js';
import { createMapPanel } from './ui/panels/map.js';

// --- PeerJS signaling via CDN ---
const peer = new Peer(); // global Peer from CDN

const peerIdInput   = document.getElementById('peer-id');
const theirIdInput  = document.getElementById('their-peer-id');
const peerConnectBtn= document.getElementById('peer-connect');
peerConnectBtn.disabled = true;
const pastePeerIdBtn = document.getElementById('paste-peer-id');
const statusIndicator = document.getElementById('status-indicator');

const copyPeerIdBtn = document.getElementById('copy-peer-id');
copyPeerIdBtn.addEventListener('click', () => {
  if (peerIdInput.value) {
    navigator.clipboard.writeText(peerIdInput.value)
      .then(() => console.log('Peer ID copié !'))
      .catch(err => console.error('Erreur copie Peer ID', err));
  }
});

// Show own Peer ID
peer.on('open', id => {
  peerIdInput.value = id;
  console.log('My Peer ID:', id);
});

// Outgoing connection
peerConnectBtn.addEventListener('click', () => {
  const theirId = theirIdInput.value.trim();
  if (!theirId) return alert("Veuillez saisir l'ID du pair !");
  const conn = peer.connect(theirId);
  conn.on('open', () => {
    console.log('Connected to', theirId);
    statusIndicator.classList.replace('bg-red-500','bg-green-500');
    EventBus.emit('p2p:connected');
    peerConnectBtn.classList.replace('bg-gray-500','bg-green-500');
    window.isP2PConnected = true;
    window.p2pSend = data => conn.send(data);
    conn.on('data', data => EventBus.emit('p2p:recv', data));
  });
});

// Incoming connection
peer.on('connection', conn => {
  conn.on('open', () => {
    console.log('Peer connected:', conn.peer);
    statusIndicator.classList.replace('bg-red-500','bg-green-500');
    EventBus.emit('p2p:connected');
    peerConnectBtn.classList.replace('bg-gray-500','bg-green-500');
    window.isP2PConnected = true;
    window.p2pSend = data => conn.send(data);
    conn.on('data', data => EventBus.emit('p2p:recv', data));
  });
});

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

// Listen for all incoming P2P messages
EventBus.on('p2p:recv', ({ channel, payload }) => {
  switch(channel) {
    case 'chat':          EventBus.emit('chat:receive', payload); break;
    case 'map:image-chunk': {
      const { fileId, index, total, chunk, id } = payload;
      if (!imageBuffers[fileId]) {
        imageBuffers[fileId] = { total, received: 0, chunks: [], id };
      }
      const buf = imageBuffers[fileId];
      if (!buf.chunks[index]) {
        buf.chunks[index] = chunk;
        buf.received++;
        const percent = Math.floor((buf.received / buf.total) * 100);
        EventBus.emit('map:imageProgress', { percent, fileId, id });
      }
      if (buf.received === total) {
        const dataUrl = buf.chunks.join('');
        delete imageBuffers[fileId];
        EventBus.emit('map:imageChange', { dataUrl, local: false, id: buf.id });
        EventBus.emit('map:imageProgress', { percent: 100, fileId, id: buf.id });
      }
      break;
    }
    case 'map:token':     EventBus.emit('map:tokenMove', { ...payload, local:false }); break;
    case 'map:color':     EventBus.emit('map:colorChange', { ...payload, local:false }); break;
    case 'map:dim':       EventBus.emit('map:dimChange', { ...payload, local:false }); break;
    case 'map:clear':     EventBus.emit('map:clear', { local:false, id: payload.id }); break;
    case 'map:sizeChange':EventBus.emit('map:sizeChange', { ...payload, local:false }); break;
    case 'tab:create':    EventBus.emit('tab:create', { ...payload, local:false }); break;
    case 'tab:delete':    EventBus.emit('tab:delete', { ...payload, local:false }); break;
    case 'tab:rename':    EventBus.emit('tab:rename', { ...payload, local:false }); break;
    case 'tab:state':     EventBus.emit('tab:state', { ...payload, local:false }); break;
    case 'map:imageProgress': EventBus.emit('map:imageProgress', { percent: payload.percent, id: payload.id }); break;
    // add other channels as needed
  }
});

// Generic tabbed container factory
function createTabbedContainer(container, createContentFn, label) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bg-white rounded shadow h-full flex flex-col w-full min-w-0';

  // Tab navigation bar
  const nav = document.createElement('div');
  nav.className = 'w-full flex items-center border-b px-2 py-1 overflow-hidden';

  // Container for tabs (scrollable)
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'flex-1 flex items-center space-x-2 overflow-x-auto min-w-0';

  // "Add tab" button
  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.className = 'px-2 py-1 bg-blue-500 text-white rounded flex-shrink-0';

  nav.append(tabsContainer, addBtn);

  // Content area for tab panels
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 relative';

  let tabIndex = 0;
  function addTab() {
    tabIndex++;
    // Tab button
    const tabBtn = document.createElement('button');
    tabBtn.textContent = `${label} ${tabIndex}`;
    tabBtn.className = 'px-2 py-1 rounded relative';
    tabsContainer.append(tabBtn);

    // Make tab name editable on double-click
    tabBtn.addEventListener('dblclick', () => {
      const currentName = tabBtn.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.className = 'absolute inset-0 w-full h-full p-1 text-left';
      tabBtn.textContent = '';
      tabBtn.append(input);
      input.focus();
      function finish() {
        const newName = input.value.trim() || currentName;
        tabBtn.textContent = newName;
        EventBus.emit('tab:rename', { label, index: tabIndex, name: newName, local: true });
      }
      input.addEventListener('blur', finish);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          input.blur();
        }
      });
    });

    // Add delete button if tabIndex > 1
    let delBtn = null;
    if (tabIndex > 1) {
      delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.className = 'ml-1 text-red-500';
      tabsContainer.append(delBtn);
      delBtn.addEventListener('click', () => {
        // remove panel and tab button
        panel.remove();
        tabBtn.remove();
        delBtn.remove();
        EventBus.emit('tab:delete', { label, index: tabIndex, local: true });
      });
    }

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
    // Force canvas redraw on tab switch
    window.dispatchEvent(new Event('resize'));
  });

    // Activate first tab
    if (tabIndex === 1) tabBtn.click();

    // Emit tab:create event
    EventBus.emit('tab:create', { label, index: tabIndex, local: true });
  }

  addBtn.addEventListener('click', addTab);

  // Apply remote tab renames
  EventBus.on('tab:rename', ({ label: remLabel, index: remIndex, name, local }) => {
    if (local) return;
    if (remLabel === label) {
      // find the correct tab button
      const btns = Array.from(tabsContainer.querySelectorAll('button')).filter(
        b => !b.textContent.startsWith('×') && b.textContent !== '+'
      );
      const targetBtn = btns[remIndex - 1];
      if (targetBtn) targetBtn.textContent = name;
    }
  });

  addTab();

  // Remote tab-create: add missing tabs up to index
  EventBus.on('tab:create', ({ label: rl, index: idx, local }) => {
    if (local || rl !== label) return;
    while (tabIndex < idx) addTab();
  });

  // Remote tab-delete: remove the specified tab
  EventBus.on('tab:delete', ({ label: rl, index: idx, local }) => {
    if (local || rl !== label) return;
    // Find tab buttons (exclude "+" and "×" controls)
    const tabBtns = Array.from(tabsContainer.querySelectorAll('button'))
      .filter(b => b.textContent !== '+' && b.textContent !== '×');
    const tabBtn = tabBtns[idx - 1];
    if (tabBtn) {
      // Remove corresponding delete button if present
      const delBtn = tabBtn.nextSibling;
      if (delBtn && delBtn.textContent === '×') delBtn.remove();
      // Remove panel
      const panel = contentArea.querySelector(`#${label.toLowerCase()}-${idx}`);
      if (panel) panel.remove();
      // Remove tab button
      tabBtn.remove();
    }
  });

  // Remote full-state sync: reconcile tab names
  EventBus.on('tab:state', ({ label: rl, names, local }) => {
    if (local || rl !== label) return;
    // current names
    const btns = Array.from(tabsContainer.querySelectorAll('button'))
      .filter(b => b.textContent !== '+' && b.textContent !== '×');
    const currentNames = btns.map(b => b.textContent);
    // Add missing tabs
    names.forEach((name, idx) => {
      if (currentNames[idx] !== name) {
        if (idx < currentNames.length) {
          // rename existing
          btns[idx].textContent = name;
        } else {
          // add new tab and rename
          addTab();
          // last created tab button:
          const newBtn = tabsContainer.querySelectorAll('button')[tabsContainer.querySelectorAll('button').length - (delBtn ? 2 : 1)];
          newBtn.textContent = name;
        }
      }
    });
    // Remove extra tabs
    if (currentNames.length > names.length) {
      for (let i = currentNames.length; i > names.length; i--) {
        // remove the last tab
        const toRemoveBtn = tabsContainer.querySelectorAll('button')
          .filter(b => b.textContent !== '+' && b.textContent !== '×')[i-1];
        const delBtnLocal = toRemoveBtn.nextSibling;
        if (delBtnLocal && delBtnLocal.textContent === '×') delBtnLocal.remove();
        toRemoveBtn.remove();
        const panel = contentArea.querySelector(`#${label.toLowerCase()}-${i}`);
        if (panel) panel.remove();
      }
    }
  });

  wrapper.append(nav, contentArea);
  container.append(wrapper);
}

// Initialize layout
const root = document.getElementById('app');
const { left, right } = setupLayout(root);

// Ensure tabbed panels are created immediately after layout initialization, outside any conditionals
createTabbedContainer(left, createCharacterPanel, 'Character');
createTabbedContainer(left, createChatPanel, 'Chat');
createTabbedContainer(right, createMapPanel, 'Map');

// Relay chat messages over P2P
EventBus.on('chat:send', msg => {
  console.log('[P2P SEND] chat', msg);
  if (window.p2pSend) window.p2pSend({ channel: 'chat', payload: msg });
});

// Sync dim changes
EventBus.on('map:dimChange', ({ local, ...data }) => {
  if (local) {
    console.log('[P2P SEND] map:dim', data);
    if (window.p2pSend) window.p2pSend({ channel: 'map:dim', payload: data });
  }
});
// Sync clear
EventBus.on('map:clear', ({ local, id }) => {
  if (local) {
    console.log('[P2P SEND] map:clear', id);
    if (window.p2pSend) window.p2pSend({ channel: 'map:clear', payload: { id } });
  }
});

// Sync tab create/delete
EventBus.on('tab:create', ({ local, ...data }) => {
  if (local) {
    console.log('[P2P SEND] tab:create', data);
    if (window.p2pSend) window.p2pSend({ channel: 'tab:create', payload: data });
  }
});
EventBus.on('tab:delete', ({ local, ...data }) => {
  if (local) {
    console.log('[P2P SEND] tab:delete', data);
    if (window.p2pSend) window.p2pSend({ channel: 'tab:delete', payload: data });
  }
});

// Sync tab renames
EventBus.on('tab:rename', ({ local, ...data }) => {
  if (local) {
    console.log('[P2P SEND] tab:rename', data);
    if (window.p2pSend) window.p2pSend({ channel: 'tab:rename', payload: data });
  }
});

// Periodic full tab state sync
setInterval(() => {
  // for each container type, emit its state
  ['Character','Chat','Map'].forEach(label => {
    EventBus.emit('tab:state', {
      label,
      names: (() => {
        // collect names of buttons in that container
        const container = label === 'Map' ? right : left; // use setupLayout variables
        const nav = container.querySelector('div'); // first nav
        const tabsContainer = nav.querySelector('div');
        return Array.from(tabsContainer.querySelectorAll('button'))
          .filter(b => b.textContent !== '+' && b.textContent !== '×')
          .map(b => b.textContent);
      })(),
      local: true
    });
  });
}, 5000);

EventBus.on('tab:state', ({ local, label, names }) => {
  if (local) {
    console.log('[P2P SEND] tab:state', { label, names });
    if (window.p2pSend) window.p2pSend({ channel: 'tab:state', payload: { label, names } });
  }
});



// Send map image in chunks when local upload occurs
EventBus.on('map:imageChange', ({ local, id, ...data }) => {
  if (!local) return;
  console.log('[P2P SEND] map:imageChange', { id, dataUrlSnippet: data.dataUrl.slice(0,50) });
  const fileId = crypto.randomUUID();
  const chunks = splitString(data.dataUrl, 16000);
  chunks.forEach((chunk, index) => {
    if (window.p2pSend) window.p2pSend({
      channel: 'map:image-chunk',
      payload: { fileId, index, total: chunks.length, chunk, id }
    });
  });
});
EventBus.on('map:tokenMove', ({ local, ...data }) => {
  if (local) {
    console.log('[P2P SEND] map:token', data);
    if (window.p2pSend) window.p2pSend({ channel: 'map:token', payload: data });
  }
});
EventBus.on('map:colorChange', ({ local, ...data }) => {
  if (local) {
    console.log('[P2P SEND] map:color', data);
    if (window.p2pSend) window.p2pSend({ channel: 'map:color', payload: data });
  }
});
// Sync token-size changes
EventBus.on('map:sizeChange', ({ local, ...data }) => {
  if (local) {
    console.log('[P2P SEND] map:sizeChange', data);
    if (window.p2pSend) window.p2pSend({ channel: 'map:sizeChange', payload: data });
  }
});
pastePeerIdBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    theirIdInput.value = text;
    peerConnectBtn.disabled = false;
    peerConnectBtn.classList.replace('bg-gray-500', 'bg-green-500');
    console.log('Peer ID collé :', text);
  } catch (e) {
    console.error('Impossible de coller depuis le presse-papiers', e);
  }
});