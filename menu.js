const { Menu, app, shell } = require('electron');
const path = require('path');
const { ipcMain } = require('electron');

const createMenu = (win, lang = 'ar') => {
    const isArabic = lang === 'ar';
    const t = (ar, en) => isArabic ? ar : en;

    const template = [
        {
            label: t('ملف', 'File'),
            submenu: [
                {
                    label: t('فتح مجلد المخرجات', 'Open Output Folder'),
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const UPLOADS_DIR = path.join(app.getPath('userData'), 'uploads');
                        await shell.openPath(UPLOADS_DIR);
                    }
                },
                { type: 'separator' },
                {
                    label: t('خروج', 'Quit'),
                    role: 'quit'
                }
            ]
        },
        {
            label: t('نمط', 'Style'), // Edit menu usually comes second, but skipping as per user requirement to just translate
            submenu: [
                { label: t('قص', 'Cut'), role: 'cut' },
                { label: t('نسخ', 'Copy'), role: 'copy' },
                { label: t('لصق', 'Paste'), role: 'paste' },
                { label: t('تحديد الكل', 'Select All'), role: 'selectAll' }
            ]
        },
        {
            label: t('عرض', 'View'),
            submenu: [
                { label: t('إعادة تحميل', 'Reload'), role: 'reload' },
                { label: t('فرض إعادة التحميل', 'Force Reload'), role: 'forceReload' },
                { label: t('أدوات المطورين', 'Toggle Developer Tools'), role: 'toggleDevTools' },
                { type: 'separator' },
                { label: t('تغيير الحجم الفعلي', 'Actual Size'), role: 'resetZoom' },
                { label: t('تكبير', 'Zoom In'), role: 'zoomIn' },
                { label: t('تصغير', 'Zoom Out'), role: 'zoomOut' },
                { type: 'separator' },
                { label: t('ملء الشاشة', 'Toggle Fullscreen'), role: 'togglefullscreen' }
            ]
        },
        {
            label: t('مساعدة', 'Help'),
            submenu: [
                {
                    label: t('حول البرنامج', 'About'),
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
