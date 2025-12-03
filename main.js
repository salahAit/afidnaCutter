const { app, BrowserWindow, powerSaveBlocker } = require('electron/main')
const path = require('node:path')
const { registerHandlers, registerProtocol } = require('./handlers');

registerHandlers();

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
            contextIsolation: true,
            webSecurity: false,
            backgroundThrottling: false // Prevent throttling when minimized
        },
        icon: path.join(__dirname, 'resources/icon.png')
    })

    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, 'dist/index.html'));
    }
    return win
}

app.whenReady().then(() => {
    // Prevent app from being suspended
    powerSaveBlocker.start('prevent-app-suspension');

    registerProtocol(require('electron').protocol);
    const win = createWindow()
    const { createMenu } = require('./menu');
    createMenu(win);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})