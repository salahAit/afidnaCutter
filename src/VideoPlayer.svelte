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
  let isAudio = $derived(
    appState.videoFilename &&
      /\.(mp3|wav|ogg|m4a)$/i.test(appState.videoFilename),
  );
</script>

<div
  class="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[250px] md:min-h-[400px]"
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
    class:hidden={!appState.videoSrc}
    class="w-full h-full object-contain"
    ontimeupdate={handleTimeUpdate}
    onloadedmetadata={handleLoadedMetadata}
    onplay={handlePlay}
    onpause={handlePause}
  ></video>
</div>
