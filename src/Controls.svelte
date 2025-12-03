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
</script>

<div class="bg-slate-800 p-4 border-t border-slate-700 flex flex-col gap-4">
    <div class="text-center font-mono text-xl text-blue-400" dir="ltr">
        <span id="current-time">{formatTime(appState.currentTime)}</span> /
        <span id="duration">{formatTime(appState.duration)}</span>
    </div>

    <div class="flex justify-center gap-4 items-center flex-wrap" dir="ltr">
        <button
            class="w-10 h-10 rounded-full border border-slate-600 flex items-center justify-center hover:bg-white/5 font-mono text-sm"
            onclick={() => step(-1)}
            title="-1s">-1</button
        >
        <button
            class="w-10 h-10 rounded-full border border-slate-600 flex items-center justify-center hover:bg-white/5 font-mono text-sm"
            onclick={() => step(-0.1)}
            title="-0.1s">-0.1</button
        >

        <button
            class="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all"
            onclick={togglePlay}
        >
            {#if appState.isPlaying}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><rect x="6" y="4" width="4" height="16"></rect><rect
                        x="14"
                        y="4"
                        width="4"
                        height="16"
                    ></rect></svg
                >
            {:else}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    ><polygon points="5 3 19 12 5 21 5 3"></polygon></svg
                >
            {/if}
        </button>

        <button
            class="w-10 h-10 rounded-full border border-slate-600 flex items-center justify-center hover:bg-white/5 font-mono text-sm"
            onclick={() => step(0.1)}
            title="+0.1s">+0.1</button
        >
        <button
            class="w-10 h-10 rounded-full border border-slate-600 flex items-center justify-center hover:bg-white/5 font-mono text-sm"
            onclick={() => step(1)}
            title="+1s">+1</button
        >
    </div>

    <div class="flex justify-center gap-4 flex-wrap items-center" dir="ltr">
        <button
            class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
            onclick={markStart}>تحديد البداية [I]</button
        >

        <!-- Arrow Icon -->
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-slate-500"
            ><line x1="5" y1="12" x2="19" y2="12"></line><polyline
                points="12 5 19 12 12 19"
            ></polyline></svg
        >

        <button
            class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={appState.currentStart === null}
            onclick={markEnd}>تحديد النهاية [O]</button
        >
        {#if appState.currentStart !== null}
            <button
                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg ml-4"
                onclick={cancelStart}>إلغاء</button
            >
        {/if}
    </div>

    {#if appState.currentStart !== null}
        <div class="text-center text-amber-500 font-bold">
            تم تحديد البداية: {formatTime(appState.currentStart)}
        </div>
    {/if}
</div>
