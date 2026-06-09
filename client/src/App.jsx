import { useState, useRef, useEffect } from 'react';
import { 
  FiFolder, FiGithub, FiLock, FiGlobe, FiUpload, FiCheck, 
  FiAlertCircle, FiLoader, FiShield, FiTrash2, FiX, FiAlertTriangle, 
  FiRefreshCw, FiGitBranch, FiPlusCircle, FiEye,
  FiCheckCircle
} from 'react-icons/fi';
import './index.css';

function App() {
  const [token, setToken] = useState('');
  const [tokenValid, setTokenValid] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('create');
  const [folderPath, setFolderPath] = useState('');
  const [repoName, setRepoName] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [description, setDescription] = useState('');
  const [license, setLicense] = useState('None');
  const [status, setStatus] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [tokenStored, setTokenStored] = useState(false);
  const [sanitizeFindings, setSanitizeFindings] = useState([]);
  const [showSanitizeModal, setShowSanitizeModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isApplyingSanitize, setIsApplyingSanitize] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [gitStatus, setGitStatus] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setToken(savedToken);
      validateToken(savedToken);
    }
  }, []);

  const validateToken = async (tokenValue) => {
    try {
      const res = await fetch('/api/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue })
      });
      const data = await res.json();
      if (data.valid) {
        setTokenValid(true);
        setUser(data.user);
        localStorage.setItem('github_token', tokenValue);
        setTokenStored(true);
      } else {
        setTokenValid(false);
      }
    } catch (err) {
      setTokenValid(false);
    }
  };

  const handleStoreToken = async () => {
    if (!token || !tokenValid) return;
    try {
      const res = await fetch('/api/store-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) {
        setTokenStored(true);
        setStatus(prev => [...prev, '🔐 Token stored securely in OS Vault']);
        setShowSettings(false);
      }
    } catch (err) {
      setStatus(prev => [...prev, `Error: ${err.message}`]);
    }
  };

  const handleDeleteToken = async () => {
    try {
      await fetch('/api/delete-token', { method: 'POST' });
      localStorage.removeItem('github_token');
      setTokenValid(null);
      setTokenStored(false);
      setToken('');
      setUser(null);
    } catch (err) {
      setStatus(prev => [...prev, `Error: ${err.message}`]);
    }
  };

  const handleCreateRepo = async () => {
    if (!folderPath || !repoName) {
      setStatus(prev => [...prev, '⚠️ Please provide folder path and repository name']);
      return;
    }
    
    setIsUploading(true);
    setStatus([]);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/create-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath,
          repoName,
          visibility,
          description,
          license,
          token
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.message) setStatus(prev => [...prev, data.message]);
              if (data.error) setStatus(prev => [...prev, `Error: ${data.error}`]);
              if (data.success) {
                setSuccess(data);
                setIsUploading(false);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      setStatus(prev => [...prev, `Error: ${err.message}`]);
      setIsUploading(false);
    }
  };

  const handleScanSecrets = async () => {
    if (!folderPath) {
      setStatus(prev => [...prev, '⚠️ Please select a folder first']);
      return;
    }
    
    setIsScanning(true);
    setStatus([]);
    setScanResults(null);
    
    try {
      const response = await fetch('/api/sanitize-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath, dryRun: true })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.message) setStatus(prev => [...prev, data.message]);
              if (data.error) setStatus(prev => [...prev, `Error: ${data.error}`]);
              if (data.stats) {
                setScanResults(data.stats);
                setSanitizeFindings(data.stats.findings || []);
                if (data.stats.findings && data.stats.findings.length > 0) {
                  setShowSanitizeModal(true);
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      setStatus(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplySanitization = async () => {
    if (!folderPath) return;
    
    setIsApplyingSanitize(true);
    setStatus([]);
    
    try {
      const response = await fetch('/api/apply-sanitization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.message) setStatus(prev => [...prev, data.message]);
              if (data.error) setStatus(prev => [...prev, `Error: ${data.error}`]);
              if (data.stats) {
                setScanResults(data.stats);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      setStatus(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setIsApplyingSanitize(false);
      setShowSanitizeModal(false);
    }
  };

  const checkGitStatus = async () => {
    if (!folderPath) {
      setStatus(prev => [...prev, '⚠️ Please enter a folder path']);
      return;
    }
    setIsLoadingStatus(true);
    setGitStatus(null);
    setPushSuccess(null);
    setStatus([]);
    try {
      const res = await fetch('/api/git-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(prev => [...prev, data.error || 'Error']);
        if (data.notGitRepo) {
          setGitStatus({ notGitRepo: true });
        }
      } else {
        setGitStatus(data);
      }
    } catch (err) {
      setStatus(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handlePushUpdates = async () => {
    if (!folderPath || !gitStatus || gitStatus.isClean) return;
    setIsPushing(true);
    setPushSuccess(null);
    setStatus([]);
    try {
      const response = await fetch('/api/git-push-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath, commitMessage: commitMessage || 'Update project files' })
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.message) setStatus(prev => [...prev, data.message]);
              if (data.success) {
                setPushSuccess(data);
                setGitStatus(null);
                setCommitMessage('');
              }
              if (data.error) setStatus(prev => [...prev, `Error: ${data.error}`]);
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      setStatus(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setIsPushing(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-slate-700">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-emerald-500/20 mb-4 overflow-hidden">
              <img src="/ggui-logo.svg" alt="GGUI" className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-white">GGUI</h1>
            <p className="text-slate-400 mt-1">Git Automation</p>
            <p className="text-xs text-amber-400 mt-2">🔒 Secured by Amanat Digital</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">GitHub PAT</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {tokenValid === false && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <FiAlertCircle />
                <span>Invalid token</span>
              </div>
            )}
            <button
              onClick={() => token && validateToken(token)}
              disabled={!token}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              <FiCheck /> Continue
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-6 text-center">
            Required scopes: repo, user<br/>
            <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
              Generate token on GitHub →
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20 overflow-hidden">
              <img src="/ggui-logo.svg" alt="GGUI" className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GGUI</h1>
              <p className="text-sm text-slate-400">@{user}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {tokenStored && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                <FiShield className="w-3 h-3" /> OS Vault
              </span>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
            >
              <FiShield className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>

        {/* Settings Dropdown */}
        {showSettings && (
          <div className="mb-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-3">Token Settings</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteToken}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
              >
                <FiTrash2 className="w-4 h-4" /> Remove Token
              </button>
              <span className="text-xs text-slate-500">Token is stored in OS Vault (secure)</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('create'); setFolderPath(''); setGitStatus(null); setSuccess(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              activeTab === 'create' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <FiPlusCircle className="w-4 h-4" /> Create New Repo
          </button>
          <button
            onClick={() => { setActiveTab('update'); setFolderPath(''); setGitStatus(null); setSuccess(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              activeTab === 'update' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <FiRefreshCw className="w-4 h-4" /> Update Existing
          </button>
        </div>

        {/* CREATE NEW REPO TAB */}
        {activeTab === 'create' && !success && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FiFolder className="text-emerald-400" /> Select Folder
              </h2>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => { 
                  setFolderPath(e.target.value); 
                  const n = e.target.value.split(/[/\\]/).pop(); 
                  if (n && !repoName) setRepoName(n); 
                }}
                placeholder="/Users/username/projects/my-app"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {folderPath && (
              <>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700">
                  <h2 className="text-lg font-semibold text-white mb-4">Repository Details</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Repository Name</label>
                      <input
                        type="text"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="My awesome project"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Visibility</label>
                      <div className="flex gap-4">
                        <button onClick={() => setVisibility('public')} className={`flex-1 py-3 rounded-lg border ${visibility === 'public' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 text-slate-400'}`}>
                          <FiGlobe className="inline w-4 h-4 mr-1" /> Public
                        </button>
                        <button onClick={() => setVisibility('private')} className={`flex-1 py-3 rounded-lg border ${visibility === 'private' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-600 text-slate-400'}`}>
                          <FiLock className="inline w-4 h-4 mr-1" /> Private
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">License</label>
                      <select value={license} onChange={(e) => setLicense(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
                        <option value="None">None</option>
                        <option value="MIT">MIT License</option>
                        <option value="Apache-2.0">Apache License 2.0</option>
                        <option value="GPLv3">GNU GPLv3</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Security Tools - Scan & Preview */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FiAlertTriangle className="text-amber-400" /> Security Tools
                  </h2>
                  <p className="text-sm text-slate-400 mb-4">
                    Scan your code for sensitive data (API keys, passwords, tokens) before uploading.
                  </p>
                  <button
                    onClick={handleScanSecrets}
                    disabled={isScanning || !folderPath}
                    className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg flex items-center justify-center gap-2"
                  >
                    {isScanning ? <FiLoader className="animate-spin" /> : <FiEye className="w-4 h-4" />}
                    Scan & Preview
                  </button>
                </div>
              </>
            )}

            {/* Status Messages */}
            {status.length > 0 && (
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                {status.map((msg, i) => (
                  <p key={i} className="text-sm text-slate-300 flex items-center gap-2">
                    <FiLoader className={`w-4 h-4 ${msg.includes('Complete') || msg.includes('✅') ? 'text-emerald-400' : 'animate-spin text-emerald-400'}`} />
                    {msg}
                  </p>
                ))}
              </div>
            )}

            {/* Create Repo Button - PRIMARY ACTION */}
            {folderPath && repoName && (
              <button
                onClick={handleCreateRepo}
                disabled={isUploading}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 text-lg"
              >
                {isUploading ? <FiLoader className="animate-spin" /> : <FiUpload className="w-5 h-5" />}
                Create Repo & Upload
              </button>
            )}
          </div>
        )}

        {/* Success State for Create */}
        {activeTab === 'create' && success && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700 text-center">
            <FiCheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Repository Created!</h2>
            <p className="text-slate-400 mb-4">Your project has been uploaded to GitHub.</p>
            <a 
              href={success.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg mb-4"
            >
              <FiGithub className="w-5 h-5" /> View on GitHub
            </a>
            <br/>
            <button 
              onClick={() => { 
                setFolderPath(''); 
                setRepoName(''); 
                setDescription(''); 
                setSuccess(null); 
                setStatus([]); 
              }} 
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Upload Another Project
            </button>
          </div>
        )}

        {/* UPDATE EXISTING TAB */}
        {activeTab === 'update' && !pushSuccess && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FiGitBranch className="text-emerald-400" /> Select Existing Project
              </h2>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => { setFolderPath(e.target.value); setGitStatus(null); setSuccess(null); }}
                placeholder="/Users/username/projects/my-existing-app"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={checkGitStatus}
                disabled={!folderPath || isLoadingStatus}
                className="w-full mt-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg flex items-center justify-center gap-2"
              >
                {isLoadingStatus ? <FiLoader className="animate-spin" /> : <FiRefreshCw className="w-4 h-4" />}
                Check for Updates
              </button>
            </div>

            {/* Security Tools for Update Tab */}
            {folderPath && (
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FiShieldAlert className="text-amber-400" /> Security Tools
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Scan your code for sensitive data before pushing updates.
                </p>
                <button
                  onClick={handleScanSecrets}
                  disabled={isScanning || !folderPath}
                  className="w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg flex items-center justify-center gap-2"
                >
                  {isScanning ? <FiLoader className="animate-spin" /> : <FiEye className="w-4 h-4" />}
                  Scan & Preview
                </button>
              </div>
            )}

            {/* Git Status Display */}
            {gitStatus && !gitStatus.notGitRepo && (
              gitStatus.isClean ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-3">
                    <FiCheck className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-emerald-400">Up to date!</h3>
                      <p className="text-slate-400 text-sm">No changes detected. Repository is already synced with GitHub.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Changes Summary</h3>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                      <p className="text-2xl font-bold text-yellow-400">{gitStatus.modified.length}</p>
                      <p className="text-xs text-slate-400">Modified</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <p className="text-2xl font-bold text-emerald-400">{gitStatus.created.length + gitStatus.untracked.length}</p>
                      <p className="text-xs text-slate-400">Added</p>
                    </div>
                    <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-2xl font-bold text-red-400">{gitStatus.deleted.length}</p>
                      <p className="text-xs text-slate-400">Deleted</p>
                    </div>
                    <div className="text-center p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                      <p className="text-2xl font-bold text-blue-400">{gitStatus.totalChanges}</p>
                      <p className="text-xs text-slate-400">Total</p>
                    </div>
                  </div>
                  
                  {/* Show changed files if any */}
                  {(gitStatus.modified.length > 0 || gitStatus.created.length > 0 || gitStatus.deleted.length > 0) && (
                    <div className="mb-4 max-h-40 overflow-y-auto">
                      <p className="text-xs text-slate-500 mb-2">Changed files:</p>
                      {gitStatus.modified.slice(0, 10).map((f, i) => (
                        <div key={i} className="text-xs text-yellow-400">M {f}</div>
                      ))}
                      {gitStatus.created.slice(0, 10).map((f, i) => (
                        <div key={i} className="text-xs text-emerald-400">A {f}</div>
                      ))}
                      {gitStatus.deleted.slice(0, 10).map((f, i) => (
                        <div key={i} className="text-xs text-red-400">D {f}</div>
                      ))}
                      {gitStatus.totalChanges > 30 && (
                        <div className="text-xs text-slate-500">... and {gitStatus.totalChanges - 30} more</div>
                      )}
                    </div>
                  )}
                  
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Update project files"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 mb-4"
                  />
                  <button
                    onClick={handlePushUpdates}
                    disabled={isPushing || gitStatus.isClean}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
                  >
                    {isPushing ? <FiLoader className="animate-spin" /> : <FiUpload />}
                    Sync Updates to GitHub
                  </button>
                </div>
              )
            )}

            {gitStatus && gitStatus.notGitRepo && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <FiAlertTriangle className="w-6 h-6 text-red-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-400">Not a Git Repository</h3>
                    <p className="text-slate-400 text-sm">This folder is not initialized as a Git repository. Please use the "Create New Repo" feature first.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {status.length > 0 && (
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                {status.map((msg, i) => (
                  <p key={i} className="text-sm text-slate-300 flex items-center gap-2">
                    <FiLoader className={`w-4 h-4 ${msg.includes('Complete') || msg.includes('Successfully') || msg.includes('✅') ? 'text-emerald-400' : 'animate-spin text-emerald-400'}`} />
                    {msg}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Push Success State */}
        {activeTab === 'update' && pushSuccess && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700 text-center">
            <FiCheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Successfully Synced!</h2>
            <p className="text-slate-400 mb-4">
              {pushSuccess.stats && `${pushSuccess.stats.modified} modified, ${pushSuccess.stats.created} added, ${pushSuccess.stats.deleted} deleted`}
            </p>
            <button 
              onClick={() => { 
                setFolderPath(''); 
                setGitStatus(null); 
                setPushSuccess(null); 
                setStatus([]); 
              }} 
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Check Another Project
            </button>
          </div>
        )}

        {/* Sanitization Modal */}
        {showSanitizeModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl border border-slate-700 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FiShieldAlert className="text-amber-400" /> Security Scan Results
                </h2>
                <button onClick={() => setShowSanitizeModal(false)} className="text-slate-400 hover:text-white">
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                  <p className="text-amber-400 font-semibold">⚠️ {sanitizeFindings.length} files with potential secrets detected!</p>
                  <p className="text-slate-400 text-sm mt-1">Review the findings below before uploading to GitHub.</p>
                </div>
                
                {sanitizeFindings.length > 0 ? (
                  <div className="space-y-2">
                    {sanitizeFindings.map((finding, i) => (
                      <div key={i} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{finding.file}</span>
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">{finding.type}</span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1">{finding.count} secret(s) found</p>
                        {finding.matches && finding.matches.length > 0 && (
                          <div className="mt-2 text-xs text-slate-500">
                            {finding.matches.map((m, j) => (
                              <div key={j} className="font-mono bg-slate-800 p-1 rounded mt-1 truncate">{m}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiCheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400">No secrets found!</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSanitizeModal(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySanitization}
                  disabled={isApplyingSanitize}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  {isApplyingSanitize ? <FiLoader className="animate-spin" /> : <FiShield className="w-4 h-4" />}
                  Approve & Redact
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
