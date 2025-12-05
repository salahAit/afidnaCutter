<script>
  import { onMount } from "svelte";
  import { appState, formatTime } from "./lib/state.svelte.js";

  let activeTab = $state("local"); // 'local' or 'youtube'
  let showDownloadModal = $state(false);
  let selectedQuality = $state("360");

  const qualityOptions = [
    { value: "144", label: "144p" },
    { value: "240", label: "240p" },
    { value: "360", label: "360p" },
    { value: "480", label: "480p" },
    { value: "720", label: "720p" },
    { value: "1080", label: "1080p" },
    { value: "best", label: "أفضل جودة" },
  ];

  // Check if selected quality is available
  function isQualityAvailable(quality) {
    if (quality === "best") return true;
    const available = appState.youtubeMetadata?.availableQualities || [];
    const qualityNum = parseInt(quality);
    return available.some((q) => parseInt(q) >= qualityNum);
  }

  // Listen for download progress
  onMount(() => {
    const handleProgress = (data) => {
      if (appState.downloadStatus.status === "downloading") {
        appState.downloadStatus = {
          status: "downloading",
          progress: data.progress,
        };
      }
    };
    window.electron.on("download-progress", handleProgress);
  });

  async function startDownload() {
    showDownloadModal = false;
    try {
      appState.downloadStatus = { status: "downloading", progress: 0 };
      const result = await window.electron.invoke("download-full-youtube", {
        url: appState.youtubeUrl,
        quality: selectedQuality,
      });
      appState.downloadStatus = { status: "completed", progress: 100 };
      alert(`تم التنزيل: ${result.filename}`);
      setTimeout(() => {
        appState.downloadStatus = { status: "idle", progress: 0 };
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("فشل التنزيل: " + error.message);
      appState.downloadStatus = { status: "idle", progress: 0 };
    }
  }

  function extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  function handleShowVideo() {
    const videoId = extractVideoId(appState.youtubeUrl);
    if (!videoId) {
      alert("الرجاء إدخال رابط يوتيوب صحيح");
      return;
    }
    appState.youtubeMetadata = {
      id: videoId,
      title: "جاري التحميل...",
      duration: 0,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      loading: true,
    };
    appState.mode = "youtube";
    appState.videoSrc = null;
    appState.segments = [];
    fetchMetadata(videoId);
  }

  async function fetchMetadata(videoId) {
    try {
      const metadata = await window.electron.invoke("analyze-youtube", {
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
      if (appState.youtubeMetadata?.id === videoId) {
        appState.youtubeMetadata = { ...metadata, id: videoId, loading: false };
        appState.duration = metadata.duration;
      }
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
      if (appState.youtubeMetadata?.id === videoId) {
        appState.youtubeMetadata.loading = false;
      }
    }
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
      appState.mode = "upload";
      appState.youtubeMetadata = null;
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

<div class="bg-slate-800 px-4 py-3 rounded-xl mb-3 border border-slate-700">
  <!-- Tabs Header -->
  <div class="flex border-b border-slate-600 mb-3">
    <button
      class="flex-1 px-3 py-2 text-sm font-medium transition-all relative {activeTab ===
      'local'
        ? 'text-blue-400 border-b-2 border-blue-400'
        : 'text-slate-400 hover:text-slate-200'}"
      onclick={() => (activeTab = "local")}
    >
      📁 ملف محلي
    </button>
    <button
      class="flex-1 px-3 py-2 text-sm font-medium transition-all relative {activeTab ===
      'youtube'
        ? 'text-red-400 border-b-2 border-red-400'
        : 'text-slate-400 hover:text-slate-200'}"
      onclick={() => (activeTab = "youtube")}
    >
      <span class="inline-flex items-center gap-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="text-red-500"
        >
          <path
            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
          />
        </svg>
        يوتيوب
      </span>
    </button>
  </div>

  <!-- Local File Tab -->
  {#if activeTab === "local"}
    <button
      class="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
      onclick={handleFileSelect}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <span>اختر ملف (فيديو أو صوت)</span>
    </button>
  {/if}

  <!-- YouTube Tab -->
  {#if activeTab === "youtube"}
    <div class="space-y-4">
      <div class="flex gap-2">
        <input
          type="text"
          placeholder="الصق رابط يوتيوب هنا..."
          bind:value={appState.youtubeUrl}
          class="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          dir="ltr"
        />
        <button
          type="button"
          class="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          onclick={() => handleShowVideo()}
        >
          عرض
        </button>
      </div>

      <!-- Metadata Display -->
      {#if appState.youtubeMetadata}
        <div class="flex gap-4 bg-slate-900 p-4 rounded-lg">
          <img
            src={appState.youtubeMetadata.thumbnail}
            alt="Thumbnail"
            class="w-32 h-auto rounded-lg object-cover"
          />
          <div class="flex-1">
            <h3 class="text-white font-bold text-lg mb-2" dir="auto">
              {appState.youtubeMetadata.title}
            </h3>
            <p class="text-slate-400 mb-3">
              المدة: {formatTime(appState.youtubeMetadata.duration)}
            </p>
            <button
              class="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={appState.downloadStatus.status === "downloading"}
              onclick={() => (showDownloadModal = true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {#if appState.downloadStatus.status === "downloading"}
                جاري التنزيل...
              {:else}
                تنزيل كامل
              {/if}
            </button>
          </div>
        </div>
      {/if}
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
          جاري التحميل: {Math.round(appState.downloadStatus.progress)}%
        {:else if appState.downloadStatus.status === "processing"}
          جاري المعالجة...
        {:else if appState.downloadStatus.status === "completed"}
          تم التحميل بنجاح
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Download Quality Modal -->
{#if showDownloadModal}
  <div
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    onclick={() => (showDownloadModal = false)}
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 border border-slate-600 shadow-2xl"
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <h3 class="text-xl font-bold text-white mb-4 text-center">
        اختر جودة التنزيل
      </h3>

      <div class="space-y-2 mb-4">
        {#each qualityOptions as option}
          {#if isQualityAvailable(option.value)}
            <button
              class="w-full px-4 py-3 rounded-lg text-right transition-colors flex justify-between items-center {selectedQuality ===
              option.value
                ? 'bg-green-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
              onclick={() => (selectedQuality = option.value)}
            >
              <span>{option.label}</span>
              {#if selectedQuality === option.value}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              {/if}
            </button>
          {/if}
        {/each}
      </div>

      <div class="flex gap-3">
        <button
          class="flex-1 px-4 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
          onclick={startDownload}
        >
          تنزيل
        </button>
        <button
          class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          onclick={() => (showDownloadModal = false)}
        >
          إلغاء
        </button>
      </div>
    </div>
  </div>
{/if}
