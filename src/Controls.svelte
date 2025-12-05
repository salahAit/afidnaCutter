<script>
    import { appState, formatTime, addSegment } from "./lib/state.svelte.js";

    function togglePlay() {
        if (appState.mode === "upload") {
            const video = document.getElementById("main-video");
            if (video) {
                if (video.paused) video.play();
                else video.pause();
            }
        } else if (appState.mode === "youtube" && appState.youtubePlayer) {
            const playerState = appState.youtubePlayer.getPlayerState();
            if (playerState === YT.PlayerState.PLAYING)
                appState.youtubePlayer.pauseVideo();
            else appState.youtubePlayer.playVideo();
        }
    }

    function step(seconds) {
        let newTime = appState.currentTime + seconds;
        if (appState.mode === "upload") {
            const video = document.getElementById("main-video");
            if (video) video.currentTime = newTime;
        } else if (appState.mode === "youtube" && appState.youtubePlayer) {
            appState.youtubePlayer.seekTo(newTime, true);
        }
        appState.currentTime = newTime;
    }

    function markStart() {
        appState.currentStart = appState.currentTime;
    }

    function markEnd() {
        if (appState.currentStart === null) return;
        if (appState.currentTime <= appState.currentStart) {
            alert("وقت النهاية يجب أن يكون بعد وقت البداية");
            return;
        }
        addSegment(appState.currentStart, appState.currentTime);
        appState.currentStart = null;
    }

    function cancelStart() {
        appState.currentStart = null;
    }

    // Apply playback rate changes to YouTube player
    $effect(() => {
        if (appState.mode === "youtube" && appState.youtubePlayer) {
            const rate = Math.min(appState.playbackRate, 2.0);
            try {
                appState.youtubePlayer.setPlaybackRate(rate);
            } catch (e) {
                console.error("Failed to set playback rate:", e);
            }
        }
    });
</script>

<div class="bg-slate-800/50 border-t border-slate-700 px-4 py-2">
    <div class="flex items-center justify-center gap-2 flex-wrap" dir="ltr">
        <!-- Step Buttons -->
        <button
            class="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center hover:bg-white/10 hover:border-blue-400 text-xs font-mono transition-all"
            onclick={() => step(-1)}
            title="-1s">-1</button
        >
        <button
            class="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center hover:bg-white/10 hover:border-blue-400 text-xs font-mono transition-all"
            onclick={() => step(-0.1)}
            title="-0.1s">-0.1</button
        >

        <!-- Play Button -->
        <button
            class="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all"
            onclick={togglePlay}
        >
            {#if appState.isPlaying}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            {:else}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            {/if}
        </button>

        <button
            class="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center hover:bg-white/10 hover:border-blue-400 text-xs font-mono transition-all"
            onclick={() => step(0.1)}
            title="+0.1s">+0.1</button
        >
        <button
            class="w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center hover:bg-white/10 hover:border-blue-400 text-xs font-mono transition-all"
            onclick={() => step(1)}
            title="+1s">+1</button
        >

        <!-- Separator -->
        <div class="w-px h-6 bg-slate-600 mx-1"></div>

        <!-- Mark Buttons -->
        <button
            class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-all"
            onclick={markStart}>البداية [I]</button
        >

        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="text-slate-500"
        >
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
        </svg>

        <button
            class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={appState.currentStart === null}
            onclick={markEnd}>النهاية [O]</button
        >

        {#if appState.currentStart !== null}
            <button
                class="bg-red-500/80 hover:bg-red-500 text-white px-2 py-1.5 rounded text-sm transition-all"
                onclick={cancelStart}>✕</button
            >
        {/if}

        <!-- Separator -->
        <div class="w-px h-6 bg-slate-600 mx-1"></div>

        <!-- Speed -->
        <select
            bind:value={appState.playbackRate}
            class="bg-slate-700 text-white text-xs font-mono border border-slate-600 rounded px-2 py-1.5 focus:outline-none hover:bg-slate-600 cursor-pointer"
            title="سرعة التشغيل"
        >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2.0x</option>
            <option value={2.5}>2.5x</option>
            <option value={3.0}>3.0x</option>
            <option value={4.0}>4.0x</option>
        </select>
    </div>

    {#if appState.currentStart !== null}
        <div class="text-center text-amber-400 text-sm mt-2">
            📍 البداية: {formatTime(appState.currentStart)}
        </div>
    {/if}
</div>
