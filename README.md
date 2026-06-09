# GGUI - Git Automation Tool

<p align="center">
  <img src="https://img.shields.io/badge/GGUI-Git%20Automation-brightgreen?style=for-the-badge&logo=github" alt="GGUI">
  <img src="https://img.shields.io/badge/Node.js-Express-green?style=flat&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/React-Vite-blue?style=flat&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Tailwind-CSS-cyan?style=flat&logo=tailwind-css" alt="Tailwind">
</p>

<p align="center">
  <strong>A secure, cross-platform CLI tool with a modern web interface for uploading local projects to GitHub.</strong>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Security](#security)
- [License](#license)

---

## Overview

**GGUI (Git Automation Tool)** is a CLI-based application that launches a local web interface, allowing users to easily upload local folders as new GitHub repositories or update existing ones. Built with security-first approach using OS-native credential storage and intelligent code sanitization.

---

## Features

### 🚀 Core Features

| Feature | Description |
|---------|-------------|
| **Create New Repository** | Upload any local folder as a new GitHub repository |
| **Update Existing Repo** | Detect and push changes to previously uploaded projects |
| **Smart .gitignore** | Auto-detects tech stack and generates appropriate `.gitignore` |
| **License Generator** | Automatically add MIT, Apache 2.0, or GPLv3 licenses |

### 🔒 Security Features

| Feature | Description |
|---------|-------------|
| **OS Credential Vault** | GitHub PAT stored securely in Windows Credential Manager / Linux Secret Service |
| **Code Sanitization** | Auto-detect and redact secrets (AWS keys, JWTs, DB URIs) before upload |
| **Dry-Run Preview** | Preview all sensitive data found before any modifications |
| **Cross-Platform** | Works seamlessly on Windows, Linux, and macOS |

### 🎨 UI Features

| Feature | Description |
|---------|-------------|
| **Modern Dark Theme** | Professional cyber-themed UI with neon accents |
| **Real-time Progress** | SSE streaming shows upload status live |
| **Tab-based Navigation** | Switch between Create and Update modes |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js |
| **Backend Framework** | Express.js |
| **Frontend** | React 19 + Vite |
| **Styling** | Tailwind CSS v4 |
| **Git Operations** | simple-git |
| **GitHub API** | @octokit/rest |
| **Credential Storage** | keytar |
| **CLI Prompts** | enquirer |

---

## Project Structure

```
UptoGithubUploader/
├── bin/
│   └── cli.js                 # CLI entry point
├── server/
│   ├── index.js               # Express server with all API routes
│   └── config.json            # Local configuration (optional)
├── client/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Tailwind CSS styles
│   ├── public/
│   │   └── ggui-logo.svg     # Custom favicon/logo
│   ├── dist/                 # Built frontend assets
│   ├── index.html            # HTML template
│   ├── vite.config.js       # Vite configuration
│   └── package.json          # Frontend dependencies
├── package.json               # Backend dependencies
└── README.md                  # This file
```

---

## Installation

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**
- **Git** installed on system
- **GitHub Account** with Personal Access Token (PAT)

### Steps

```bash
# Clone or navigate to the project
cd UptoGithubUploader

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Build frontend for production
npm run build
```

---

## Usage

### Starting the Application

```bash
npm start
```

This will:
1. Check for existing GitHub token in OS Vault
2. If not found, prompt for token in terminal or via web UI
3. Start Express server on `http://localhost:3500`
4. Automatically open your default browser

### First-Time Setup

1. Enter your GitHub Personal Access Token
2. Token is securely stored in OS Credential Manager
3. Token validity is verified automatically

### Creating a New Repository

1. Select **"Create New Repo"** tab
2. Enter full path to your local folder (e.g., `/home/user/my-project`)
3. Edit repository name, visibility (public/private), description
4. Optionally select a license (MIT, Apache 2.0, GPLv3)
5. Click **"Create Repo & Upload"**

### Updating an Existing Repository

1. Select **"Update Existing"** tab
2. Enter path to previously uploaded project
3. Click **"Check for Updates"**
4. Review changes (modified/added/deleted files)
5. Enter commit message
6. Click **"Sync Updates to GitHub"**

### Sanitizing Code (Remove Secrets)

1. Select your project folder
2. Click **"Scan & Preview"** in Security Tools
3. Review found secrets in modal
4. Click **"Approve & Redact"** to sanitize

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/validate-token` | Verify GitHub PAT validity |
| `POST` | `/api/store-token` | Store token in OS Vault |
| `POST` | `/api/delete-token` | Remove token from OS Vault |
| `POST` | `/api/create-repo` | Create new GitHub repo & upload |
| `POST` | `/api/git-status` | Get changes in existing repo |
| `POST` | `/api/git-push-updates` | Push changes to remote |
| `POST` | `/api/sanitize-folder` | Scan for secrets (dry-run) |
| `POST` | `/api/apply-sanitization` | Apply redactions |

---

## Security

### Credential Storage

- GitHub PAT is stored in **Windows Credential Manager** (Windows) or **Linux Secret Service API** (Linux)
- Never stored in plain text files or environment variables

### Secret Detection Patterns

The sanitization engine detects:

- AWS Access Keys (AKIA...)
- AWS Secret Keys
- JWT Tokens
- MongoDB/PostgreSQL/MySQL/Redis URIs
- GitHub Tokens
- Slack/Discord Tokens
- Stripe/Google API Keys
- Private Keys
- Generic secrets (passwords, API keys)

### .gitignore Templates

Auto-generated based on detected stack:

- **Node.js**: `node_modules`, `.env`, `dist`, etc.
- **Python**: `venv`, `__pycache__`, `.env`, etc.
- **Java**: `target`, `.class`, `.gradle`, etc.
- **Go**: `vendor`, `bin`, `go.work`, etc.
- **Rust**: `target`, `Cargo.lock`, etc.

---

---

## Author

**GGUI** - Developed with ❤️ by Raja Muhammad Bilal Arshad

<p align="center">
  <sub>© 2026 GGUI - Git Automation Tool. All rights reserved.</sub>
</p>
