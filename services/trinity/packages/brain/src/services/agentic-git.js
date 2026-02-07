const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

function findGitRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  while (current !== path.parse(current).root) {
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

function runGit(args, options = {}) {
  const gitRoot = options.gitRoot || findGitRoot();
  if (!gitRoot) {
    return Promise.reject(new Error('Git root not found'));
  }

  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: gitRoot, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(stderr || err.message));
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), gitRoot });
    });
  });
}

async function getStatus() {
  return runGit(['status', '--porcelain=v1', '--branch']);
}

async function getDiff(options = {}) {
  const args = ['diff'];
  if (options.staged) args.push('--staged');
  if (options.path) args.push('--', options.path);
  return runGit(args);
}

async function getLog(options = {}) {
  const limit = Math.max(1, Number(options.limit ?? 20));
  return runGit(['log', `-n${limit}`, '--pretty=oneline']);
}

async function commitChanges(message) {
  if (!message) {
    throw new Error('commit message required');
  }
  await runGit(['add', '--all']);
  return runGit(['commit', '-m', message]);
}

module.exports = {
  findGitRoot,
  getStatus,
  getDiff,
  getLog,
  commitChanges,
};
