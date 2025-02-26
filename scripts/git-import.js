import { execSync } from 'child_process';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import ignore from 'ignore';

// Common patterns to ignore
const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.github/**',
  '.vscode/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yaml',
];

const ig = ignore().add(IGNORE_PATTERNS);

async function importGitRepo(repoUrl) {
  try {
    // Create temp directory for cloning
    const tempDir = join(process.cwd(), 'temp_git_import');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir);
    }

    console.log('Cloning repository...');
    execSync(`git clone ${repoUrl} ${tempDir}`, { stdio: 'inherit' });

    // Get list of files
    const files = execSync('git ls-files', { cwd: tempDir }).toString().split('\n').filter(Boolean);

    // Filter files based on ignore patterns
    const filteredFiles = files.filter(file => !ig.ignores(file));

    console.log(`Found ${filteredFiles.length} files to import`);

    // Import files to project
    for (const file of filteredFiles) {
      const sourcePath = join(tempDir, file);
      const targetPath = join(process.cwd(), file);
      const content = readFileSync(sourcePath, 'utf8');

      // Create directories if needed
      const dir = targetPath.split('/').slice(0, -1).join('/');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(targetPath, content);
      console.log(`Imported: ${file}`);
    }

    // Clean up
    execSync(`rm -rf ${tempDir}`);
    console.log('Import completed successfully!');

  } catch (error) {
    console.error('Error importing repository:', error);
    process.exit(1);
  }
}

// Get repo URL from command line args
const repoUrl = process.argv[2];
if (!repoUrl) {
  console.error('Please provide a repository URL');
  console.log('Usage: node scripts/git-import.js <repository-url>');
  process.exit(1);
}

importGitRepo(repoUrl);