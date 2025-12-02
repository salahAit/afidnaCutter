export const appState = $state({
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
    downloadStatus: { status: 'idle', progress: 0 },
    isDragging: false
});

export function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
