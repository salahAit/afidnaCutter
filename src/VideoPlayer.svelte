<script>
  import { appState, formatTime } from "./lib/state.svelte.js";

  let videoElement;
  let hoverTime = $state(0);
  let tooltipLeft = $state(0);
  let isHovering = $state(false);

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
    if (videoElement) {
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
  {#if !appState.videoSrc}
    <div class="text-slate-500">الرجاء اختيار ملف للبدء</div>
  {/if}

  {#if isAudio && appState.videoSrc}
    <div
      class="absolute inset-0 flex items-center justify-center bg-slate-900 z-10"
    >
      <div class="flex flex-col items-center gap-4 animate-pulse">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-blue-500"
          ><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"
          ></circle><circle cx="18" cy="16" r="3"></circle></svg
        >
        <span class="text-xl text-slate-300 font-mono"
          >{appState.videoFilename}</span
        >
      </div>
    </div>
  {/if}

  <!-- Local Video/Audio -->
  <video
    id="main-video"
    bind:this={videoElement}
    src={appState.videoSrc}
    bind:playbackRate={appState.playbackRate}
    class:hidden={!appState.videoSrc}
    class="w-full h-full object-contain"
    ontimeupdate={handleTimeUpdate}
    onloadedmetadata={handleLoadedMetadata}
    onplay={handlePlay}
    onpause={handlePause}
  >
    <track kind="captions" />
  </video>

  <!-- Progress Bar Overlay -->
  {#if appState.videoSrc}
    <div
      class="absolute bottom-0 left-0 right-0 px-4 py-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
      onmousemove={handleMouseMove}
      onmouseenter={() => (isHovering = true)}
      onmouseleave={() => (isHovering = false)}
      role="slider"
      aria-valuenow={appState.currentTime}
      tabindex="0"
    >
      <!-- Tooltip -->
      {#if isHovering}
        <div
          class="absolute bottom-12 bg-black/80 text-white text-xs px-2 py-1 rounded border border-white/20 pointer-events-none transform -translate-x-1/2 font-mono"
          style="left: {tooltipLeft}px"
        >
          {formatTime(hoverTime)}
        </div>
      {/if}

      <input
        type="range"
        min="0"
        max={appState.duration || 100}
        value={appState.currentTime}
        oninput={handleSeek}
        class="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2 transition-all"
        dir="ltr"
      />
    </div>
  {/if}
</div>
