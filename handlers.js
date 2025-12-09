const { ipcMain, shell, dialog, net, app, BrowserWindow } = require('electron');
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
        const inputPath = normalizePath(path.join(sessionDir, filename));
        const outputDir = path.join(sessionDir, 'outputs');
        await fs.ensureDir(outputDir);

        const ext = path.extname(filename); // Get extension from input file
        const outputFiles = [];

        for (let i = 0; i < segments.length; i++) {
            const { start, end, originalIndex } = segments[i];
            const outputFilename = `segment_${originalIndex || (i + 1)}${ext}`; // Use original index if present
            const outputPath = normalizePath(path.join(outputDir, outputFilename));

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

    'open-youtube-window': async () => {
        const win = new BrowserWindow({
            width: 1280,
            height: 800,
            title: "YouTube Browser",
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        await win.loadURL('https://www.youtube.com');
        return { success: true };
    },

    'open-external': async (event, url) => {
        await shell.openExternal(url);
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
    },

    'analyze-youtube': async (event, { url }) => {
        return new Promise((resolve, reject) => {
            const ytdlp = spawn('yt-dlp', ['--dump-json', '--no-playlist', url]);
            let stdout = '';
            let stderr = '';

            ytdlp.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ytdlp.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ytdlp.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(stderr || 'yt-dlp failed'));
                    return;
                }
                try {
                    const info = JSON.parse(stdout);

                    // Extract available qualities from formats
                    const availableQualities = new Set();
                    if (info.formats) {
                        for (const format of info.formats) {
                            if (format.height) {
                                availableQualities.add(format.height);
                            }
                        }
                    }

                    // Convert to sorted array (highest first)
                    const qualities = Array.from(availableQualities)
                        .sort((a, b) => b - a)
                        .map(h => h.toString());

                    resolve({
                        title: info.title,
                        duration: info.duration,
                        thumbnail: info.thumbnail,
                        id: info.id,
                        availableQualities: qualities
                    });
                } catch (e) {
                    reject(new Error('Failed to parse yt-dlp output'));
                }
            });
        });
    },

    'download-full-youtube': async (event, { url, quality = '360' }) => {
        const sessionId = uuidv4();
        const sessionDir = path.join(UPLOADS_DIR, sessionId);
        await fs.ensureDir(sessionDir);

        // Map quality to yt-dlp format
        const formatMap = {
            'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '1080': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
            '720': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
            '480': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best',
            '360': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best',
            '240': 'bestvideo[height<=240][ext=mp4]+bestaudio[ext=m4a]/best[height<=240][ext=mp4]/best',
            '144': 'bestvideo[height<=144][ext=mp4]+bestaudio[ext=m4a]/best[height<=144][ext=mp4]/best'
        };
        const formatArg = formatMap[quality] || formatMap['360'];

        const outputTemplate = path.join(sessionDir, '%(title)s.%(ext)s');

        return new Promise((resolve, reject) => {
            const ytdlp = spawn('yt-dlp', [
                '--no-playlist',
                '-f', formatArg,
                '-o', outputTemplate,
                '--merge-output-format', 'mp4',
                '--newline',
                '--progress',
                url
            ]);

            let stderr = '';
            let filename = '';

            ytdlp.stdout.on('data', (data) => {
                const output = data.toString();

                // Parse progress from yt-dlp output
                // Format: [download]  45.2% of 50.00MiB at 2.50MiB/s ETA 00:11
                const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
                if (progressMatch) {
                    const progress = parseFloat(progressMatch[1]);
                    // Send progress to renderer
                    event.sender.send('download-progress', { progress });
                }

                // Try to capture the filename
                const destMatch = output.match(/\[download\] Destination: (.+)/);
                if (destMatch) {
                    filename = path.basename(destMatch[1]);
                }
                const mergeMatch = output.match(/\[Merger\] Merging formats into "(.+)"/);
                if (mergeMatch) {
                    filename = path.basename(mergeMatch[1]);
                }
            });

            ytdlp.stderr.on('data', (data) => {
                stderr += data.toString();
                console.error('yt-dlp stderr:', data.toString());
            });

            ytdlp.on('close', async (code) => {
                if (code !== 0) {
                    reject(new Error(`yt-dlp failed: ${stderr}`));
                    return;
                }

                // Find the downloaded file
                const files = await fs.readdir(sessionDir);
                const videoFile = files.find(f => f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm'));

                if (!videoFile) {
                    reject(new Error('Downloaded file not found'));
                    return;
                }

                const filePath = path.join(sessionDir, videoFile);

                // Open folder with the file
                shell.showItemInFolder(filePath);

                resolve({
                    filename: videoFile,
                    path: filePath,
                    session_id: sessionId
                });
            });
        });
    },

    'cut-youtube': async (event, { url, segments, quality = 'best' }) => {
        const sessionId = uuidv4();
        const sessionDir = path.join(UPLOADS_DIR, sessionId);
        await fs.ensureDir(sessionDir);
        const outputDir = path.join(sessionDir, 'outputs');
        await fs.ensureDir(outputDir);

        // Map quality to yt-dlp format
        const formatMap = {
            'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '1080': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best',
            '720': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
            '480': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best',
            '360': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best',
            '240': 'bestvideo[height<=240][ext=mp4]+bestaudio[ext=m4a]/best[height<=240][ext=mp4]/best',
            '144': 'bestvideo[height<=144][ext=mp4]+bestaudio[ext=m4a]/best[height<=144][ext=mp4]/best'
        };
        const formatArg = formatMap[quality] || formatMap['best'];
        console.log(`Using quality: ${quality}, format: ${formatArg}`);

        // Step 1: Merge overlapping/nearby segments into chunks
        const chunks = mergeSegments(segments, 5);
        console.log('Merged segments into chunks:', chunks);

        const outputFiles = [];

        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            const chunk = chunks[chunkIdx];
            const chunkFilename = `chunk_${chunkIdx + 1}.mp4`;
            const chunkPath = path.join(sessionDir, chunkFilename);

            // Step 2: Download chunk using yt-dlp --download-sections
            const sectionArg = `*${chunk.start}-${chunk.end}`;
            console.log(`Downloading chunk ${chunkIdx + 1}: ${sectionArg}`);

            await new Promise((resolve, reject) => {
                const ytdlp = spawn('yt-dlp', [
                    '--no-playlist',
                    '-f', formatArg,
                    '--download-sections', sectionArg,
                    '-o', chunkPath,
                    '--force-keyframes-at-cuts',
                    url
                ]);

                ytdlp.stdout.on('data', (data) => console.log('yt-dlp:', data.toString()));
                ytdlp.stderr.on('data', (data) => console.log('yt-dlp err:', data.toString()));

                ytdlp.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`yt-dlp failed with code ${code}`));
                    } else {
                        resolve();
                    }
                });
            });

            // Step 3: Extract exact segments from the chunk
            const segmentsInChunk = segments.filter(seg =>
                seg.start >= chunk.start && seg.end <= chunk.end
            );

            for (let segIdx = 0; segIdx < segmentsInChunk.length; segIdx++) {
                const seg = segmentsInChunk[segIdx];
                // Calculate relative time within the chunk
                const relativeStart = seg.start - chunk.start;
                const duration = seg.end - seg.start;

                // Use original index for filename if available to prevent overwrites
                const usedIndex = seg.originalIndex || (outputFiles.length + 1);
                const outputFilename = `segment_${usedIndex}.mp4`;
                const outputPath = path.join(outputDir, outputFilename);

                await new Promise((resolve, reject) => {
                    ffmpeg(chunkPath)
                        .setStartTime(relativeStart)
                        .setDuration(duration)
                        .outputOptions(['-c copy'])
                        .output(outputPath)
                        .on('end', () => resolve())
                        .on('error', (err) => reject(err))
                        .run();
                });

                outputFiles.push(outputFilename);
            }

            // Cleanup chunk file
            await fs.remove(chunkPath);
        }

        return { session_id: sessionId, output_files: outputFiles };
    }
};

// Chunk merging algorithm: merge overlapping/nearby segments
function mergeSegments(segments, gapThreshold = 5) {
    if (!segments.length) return [];
    const sorted = [...segments].sort((a, b) => a.start - b.start);
    const chunks = [{ start: sorted[0].start, end: sorted[0].end }];
    for (let i = 1; i < sorted.length; i++) {
        const last = chunks[chunks.length - 1];
        if (sorted[i].start <= last.end + gapThreshold) {
            last.end = Math.max(last.end, sorted[i].end);
        } else {
            chunks.push({ start: sorted[i].start, end: sorted[i].end });
        }
    }
    return chunks;
}

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

function normalizePath(filePath) {
    // Normalize path separators for the current OS
    let normalized = path.normalize(filePath);
    // On Windows, ensure we don't have mixed separators which might confuse some tools
    if (process.platform === 'win32') {
        normalized = normalized.replace(/\//g, '\\');
    }
    return normalized;
}

module.exports = { registerHandlers, registerProtocol };
