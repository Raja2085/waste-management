const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Primary Buttons (Background + Text)
  content = content.replace(/bg-blue-600\s+text-white/g, 'bg-foreground text-background');
  
  // Specific Gradient removals
  content = content.replace(/bg-gradient-to-br from-blue-600 to-blue-800 text-white/g, 'bg-foreground text-background');
  content = content.replace(/bg-gradient-to-br from-blue-600 to-blue-800/g, 'bg-foreground text-background');

  // Background replacements
  content = content.replace(/bg-blue-600/g, 'bg-foreground');
  content = content.replace(/hover:bg-blue-700/g, 'hover:bg-foreground/90 hover:text-background');
  content = content.replace(/hover:bg-blue-600/g, 'hover:bg-foreground hover:text-background');
  content = content.replace(/hover:bg-blue-500/g, 'hover:bg-foreground/80');
  
  // Lighter backgrounds
  content = content.replace(/bg-blue-50/g, 'bg-foreground/5');
  content = content.replace(/bg-blue-100/g, 'bg-foreground/10');
  content = content.replace(/dark:bg-blue-900\/20/g, 'dark:bg-foreground/10');
  content = content.replace(/dark:bg-blue-900\/30/g, 'dark:bg-foreground/15');
  content = content.replace(/dark:bg-blue-900\/40/g, 'dark:bg-foreground/20');
  content = content.replace(/dark:hover:bg-blue-900\/20/g, 'dark:hover:bg-foreground/10');
  content = content.replace(/dark:hover:bg-blue-500/g, 'dark:hover:bg-foreground/80');

  // Text colors
  content = content.replace(/text-blue-50/g, 'text-background');
  content = content.replace(/text-blue-100/g, 'text-background/90');
  content = content.replace(/text-blue-200/g, 'text-foreground/40');
  content = content.replace(/text-blue-300/g, 'text-foreground/50');
  content = content.replace(/text-blue-400/g, 'text-foreground/60');
  content = content.replace(/text-blue-500/g, 'text-foreground/70');
  content = content.replace(/text-blue-600/g, 'text-foreground');
  content = content.replace(/text-blue-700/g, 'text-foreground');
  content = content.replace(/text-blue-800/g, 'text-foreground');
  content = content.replace(/text-blue-900/g, 'text-foreground');

  // Dark mode text colors
  content = content.replace(/dark:text-blue-300/g, 'dark:text-foreground/70');
  content = content.replace(/dark:text-blue-400/g, 'dark:text-foreground/80');
  content = content.replace(/dark:text-blue-500/g, 'dark:text-foreground');

  // Hover Text colors
  content = content.replace(/hover:text-blue-400/g, 'hover:text-foreground/80');
  content = content.replace(/hover:text-blue-500/g, 'hover:text-foreground/90');
  content = content.replace(/hover:text-blue-600/g, 'hover:text-foreground');
  content = content.replace(/hover:text-blue-700/g, 'hover:text-foreground');
  content = content.replace(/dark:hover:text-blue-400/g, 'dark:hover:text-foreground/90');

  // Borders
  content = content.replace(/border-blue-100/g, 'border-foreground/10');
  content = content.replace(/border-blue-200/g, 'border-foreground/20');
  content = content.replace(/border-blue-300/g, 'border-foreground/30');
  content = content.replace(/border-blue-400/g, 'border-foreground/40');
  content = content.replace(/border-blue-500/g, 'border-foreground/50');
  content = content.replace(/border-blue-600/g, 'border-foreground');
  content = content.replace(/border-blue-700/g, 'border-foreground');
  content = content.replace(/border-blue-800/g, 'border-foreground');
  
  content = content.replace(/dark:border-blue-500/g, 'dark:border-foreground/50');
  content = content.replace(/dark:border-blue-600/g, 'dark:border-foreground/60');
  content = content.replace(/dark:border-blue-700/g, 'dark:border-foreground/70');
  content = content.replace(/dark:border-blue-800/g, 'dark:border-foreground/80');

  // Hover borders
  content = content.replace(/hover:border-blue-200/g, 'hover:border-foreground/20');
  content = content.replace(/hover:border-blue-500/g, 'hover:border-foreground/50');
  content = content.replace(/dark:hover:border-blue-500/g, 'dark:hover:border-foreground/50');

  // Focus rings
  content = content.replace(/focus:ring-blue-500/g, 'focus:ring-foreground/50');
  content = content.replace(/focus:border-blue-500/g, 'focus:border-foreground/50');

  // Shadows
  content = content.replace(/shadow-blue-600\/20/g, 'shadow-foreground/20');
  content = content.replace(/shadow-blue-500\/50/g, 'shadow-foreground/30');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
}

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

traverseDir(path.join(__dirname, 'app'));
traverseDir(path.join(__dirname, 'components'));
console.log('Done!');
