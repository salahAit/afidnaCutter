<script>
  import { appState } from "./lib/state.svelte.js";

  let videoElement;

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
</script>

<div
  class="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[250px] md:min-h-[400px]"
>
  {#if !appState.videoSrc}
    <div class="text-slate-500">الرجاء اختيار فيديو للبدء</div>
  {/if}

  <!-- Local Video -->
  <video
    id="main-video"
    bind:this={videoElement}
    src={appState.videoSrc}
    class:hidden={!appState.videoSrc}
    class="w-full h-full object-contain"
    ontimeupdate={handleTimeUpdate}
    onloadedmetadata={handleLoadedMetadata}
    onplay={handlePlay}
    onpause={handlePause}
  ></video>
</div>
