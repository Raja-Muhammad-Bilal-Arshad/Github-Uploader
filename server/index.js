require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Octokit } = require('@octokit/rest');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

const app = express();
const PORT = 3500;
const SERVICE_NAME = 'AmanatAutoUploader';
const ACCOUNT_NAME = 'github_pat';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

const IS_WINDOWS = os.platform() === 'win32';
const IS_LINUX = os.platform() === 'linux';
const IS_MAC = os.platform() === 'darwin';

console.log(`🖥️  Detected OS: ${IS_WINDOWS ? 'Windows' : IS_LINUX ? 'Linux' : IS_MAC ? 'macOS' : 'Unknown'}`);

const LICENSES = {
  'MIT': `MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
  'Apache-2.0': `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.
2. Grant of Copyright License.
3. Grant of Patent License.
4. Redistribution.
5. Submission of Contributions.
6. Trademarks.
7. Disclaimer of Warranty.
8. Limitation of Liability.
9. Accepting Warranty or Additional Liability.`,
  'GPLv3': `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>

Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.`,
  'None': null
};

const IGNORE_DIRS = [
  'node_modules', '.git', 'venv', '.venv', '__pycache__', 
  'dist', 'build', '.next', '.nuxt', 'vendor', 'target',
  '.idea', '.vscode', 'coverage', '.nyc_output'
];

const SENSITIVE_PATTERNS = [
  { name: 'AWS Access Key', regex: /(?<![A-Z0-9])(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}(?![A-Z0-9])/g },
  { name: 'AWS Secret Key', regex: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g },
  { name: 'JWT Token', regex: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g },
  { name: 'MongoDB URI', regex: /mongodb(\+srv)?:\/\/[^\s"']+/gi },
  { name: 'PostgreSQL URI', regex: /postgres(ql)?:\/\/[^\s"']+/gi },
  { name: 'MySQL URI', regex: /mysql:\/\/[^\s"']+/gi },
  { name: 'Redis URI', regex: /redis:\/\/[^\s"']+/gi },
  { name: 'Generic Secret', regex: /(?<![A-Za-z0-9/+=])(?:secret|password|passwd|pwd|api_key|apikey|auth_token|access_token|private_key)[^\s"']*[=:]\s*["']?[A-Za-z0-9_=-]{8,}["']?/gi },
  { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { name: 'Slack Token', regex: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g },
  { name: 'Stripe Key', regex: /(?:sk|pk)_(?:live|test)_[0-9a-zA-Z]{24,}/g },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
  { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
];

const FILE_EXTENSIONS_TO_SCAN = [
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
  '.rb', '.php', '.go', '.rs', '.swift', '.kt', '.scala', '.env', '.yml',
  '.yaml', '.json', '.xml', '.properties', '.config', '.ini', '.toml',
  '.md', '.txt', '.sql', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd'
];

const GITIGNORE_TEMPLATES = {
  node: `# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Environment
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
.next/
.nuxt/
out/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
`,

  python: `# Virtual environments
venv/
.venv/
env/
ENV/

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
pip-log.txt
pip-delete-this-directory.txt

# Environment
.env
.env.local
*.env

# IDE
.idea/
.vscode/
*.swp

# Build
dist/
build/
*.egg-info/
.pytest_cache/
.coverage
htmlcov/

# OS
.DS_Store
Thumbs.db
`,

  java: `# Compiled
*.class
*.jar
*.war

# Maven
target/
pom.xml.tag
pom.xml.releaseBackup
pom.xml.versionsBackup
pom.xml.next

# Gradle
.gradle/
build/

# IDE
.idea/
.vscode/
*.iml
*.ipr
*.iws

# OS
.DS_Store
Thumbs.db
`,

  go: `# Binaries
*.exe
*.dll
*.so
*.dylib

# Go workspace
go.work

# Vendor
vendor/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
`,

  rust: `# Cargo
target/
Cargo.lock

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
`,

  default: `# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/
vendor/
venv/
.venv/

# Build outputs
dist/
build/
target/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
`
};

function detectTechStack(folderPath) {
  const files = fs.readdirSync(folderPath);
  
  if (files.includes('package.json') || files.includes('package-lock.json') || files.includes('yarn.lock') || files.includes('pnpm-lock.yaml')) {
    return 'node';
  }
  
  if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml') || files.includes('Pipfile')) {
    return 'python';
  }
  
  if (files.includes('pom.xml') || files.includes('build.gradle') || files.includes('gradlew')) {
    return 'java';
  }
  
  if (files.includes('go.mod') || files.includes('go.sum')) {
    return 'go';
  }
  
  if (files.includes('Cargo.toml') || files.includes('Cargo.lock')) {
    return 'rust';
  }
  
  if (files.includes('composer.json')) {
    return 'php';
  }
  
  return 'default';
}

function generateGitignore(folderPath, techStack) {
  const gitignorePath = path.join(folderPath, '.gitignore');
  
  if (fs.existsSync(gitignorePath)) {
    return { exists: true, generated: false };
  }
  
  const template = GITIGNORE_TEMPLATES[techStack] || GITIGNORE_TEMPLATES.default;
  fs.writeFileSync(gitignorePath, template, 'utf8');
  
  return { exists: false, generated: true, techStack };
}

function isIgnored(dirName) {
  return IGNORE_DIRS.includes(dirName.toLowerCase());
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();
  
  if (baseName === '.env' || baseName === '.env.local' || baseName === '.env.production') {
    return true;
  }
  
  return FILE_EXTENSIONS_TO_SCAN.includes(ext);
}

function sanitizePath(inputPath) {
  if (!inputPath) return '';
  
  let normalized = inputPath.trim();
  
  if (IS_WINDOWS) {
    normalized = normalized.replace(/\//g, '\\');
    if (normalized.startsWith('~')) {
      normalized = normalized.replace('~', os.homedir());
    }
  } else {
    normalized = normalized.replace(/\\/g, '/');
    if (normalized.startsWith('~')) {
      normalized = normalized.replace('~', os.homedir());
    }
  }
  
  return path.normalize(normalized);
}

async function storeCredential(password) {
  try {
    const keytar = require('keytar');
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, password);
    console.log('🔐 Credentials stored in OS Vault');
    return true;
  } catch (error) {
    console.error('❌ Failed to store credential:', error.message);
    return false;
  }
}

async function getCredential() {
  try {
    const keytar = require('keytar');
    const password = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    return password;
  } catch (error) {
    console.error('❌ Failed to retrieve credential:', error.message);
    return null;
  }
}

async function deleteCredential() {
  try {
    const keytar = require('keytar');
    await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    console.log('🗑️  Credentials removed from OS Vault');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete credential:', error.message);
    return false;
  }
}

app.post('/api/store-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.json({ success: false, error: 'Token is required' });
    }
    
    const stored = await storeCredential(token);
    if (stored) {
      res.json({ success: true, message: 'Token stored securely in OS Vault' });
    } else {
      res.json({ success: false, error: 'Failed to store token' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/delete-token', async (req, res) => {
  try {
    await deleteCredential();
    res.json({ success: true, message: 'Token removed from OS Vault' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/validate-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.json({ valid: false, error: 'Token is required' });
    }
    
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.users.getAuthenticated();
    res.json({ valid: true, user: data.login, avatar: data.avatar_url });
  } catch (error) {
    res.json({ valid: false, error: error.message });
  }
});

app.post('/api/sanitize-folder', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const { folderPath, dryRun = true } = req.body;
  
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    const sanitizedPath = sanitizePath(folderPath);
    
    if (!fs.existsSync(sanitizedPath)) {
      sendUpdate({ error: 'Folder does not exist' });
      res.end();
      return;
    }
    
    const stats = fs.statSync(sanitizedPath);
    if (!stats.isDirectory()) {
      sendUpdate({ error: 'Path is not a directory' });
      res.end();
      return;
    }
    
    sendUpdate({ message: '🔍 Starting security scan...', phase: 'scanning' });
    
    let filesScanned = 0;
    let secretsFound = 0;
    let filesModified = 0;
    const findings = [];
    
    function scanDirectory(dirPath) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (!isIgnored(entry.name)) {
            scanDirectory(fullPath);
          }
          continue;
        }
        
        if (!shouldScanFile(fullPath)) {
          continue;
        }
        
        filesScanned++;
        
        try {
          let content = fs.readFileSync(fullPath, 'utf8');
          let originalContent = content;
          let fileSecretsFound = 0;
          
          for (const pattern of SENSITIVE_PATTERNS) {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            const matches = content.match(regex);
            if (matches) {
              fileSecretsFound += matches.length;
              secretsFound += matches.length;
              
              findings.push({
                file: path.relative(sanitizedPath, fullPath),
                type: pattern.name,
                count: matches.length,
                matches: matches.slice(0, 3)
              });
              
              content = content.replace(regex, '[REDACTED_BY_AMANAT_SEC]');
            }
          }
          
          if (!dryRun && content !== originalContent) {
            fs.writeFileSync(fullPath, content, 'utf8');
            filesModified++;
          }
        } catch (err) {
          console.error(`Error scanning ${fullPath}:`, err.message);
        }
      }
    }
    
    sendUpdate({ message: `📁 Scanning ${sanitizedPath}...`, phase: 'scanning' });
    scanDirectory(sanitizedPath);
    
    if (dryRun) {
      sendUpdate({ 
        message: `🔍 Dry run complete! Found ${secretsFound} secrets in ${findings.length} files`,
        phase: 'preview',
        stats: { filesScanned, secretsFound, filesModified: 0, findings }
      });
    } else {
      sendUpdate({ 
        message: `✅ Sanitization complete! Redacted ${secretsFound} secrets in ${filesModified} files`,
        phase: 'complete',
        stats: { filesScanned, secretsFound, filesModified, findings }
      });
    }
    
    res.end();
    
  } catch (error) {
    sendUpdate({ error: error.message });
    res.end();
  }
});

app.post('/api/apply-sanitization', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const { folderPath } = req.body;
  
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    const sanitizedPath = sanitizePath(folderPath);
    
    if (!fs.existsSync(sanitizedPath)) {
      sendUpdate({ error: 'Folder does not exist' });
      res.end();
      return;
    }
    
    sendUpdate({ message: '🔍 Starting sanitization...', phase: 'sanitizing' });
    
    let filesScanned = 0;
    let secretsFound = 0;
    let filesModified = 0;
    const findings = [];
    
    function scanDirectory(dirPath) {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (!isIgnored(entry.name)) {
            scanDirectory(fullPath);
          }
          continue;
        }
        
        if (!shouldScanFile(fullPath)) {
          continue;
        }
        
        filesScanned++;
        
        try {
          let content = fs.readFileSync(fullPath, 'utf8');
          let originalContent = content;
          
          for (const pattern of SENSITIVE_PATTERNS) {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            const matches = content.match(regex);
            if (matches) {
              secretsFound += matches.length;
              
              findings.push({
                file: path.relative(sanitizedPath, fullPath),
                type: pattern.name,
                count: matches.length
              });
              
              content = content.replace(regex, '[REDACTED_BY_AMANAT_SEC]');
            }
          }
          
          if (content !== originalContent) {
            fs.writeFileSync(fullPath, content, 'utf8');
            filesModified++;
          }
        } catch (err) {
          console.error(`Error sanitizing ${fullPath}:`, err.message);
        }
      }
    }
    
    sendUpdate({ message: `📁 Processing files...`, phase: 'sanitizing' });
    scanDirectory(sanitizedPath);
    
    sendUpdate({ 
      message: `✅ Complete! Redacted ${secretsFound} secrets in ${filesModified} files`,
      phase: 'complete',
      stats: { filesScanned, secretsFound, filesModified, findings }
    });
    
    res.end();
    
  } catch (error) {
    sendUpdate({ error: error.message });
    res.end();
  }
});

app.post('/api/create-repo', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const { folderPath, repoName, visibility, description, license, token } = req.body;
  
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    let authToken = token;
    
    if (!authToken) {
      sendUpdate({ message: '🔐 Retrieving token from OS Vault...' });
      authToken = await getCredential();
      
      if (!authToken) {
        sendUpdate({ error: 'No GitHub token found. Please authenticate first.' });
        res.end();
        return;
      }
    }
    
    const sanitizedPath = sanitizePath(folderPath);
    
    if (!fs.existsSync(sanitizedPath)) {
      sendUpdate({ error: 'Folder does not exist: ' + sanitizedPath });
      res.end();
      return;
    }
    
    sendUpdate({ message: '🔍 Detecting tech stack...' });
    const techStack = detectTechStack(sanitizedPath);
    
    const gitignoreResult = generateGitignore(sanitizedPath, techStack);
    
    if (gitignoreResult.exists) {
      sendUpdate({ message: '📄 .gitignore already exists' });
    } else if (gitignoreResult.generated) {
      sendUpdate({ message: `📄 Generated .gitignore for ${techStack === 'node' ? 'Node.js' : techStack === 'python' ? 'Python' : techStack === 'java' ? 'Java' : techStack === 'go' ? 'Go' : techStack === 'rust' ? 'Rust' : 'Default'} stack` });
    }
    
    sendUpdate({ message: '🔄 Validating token...' });
    const octokit = new Octokit({ auth: authToken });
    
    sendUpdate({ message: '📁 Creating repository on GitHub...' });
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: visibility === 'private',
      description: description || '',
      auto_init: false
    });
    
    sendUpdate({ message: '⚙️ Initializing local Git repository...' });
    const git = simpleGit(sanitizedPath);
    await git.init();
    
    if (license && license !== 'None' && LICENSES[license]) {
      sendUpdate({ message: '📜 Adding license file...' });
      const licensePath = path.join(sanitizedPath, 'LICENSE');
      fs.writeFileSync(licensePath, LICENSES[license]);
    }
    
    sendUpdate({ message: '📦 Staging files...' });
    await git.add('.');
    
    sendUpdate({ message: '💾 Committing files...' });
    await git.commit('Initial commit via UptoGithubUploader');
    
    sendUpdate({ message: '🔀 Renaming branch to main...' });
    await git.branch(['-M', 'main']);
    
    sendUpdate({ message: '🔗 Adding remote origin...' });
    const repoUrl = repo.clone_url.replace('https://', `https://${authToken}@`);
    await git.addRemote('origin', repoUrl);
    
    sendUpdate({ message: '🚀 Pushing to GitHub...' });
    await git.push('origin', 'main', ['-u']);
    
    sendUpdate({ message: '✅ Complete!' });
    sendUpdate({ success: true, url: repo.html_url });
    res.end();
    
  } catch (error) {
    sendUpdate({ error: error.message });
    res.end();
  }
});

app.post('/api/git-status', async (req, res) => {
  try {
    const { folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }
    
    const sanitizedPath = sanitizePath(folderPath);
    const gitDir = path.join(sanitizedPath, '.git');
    
    if (!fs.existsSync(gitDir)) {
      return res.status(400).json({ 
        error: 'This folder is not a Git repository. Please use the "Create New Repo" feature first.',
        notGitRepo: true 
      });
    }
    
    if (!fs.statSync(gitDir).isDirectory()) {
      return res.status(400).json({ 
        error: 'This folder is not a Git repository. Please use the "Create New Repo" feature first.',
        notGitRepo: true 
      });
    }
    
    const git = simpleGit(sanitizedPath);
    const status = await git.status();
    
    const modified = (status.modified || []).filter(f => !f.startsWith('.gitignore'));
    const created = (status.not_added || []).filter(f => !f.startsWith('.gitignore'));
    const deleted = (status.deleted || []).filter(f => !f.startsWith('.gitignore'));
    const untracked = (status.untracked || []).filter(f => !f.startsWith('.gitignore'));
    const currentBranch = status.current;
    const tracking = status.tracking ? status.tracking[0] : null;
    
    const isClean = modified.length === 0 && created.length === 0 && 
                    deleted.length === 0 && untracked.length === 0;
    
    res.json({
      isClean,
      currentBranch,
      tracking,
      modified,
      created,
      deleted,
      untracked,
      totalChanges: modified.length + created.length + deleted.length + untracked.length
    });
    
  } catch (error) {
    console.error('Git status error:', error.message);
    res.status(500).json({ error: `Failed to get git status: ${error.message}` });
  }
});

app.post('/api/git-push-updates', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const { folderPath, commitMessage } = req.body;
  
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    let authToken = await getCredential();
    
    if (!authToken) {
      sendUpdate({ error: 'No GitHub token found. Please authenticate first.' });
      res.end();
      return;
    }
    
    const sanitizedPath = sanitizePath(folderPath);
    const gitDir = path.join(sanitizedPath, '.git');
    
    if (!fs.existsSync(gitDir)) {
      sendUpdate({ error: 'This folder is not a Git repository.' });
      res.end();
      return;
    }
    
    const git = simpleGit(sanitizedPath);
    
    sendUpdate({ message: '📋 Checking git status...' });
    const status = await git.status();
    
    const modified = status.modified.filter(f => !f.startsWith('.gitignore'));
    const created = status.not_added.filter(f => !f.startsWith('.gitignore'));
    const deleted = status.deleted.filter(f => !f.startsWith('.gitignore'));
    const untracked = status.untracked.filter(f => !f.startsWith('.gitignore'));
    
    if (modified.length === 0 && created.length === 0 && deleted.length === 0 && untracked.length === 0) {
      sendUpdate({ message: '✅ Repository is already up to date!' });
      sendUpdate({ success: true, alreadyUpToDate: true });
      res.end();
      return;
    }
    
    sendUpdate({ message: `📦 Staging ${modified.length + created.length + deleted.length + untracked.length} file(s)...` });
    
    await git.add('.');
    
    const msg = commitMessage && commitMessage.trim() 
      ? commitMessage.trim() 
      : 'Update project files';
    
    sendUpdate({ message: `💾 Committing with: "${msg}"` });
    await git.commit(msg);
    
    sendUpdate({ message: '🚀 Pushing to GitHub...' });
    
    try {
      await git.push();
    } catch (pushError) {
      if (pushError.message.includes('rejected') || pushError.message.includes('fetch first')) {
        sendUpdate({ error: 'Push rejected! Remote has newer changes. Please pull the latest changes first and try again.' });
        res.end();
        return;
      }
      throw pushError;
    }
    
    sendUpdate({ message: '✅ Successfully pushed to GitHub!' });
    sendUpdate({ 
      success: true, 
      stats: {
        modified: modified.length,
        created: created.length,
        deleted: deleted.length,
        untracked: untracked.length
      }
    });
    res.end();
    
  } catch (error) {
    console.error('Git push error:', error.message);
    sendUpdate({ error: `Failed to push: ${error.message}` });
    res.end();
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

async function start() {
  const existingToken = await getCredential();
  
  if (!existingToken) {
    console.log('\n🔐 No GitHub token found in OS Vault.');
    console.log('   Please enter your token in the web interface to store it securely.\n');
  } else {
    console.log('✅ Found existing token in OS Vault');
  }
  
  app.listen(PORT, () => {
    console.log(`\n🌐 Server running at http://localhost:${PORT}`);
    console.log(`   Opening browser...\n`);
    
    exec(`xdg-open http://localhost:${PORT}`);
  });
}

start();
