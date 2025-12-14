const { app, BrowserWindow, powerSaveBlocker, Menu } = require('electron/main')
const path = require('node:path')
const { registerHandlers, registerProtocol } = require('./handlers');
const { createMenu } = require('./menu');

registerHandlers();

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: true,
            webSecurity: false,
            backgroundThrottling: false // Prevent throttling when minimized
        },
        icon: path.join(__dirname, 'resources/icon.png')
    })

    // Register language handler
    let currentLang = 'ar'; // Default
    const { ipcMain } = require('electron');

    ipcMain.handle('set-language', (event, lang) => {
        currentLang = lang;
        createMenu(win, currentLang);
    });

    // Enable right-click context menu
    win.webContents.on('context-menu', (event, params) => {
        const isArabic = currentLang === 'ar';
        const t = (ar, en) => isArabic ? ar : en;

        const contextMenu = Menu.buildFromTemplate([
            { label: t('قص', 'Cut'), role: 'cut' },
            { label: t('نسخ', 'Copy'), role: 'copy' },
            { label: t('لصق', 'Paste'), role: 'paste' },
            { type: 'separator' },
            { label: t('تحديد الكل', 'Select All'), role: 'selectAll' }
        ]);
        contextMenu.popup(win);
    });

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

    // --- Ad Blocking Logic ---
    const { session } = require('electron');
    const adFilter = {
        urls: [
            "*://*.doubleclick.net/*",
            "*://*.googleadservices.com/*",
            "*://*.googlesyndication.com/*",
            "*://*.moatads.com/*",
            "*://*.youtube.com/api/stats/ads*",
            "*://*.youtube.com/pagead/*",
            "*://*.youtube.com/ptracking*",
            "*://*.adservice.google.com/*",
            "*://*.google-analytics.com/*"
        ]
    };

    session.defaultSession.webRequest.onBeforeRequest(adFilter, (details, callback) => {
        // console.log("Blocked Ad Request:", details.url); // Optional: Debug log
        callback({ cancel: true });
    });
    // -------------------------

    registerProtocol(require('electron').protocol);
    const win = createWindow()

    // Initial menu creation
    createMenu(win, 'ar');

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