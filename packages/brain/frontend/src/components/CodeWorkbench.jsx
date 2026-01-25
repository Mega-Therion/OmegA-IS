import { useEffect, useState } from 'react'
import { Folder, FileText, RefreshCw, GitBranch, Search } from 'lucide-react'

const defaultRoot = '.'

const fetchJson = async (url, options) => {
  const response = await fetch(url, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }
  return response.json()
}

const TreeNode = ({ node, onSelect, depth = 0 }) => {
  const padding = depth * 12
  return (
    <div className="space-y-1">
      <button
        onClick={() => node.type === 'file' && onSelect(node)}
        className="flex items-center space-x-2 text-left text-sm text-gray-200 hover:text-omega-accent"
        style={{ paddingLeft: `${padding}px` }}
      >
        {node.type === 'directory' ? (
          <Folder className="w-4 h-4 text-omega-accent/70" />
        ) : (
          <FileText className="w-4 h-4 text-omega-purple/70" />
        )}
        <span>{node.name}</span>
      </button>
      {node.children?.map((child) => (
        <TreeNode key={child.path} node={child} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  )
}

const CodeWorkbench = () => {
  const [rootPath, setRootPath] = useState(defaultRoot)
  const [tree, setTree] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [gitStatus, setGitStatus] = useState('')
  const [gitDiff, setGitDiff] = useState('')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [error, setError] = useState(null)

  const loadTree = async () => {
    try {
      setError(null)
      const data = await fetchJson(`/code/fs/tree?path=${encodeURIComponent(rootPath)}&depth=2`)
      setTree(data.tree || [])
    } catch (err) {
      setError(err.message)
    }
  }

  const loadGitStatus = async () => {
    try {
      const data = await fetchJson('/code/git/status')
      setGitStatus(data.status.stdout || '')
    } catch (err) {
      setGitStatus(err.message)
    }
  }

  const loadGitDiff = async () => {
    try {
      const data = await fetchJson('/code/git/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      setGitDiff(data.diff.stdout || '')
    } catch (err) {
      setGitDiff(err.message)
    }
  }

  const handleSelectFile = async (node) => {
    try {
      setSelectedFile(node)
      const data = await fetchJson(`/code/fs/read?path=${encodeURIComponent(node.path)}`)
      setFileContent(data.file.content || '')
    } catch (err) {
      setFileContent(`Error: ${err.message}`)
    }
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    try {
      const data = await fetchJson('/code/fs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, path: rootPath, maxResults: 20 }),
      })
      setSearchResults(data.result.matches || [])
    } catch (err) {
      setSearchResults([{ path: 'error', line: 0, text: err.message }])
    }
  }

  useEffect(() => {
    loadTree()
    loadGitStatus()
    loadGitDiff()
  }, [])

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-omega-accent">Workspace</h3>
          <button onClick={loadTree} className="text-gray-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <input
          value={rootPath}
          onChange={(e) => setRootPath(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white mb-3"
          placeholder="Root path"
        />
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <div className="max-h-[420px] overflow-y-auto space-y-2">
          {tree.map((node) => (
            <TreeNode key={node.path} node={node} onSelect={handleSelectFile} />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-omega-purple">File Viewer</h3>
            {selectedFile && (
              <span className="text-xs text-gray-400">{selectedFile.path}</span>
            )}
          </div>
          <pre className="text-xs text-gray-200 bg-black/70 border border-gray-900 rounded-lg p-3 max-h-[320px] overflow-auto">
            {fileContent || 'Select a file to view.'}
          </pre>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-omega-accent">Git Status</h3>
              <button onClick={loadGitStatus} className="text-gray-400 hover:text-white">
                <GitBranch className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-xs text-gray-200 bg-black/70 border border-gray-900 rounded-lg p-3 max-h-[180px] overflow-auto">
              {gitStatus || 'No git status available.'}
            </pre>
          </div>

          <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-omega-accent">Git Diff</h3>
              <button onClick={loadGitDiff} className="text-gray-400 hover:text-white">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-xs text-gray-200 bg-black/70 border border-gray-900 rounded-lg p-3 max-h-[180px] overflow-auto">
              {gitDiff || 'No diff.'}
            </pre>
          </div>
        </div>

        <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-omega-accent">Search</h3>
            <button onClick={handleSearch} className="text-gray-400 hover:text-white">
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white"
              placeholder="Search query"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 rounded-lg bg-omega-accent/30 text-sm text-omega-accent"
            >
              Search
            </button>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-auto">
            {searchResults.length === 0 && (
              <p className="text-xs text-gray-500">No results yet.</p>
            )}
            {searchResults.map((result, idx) => (
              <div key={`${result.path}-${idx}`} className="text-xs text-gray-300">
                <span className="text-omega-purple">{result.path}</span>
                {result.line ? `:${result.line} ` : ' '}
                <span>{result.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeWorkbench
