<script>
  import { onMount } from "svelte";
  import { appState, formatTime } from "./lib/state.svelte.js";
  import { i18n } from "./stores/i18n.svelte.js";

  let showDownloadModal = $state(false);
  let selectedQuality = $state("360");

  const qualityOptions = [
    { value: "144", label: "144p" },
    { value: "240", label: "240p" },
    { value: "360", label: "360p" },
    { value: "480", label: "480p" },
    { value: "720", label: "720p" },
    { value: "1080", label: "1080p" },
    { value: "best", label: "Best Quality" },
  ];

  function isQualityAvailable(quality) {
    if (quality === "best") return true;
    const available = appState.youtubeMetadata?.availableQualities || [];
    const qualityNum = parseInt(quality);
    return available.some((q) => parseInt(q) >= qualityNum);
  }

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
      // Use toast or alert
      setTimeout(() => {
        appState.downloadStatus = { status: "idle", progress: 0 };
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Download failed: " + error.message);
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

  function isYouTubeUrl(url) {
    return /youtube\.com|youtu\.be/.test(url);
  }

  function handleShowVideo() {
    const url = appState.youtubeUrl?.trim();
    if (!url) {
      alert(
        i18n.lang === "ar"
          ? "الرجاء إدخال رابط صحيح"
          : "Please enter a valid URL",
      );
      return;
    }

    // For YouTube, extract video ID for iframe preview
    if (isYouTubeUrl(url)) {
      const videoId = extractVideoId(url);
      if (!videoId) {
        alert(
          i18n.lang === "ar"
            ? "الرجاء إدخال رابط يوتوب صحيح"
            : "Please enter a valid YouTube URL",
        );
        return;
      }
      appState.youtubeMetadata = {
        id: videoId,
        title: i18n.lang === "ar" ? "جاري التحميل..." : "Loading...",
        duration: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        loading: true,
        isYouTube: true,
      };
      appState.mode = "youtube";
      appState.videoSrc = null;
      appState.segments = [];
      fetchMetadata(url);
    } else {
      // For other platforms, just fetch metadata
      appState.youtubeMetadata = {
        id: null,
        title: i18n.lang === "ar" ? "جاري التحميل..." : "Loading...",
        duration: 0,
        thumbnail: "",
        loading: true,
        isYouTube: false,
      };
      appState.mode = "youtube"; // Reuse youtube mode for online videos
      appState.videoSrc = null;
      appState.segments = [];
      fetchMetadata(url);
    }
  }

  async function fetchMetadata(url) {
    try {
      const metadata = await window.electron.invoke("analyze-youtube", { url });
      appState.youtubeMetadata = {
        ...appState.youtubeMetadata,
        ...metadata,
        loading: false,
      };
      appState.duration = metadata.duration;
    } catch (error) {
      console.error(i18n.t("failedToFetchMetadata"), error);
      appState.youtubeMetadata = {
        ...appState.youtubeMetadata,
        loading: false,
        title:
          i18n.lang === "ar" ? "فشل تحميل البيانات" : "Failed to load metadata",
      };
    }
  }
</script>

<div
  class="card bg-base-200 shadow-xl border border-base-300 mb-6"
  dir={i18n.lang === "ar" ? "rtl" : "ltr"}
>
  <div class="card-body p-4">
    <!-- Blueprint Tabs -->
    <div
      role="tablist"
      class="tabs tabs-box justify-center mb-6 w-full max-w-2xl mx-auto flex-wrap"
    >
      <button
        role="tab"
        class="tab {appState.activeTab === 'local' ? 'tab-active' : ''}"
        onclick={() => (appState.activeTab = "local")}
      >
        📁 {i18n.t("localFile")}
      </button>
      <button
        role="tab"
        class="tab {appState.activeTab === 'youtube'
          ? 'tab-active'
          : ''} flex items-center gap-1"
        onclick={() => (appState.activeTab = "youtube")}
      >
        <!-- YouTube Icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="#FF0000"
        >
          <path
            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
          />
        </svg>
        {i18n.t("youtube")}
      </button>
      <button
        role="tab"
        class="tab {appState.activeTab === 'facebook'
          ? 'tab-active'
          : ''} flex items-center gap-1"
        onclick={() => (appState.activeTab = "facebook")}
      >
        <!-- Facebook Icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="#1877F2"
        >
          <path
            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
          />
        </svg>
        {i18n.t("facebook")}
      </button>
      <button
        role="tab"
        class="tab {appState.activeTab === 'tiktok'
          ? 'tab-active'
          : ''} flex items-center gap-1"
        onclick={() => (appState.activeTab = "tiktok")}
      >
        <!-- TikTok Icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
          />
        </svg>
        {i18n.t("tiktok")}
      </button>
      <button
        role="tab"
        class="tab {appState.activeTab === 'other'
          ? 'tab-active'
          : ''} flex items-center gap-1"
        onclick={() => (appState.activeTab = "other")}
      >
        <span>🔗</span>
        {i18n.t("otherUrl")}
      </button>
    </div>

    <!-- YouTube Tab Input -->
    {#if appState.activeTab === "youtube"}
      <div class="w-full max-w-2xl mx-auto space-y-6">
        <div class="join w-full">
          <input
            type="text"
            placeholder={i18n.t("youtubeUrlPlaceholder")}
            bind:value={appState.youtubeUrl}
            class="input input-bordered join-item w-full"
            dir="ltr"
          />
          <button
            class="btn btn-error join-item font-bold"
            onclick={handleShowVideo}
          >
            {i18n.t("display")}
          </button>
        </div>

        <!-- Browse YouTube Button -->
        <div class="mt-2 text-center w-full">
          <div class="divider text-xs opacity-50 my-1">{i18n.t("or")}</div>
          <button
            class="btn btn-outline btn-sm btn-secondary w-full gap-2"
            onclick={() => window.electron.invoke("open-youtube-window")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-external-link"
              ><path
                d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
              /><polyline points="15 3 21 3 21 9" /><line
                x1="10"
                y1="14"
                x2="21"
                y2="3"
              /></svg
            >
            <div class="flex flex-col items-center leading-tight">
              <span>{i18n.t("browseYoutube")}</span>
              <span class="text-[10px] opacity-70 font-normal"
                >{i18n.t("browseYoutubeSub")}</span
              >
            </div>
          </button>
        </div>

        {#if appState.youtubeMetadata}
          <div
            class="card card-side bg-base-100 shadow-sm border border-base-300 overflow-hidden"
          >
            <figure class="w-1/3">
              <img
                src={appState.youtubeMetadata.thumbnail}
                alt="Thumbnail"
                class="h-full w-full object-cover"
              />
            </figure>
            <div class="card-body p-4 w-2/3">
              <h3 class="card-title text-base" dir="auto">
                {appState.youtubeMetadata.title}
              </h3>
              <p class="text-sm opacity-70">
                Duration: {formatTime(appState.youtubeMetadata.duration)}
              </p>
              <div class="card-actions justify-end mt-2">
                <button
                  class="btn btn-success btn-sm"
                  disabled={appState.downloadStatus.status === "downloading"}
                  onclick={() => (showDownloadModal = true)}
                >
                  {#if appState.downloadStatus.status === "downloading"}
                    <span class="loading loading-spinner loading-xs"></span> Downloading...
                  {:else}
                    {i18n.t("downloadFull")}
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Facebook Tab Input -->
    {#if appState.activeTab === "facebook"}
      <div class="w-full max-w-2xl mx-auto space-y-6">
        <div class="join w-full">
          <input
            type="text"
            placeholder={i18n.t("facebookUrlPlaceholder")}
            bind:value={appState.youtubeUrl}
            class="input input-bordered join-item w-full"
            dir="ltr"
          />
          <button
            class="btn btn-primary join-item font-bold"
            onclick={handleShowVideo}
          >
            {i18n.t("display")}
          </button>
        </div>

        <!-- Browse Facebook Button -->
        <div class="mt-2 text-center w-full">
          <div class="divider text-xs opacity-50 my-1">{i18n.t("or")}</div>
          <button
            class="btn btn-outline btn-sm btn-primary w-full gap-2"
            onclick={() => window.electron.invoke("open-facebook-window")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#1877F2"
            >
              <path
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
              />
            </svg>
            <span>{i18n.t("browseFacebook")}</span>
          </button>
        </div>

        {#if appState.youtubeMetadata}
          <div
            class="card card-side bg-base-100 shadow-sm border border-base-300 overflow-hidden"
          >
            <figure class="w-1/3">
              <img
                src={appState.youtubeMetadata.thumbnail}
                alt="Thumbnail"
                class="h-full w-full object-cover"
              />
            </figure>
            <div class="card-body p-4 w-2/3">
              <h3 class="card-title text-base" dir="auto">
                {appState.youtubeMetadata.title}
              </h3>
              <p class="text-sm opacity-70">
                {i18n.t("duration")}
                {formatTime(appState.youtubeMetadata.duration)}
              </p>
              <div class="card-actions justify-end mt-2">
                <button
                  class="btn btn-success btn-sm"
                  disabled={appState.downloadStatus.status === "downloading"}
                  onclick={() => (showDownloadModal = true)}
                >
                  {#if appState.downloadStatus.status === "downloading"}
                    <span class="loading loading-spinner loading-xs"></span> Downloading...
                  {:else}
                    {i18n.t("downloadFull")}
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- TikTok Tab Input -->
    {#if appState.activeTab === "tiktok"}
      <div class="w-full max-w-2xl mx-auto space-y-6">
        <div class="join w-full">
          <input
            type="text"
            placeholder={i18n.t("tiktokUrlPlaceholder")}
            bind:value={appState.youtubeUrl}
            class="input input-bordered join-item w-full"
            dir="ltr"
          />
          <button
            class="btn join-item font-bold"
            style="background: linear-gradient(45deg, #00f2ea, #ff0050); color: white; border: none;"
            onclick={handleShowVideo}
          >
            {i18n.t("display")}
          </button>
        </div>

        <!-- Browse TikTok Button -->
        <div class="mt-2 text-center w-full">
          <div class="divider text-xs opacity-50 my-1">{i18n.t("or")}</div>
          <button
            class="btn btn-outline btn-sm w-full gap-2"
            style="border-color: #ff0050; color: #ff0050;"
            onclick={() => window.electron.invoke("open-tiktok-window")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
              />
            </svg>
            <span>{i18n.t("browseTiktok")}</span>
          </button>
        </div>

        {#if appState.youtubeMetadata}
          <div
            class="card card-side bg-base-100 shadow-sm border border-base-300 overflow-hidden"
          >
            <figure class="w-1/3">
              <img
                src={appState.youtubeMetadata.thumbnail}
                alt="Thumbnail"
                class="h-full w-full object-cover"
              />
            </figure>
            <div class="card-body p-4 w-2/3">
              <h3 class="card-title text-base" dir="auto">
                {appState.youtubeMetadata.title}
              </h3>
              <p class="text-sm opacity-70">
                {i18n.t("duration")}
                {formatTime(appState.youtubeMetadata.duration)}
              </p>
              <div class="card-actions justify-end mt-2">
                <button
                  class="btn btn-success btn-sm"
                  disabled={appState.downloadStatus.status === "downloading"}
                  onclick={() => (showDownloadModal = true)}
                >
                  {#if appState.downloadStatus.status === "downloading"}
                    <span class="loading loading-spinner loading-xs"></span> Downloading...
                  {:else}
                    {i18n.t("downloadFull")}
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Other URL Tab Input -->
    {#if appState.activeTab === "other"}
      <div class="w-full max-w-2xl mx-auto space-y-6">
        <div class="join w-full">
          <input
            type="text"
            placeholder={i18n.t("urlPlaceholder")}
            bind:value={appState.youtubeUrl}
            class="input input-bordered join-item w-full"
            dir="ltr"
          />
          <button
            class="btn btn-accent join-item font-bold"
            onclick={handleShowVideo}
          >
            {i18n.t("display")}
          </button>
        </div>

        <div class="alert alert-info text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path></svg
          >
          <span
            >{i18n.lang === "ar"
              ? "يدعم أكثر من 1000 موقع: Twitter, Instagram, Vimeo, Dailymotion..."
              : "Supports 1000+ sites: Twitter, Instagram, Vimeo, Dailymotion..."}</span
          >
        </div>

        <!-- Browse Google Button -->
        <div class="mt-2 text-center w-full">
          <div class="divider text-xs opacity-50 my-1">{i18n.t("or")}</div>
          <button
            class="btn btn-outline btn-sm w-full gap-2"
            onclick={() => window.electron.invoke("open-google-window")}
          >
            <!-- Google Icon -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span
              >{i18n.lang === "ar"
                ? "افتح Google للبحث"
                : "Open Google to Search"}</span
            >
          </button>
        </div>

        {#if appState.youtubeMetadata}
          <div
            class="card card-side bg-base-100 shadow-sm border border-base-300 overflow-hidden"
          >
            <figure class="w-1/3">
              <img
                src={appState.youtubeMetadata.thumbnail}
                alt="Thumbnail"
                class="h-full w-full object-cover"
              />
            </figure>
            <div class="card-body p-4 w-2/3">
              <h3 class="card-title text-base" dir="auto">
                {appState.youtubeMetadata.title}
              </h3>
              <p class="text-sm opacity-70">
                {i18n.t("duration")}
                {formatTime(appState.youtubeMetadata.duration)}
              </p>
              <div class="card-actions justify-end mt-2">
                <button
                  class="btn btn-success btn-sm"
                  disabled={appState.downloadStatus.status === "downloading"}
                  onclick={() => (showDownloadModal = true)}
                >
                  {#if appState.downloadStatus.status === "downloading"}
                    <span class="loading loading-spinner loading-xs"></span> Downloading...
                  {:else}
                    {i18n.t("downloadFull")}
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Progress Bar -->
    {#if appState.downloadStatus.status !== "idle"}
      <div class="mt-6 w-full max-w-2xl mx-auto">
        <progress
          class="progress progress-primary w-full"
          value={appState.downloadStatus.progress}
          max="100"
        ></progress>
        <div class="text-center mt-1 text-xs opacity-70">
          {#if appState.downloadStatus.status === "downloading"}
            Downloading: {Math.round(appState.downloadStatus.progress)}%
          {:else if appState.downloadStatus.status === "processing"}
            Processing...
          {:else if appState.downloadStatus.status === "completed"}
            Completed Successfully
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- DaisyUI Modal -->
{#if showDownloadModal}
  <dialog class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg text-center mb-4">
        {i18n.t("selectQuality")}
      </h3>

      <div
        class="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4 custom-scrollbar"
      >
        {#if appState.youtubeMetadata?.loading}
          <div class="flex flex-col items-center justify-center py-8 gap-2">
            <span class="loading loading-spinner loading-md text-primary"
            ></span>
            <span class="text-sm opacity-70">{i18n.t("fetchingQuality")}</span>
          </div>
        {:else}
          {#each qualityOptions as option}
            {#if isQualityAvailable(option.value)}
              <label
                class="label cursor-pointer hover:bg-base-200 rounded-lg px-2 border border-base-200 {selectedQuality ===
                option.value
                  ? 'bg-base-200 border-primary'
                  : ''}"
              >
                <span class="label-text font-medium"
                  >{option.value === "best"
                    ? i18n.t("bestQuality")
                    : option.label}</span
                >
                <input
                  type="radio"
                  name="quality"
                  class="radio radio-primary"
                  value={option.value}
                  bind:group={selectedQuality}
                />
              </label>
            {/if}
          {/each}
        {/if}
      </div>

      <div class="modal-action">
        <form method="dialog" class="flex gap-2 w-full">
          <button
            class="btn btn-success flex-1"
            type="button"
            onclick={startDownload}>{i18n.t("download")}</button
          >
          <button
            class="btn btn-ghost flex-1"
            type="button"
            onclick={() => (showDownloadModal = false)}
            >{i18n.t("cancel")}</button
          >
        </form>
      </div>
    </div>
    <div
      class="modal-backdrop bg-black/50"
      role="button"
      tabindex="0"
      onclick={() => (showDownloadModal = false)}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") showDownloadModal = false;
      }}
    ></div>
  </dialog>
{/if}
