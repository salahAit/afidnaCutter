<script>
  import { onMount, onDestroy } from 'svelte';
  import { appState, formatTime } from './lib/state.svelte.js';

  let videoElement;
  let playerContainer;

  // Load YouTube API
  onMount(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    
    window.onYouTubeIframeAPIReady = function () {
        // API Ready
    };
  });

  // React to YouTube Video ID change
  $effect(() => {
    if (appState.mode === 'youtube' && appState.youtubeVideoId && window.YT) {
        initYouTubePlayer(appState.youtubeVideoId);
    }
  });

  function initYouTubePlayer(videoId) {
    if (appState.youtubePlayer) {
        appState.youtubePlayer.loadVideoById(videoId);
        return;
    }

    // Ensure container is empty before creating new player
    if (playerContainer) {
        playerContainer.innerHTML = '<div id="yt-player"></div>';
    }

    appState.youtubePlayer = new YT.Player('yt-player', {
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
    appState.duration = event.target.getDuration();
    // Start polling for time
    const interval = setInterval(() => {
        if (appState.mode === 'youtube' && appState.youtubePlayer && appState.youtubePlayer.getCurrentTime) {
            appState.currentTime = appState.youtubePlayer.getCurrentTime();
        }
    }, 500);
    
    onDestroy(() => clearInterval(interval));
  }

  function onPlayerStateChange(event) {
    appState.isPlaying = event.data === YT.PlayerState.PLAYING;
  }

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

<div class="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[400px]">
  {#if !appState.videoSrc && !appState.youtubeVideoId}
    <div class="text-slate-500">الرجاء اختيار فيديو للبدء</div>
  {/if}

  <!-- Local Video -->
  <video 
    id="main-video"
    bind:this={videoElement}
    src={appState.videoSrc}
    class:hidden={appState.mode !== 'upload' || !appState.videoSrc}
    class="w-full h-full object-contain"
    ontimeupdate={handleTimeUpdate}
    onloadedmetadata={handleLoadedMetadata}
    onplay={handlePlay}
    onpause={handlePause}
  ></video>

  <!-- YouTube Player -->
  <div 
    id="youtube-player-container" 
    bind:this={playerContainer}
    class:hidden={appState.mode !== 'youtube' || !appState.youtubeVideoId}
    class="w-full h-full"
  >
    <div id="yt-player"></div>
  </div>
</div>
