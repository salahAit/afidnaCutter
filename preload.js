const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
})

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
    on: (channel, func) => {
        const validChannels = ['open-about', 'download-progress', 'cut-progress'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    off: (channel, func) => {
        const validChannels = ['open-about', 'download-progress', 'cut-progress'];
        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, func);
        }
    },
    removeListener: (channel, func) => {
        ipcRenderer.removeListener(channel, func);
    },
    getPathForFile: (file) => webUtils.getPathForFile(file)
})