const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const { readFile } = require('./agentic-fs');

function basicMetrics(code) {
  const lines = code.split('\n');
  const todoMatches = code.match(/TODO|FIXME|XXX/g) || [];
  return {
    lines: lines.length,
    nonEmptyLines: lines.filter(line => line.trim()).length,
    todos: todoMatches.length,
  };
}

function analyzeJavaScript(code) {
  const metrics = basicMetrics(code);
  let ast;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });
  } catch (error) {
    return { metrics, parseError: error.message };
  }

  const counters = {
    functions: 0,
    loops: 0,
    conditionals: 0,
    imports: 0,
    exports: 0,
  };

  walk.simple(ast, {
    FunctionDeclaration() { counters.functions += 1; },
    FunctionExpression() { counters.functions += 1; },
    ArrowFunctionExpression() { counters.functions += 1; },
    ForStatement() { counters.loops += 1; },
    WhileStatement() { counters.loops += 1; },
    DoWhileStatement() { counters.loops += 1; },
    IfStatement() { counters.conditionals += 1; },
    ImportDeclaration() { counters.imports += 1; },
    ExportNamedDeclaration() { counters.exports += 1; },
    ExportDefaultDeclaration() { counters.exports += 1; },
  });

  return {
    metrics,
    structure: counters,
  };
}

function analyzeCode(code, language = 'javascript') {
  if (language === 'javascript') {
    return analyzeJavaScript(code);
  }
  return {
    metrics: basicMetrics(code),
    notice: `AST analysis not available for language: ${language}`,
  };
}

async function analyzeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const { content } = await readFile(filePath);

  if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    return analyzeJavaScript(content);
  }

  return {
    metrics: basicMetrics(content),
    notice: 'AST analysis not available for this file type',
  };
}

module.exports = {
  analyzeJavaScript,
  analyzeFile,
  basicMetrics,
  analyzeCode,
};
