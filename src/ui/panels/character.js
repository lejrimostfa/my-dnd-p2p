

export function createCharacterPanel(id) {
  const container = document.createElement('div');
  container.id = id;
  container.className = 'bg-white rounded shadow h-full flex flex-col';

  // Header with title and add button
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between px-4 py-2 border-b';
  const title = document.createElement('h2');
  title.textContent = 'Character Sheet';
  title.className = 'text-lg font-semibold';
  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.className = 'px-2 py-1 bg-blue-500 text-white rounded';
  header.append(title, addBtn);

  // Content area
  const content = document.createElement('div');
  content.className = 'p-4 flex-1 overflow-auto';
  content.textContent = 'Import JSON/CSV to load character data here.';

  container.append(header, content);
  return container;
}