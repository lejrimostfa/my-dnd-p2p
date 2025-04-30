

import { EventBus } from '../../utils/eventBus.js';

export function createChatPanel(id) {
  const container = document.createElement('div');
  container.id = id;
  container.className = 'bg-white rounded shadow h-full flex flex-col';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between px-4 py-2 border-b';
  const title = document.createElement('h2');
  title.textContent = 'Chat';
  title.className = 'text-lg font-semibold';
  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.className = 'px-2 py-1 bg-blue-500 text-white rounded';
  header.append(title, addBtn);

  const messages = document.createElement('div');
  messages.className = 'p-4 flex-1 overflow-auto';
  
  const inputBar = document.createElement('div');
  inputBar.className = 'flex border-t';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type a message...';
  input.className = 'flex-1 px-4 py-2';
  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.className = 'px-4 bg-blue-500 text-white';

  inputBar.append(input, sendBtn);
  container.append(header, messages, inputBar);

  // Send on click
  sendBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;
    EventBus.emit('chat:send', text);
    // local echo
    const msgDiv = document.createElement('div');
    msgDiv.className = 'text-right text-blue-600';
    msgDiv.textContent = text;
    messages.append(msgDiv);
    input.value = '';
  });

  // Receive over P2P
  EventBus.on('chat:receive', text => {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'text-left text-gray-800';
    msgDiv.textContent = text;
    messages.append(msgDiv);
  });

  return container;
}