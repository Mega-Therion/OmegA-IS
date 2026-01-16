/**
 * OMEGA Desktop - Electron Main Process
 * 
 * Desktop application for OmegAI Brain with system tray,
 * global hotkeys, and native notifications.
 */

const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, Notification, nativeImage } = require('electron');
const path = require('path');

// Configuration
const CONFIG = {
  apiUrl: process.env.OMEGA_API_URL || 'http://localhost:8080',
  jarvisUrl: process.env.JARVIS_URL || 'http://localhost:3001',
  isDev: process.env.NODE_ENV === 'development'
};

let mainWindow = null;
let tray = null;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'OMEGA Brain',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0f',
    show: false // Show when ready
  });

  // Load Jarvis or local interface
  if (CONFIG.isDev) {
    mainWindow.loadURL(CONFIG.jarvisUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built app
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Show notification on first minimize
      if (Notification.isSupported()) {
        new Notification({
          title: 'OMEGA Brain',
          body: 'Running in the background. Click the tray icon to restore.',
          silent: true
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  
  // Create a simple icon if file doesn't exist
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
  } catch {
    // Create a simple colored square as fallback
    icon = nativeImage.createEmpty();
  }
  
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADfSURBVDiNpZMxDoJAEEXfLhZsbGy8gZU34Aq2HsELeANL78ANvIC11hzBWtiwoKEwYbJZWFg2fpVkZv7/M0MmABCRYoq+iNwBH5gBa+A1CKhqAuwuHFjXQKpq4jvgl0D0yQFIgBewGPr7EnCt70CqGk7qD4EnsACWwBZYGVUvHjhxFgPAFFgD2xPnBkjVqJdwB+yAKzCvEWA79noJ90ClaiR1H3AFHJW6ofeIVHXqMVb1KOr6xPkJxKquu3rU/4JIVc1JHasaJnUkZV2f/0NMuoJx1Knq98l0xdOo/o4frQVN8KMx6hAAAAAASUVORK5CYII=') : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open OMEGA Brain',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Quick Chat',
      submenu: [
        { label: 'Ask Gemini...', click: () => openQuickChat('gemini') },
        { label: 'Ask Claude...', click: () => openQuickChat('claude') },
        { label: 'Ask Codex...', click: () => openQuickChat('codex') },
        { label: 'Ask Grok...', click: () => openQuickChat('grok') }
      ]
    },
    { type: 'separator' },
    {
      label: 'System Status',
      click: () => checkStatus()
    },
    {
      label: 'View Missions',
      click: () => openMissions()
    },
    { type: 'separator' },
    {
      label: 'Preferences',
      click: () => openPreferences()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('OMEGA Brain - OmegAI Interface');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Register global shortcuts
function registerShortcuts() {
  // Ctrl+Shift+O - Open/focus main window
  globalShortcut.register('CommandOrControl+Shift+O', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Ctrl+Shift+Space - Quick chat overlay
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    openQuickChat();
  });

  // Ctrl+Shift+S - Status
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    checkStatus();
  });
}

// Quick chat window
function openQuickChat(agent = 'gemini') {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.executeJavaScript(`
      window.postMessage({ type: 'OMEGA_QUICK_CHAT', agent: '${agent}' }, '*');
    `);
  }
}

// Check system status
async function checkStatus() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/health`);
    const data = await response.json();
    
    new Notification({
      title: 'OMEGA Brain Status',
      body: response.ok ? '✅ All systems operational' : '⚠️ Some systems may be offline'
    }).show();
  } catch (error) {
    new Notification({
      title: 'OMEGA Brain Status',
      body: '❌ Unable to connect to server'
    }).show();
  }
}

// Open missions view
function openMissions() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.executeJavaScript(`
      window.postMessage({ type: 'OMEGA_VIEW_MISSIONS' }, '*');
    `);
  }
}

// Open preferences
function openPreferences() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.executeJavaScript(`
      window.postMessage({ type: 'OMEGA_PREFERENCES' }, '*');
    `);
  }
}

// IPC Handlers
ipcMain.handle('get-config', () => CONFIG);

ipcMain.handle('show-notification', (event, { title, body }) => {
  new Notification({ title, body }).show();
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
