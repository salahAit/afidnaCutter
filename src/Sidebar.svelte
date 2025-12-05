<script>
  import { appState, formatTime, sortSegments } from "./lib/state.svelte.js";

  function playSegment(index) {
    const seg = appState.segments[index];
    if (appState.mode === "upload") {
      const video = document.getElementById("main-video");
      if (video) {
        video.currentTime = seg.start;
        video.play();
      }
    } else if (appState.mode === "youtube" && appState.youtubePlayer) {
      appState.youtubePlayer.seekTo(seg.start, true);
      appState.youtubePlayer.playVideo();
    }
  }

  function deleteSegment(index) {
    appState.segments.splice(index, 1);
  }

  function parseTime(timeStr) {
    const parts = timeStr.split(":");
    if (parts.length === 1) return parseFloat(parts[0]);
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }
    if (parts.length === 3) {
      return (
        parseInt(parts[0]) * 3600 +
        parseInt(parts[1]) * 60 +
        parseFloat(parts[2])
      );
    }
    return 0;
  }

  function updateSegment(index, field, value) {
    const time = parseTime(value);
    if (isNaN(time)) {
      // Reset value to current state if invalid
      const el = document.getElementById(`seg-${index}-${field}`);
      if (el) el.value = formatTime(appState.segments[index][field]);
      return;
    }

    // Validation logic could go here (e.g. check start < end)
    // For now, just update. Ideally we should validate before committing.

    // Simple validation
    const otherField = field === "start" ? "end" : "start";
    const otherTime = appState.segments[index][otherField];

    if (field === "start" && time >= otherTime) {
      alert("وقت البداية يجب أن يكون قبل النهاية");
      const el = document.getElementById(`seg-${index}-${field}`);
      if (el) el.value = formatTime(appState.segments[index][field]);
      return;
    }
    if (field === "end" && time <= otherTime) {
      alert("وقت النهاية يجب أن يكون بعد البداية");
      const el = document.getElementById(`seg-${index}-${field}`);
      if (el) el.value = formatTime(appState.segments[index][field]);
      return;
    }

    appState.segments[index][field] = time;
    sortSegments();
  }

  const qualityLabels = {
    best: "أفضل جودة",
    "1080": "1080p",
    "720": "720p",
    "480": "480p",
    "360": "360p",
    "240": "240p",
    "144": "144p",
  };

  let showQualityModal = $state(false);
  let pendingCut = $state(false);
  let qualityWarning = $state("");

  // Check if selected quality is available
  function isQualityAvailable(quality) {
    if (quality === "best") return true;
    const available = appState.youtubeMetadata?.availableQualities || [];
    const qualityNum = parseInt(quality);
    // Check if any available quality is >= selected quality
    return available.some((q) => parseInt(q) >= qualityNum);
  }

  function getAvailableQualitiesText() {
    const available = appState.youtubeMetadata?.availableQualities || [];
    if (available.length === 0) return "غير معروفة";
    return available
      .slice(0, 5)
      .map((q) => q + "p")
      .join("، ");
  }

  function confirmQuality() {
    // Check if quality is available
    if (!isQualityAvailable(appState.youtubeQuality)) {
      qualityWarning = `الجودة ${qualityLabels[appState.youtubeQuality]} غير متوفرة. الجودات المتوفرة: ${getAvailableQualitiesText()}`;
      return;
    }
    qualityWarning = "";
    showQualityModal = false;
    pendingCut = true;
    executeCut();
  }

  async function cutVideo() {
    if (appState.segments.length === 0) return;

    // Validate based on mode
    if (appState.mode === "upload" && !appState.sessionId) return;
    if (appState.mode === "youtube" && !appState.youtubeUrl) return;

    // For YouTube, show quality confirmation
    if (appState.mode === "youtube" && !pendingCut) {
      showQualityModal = true;
      return;
    }

    pendingCut = false;
    await executeCut();
  }

  async function executeCut() {
    const btn = document.getElementById("btn-cut");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "جاري القص...";
    }

    try {
      let response;
      if (appState.mode === "youtube") {
        // YouTube mode: use cut-youtube handler
        response = await window.electron.invoke("cut-youtube", {
          url: appState.youtubeUrl,
          segments: $state.snapshot(appState.segments),
          quality: appState.youtubeQuality,
        });
        appState.sessionId = response.session_id;
      } else {
        // Local file mode
        response = await window.electron.invoke("cut-video", {
          filename: appState.videoFilename,
          session_id: appState.sessionId,
          segments: $state.snapshot(appState.segments),
        });
      }

      const event = new CustomEvent("cut-complete", {
        detail: response.output_files,
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error(error);
      alert("فشل عملية القص: " + error.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "قص وتصدير";
      }
    }
  }
</script>

<div
  class="w-full md:w-[350px] bg-slate-800 border-t md:border-t-0 md:border-l border-slate-700 flex flex-col h-1/3 md:h-auto"
>
  <div
    class="p-4 border-b border-slate-700 font-bold flex justify-between items-center text-slate-100"
  >
    <span>المقاطع</span>
    <span class="bg-slate-900 px-2 py-1 rounded-full text-xs"
      >{appState.segments.length}</span
    >
  </div>

  <div class="flex-1 overflow-y-auto p-4 space-y-2">
    {#each appState.segments as seg, index (seg.id || index)}
      <div
        class="bg-white/5 border border-slate-700 rounded-lg p-3 flex flex-col gap-2"
      >
        <div class="flex justify-between items-center w-full gap-2">
          <div class="flex gap-1 items-center flex-1 justify-center" dir="ltr">
            <input
              id="seg-{index}-start"
              type="text"
              class="bg-transparent border border-transparent hover:border-slate-600 focus:border-blue-500 rounded px-1 py-0.5 text-sm text-slate-200 w-20 text-center transition-colors outline-none"
              value={formatTime(seg.start)}
              onchange={(e) => updateSegment(index, "start", e.target.value)}
            />
            <span class="text-slate-500 mx-1">
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
                ><line x1="5" y1="12" x2="19" y2="12"></line><polyline
                  points="12 5 19 12 12 19"
                ></polyline></svg
              >
            </span>
            <input
              id="seg-{index}-end"
              type="text"
              class="bg-transparent border border-transparent hover:border-slate-600 focus:border-blue-500 rounded px-1 py-0.5 text-sm text-slate-200 w-20 text-center transition-colors outline-none"
              value={formatTime(seg.end)}
              onchange={(e) => updateSegment(index, "end", e.target.value)}
            />
          </div>
          <div class="flex gap-1">
            <button
              class="p-2 text-xs border border-slate-600 rounded text-slate-300 hover:bg-white/10 transition-colors"
              onclick={() => playSegment(index)}
              title="تشغيل"
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
                ><polygon points="5 3 19 12 5 21 5 3"></polygon></svg
              >
            </button>
            <button
              class="p-2 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow-sm"
              onclick={() => deleteSegment(index)}
              title="حذف"
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
                ><polyline points="3 6 5 6 21 6"></polyline><path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path></svg
              >
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <div class="p-4 border-t border-slate-700">
    <button
      id="btn-cut"
      class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      disabled={appState.segments.length === 0}
      onclick={cutVideo}
    >
      قص وتصدير
    </button>
  </div>
</div>

<!-- Quality Confirmation Modal -->
{#if showQualityModal}
  <div
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    onclick={() => (showQualityModal = false)}
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 border border-slate-600 shadow-2xl"
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <h3 class="text-xl font-bold text-white mb-4 text-center">
        اختر جودة التحميل
      </h3>

      <div class="space-y-2 mb-4 max-h-60 overflow-y-auto">
        {#each Object.entries(qualityLabels) as [value, label]}
          {@const available = isQualityAvailable(value)}
          {#if available || value === "best"}
            <button
              class="w-full px-4 py-3 rounded-lg text-right transition-colors flex justify-between items-center {appState.youtubeQuality ===
              value
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}"
              onclick={() => {
                appState.youtubeQuality = value;
                qualityWarning = "";
              }}
            >
              <span>{label}</span>
              {#if appState.youtubeQuality === value}
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

      {#if qualityWarning}
        <div
          class="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center"
        >
          {qualityWarning}
        </div>
      {/if}

      <div class="flex gap-3">
        <button
          class="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors"
          onclick={confirmQuality}
        >
          قص وتصدير
        </button>
        <button
          class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          onclick={() => (showQualityModal = false)}
        >
          إلغاء
        </button>
      </div>
    </div>
  </div>
{/if}
