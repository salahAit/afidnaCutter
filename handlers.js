const { ipcMain, shell, dialog, net, app } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');

// Configure paths
const UPLOADS_DIR = path.join(app.getPath('userData'), 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

// Configure ffmpeg and ffprobe paths
let ffmpegPath, ffprobePath;
if (process.platform === 'win32') {
    if (app.isPackaged) {
        ffmpegPath = path.join(process.resourcesPath, 'bin', 'win', 'ffmpeg.exe');
        ffprobePath = path.join(process.resourcesPath, 'bin', 'win', 'ffprobe.exe');
    } else {
        ffmpegPath = path.join(__dirname, 'resources', 'bin', 'win', 'ffmpeg.exe');
        ffprobePath = path.join(__dirname, 'resources', 'bin', 'win', 'ffprobe.exe');
    }
} else {
    ffmpegPath = 'ffmpeg'; // Fallback to system ffmpeg for other platforms
    ffprobePath = 'ffprobe';
}
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Store active tasks status
const tasks = new Map();

const handlers = {
    'upload-video': async (event, { filePath }) => {
        const sessionId = uuidv4();
        const sessionDir = path.join(UPLOADS_DIR, sessionId);
        await fs.ensureDir(sessionDir);

        const filename = path.basename(filePath);
        const destPath = path.join(sessionDir, filename);

        await fs.copy(filePath, destPath);

        return {
            session_id: sessionId,
            filename: filename,
            url: `file://${destPath}`
        };
    },



    'cut-video': async (event, { filename, session_id, segments }) => {
        const sessionDir = path.join(UPLOADS_DIR, session_id);
        const inputPath = path.join(sessionDir, filename);
        const outputDir = path.join(sessionDir, 'outputs');
        await fs.ensureDir(outputDir);

        const ext = path.extname(filename); // Get extension from input file
        const outputFiles = [];

        for (let i = 0; i < segments.length; i++) {
            const { start, end } = segments[i];
            const outputFilename = `segment_${i + 1}${ext}`; // Use same extension
            const outputPath = path.join(outputDir, outputFilename);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .setStartTime(start)
                    .setDuration(end - start)
                    .outputOptions(['-c copy'])
                    .output(outputPath)
                    .on('start', (commandLine) => {
                        console.log('Spawned Ffmpeg with command: ' + commandLine);
                    })
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err))
                    .run();
            });

            outputFiles.push(outputFilename);
        }

        return { output_files: outputFiles };
    },

    'open-folder': async (event, sessionId) => {
        const dir = sessionId ? path.join(UPLOADS_DIR, sessionId, 'outputs') : UPLOADS_DIR;
        await fs.ensureDir(dir);
        await shell.openPath(dir);
        return { success: true };
    },

    'select-file': async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Media Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'mp3', 'wav', 'ogg', 'm4a'] }
            ]
        });
        if (canceled) {
            return { canceled: true };
        }
        return { filePath: filePaths[0], canceled: false };
    }
};

function registerHandlers() {
    for (const [name, handler] of Object.entries(handlers)) {
        ipcMain.handle(name, handler);
    }
}

function registerProtocol(protocol) {
    protocol.handle('media', (request) => {
        const url = request.url.replace('media://', '');
        // url structure: session_id/filename
        // or: uploads/session_id/filename if we keep the frontend structure

        // The frontend uses ${BACKEND_URL}/uploads/${sessionId}/${filename}
        // If BACKEND_URL is 'media://app', then url is app/uploads/sessionId/filename

        // Let's simplify. If we set BACKEND_URL to 'media://', then url is uploads/sessionId/filename

        const decodedUrl = decodeURIComponent(url);
        // Remove 'uploads/' if present to match our directory structure relative to UPLOADS_DIR
        // Our UPLOADS_DIR contains session folders directly.
        // Frontend: uploads/sessionId/filename
        // We want: sessionId/filename

        let relativePath = decodedUrl;

        // Remove 'app/' if present (domain)
        if (relativePath.startsWith('app/')) {
            relativePath = relativePath.replace('app/', '');
        }

        if (relativePath.startsWith('uploads/')) {
            relativePath = relativePath.replace('uploads/', '');
        }

        const filePath = path.join(UPLOADS_DIR, relativePath);
        return net.fetch('file://' + filePath);
    });
}

module.exports = { registerHandlers, registerProtocol };
