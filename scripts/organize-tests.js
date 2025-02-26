
import { readdirSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const moveTestFiles = (dir) => {
  const files = readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    if (file.isDirectory()) {
      if (file.name === '__tests__') return;
      moveTestFiles(join(dir, file.name));
    } else if (file.name.includes('.test.') || file.name.includes('.spec.')) {
      const sourcePath = join(dir, file.name);
      const targetDir = join(dir, '__tests__');
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      renameSync(sourcePath, join(targetDir, file.name));
    }
  });
};

moveTestFiles('./app');
console.log('Test files organized successfully!');
