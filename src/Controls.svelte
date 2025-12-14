<script>
    import { appState, formatTime, addSegment } from "./lib/state.svelte.js";
    import { i18n } from "./stores/i18n.svelte.js";

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
            alert(i18n.t("endTimeBeforeStartTimeError"));
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

<div
    class="bg-base-200/50 border-t border-base-300 px-4 py-6 mb-4 relative z-[95]"
    dir={i18n.lang === "ar" ? "rtl" : "ltr"}
>
    <div class="flex items-center justify-center gap-4 flex-wrap">
        <!-- Playback Controls (Join) -->
        <div class="join shadow-sm" dir="ltr">
            <button
                class="join-item btn btn-md btn-neutral tooltip"
                data-tip={i18n.t("tipBack1s")}
                onclick={() => step(-1)}
                aria-label={i18n.t("stepBack1s")}
                disabled={!appState.videoSrc && !appState.youtubeMetadata}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="size-5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
                    />
                </svg>
            </button>
            <button
                class="join-item btn btn-md btn-neutral tooltip"
                data-tip={i18n.t("tipBack01s")}
                onclick={() => step(-0.1)}
                aria-label={i18n.t("stepBack01s")}
                disabled={!appState.videoSrc && !appState.youtubeMetadata}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="size-5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 19.5L8.25 12l7.5-7.5"
                    />
                </svg>
            </button>
            <button
                class="join-item btn btn-md btn-primary px-6"
                onclick={togglePlay}
                aria-label={appState.isPlaying
                    ? i18n.t("pause")
                    : i18n.t("play")}
                disabled={!appState.videoSrc && !appState.youtubeMetadata}
            >
                {#if appState.isPlaying}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="size-6"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                        />
                    </svg>
                {:else}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="size-6"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"
                        />
                    </svg>
                {/if}
            </button>
            <button
                class="join-item btn btn-md btn-neutral tooltip"
                data-tip={i18n.t("tipForward01s")}
                onclick={() => step(0.1)}
                aria-label={i18n.t("stepForward01s")}
                disabled={!appState.videoSrc && !appState.youtubeMetadata}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="size-5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                </svg>
            </button>
            <button
                class="join-item btn btn-md btn-neutral tooltip"
                data-tip={i18n.t("tipForward1s")}
                onclick={() => step(1)}
                aria-label={i18n.t("stepForward1s")}
                disabled={!appState.videoSrc && !appState.youtubeMetadata}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="size-5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5"
                    />
                </svg>
            </button>
        </div>

        <!-- Separator -->
        <div class="hidden md:flex divider divider-horizontal mx-1"></div>

        <!-- Mark Buttons (Join) -->
        <div class="join shadow-sm">
            <button
                class="join-item btn btn-md btn-accent"
                onclick={markStart}
                disabled={!appState.videoSrc && !appState.youtubeMetadata}
            >
                [I] {i18n.t("start")}
            </button>
            <button
                class="join-item btn btn-md btn-accent"
                disabled={appState.currentStart === null}
                onclick={markEnd}
            >
                {i18n.t("end")} [O]
            </button>
            {#if appState.currentStart !== null}
                <button
                    class="join-item btn btn-md btn-error"
                    onclick={cancelStart}
                    title={i18n.t("cancelSelection")}
                >
                    ✕
                </button>
            {/if}
        </div>

        <!-- Separator -->
        <div class="hidden md:flex divider divider-horizontal mx-1"></div>

        <!-- Speed Custom Dropdown -->
        <!-- Speed Native Select -->
        <select
            class="select select-sm select-bordered font-bold w-24 h-8 min-h-0 text-center"
            bind:value={appState.playbackRate}
            dir="ltr"
            aria-label="Playback Speed"
            style="background-image: none;"
            disabled={!appState.videoSrc && !appState.youtubeMetadata}
        >
            {#each [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0] as rate}
                <option value={rate}>{rate}x</option>
            {/each}
        </select>
    </div>

    {#if appState.currentStart !== null}
        <div class="text-center text-warning text-sm mt-3 font-bold">
            📍 البداية: {formatTime(appState.currentStart)}
        </div>
    {/if}
</div>
