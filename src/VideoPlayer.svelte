<script>
  import { appState, resetState } from "./lib/state.svelte.js";
  import { i18n } from "./stores/i18n.svelte.js";
  import { onMount } from "svelte";

  let videoElement;
  let youtubeContainer = $state(null);
  let hoverTime = $state(0);
  let tooltipLeft = $state(0);
  let isHovering = $state(false);
  let isDragging = $state(false);

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
            autoplay: 1,
            controls: 1,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            origin: window.location.origin, // standard fix for embed issues
          },
          host: "https://www.youtube-nocookie.com", // Try privacy enhanced mode
          events: {
            onReady: (event) => {
              appState.youtubePlayer = event.target;
              appState.duration = event.target.getDuration();
              appState.isPlaying = true; // Auto-playing
            },
            onStateChange: (event) => {
              // 1 = playing, 2 = paused
              appState.isPlaying = event.data === 1;
              if (event.data === 1) {
                // start timer if playing
                startTracking();
              } else {
                stopTracking();
              }
            },
            onError: (event) => {
              console.error("YouTube Player Error:", event.data);
              // Error 153 is permission/embed restriction
              if (
                event.data === 150 ||
                event.data === 101 ||
                event.data === 153
              ) {
                alert(
                  i18n.t("error") +
                    ": " +
                    "Video owner restricted playback (Error " +
                    event.data +
                    ")",
                );
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

  // --- Logic for File Input & Reset ---
  async function handleFileSelect() {
    try {
      const { filePath, canceled } =
        await window.electron.invoke("select-file");
      if (canceled || !filePath) return;
      processFile(filePath);
    } catch (error) {
      console.error(error);
      alert(i18n.t("failedToSelectFile"));
    }
  }

  async function processFile(filePath) {
    appState.downloadStatus = { status: "processing", progress: 50 };
    try {
      const response = await window.electron.invoke("upload-video", {
        filePath,
      });
      appState.sessionId = response.session_id;
      appState.videoFilename = response.filename;
      appState.videoSrc = response.url;
      appState.mode = "upload";
      appState.youtubeMetadata = null;
      appState.downloadStatus = { status: "completed", progress: 100 };
      setTimeout(() => {
        appState.downloadStatus = { status: "idle", progress: 0 };
      }, 1000);
    } catch (error) {
      console.error(error);
      alert(i18n.t("failedToProcessFile"));
      appState.downloadStatus = { status: "idle", progress: 0 };
    }
  }

  function onDrop(e) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const filePath = file.path;
      if (filePath) processFile(filePath);
    }
  }

  function handleClose() {
    if (appState.segments.length > 0 || appState.currentStart !== null) {
      if (confirm(i18n.t("confirmCloseWorkLoss"))) {
        resetState();
      }
    } else {
      resetState();
    }
  }
</script>

<div
  class="relative flex-1 rounded-box flex items-center justify-center min-h-[250px] md:min-h-[400px] group shadow-xl transition-all duration-300 overflow-hidden"
  class:bg-black={appState.videoSrc || appState.youtubeMetadata}
  class:bg-base-100={!appState.videoSrc && !appState.youtubeMetadata}
>
  {#if appState.videoSrc || appState.youtubeMetadata}
    <!-- Close Button (Absolute Top-Right) -->
    <button
      onclick={handleClose}
      class="absolute top-2 right-2 z-50 btn btn-circle btn-sm btn-error shadow-md opacity-80 hover:opacity-100"
      title="Close Video"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>

    <!-- Content: Audio Visualization -->
    {#if isAudio && appState.videoSrc}
      <div
        class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
      >
        <div class="flex flex-col items-center gap-6 px-8 py-6">
          <!-- Animated Sound Waves -->
          <div class="flex items-center gap-2 h-20">
            {#each Array(5) as _, i}
              <div
                class="w-2 bg-linear-to-t from-primary to-secondary rounded-full {appState.isPlaying
                  ? 'animate-soundwave'
                  : ''}"
                style="animation-delay: {i * 0.1}s; {appState.isPlaying
                  ? 'min-height: 20px;'
                  : 'height: 20px;'}"
              ></div>
            {/each}
          </div>
          <div class="flex items-center gap-3 text-base-content/80">
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
              class="text-primary"
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

    <!-- Content: YouTube Player -->
    {#if appState.mode === "youtube" && appState.youtubeMetadata}
      <!-- Loading Overlay -->
      {#if appState.youtubeMetadata.loading}
        <div
          class="absolute inset-0 flex items-center justify-center bg-base-300 z-20"
        >
          <div class="flex flex-col items-center gap-4">
            <span class="loading loading-spinner loading-lg text-primary"
            ></span>
            <span class="text-xl text-base-content/70"
              >جاري تحميل الفيديو...</span
            >
          </div>
        </div>
      {/if}
      <div bind:this={youtubeContainer} class="w-full h-full"></div>
    {/if}

    <!-- Content: Local Video/Audio -->
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
  {:else if appState.activeTab === "local"}
    <!-- Drop Zone (When no video is selected) -->
    <div
      class="w-full h-full flex items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer p-10 {isDragging
        ? 'border-primary bg-base-200'
        : 'border-base-300 hover:border-primary hover:bg-base-200'}"
      onclick={handleFileSelect}
      ondragover={(e) => {
        e.preventDefault();
        isDragging = true;
      }}
      ondragleave={() => (isDragging = false)}
      ondrop={onDrop}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === "Enter" && handleFileSelect()}
    >
      <div class="text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-20 w-20 mx-auto mb-6 text-base-content/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <h3 class="text-2xl font-bold mb-2">
          {i18n.t("dragDrop")}
        </h3>
        <p class="text-base opacity-70">{i18n.t("supportedFormats")}</p>
      </div>
    </div>
  {:else}
    <!-- Fallback / YouTube Empty State -->
    <div class="text-base-content/50 italic">
      {i18n.lang === "ar"
        ? "أدخل رابط يوتيوب في الأعلى واضغط عرض"
        : "Enter a YouTube URL above and click Display"}
    </div>
  {/if}
</div>
