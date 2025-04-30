

export function createMapPanel(id) {
  const container = document.createElement('div');
  container.id = id;
  container.className = 'bg-white rounded shadow h-full flex flex-col';

  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between px-4 py-2 border-b';
  const title = document.createElement('h2');
  title.textContent = 'Map';
  title.className = 'text-lg font-semibold';
  const addBtn = document.createElement('button');
  addBtn.textContent = '+';
  addBtn.className = 'px-2 py-1 bg-blue-500 text-white rounded';
  header.append(title, addBtn);

  // Canvas area
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'p-4 flex-1 overflow-auto';
  const canvas = document.createElement('canvas');
  canvas.className = 'w-full h-full bg-gray-200';
  canvasContainer.append(canvas);

  container.append(header, canvasContainer);
  return container;
}