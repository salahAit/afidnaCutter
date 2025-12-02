<script>
  import { appState } from "./lib/state.svelte.js";

  let youtubeUrl = $state("");

  function switchMode(mode) {
    appState.mode = mode;
    // Reset player visibility logic handled in VideoPlayer via state
    if (appState.mode === "upload") {
      const video = document.getElementById("main-video");
      if (video) video.pause();
    } else if (appState.mode === "youtube" && appState.youtubePlayer) {
      if (appState.youtubePlayer.stopVideo) appState.youtubePlayer.stopVideo();
    }
  }

  async function handleYoutubeFetch() {
    if (!youtubeUrl) return;

    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = youtubeUrl.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;

    if (!videoId) {
      alert("رابط يوتيوب غير صحيح");
      return;
    }

    appState.youtubeVideoId = videoId;
    appState.downloadStatus = { status: "downloading", progress: 0 };

    try {
      const response = await window.electron.invoke("download-youtube", {
        url: youtubeUrl,
      });
      appState.sessionId = response.session_id;
      appState.videoFilename = "full_video.mp4";

      pollDownloadStatus();
      // Player init is reactive in VideoPlayer.svelte based on appState.youtubeVideoId
    } catch (error) {
      console.error(error);
      alert("فشل بدء التحميل");
      appState.downloadStatus = { status: "idle", progress: 0 };
    }
  }

  async function pollDownloadStatus() {
    const interval = setInterval(async () => {
      try {
        const status = await window.electron.invoke(
          "get-status",
          appState.sessionId,
        );
        if (status.status === "downloading") {
          appState.downloadStatus = {
            status: "downloading",
            progress: status.progress,
          };
        } else if (status.status === "completed") {
          clearInterval(interval);
          appState.downloadStatus = { status: "completed", progress: 100 };
          setTimeout(() => {
            appState.downloadStatus = { status: "idle", progress: 0 };
          }, 2000);
        } else if (status.status === "error") {
          clearInterval(interval);
          alert("فشل التحميل");
          appState.downloadStatus = { status: "error", progress: 0 };
        }
      } catch (e) {
        console.error(e);
      }
    }, 1000);
  }

  async function handleFileSelect() {
    try {
      const { filePath, canceled } =
        await window.electron.invoke("select-file");
      if (canceled || !filePath) return;

      appState.downloadStatus = { status: "processing", progress: 50 };

      const response = await window.electron.invoke("upload-video", {
        filePath,
      });

      appState.sessionId = response.session_id;
      appState.videoFilename = response.filename;
      appState.videoSrc = response.url;

      appState.downloadStatus = { status: "completed", progress: 100 };
      setTimeout(() => {
        appState.downloadStatus = { status: "idle", progress: 0 };
      }, 1000);
    } catch (error) {
      console.error(error);
      alert("فشل رفع الملف");
      appState.downloadStatus = { status: "idle", progress: 0 };
    }
  }
</script>

<div
  class="bg-slate-800 p-6 rounded-2xl mb-4 border border-slate-700 shadow-lg"
>
  <div class="flex gap-4 mb-4 border-b border-slate-700 pb-2">
    <button
      class="px-4 py-2 rounded-lg transition-colors {appState.mode === 'upload'
        ? 'bg-blue-500/10 text-blue-400 font-bold'
        : 'text-slate-400 hover:text-slate-200'}"
      onclick={() => switchMode("upload")}
    >
      رفع ملف
    </button>
    <button
      class="px-4 py-2 rounded-lg transition-colors {appState.mode === 'youtube'
        ? 'bg-blue-500/10 text-blue-400 font-bold'
        : 'text-slate-400 hover:text-slate-200'}"
      onclick={() => switchMode("youtube")}
    >
      رابط يوتيوب
    </button>
  </div>

  {#if appState.mode === "youtube"}
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={youtubeUrl}
        placeholder="ضع رابط الفيديو هنا..."
        class="flex-1 bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-lg outline-none focus:border-blue-500 transition-colors"
      />
      <button
        class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        onclick={handleYoutubeFetch}>جلب</button
      >
    </div>
  {:else}
    <div>
      <button
        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        onclick={handleFileSelect}>اختر ملف فيديو</button
      >
    </div>
  {/if}

  {#if appState.downloadStatus.status !== "idle"}
    <div class="mt-4">
      <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-500 transition-all duration-300"
          style="width: {appState.downloadStatus.progress}%"
        ></div>
      </div>
      <div class="text-center mt-2 text-sm text-slate-400">
        {#if appState.downloadStatus.status === "downloading"}
          جاري التحميل: {appState.downloadStatus.progress}%
        {:else if appState.downloadStatus.status === "processing"}
          جاري المعالجة...
        {:else if appState.downloadStatus.status === "completed"}
          تم التحميل بنجاح
        {/if}
      </div>
    </div>
  {/if}
</div>
