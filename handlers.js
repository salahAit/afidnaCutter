const { ipcMain, shell, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');

// Configure paths
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

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

    'download-youtube': async (event, { url }) => {
        const sessionId = uuidv4();
        const sessionDir = path.join(UPLOADS_DIR, sessionId);
        await fs.ensureDir(sessionDir);

        tasks.set(sessionId, { status: 'downloading', progress: 0 });

        // Spawn yt-dlp
        const args = [
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', path.join(sessionDir, 'full_video.%(ext)s'),
            '--newline', // For progress parsing
            url
        ];

        const child = spawn('yt-dlp', args);

        child.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('yt-dlp:', output);

            // Parse progress
            const match = output.match(/\[download\]\s+(\d+\.?\d*)%/);
            if (match) {
                const progress = parseFloat(match[1]);
                tasks.set(sessionId, { status: 'downloading', progress });
            }
        });

        child.stderr.on('data', (data) => {
            console.error('yt-dlp error:', data.toString());
        });

        child.on('close', (code) => {
            if (code === 0) {
                tasks.set(sessionId, { status: 'completed', progress: 100 });
            } else {
                tasks.set(sessionId, { status: 'error', message: `Process exited with code ${code}` });
            }
        });

        return { session_id: sessionId };
    },

    'get-status': async (event, sessionId) => {
        return tasks.get(sessionId) || { status: 'idle' };
    },

    'cut-video': async (event, { filename, session_id, segments }) => {
        const sessionDir = path.join(UPLOADS_DIR, session_id);
        const inputPath = path.join(sessionDir, filename);
        const outputDir = path.join(sessionDir, 'outputs');
        await fs.ensureDir(outputDir);

        const outputFiles = [];

        for (let i = 0; i < segments.length; i++) {
            const { start, end } = segments[i];
            const outputFilename = `segment_${i + 1}.mp4`;
            const outputPath = path.join(outputDir, outputFilename);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .setStartTime(start)
                    .setDuration(end - start)
                    .output(outputPath)
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
            filters: [{ name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov'] }]
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
