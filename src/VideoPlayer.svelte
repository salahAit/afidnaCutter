<script>
  import { appState, formatTime } from "./lib/state.svelte.js";
  import { onMount } from "svelte";

  let videoElement;
  let youtubeContainer;
  let hoverTime = $state(0);
  let tooltipLeft = $state(0);
  let isHovering = $state(false);

  // Load YouTube IFrame API
  onMount(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  });

  // Create YouTube player when metadata is available
  let currentVideoId = $state(null);

  $effect(() => {
    const videoId = appState.youtubeMetadata?.id;

    // Only create player if video ID changed and we're in youtube mode
    if (
      appState.mode === "youtube" &&
      videoId &&
      videoId !== currentVideoId &&
      youtubeContainer
    ) {
      currentVideoId = videoId;

      let timeoutId = null;
      let destroyed = false;

      // Wait for YT API to load
      const initPlayer = () => {
        if (destroyed) return;

        if (!window.YT || !window.YT.Player) {
          timeoutId = setTimeout(initPlayer, 200);
          return;
        }

        // Destroy existing player
        if (appState.youtubePlayer) {
          try {
            appState.youtubePlayer.destroy();
          } catch (e) {}
        }

        appState.youtubePlayer = new window.YT.Player(youtubeContainer, {
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              console.log("YouTube player ready");
              // Mark loading as complete
              if (appState.youtubeMetadata) {
                appState.youtubeMetadata.loading = false;
              }
            },
            onStateChange: (event) => {
              appState.isPlaying = event.data === window.YT.PlayerState.PLAYING;
              // Update time immediately on any state change (including seek)
              if (appState.youtubePlayer?.getCurrentTime) {
                appState.currentTime = appState.youtubePlayer.getCurrentTime();
              }
            },
          },
        });
      };

      initPlayer();

      return () => {
        destroyed = true;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  });

  // Separate effect for continuous time updates
  $effect(() => {
    if (appState.mode !== "youtube" || !appState.youtubePlayer) return;

    const intervalId = setInterval(() => {
      if (appState.youtubePlayer?.getCurrentTime) {
        const newTime = appState.youtubePlayer.getCurrentTime();
        if (Math.abs(newTime - appState.currentTime) > 0.01) {
          appState.currentTime = newTime;
        }
      }
    }, 100);

    return () => {
      clearInterval(intervalId);
    };
  });

  function handleTimeUpdate() {
    if (videoElement) {
      appState.currentTime = videoElement.currentTime;
    }
  }

  function handleLoadedMetadata() {
    if (videoElement) {
      appState.duration = videoElement.duration;
    }
  }

  function handlePlay() {
    appState.isPlaying = true;
  }

  function handlePause() {
    appState.isPlaying = false;
  }

  let isAudio = $derived(
    appState.videoFilename &&
      /\.(mp3|wav|ogg|m4a)$/i.test(appState.videoFilename),
  );

  function handleSeek(e) {
    const newTime = parseFloat(e.target.value);
    if (appState.mode === "youtube" && appState.youtubePlayer?.seekTo) {
      appState.youtubePlayer.seekTo(newTime, true);
    } else if (videoElement) {
      videoElement.currentTime = newTime;
    }
    appState.currentTime = newTime;
  }

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    hoverTime = percentage * (appState.duration || 0);
    tooltipLeft = x;
  }
</script>

<div
  class="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[250px] md:min-h-[400px] group"
>
  {#if !appState.videoSrc && !appState.youtubeMetadata}
    <div class="text-slate-500">الرجاء اختيار ملف للبدء</div>
  {/if}

  {#if isAudio && appState.videoSrc}
    <div
      class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
    >
      <div class="flex flex-col items-center gap-6 px-8 py-6">
        <!-- Animated Sound Waves -->
        <div class="flex items-center gap-2 h-20">
          {#each Array(5) as _, i}
            <div
              class="w-2 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full {appState.isPlaying
                ? 'animate-soundwave'
                : ''}"
              style="animation-delay: {i * 0.1}s; {appState.isPlaying
                ? 'min-height: 20px;'
                : 'height: 20px;'}"
            ></div>
          {/each}
        </div>
        <div class="flex items-center gap-3 text-slate-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-purple-400"
          >
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <span class="text-xl font-medium">{appState.videoFilename}</span>
        </div>
      </div>
    </div>

    <style>
      @keyframes soundwave {
        0%,
        100% {
          height: 20px;
        }
        50% {
          height: 60px;
        }
      }
      .animate-soundwave {
        animation: soundwave 1s ease-in-out infinite;
      }
    </style>
  {/if}

  <!-- YouTube Player -->
  {#if appState.mode === "youtube" && appState.youtubeMetadata}
    <!-- Loading Overlay -->
    {#if appState.youtubeMetadata.loading}
      <div
        class="absolute inset-0 flex items-center justify-center bg-slate-900 z-20"
      >
        <div class="flex flex-col items-center gap-4">
          <div
            class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
          ></div>
          <span class="text-xl text-slate-300">جاري تحميل الفيديو...</span>
        </div>
      </div>
    {/if}
    <div bind:this={youtubeContainer} class="w-full h-full"></div>
  {/if}

  <!-- Local Video/Audio -->
  <video
    id="main-video"
    bind:this={videoElement}
    src={appState.videoSrc}
    bind:playbackRate={appState.playbackRate}
    class:hidden={!appState.videoSrc || appState.mode === "youtube"}
    class="w-full h-full object-contain"
    controls
    ontimeupdate={handleTimeUpdate}
    onloadedmetadata={handleLoadedMetadata}
    onplay={handlePlay}
    onpause={handlePause}
  >
    <track kind="captions" />
  </video>
</div>
