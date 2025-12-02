// State
let state = {
    mode: 'youtube', // 'youtube' or 'upload'
    videoSrc: null,
    videoFilename: null,
    sessionId: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    segments: [],
    currentStart: null,
    youtubePlayer: null,
    youtubeVideoId: null,
    downloadStatus: { status: 'idle' }
};

// DOM Elements
const els = {
    tabYoutube: document.getElementById('tab-youtube'),
    tabUpload: document.getElementById('tab-upload'),
    inputYoutube: document.getElementById('input-youtube'),
    inputUpload: document.getElementById('input-upload'),
    youtubeUrl: document.getElementById('youtube-url'),
    btnFetchYoutube: document.getElementById('btn-fetch-youtube'),
    btnSelectFile: document.getElementById('btn-select-file'),
    progressContainer: document.getElementById('progress-container'),
    progressBar: document.getElementById('progress-bar'),
    statusText: document.getElementById('status-text'),
    videoContainer: document.getElementById('video-container'),
    placeholderText: document.getElementById('placeholder-text'),
    mainVideo: document.getElementById('main-video'),
    youtubePlayerContainer: document.getElementById('youtube-player-container'),
    segmentsList: document.getElementById('segments-list'),
    segmentCount: document.getElementById('segment-count'),
    btnCut: document.getElementById('btn-cut'),
    currentTime: document.getElementById('current-time'),
    duration: document.getElementById('duration'),
    btnPlayPause: document.getElementById('btn-play-pause'),
    btnStepBack1: document.getElementById('btn-step-back-1s'),
    btnStepBack01: document.getElementById('btn-step-back-01s'),
    btnStepFwd01: document.getElementById('btn-step-fwd-01s'),
    btnStepFwd1: document.getElementById('btn-step-fwd-1s'),
    btnMarkStart: document.getElementById('btn-mark-start'),
    btnMarkEnd: document.getElementById('btn-mark-end'),
    startMarkerDisplay: document.getElementById('start-marker-display'),
    startTimeVal: document.getElementById('start-time-val'),
    successModal: document.getElementById('success-modal'),
    createdFilesList: document.getElementById('created-files-list'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    timelineCanvas: document.getElementById('timeline-canvas')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadYouTubeAPI();
    setupTimeline();
});

function setupEventListeners() {
    // ... existing listeners ...
    // Tabs
    els.tabYoutube.addEventListener('click', () => switchMode('youtube'));
    els.tabUpload.addEventListener('click', () => switchMode('upload'));

    // Inputs
    els.btnFetchYoutube.addEventListener('click', handleYoutubeFetch);
    els.btnSelectFile.addEventListener('click', handleFileSelect);

    // Controls
    els.btnPlayPause.addEventListener('click', togglePlay);
    els.btnStepBack1.addEventListener('click', () => step(-1));
    els.btnStepBack01.addEventListener('click', () => step(-0.1));
    els.btnStepFwd01.addEventListener('click', () => step(0.1));
    els.btnStepFwd1.addEventListener('click', () => step(1));
    els.btnMarkStart.addEventListener('click', markStart);
    els.btnMarkEnd.addEventListener('click', markEnd);
    els.btnCut.addEventListener('click', cutVideo);
    els.btnCloseModal.addEventListener('click', () => els.successModal.classList.remove('active'));

    // Video Events
    els.mainVideo.addEventListener('timeupdate', () => updateTime(els.mainVideo.currentTime));
    els.mainVideo.addEventListener('loadedmetadata', () => {
        state.duration = els.mainVideo.duration;
        els.duration.textContent = formatTime(state.duration);
        drawTimeline();
    });
    els.mainVideo.addEventListener('play', () => updatePlayState(true));
    els.mainVideo.addEventListener('pause', () => updatePlayState(false));

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        switch (e.code) {
            case 'Space': e.preventDefault(); togglePlay(); break;
            case 'KeyI': markStart(); break;
            case 'KeyO': markEnd(); break;
            case 'ArrowLeft': step(-5); break;
            case 'ArrowRight': step(5); break;
        }
    });

    // Timeline Events
    window.addEventListener('resize', drawTimeline);
    els.timelineCanvas.addEventListener('click', handleTimelineClick);
}

// ... existing code ...

// --- Timeline Logic ---
function setupTimeline() {
    // Set canvas resolution
    const resizeCanvas = () => {
        els.timelineCanvas.width = els.timelineCanvas.offsetWidth;
        els.timelineCanvas.height = els.timelineCanvas.offsetHeight;
        drawTimeline();
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
}

function drawTimeline() {
    const ctx = els.timelineCanvas.getContext('2d');
    const width = els.timelineCanvas.width;
    const height = els.timelineCanvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background Track
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, height / 2 - 4, width, 8);

    if (state.duration <= 0) return;

    // Draw Segments
    state.segments.forEach(seg => {
        const startX = (seg.start / state.duration) * width;
        const endX = (seg.end / state.duration) * width;
        const segWidth = Math.max(endX - startX, 2);

        ctx.fillStyle = '#10b981'; // Success color
        ctx.fillRect(startX, height / 2 - 4, segWidth, 8);
    });

    // Draw Current Start Marker
    if (state.currentStart !== null) {
        const startX = (state.currentStart / state.duration) * width;

        // Highlight from start to current cursor (preview)
        const currentX = (state.currentTime / state.duration) * width;
        if (currentX > startX) {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.3)'; // Warning with opacity
            ctx.fillRect(startX, height / 2 - 4, currentX - startX, 8);
        }

        // Marker Line
        ctx.fillStyle = '#f59e0b'; // Warning color
        ctx.fillRect(startX - 1, 0, 2, height);

        // Label
        ctx.font = '10px Cairo';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('البداية', startX + 4, 12);
    }

    // Draw Playhead
    const playheadX = (state.currentTime / state.duration) * width;
    ctx.fillStyle = '#3b82f6'; // Primary color
    ctx.fillRect(playheadX - 1, 0, 2, height);

    // Playhead Knob
    ctx.beginPath();
    ctx.arc(playheadX, height / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
}

function handleTimelineClick(e) {
    if (state.duration <= 0) return;

    const rect = els.timelineCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * state.duration;

    if (state.mode === 'upload') {
        els.mainVideo.currentTime = time;
    } else if (state.mode === 'youtube' && state.youtubePlayer) {
        state.youtubePlayer.seekTo(time, true);
    }

    updateTime(time);
}

function updateTime(time) {
    state.currentTime = time;
    els.currentTime.textContent = formatTime(time);
    requestAnimationFrame(drawTimeline);
}

// ... existing code ...

function switchMode(mode) {
    state.mode = mode;
    els.tabYoutube.classList.toggle('active', mode === 'youtube');
    els.tabUpload.classList.toggle('active', mode === 'upload');
    els.inputYoutube.classList.toggle('hidden', mode !== 'youtube');
    els.inputUpload.classList.toggle('hidden', mode !== 'upload');

    // Reset player visibility
    els.placeholderText.classList.remove('hidden');
    els.mainVideo.classList.add('hidden');
    els.youtubePlayerContainer.classList.add('hidden');

    // Stop players
    els.mainVideo.pause();
    if (state.youtubePlayer && state.youtubePlayer.stopVideo) {
        state.youtubePlayer.stopVideo();
    }
}

// --- YouTube Logic ---
function loadYouTubeAPI() {
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
}

window.onYouTubeIframeAPIReady = function () {
    // API Ready
};

async function handleYoutubeFetch() {
    const url = els.youtubeUrl.value;
    if (!url) return;

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    if (!videoId) {
        alert("رابط يوتيوب غير صحيح");
        return;
    }

    state.youtubeVideoId = videoId;

    // Show loading
    els.progressContainer.classList.remove('hidden');
    els.statusText.classList.remove('hidden');
    els.statusText.textContent = "جاري بدء التحميل...";

    try {
        const response = await window.electron.invoke('download-youtube', { url });
        state.sessionId = response.session_id;
        state.videoFilename = "full_video.mp4";

        // Start polling
        pollDownloadStatus();

        // Initialize Player
        initYouTubePlayer(videoId);

    } catch (error) {
        console.error(error);
        alert('فشل بدء التحميل');
        els.progressContainer.classList.add('hidden');
    }
}

function initYouTubePlayer(videoId) {
    els.placeholderText.classList.add('hidden');
    els.youtubePlayerContainer.classList.remove('hidden');
    els.youtubePlayerContainer.innerHTML = '<div id="yt-player"></div>';

    state.youtubePlayer = new YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    state.duration = event.target.getDuration();
    els.duration.textContent = formatTime(state.duration);
    // Start update loop for time
    setInterval(() => {
        if (state.mode === 'youtube' && state.youtubePlayer && state.youtubePlayer.getCurrentTime) {
            const time = state.youtubePlayer.getCurrentTime();
            updateTime(time);
        }
    }, 500);
}

function onPlayerStateChange(event) {
    updatePlayState(event.data === YT.PlayerState.PLAYING);
}

async function pollDownloadStatus() {
    const interval = setInterval(async () => {
        try {
            const status = await window.electron.invoke('get-status', state.sessionId);
            if (status.status === 'downloading') {
                els.progressBar.style.width = `${status.progress}%`;
                els.statusText.textContent = `جاري التحميل: ${status.progress}%`;
            } else if (status.status === 'completed') {
                clearInterval(interval);
                els.progressBar.style.width = '100%';
                els.statusText.textContent = "تم التحميل بنجاح";
                setTimeout(() => {
                    els.progressContainer.classList.add('hidden');
                    els.statusText.classList.add('hidden');
                }, 2000);
            } else if (status.status === 'error') {
                clearInterval(interval);
                alert('فشل التحميل');
            }
        } catch (e) {
            console.error(e);
        }
    }, 1000);
}

// --- Local File Logic ---
async function handleFileSelect() {
    try {
        const { filePath, canceled } = await window.electron.invoke('select-file');
        if (canceled || !filePath) return;

        // Show loading
        els.progressContainer.classList.remove('hidden');
        els.progressBar.style.width = '50%';
        els.statusText.classList.remove('hidden');
        els.statusText.textContent = "جاري المعالجة...";

        const response = await window.electron.invoke('upload-video', { filePath });

        state.sessionId = response.session_id;
        state.videoFilename = response.filename;
        state.videoSrc = response.url; // Use file:// URL directly

        // Setup Player
        els.placeholderText.classList.add('hidden');
        els.mainVideo.classList.remove('hidden');
        els.mainVideo.src = state.videoSrc;

        els.progressBar.style.width = '100%';
        setTimeout(() => {
            els.progressContainer.classList.add('hidden');
            els.statusText.classList.add('hidden');
        }, 1000);

    } catch (error) {
        console.error(error);
        alert('فشل رفع الملف');
    }
}

// --- Playback Control ---
function togglePlay() {
    if (state.mode === 'upload') {
        if (els.mainVideo.paused) els.mainVideo.play();
        else els.mainVideo.pause();
    } else if (state.mode === 'youtube' && state.youtubePlayer) {
        const playerState = state.youtubePlayer.getPlayerState();
        if (playerState === YT.PlayerState.PLAYING) state.youtubePlayer.pauseVideo();
        else state.youtubePlayer.playVideo();
    }
}

function updatePlayState(playing) {
    state.isPlaying = playing;
    els.btnPlayPause.innerHTML = playing
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
}

function step(seconds) {
    let newTime = state.currentTime + seconds;
    if (state.mode === 'upload') {
        els.mainVideo.currentTime = newTime;
    } else if (state.mode === 'youtube' && state.youtubePlayer) {
        state.youtubePlayer.seekTo(newTime, true);
    }
}

function updateTime(time) {
    state.currentTime = time;
    els.currentTime.textContent = formatTime(time);
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

// --- Cutting Logic ---
function markStart() {
    state.currentStart = state.currentTime;
    els.startTimeVal.textContent = formatTime(state.currentStart);
    els.startMarkerDisplay.classList.remove('hidden');
    els.btnMarkEnd.disabled = false;
}

function markEnd() {
    if (state.currentStart === null) return;
    if (state.currentTime <= state.currentStart) {
        alert('وقت النهاية يجب أن يكون بعد وقت البداية');
        return;
    }

    const segment = { start: state.currentStart, end: state.currentTime };
    state.segments.push(segment);

    // Reset
    state.currentStart = null;
    els.startMarkerDisplay.classList.add('hidden');
    els.btnMarkEnd.disabled = true;

    renderSegments();
    drawTimeline();
}

function renderSegments() {
    els.segmentsList.innerHTML = '';
    els.segmentCount.textContent = state.segments.length;
    els.btnCut.disabled = state.segments.length === 0;

    state.segments.forEach((seg, index) => {
        const div = document.createElement('div');
        div.className = 'segment-item';
        div.innerHTML = `
            <div class="segment-info">
                ${formatTime(seg.start)} - ${formatTime(seg.end)}
            </div>
            <div class="segment-actions">
                <button class="btn btn-sm btn-outline" onclick="playSegment(${index})">تشغيل</button>
                <button class="btn btn-sm btn-error" onclick="deleteSegment(${index})">حذف</button>
            </div>
        `;
        els.segmentsList.appendChild(div);
    });
}

window.deleteSegment = (index) => {
    state.segments.splice(index, 1);
    renderSegments();
    drawTimeline();
};

window.playSegment = (index) => {
    const seg = state.segments[index];
    if (state.mode === 'upload') {
        els.mainVideo.currentTime = seg.start;
        els.mainVideo.play();
    } else if (state.mode === 'youtube' && state.youtubePlayer) {
        state.youtubePlayer.seekTo(seg.start, true);
        state.youtubePlayer.playVideo();
    }
};

async function cutVideo() {
    if (!state.sessionId || state.segments.length === 0) return;

    els.btnCut.disabled = true;
    els.btnCut.textContent = "جاري القص...";

    try {
        const response = await window.electron.invoke('cut-video', {
            filename: state.videoFilename,
            session_id: state.sessionId,
            segments: state.segments
        });

        // Show success modal
        els.createdFilesList.innerHTML = '';
        response.output_files.forEach(file => {
            const li = document.createElement('li');
            li.style.marginBottom = '0.5rem';
            li.innerHTML = `
                <span>${file}</span>
                <button class="btn btn-sm btn-outline" onclick="openFolder()">فتح المجلد</button>
            `;
            els.createdFilesList.appendChild(li);
        });

        els.successModal.classList.add('active');

    } catch (error) {
        console.error(error);
        alert('فشل عملية القص');
    } finally {
        els.btnCut.disabled = false;
        els.btnCut.textContent = "قص وتصدير";
    }
}

window.openFolder = async () => {
    await window.electron.invoke('open-folder', state.sessionId);
};
