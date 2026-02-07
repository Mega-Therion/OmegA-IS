const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');

function findGitRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (current !== path.parse(current).root) {
    if (require('fs').existsSync(path.join(current, '.git'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

const DEFAULT_ROOT = path.resolve(
  process.env.AGENTIC_ROOT || findGitRoot() || path.resolve(__dirname, '..', '..')
);

function getAllowedRoots() {
  const roots = process.env.AGENTIC_ALLOWED_ROOTS
    ? process.env.AGENTIC_ALLOWED_ROOTS.split(',').map(r => r.trim()).filter(Boolean)
    : [DEFAULT_ROOT];
  return roots.map(root => path.resolve(root));
}

function resolvePath(inputPath) {
  if (!inputPath) {
    throw new Error('path is required');
  }

  const roots = getAllowedRoots();
  const resolved = path.resolve(inputPath);

  const isAllowed = roots.some(root => {
    const rel = path.relative(root, resolved);
    return (!rel || (!rel.startsWith('..') && !path.isAbsolute(rel)));
  });

  if (!isAllowed) {
    throw new Error(`Path is outside allowed roots: ${resolved}`);
  }

  return resolved;
}

async function listDirectory(dirPath, options = {}) {
  const target = resolvePath(dirPath);
  const depth = Math.max(0, Number(options.depth ?? 2));
  const includeHidden = options.includeHidden === true;

  async function walk(current, currentDepth) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      const node = {
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file',
      };

      if (entry.isDirectory() && currentDepth < depth) {
        node.children = await walk(fullPath, currentDepth + 1);
      }

      results.push(node);
    }

    return results;
  }

  return walk(target, 0);
}

async function readFile(filePath, options = {}) {
  const target = resolvePath(filePath);
  const encoding = options.encoding || 'utf-8';
  const content = await fs.readFile(target, encoding);
  return { path: target, content };
}

async function writeFile(filePath, content, options = {}) {
  const target = resolvePath(filePath);
  const encoding = options.encoding || 'utf-8';
  const mode = options.append ? 'a' : 'w';

  if (options.createDirs) {
    await fs.mkdir(path.dirname(target), { recursive: true });
  }

  await fs.writeFile(target, content, { encoding, flag: mode });
  return { path: target, bytes: Buffer.byteLength(content, encoding) };
}

async function searchFiles(query, options = {}) {
  if (!query) throw new Error('query is required');
  const root = resolvePath(options.path || DEFAULT_ROOT);
  const maxResults = Math.max(1, Number(options.maxResults ?? 50));

  const rgAvailable = await new Promise((resolve) => {
    execFile('rg', ['--version'], (err) => resolve(!err));
  });

  if (rgAvailable) {
    return new Promise((resolve, reject) => {
      const args = [
        '--json',
        '--max-count', String(maxResults),
        '--glob', '!node_modules/**',
        '--glob', '!.git/**',
        query,
        root,
      ];
      execFile('rg', args, { maxBuffer: 1024 * 1024 }, (err, stdout) => {
        if (err && err.code !== 1) {
          return reject(err);
        }

        const matches = [];
        stdout.split('\n').filter(Boolean).forEach((line) => {
          try {
            const payload = JSON.parse(line);
            if (payload.type === 'match') {
              matches.push({
                path: payload.data.path.text,
                line: payload.data.line_number,
                text: payload.data.lines.text.trim(),
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
        resolve({ matches });
      });
    });
  }

  const results = [];
  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build']);

  async function walkAndSearch(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        await walkAndSearch(full);
      } else {
        const data = await fs.readFile(full, 'utf-8').catch(() => null);
        if (!data) continue;
        const lines = data.split('\n');
        lines.forEach((line, idx) => {
          if (results.length >= maxResults) return;
          if (line.includes(query)) {
            results.push({
              path: full,
              line: idx + 1,
              text: line.trim(),
            });
          }
        });
      }
    }
  }

  await walkAndSearch(root);
  return { matches: results };
}

module.exports = {
  findGitRoot,
  resolvePath,
  listDirectory,
  readFile,
  writeFile,
  searchFiles,
};
