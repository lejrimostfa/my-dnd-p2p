

import { setupLayout } from './ui/layout.js';
import { createCharacterPanel } from './ui/panels/character.js';
import { createChatPanel } from './ui/panels/chat.js';
import { createMapPanel } from './ui/panels/map.js';

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