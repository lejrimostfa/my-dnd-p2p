

export function setupLayout(root) {
  // Ensure root uses Tailwind grid classes
  root.className =
    'h-screen grid grid-cols-1 md:grid-cols-3 grid-rows-auto md:grid-rows-1 gap-4 p-4';

  // Left column container (two stacked panels)
  const left = document.createElement('div');
  left.className = 'md:col-span-1 grid grid-rows-2 gap-4 min-w-0';

  // Right column container (single panel)
  const right = document.createElement('div');
  right.className = 'md:col-span-2 min-w-0 h-full flex flex-col';

  
  // Append containers to root
  root.append(left, right);

  return { left, right };
}