const { Menu, app, shell } = require('electron');
const path = require('path');
const { ipcMain } = require('electron');

const createMenu = (win) => {
    const template = [
        {
            label: 'ملف',
            submenu: [
                {
                    label: 'فتح المجلد',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        // Trigger the open-folder handler logic directly or via IPC
                        // Since we are in main process, we can just call the handler logic if we extracted it,
                        // or invoke the handler via ipcMain (but ipcMain.handle is for renderer->main).
                        // Best way: Re-use the handler logic or just emit an event to renderer if needed, 
                        // BUT 'open-folder' is a main process action (shell.openPath).
                        // So we can just do it here or call a shared function.
                        // For simplicity, let's replicate the simple open-folder logic here or import it if possible.
                        // However, handlers.js exports registerHandlers, not the handlers themselves easily.
                        // Let's just use the known path logic for now.

                        const UPLOADS_DIR = path.join(app.getPath('userData'), 'uploads');
                        await shell.openPath(UPLOADS_DIR);
                    }
                },
                { type: 'separator' },
                {
                    label: 'خروج',
                    role: 'quit'
                }
            ]
        },
        {
            label: 'عرض',
            submenu: [
                { label: 'إعادة تحميل', role: 'reload' },
                { label: 'فرض إعادة التحميل', role: 'forceReload' },
                { label: 'أدوات المطورين', role: 'toggleDevTools' },
                { type: 'separator' },
                { label: 'تغيير الحجم الفعلي', role: 'resetZoom' },
                { label: 'تكبير', role: 'zoomIn' },
                { label: 'تصغير', role: 'zoomOut' },
                { type: 'separator' },
                { label: 'ملء الشاشة', role: 'togglefullscreen' }
            ]
        },
        {
            label: 'مساعدة',
            submenu: [
                {
                    label: 'حول البرنامج',
                    click: () => {
                        win.webContents.send('open-about');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

module.exports = { createMenu };
