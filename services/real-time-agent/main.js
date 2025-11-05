const { app, BrowserWindow, Tray, Menu, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');
const io = require('socket.io-client');
const robot = require('robotjs');
const Database = require('better-sqlite3');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

// Simple logger for Electron app
const logger = {
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ''),
};


let mainWindow;
let tray;
let socket;
let db;
let lowdb;

// Initialize local database
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'aura-agent.db');
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT,
      timestamp INTEGER
    );
  `);
}

// Initialize lowdb for simple data
async function initLowDB() {
  const adapter = new JSONFile(path.join(app.getPath('userData'), 'cache.json'));
  lowdb = new Low(adapter, { cache: {}, settings: {} });
  await lowdb.read();
}

// Connect to workflow engine
function connectToServer() {
  const serverUrl = process.env.AURA_SERVER_URL || 'http://localhost:3001';
  socket = io(serverUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    logger.info('Connected to AURA server');
    if (mainWindow) {
      mainWindow.webContents.send('connection-status', { connected: true });
    }
  });

  socket.on('disconnect', () => {
    logger.warn('Disconnected from AURA server');
    if (mainWindow) {
      mainWindow.webContents.send('connection-status', { connected: false });
    }
  });

  socket.on('workflow-command', async (data) => {
    logger.info('Received workflow command', data);
    await handleWorkflowCommand(data);
  });

  socket.on('screen-capture-request', async (data) => {
    await captureScreen(data);
  });
}

// Handle workflow commands
async function handleWorkflowCommand(command) {
  try {
    switch (command.type) {
      case 'mouse-move':
        robot.moveMouse(command.x, command.y);
        break;
      case 'mouse-click':
        robot.mouseClick(command.button || 'left');
        break;
      case 'keyboard-type':
        robot.typeString(command.text);
        break;
      case 'keyboard-press':
        robot.keyTap(command.key);
        break;
      case 'screen-capture':
        await captureScreen({ format: command.format || 'png' });
        break;
      default:
        logger.warn('Unknown command type:', command.type);
    }

    if (socket && socket.connected) {
      socket.emit('workflow-command-result', {
        commandId: command.id,
        success: true,
      });
    }
  } catch (error) {
    logger.error('Error executing workflow command', { error });
    if (socket && socket.connected) {
      socket.emit('workflow-command-result', {
        commandId: command.id,
        success: false,
        error: error.message,
      });
    }
  }
}

// Capture screen
async function captureScreen(options = {}) {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (sources.length > 0) {
      const source = sources[0];
      const image = source.thumbnail.toDataURL();
      
      if (socket && socket.connected) {
        socket.emit('screen-capture-result', {
          image,
          format: options.format || 'png',
          timestamp: Date.now(),
        });
      }
    }
  } catch (error) {
    logger.error('Error capturing screen', { error });
  }
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // Start hidden
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      },
    },
    {
      label: 'Connection Status',
      enabled: false,
      id: 'connection-status',
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('AURA Real-Time Agent');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}

// IPC handlers
ipcMain.handle('get-screen-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
  });
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
  }));
});

ipcMain.handle('get-cache', async (event, key) => {
  await lowdb.read();
  return lowdb.data.cache[key];
});

ipcMain.handle('set-cache', async (event, key, value) => {
  await lowdb.read();
  lowdb.data.cache[key] = value;
  await lowdb.write();
  return true;
});

// App lifecycle
app.whenReady().then(async () => {
  initDatabase();
  await initLowDB();
  createTray();
  createWindow();
  connectToServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
