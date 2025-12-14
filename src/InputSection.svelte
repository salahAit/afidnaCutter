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

  function handleShowVideo() {
    const videoId = extractVideoId(appState.youtubeUrl);
    if (!videoId) {
      alert("Please enter a valid YouTube URL");
      return;
    }
    appState.youtubeMetadata = {
      id: videoId,
      title: "Loading...",
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
      console.error(i18n.t("failedToFetchMetadata"), error);
      if (appState.youtubeMetadata?.id === videoId) {
        appState.youtubeMetadata.loading = false;
      }
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
      class="tabs tabs-box justify-center mb-6 w-full max-w-md mx-auto"
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
          : ''} flex items-center gap-2"
        onclick={() => (appState.activeTab = "youtube")}
      >
        <span class="text-error">▶</span>
        {i18n.t("youtube")}
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
