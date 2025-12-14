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

// Store active operations to allow cancellation
const activeOperations = new Map(); // sessionId -> { process, type: 'ffmpeg'|'ytdlp' }

const handlers = {
    'cancel-cut': async (event, sessionId) => {
        if (activeOperations.has(sessionId)) {
            const op = activeOperations.get(sessionId);
            try {
                op.cancelled = true; // Mark as cancelled first

                if (op.process) {
                    console.log(`Cancelling operation for session ${sessionId}`);
                    op.process.kill('SIGKILL'); // Force kill
                }

                // Do not delete immediately, let the main function cleanup
                return { success: true };
            } catch (err) {
                console.error(`Failed to cancel operation for session ${sessionId}:`, err);
                return { success: false, error: err.message };
            }
        }
        return { success: false, error: 'No active operation found' };
    },

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

        // Check if cancelled before starting
        if (activeOperations.has(session_id) && activeOperations.get(session_id).cancelled) {
            throw new Error('Operation canceled');
        }

        try {
            for (let i = 0; i < segments.length; i++) {
                const { start, end, originalIndex } = segments[i];
                const outputFilename = `segment_${originalIndex || (i + 1)}${ext}`; // Use original index if present
                const outputPath = normalizePath(path.join(outputDir, outputFilename));

                await new Promise((resolve, reject) => {
                    const proc = ffmpeg(inputPath)
                        .setStartTime(start)
                        .setDuration(end - start)
                        .outputOptions(['-c copy'])
                        .output(outputPath)
                        .on('start', (commandLine) => {
                            console.log('Spawned Ffmpeg with command: ' + commandLine);
                        })
                        .on('end', () => resolve())
                        .on('error', (err) => reject(err));

                    const ffmpegProc = proc.run();
                    // Store process reference for cancellation
                    // Note: fluent-ffmpeg .run() doesn't return the child process directly in a way we can kill easily via standard node cp,
                    // but we can access the internal request or use the kill method of the command if available?
                    // Actually fluent-ffmpeg has a .kill() method on the command object.

                    activeOperations.set(session_id, { process: proc, type: 'ffmpeg' });
                });

                outputFiles.push(outputFilename);
            }
        } finally {
            activeOperations.delete(session_id);
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

        // Inject Ad Blocking Logic
        try {
            // CSS: Hide all ad containers comprehensively
            win.webContents.insertCSS(`
                /* Video ad overlays */
                .ytp-ad-overlay-container,
                .ytp-ad-text-overlay,
                .ytp-ad-image-overlay,
                /* Banner ads */
                ytd-ad-slot-renderer,
                .ytd-ad-slot-renderer,
                ytd-promoted-sparkles-web-renderer,
                ytd-promoted-video-renderer,
                ytd-display-ad-renderer,
                ytd-companion-slot-renderer,
                #masthead-ad,
                /* Sidebar ads */
                ytd-search-pyv-renderer,
                ytd-promoted-sparkles-text-search-renderer,
                /* In-feed ads */
                ytd-in-feed-ad-layout-renderer,
                /* Premium upsell */
                ytd-mealbar-promo-renderer,
                tp-yt-paper-dialog.ytd-mealbar-promo-renderer,
                /* Player ad modules */
                .ytp-paid-content-overlay,
                .ytp-ad-module,
                .ytp-suggested-action,
                .ytp-suggested-action-badge,
                /* Survey popups */
                ytmusic-you-there-renderer,
                yt-mealbar-promo-renderer
                { display: none !important; visibility: hidden !important; }
                
                /* Hide ad duration indicator */
                .ytp-ad-duration-remaining { display: none !important; }
            `);

            // JS: Advanced ad skipper with MutationObserver
            win.webContents.executeJavaScript(`
                (function() {
                    'use strict';
                    
                    // Configuration
                    const AD_SPEED = 16; // Speed up ads to 16x
                    const POLL_INTERVAL = 300; // Check every 300ms for faster response
                    
                    // Skip ad function
                    function skipAd() {
                        // Multiple skip button selectors for compatibility
                        const skipSelectors = [
                            '.ytp-ad-skip-button',
                            '.ytp-ad-skip-button-modern',
                            '.ytp-skip-ad-button',
                            '[class*="skip-button"]',
                            'button[class*="skip"]'
                        ];
                        
                        for (const selector of skipSelectors) {
                            const btn = document.querySelector(selector);
                            if (btn && btn.offsetParent !== null) {
                                btn.click();
                                console.log('[AdBlock] Skipped ad');
                                return true;
                            }
                        }
                        return false;
                    }
                    
                    // Close overlays
                    function closeOverlays() {
                        const closeBtn = document.querySelector('.ytp-ad-overlay-close-button');
                        if (closeBtn) {
                            closeBtn.click();
                            console.log('[AdBlock] Closed overlay');
                        }
                    }
                    
                    // Speed up and mute video ads
                    function speedUpAd() {
                        const video = document.querySelector('video.html5-main-video');
                        if (!video) return;
                        
                        // Check if ad is playing
                        const playerAd = document.querySelector('.ad-showing, .ytp-ad-player-overlay');
                        if (playerAd) {
                            // Speed up to skip faster
                            if (video.playbackRate !== AD_SPEED) {
                                video.playbackRate = AD_SPEED;
                                console.log('[AdBlock] Speeding up ad to ' + AD_SPEED + 'x');
                            }
                            // Mute during ad
                            if (!video.muted) {
                                video.muted = true;
                            }
                        } else {
                            // Reset for normal video
                            if (video.playbackRate > 4) {
                                video.playbackRate = 1;
                            }
                        }
                    }
                    
                    // Skip intro ads by seeking
                    function skipPrerollAds() {
                        const video = document.querySelector('video.html5-main-video');
                        const adPlaying = document.querySelector('.ad-showing');
                        
                        if (video && adPlaying && video.duration && !isNaN(video.duration)) {
                            // Jump to nearly the end
                            video.currentTime = video.duration - 0.1;
                            console.log('[AdBlock] Jumped to end of ad');
                        }
                    }
                    
                    // Main blocking function
                    function blockAds() {
                        if (!skipAd()) {
                            speedUpAd();
                            skipPrerollAds();
                        }
                        closeOverlays();
                    }
                    
                    // Use MutationObserver for instant detection
                    const observer = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            if (mutation.addedNodes.length || mutation.attributeName === 'class') {
                                blockAds();
                                break;
                            }
                        }
                    });
                    
                    // Observe player for changes
                    function startObserver() {
                        const player = document.querySelector('#movie_player, .html5-video-player');
                        if (player) {
                            observer.observe(player, {
                                childList: true,
                                subtree: true,
                                attributes: true,
                                attributeFilter: ['class']
                            });
                            console.log('[AdBlock] Observer started');
                        } else {
                            // Retry until player loads
                            setTimeout(startObserver, 500);
                        }
                    }
                    
                    // Start observer
                    startObserver();
                    
                    // Fallback polling (in case observer misses something)
                    setInterval(blockAds, POLL_INTERVAL);
                    
                    // Initial run
                    blockAds();
                    
                    console.log('[AdBlock] YouTube Ad Blocker initialized');
                })();
            `);
        } catch (e) {
            console.error("Failed to inject ad blockers:", e);
        }

        return { success: true };
    },

    'open-external': async (event, url) => {
        await shell.openExternal(url);
        return { success: true };
    },

    'open-facebook-window': async () => {
        const win = new BrowserWindow({
            width: 1280,
            height: 800,
            title: "Facebook Browser",
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        // Set User-Agent to avoid detection
        win.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await win.loadURL('https://www.facebook.com/watch');
        return { success: true };
    },

    'open-tiktok-window': async () => {
        const win = new BrowserWindow({
            width: 1280,
            height: 800,
            title: "TikTok Browser",
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        // Set User-Agent to avoid detection
        win.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        try {
            await win.loadURL('https://www.tiktok.com');
        } catch (e) {
            // TikTok may redirect, ignore abort errors
            console.log('TikTok load warning:', e.message);
        }
        return { success: true };
    },

    'open-google-window': async () => {
        const win = new BrowserWindow({
            width: 1280,
            height: 800,
            title: "Google Search",
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });
        await win.loadURL('https://www.google.com');
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

            ytdlp.on('error', (err) => {
                reject(new Error('Failed to start yt-dlp: ' + err.message));
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

            ytdlp.on('error', (err) => {
                reject(new Error('Failed to start yt-dlp: ' + err.message));
            });
        });
    },

    'cut-youtube': async (event, { url, segments, quality = 'best', session_id }) => {
        const sessionId = session_id || uuidv4();
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

        try {
            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                // Check cancellation before each chunk
                if (activeOperations.has(sessionId) && activeOperations.get(sessionId).cancelled) {
                    throw new Error('Operation canceled');
                }

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
                        '--newline',
                        url
                    ]);

                    activeOperations.set(sessionId, { process: ytdlp, type: 'ytdlp' });

                    ytdlp.stdout.on('data', (data) => {
                        const output = data.toString();
                        console.log('yt-dlp:', output);

                        // Parse progress from yt-dlp output
                        const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
                        if (progressMatch) {
                            const downloadProgress = parseFloat(progressMatch[1]);
                            // Calculate overall progress: download is first half, processing is second half
                            const chunkWeight = 100 / chunks.length;
                            const overallProgress = (chunkIdx * chunkWeight) + (downloadProgress / 100 * chunkWeight * 0.7);
                            event.sender.send('cut-progress', {
                                progress: Math.round(overallProgress),
                                status: 'downloading'
                            });
                        }
                    });
                    ytdlp.stderr.on('data', (data) => console.log('yt-dlp err:', data.toString()));

                    ytdlp.on('close', (code) => {
                        // If killed (cancellation), code might be null or signal based
                        if (code !== 0 && code !== null) {
                            reject(new Error(`yt-dlp failed with code ${code}`));
                        } else {
                            resolve();
                        }
                    });

                    ytdlp.on('error', (err) => {
                        reject(new Error('Failed to start yt-dlp: ' + err.message));
                    });
                });

                // Check cancellation after download
                if (activeOperations.has(sessionId) && activeOperations.get(sessionId).cancelled) {
                    throw new Error('Operation canceled');
                }

                // Step 3: Extract exact segments from the chunk
                const segmentsInChunk = segments.filter(seg =>
                    seg.start >= chunk.start && seg.end <= chunk.end
                );

                for (let segIdx = 0; segIdx < segmentsInChunk.length; segIdx++) {
                    // Check cancellation before each segment processing
                    if (activeOperations.has(sessionId) && activeOperations.get(sessionId).cancelled) {
                        throw new Error('Operation canceled');
                    }

                    const seg = segmentsInChunk[segIdx];
                    // Calculate relative time within the chunk
                    const relativeStart = seg.start - chunk.start;
                    const duration = seg.end - seg.start;

                    // Use original index for filename if available to prevent overwrites
                    const usedIndex = seg.originalIndex || (outputFiles.length + 1);
                    const outputFilename = `segment_${usedIndex}.mp4`;
                    const outputPath = path.join(outputDir, outputFilename);

                    // Send processing progress
                    const chunkWeight = 100 / chunks.length;
                    const segmentProgress = (segIdx + 1) / segmentsInChunk.length;
                    const overallProgress = (chunkIdx * chunkWeight) + (chunkWeight * 0.7) + (chunkWeight * 0.3 * segmentProgress);
                    event.sender.send('cut-progress', {
                        progress: Math.round(overallProgress),
                        status: 'processing'
                    });

                    // Verify chunk file exists
                    if (!await fs.pathExists(chunkPath)) {
                        throw new Error(`Chunk file not found: ${chunkPath}`);
                    }
                    const stats = await fs.stat(chunkPath);
                    console.log(`Chunk file size: ${stats.size} bytes`);
                    if (stats.size === 0) {
                        throw new Error(`Chunk file is empty: ${chunkPath}`);
                    }

                    console.log(`Processing segment ${segIdx + 1}/${segmentsInChunk.length} in chunk ${chunkIdx + 1}`);

                    await new Promise((resolve, reject) => {
                        const proc = ffmpeg(chunkPath)
                            .setStartTime(relativeStart)
                            .setDuration(duration)
                            .outputOptions(['-c copy'])
                            .output(outputPath)
                            .on('start', (cmd) => {
                                console.log('ffmpeg command:', cmd);
                            })
                            // .on('stderr', ...) // Optional detailed logging
                            .on('end', () => {
                                console.log(`ffmpeg finished: ${outputFilename}`);
                                resolve();
                            })
                            .on('error', (err, stdout, stderr) => {
                                console.error('ffmpeg error:', err.message);
                                reject(err);
                            });

                        const ffmpegProc = proc.run();
                        activeOperations.set(sessionId, { process: ffmpegProc, type: 'ffmpeg' });
                    });

                    outputFiles.push(outputFilename);
                }

                // Cleanup chunk file
                await fs.remove(chunkPath);
            }
        } finally {
            activeOperations.delete(sessionId);
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
