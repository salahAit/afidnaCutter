<script>
  import { appState, formatTime, sortSegments } from "./lib/state.svelte.js";
  import { i18n } from "./stores/i18n.svelte.js";

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
      alert(i18n.t("startTimeBeforeEndTimeError"));
      const el = document.getElementById(`seg-${index}-${field}`);
      if (el) el.value = formatTime(appState.segments[index][field]);
      return;
    }
    if (field === "end" && time <= otherTime) {
      alert(i18n.t("endTimeAfterStartTimeError"));
      const el = document.getElementById(`seg-${index}-${field}`);
      if (el) el.value = formatTime(appState.segments[index][field]);
      return;
    }

    appState.segments[index][field] = time;
    sortSegments();
  }

  // Reactive quality labels
  let qualityLabels = $derived({
    best: i18n.t("bestQuality"),
    "1080": "1080p",
    "720": "720p",
    "480": "480p",
    "360": "360p",
    "240": "240p",
    "144": "144p",
  });

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
    if (available.length === 0) return i18n.t("unknown");
    return available
      .slice(0, 5)
      .map((q) => q + "p")
      .join("، ");
  }

  function confirmQuality() {
    // Check if quality is available
    if (!isQualityAvailable(appState.youtubeQuality)) {
      qualityWarning = `${i18n.t("qualityUnavailable")}. ${i18n.t("availableQualities")}: ${getAvailableQualitiesText()}`;
      return;
    }
    qualityWarning = "";
    showQualityModal = false;
    pendingCut = true;
    const single = appState.pendingSingleSegment || null;
    appState.pendingSingleSegment = null; // Clear after using
    executeCut(single ? [single] : null);
  }

  async function cutVideo(singleSegment = null) {
    if (appState.segments.length === 0) return;

    // Validate based on mode
    if (appState.mode === "upload" && !appState.sessionId) return;
    if (appState.mode === "youtube" && !appState.youtubeUrl) return;

    // For YouTube, show quality confirmation
    if (appState.mode === "youtube" && !pendingCut) {
      showQualityModal = true;
      // If cutting single segment, store it for later
      if (singleSegment) {
        appState.pendingSingleSegment = singleSegment; // Need to add this state or just pass via pendingCut context?
        // Simpler: Just rely on UI flow. Quality modal confirms, then calls executeCut.
        // But executeCut needs to know. Maybe store in a let variable?
      } else {
        appState.pendingSingleSegment = null;
      }
      return;
    }

    pendingCut = false;
    await executeCut(singleSegment ? [singleSegment] : null);
  }

  // Helper for single segment button
  function cutSingleSegment(index) {
    const segment = { ...appState.segments[index], originalIndex: index + 1 };
    cutVideo(segment);
  }

  async function executeCut(segmentsToCut = null) {
    const segments = $state.snapshot(segmentsToCut || appState.segments);

    // Safety check
    if (!segments || segments.length === 0) return;

    const btn = document.getElementById("btn-cut");
    if (btn) {
      btn.disabled = true;
      btn.textContent = i18n.t("processing");
    }

    try {
      let response;
      if (appState.mode === "youtube") {
        // YouTube mode: use cut-youtube handler
        response = await window.electron.invoke("cut-youtube", {
          url: appState.youtubeUrl,
          segments: segments,
          quality: appState.youtubeQuality,
        });
        appState.sessionId = response.session_id;
      } else {
        // Local file mode
        response = await window.electron.invoke("cut-video", {
          filename: appState.videoFilename,
          session_id: appState.sessionId,
          segments: segments,
        });
      }

      const event = new CustomEvent("cut-complete", {
        detail: response.output_files,
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error(error);
      alert(i18n.t("cutFailed") + ": " + error.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = i18n.t("cutAll");
      }
    }
  }
</script>

<div
  class="w-full md:w-[350px] bg-base-200 border-t md:border-t-0 md:border-l border-base-300 flex flex-col h-1/3 md:h-auto"
  dir={i18n.lang === "ar" ? "rtl" : "ltr"}
>
  <div
    class="p-4 border-b border-base-300 font-bold flex justify-between items-center text-base-content"
  >
    <span>{i18n.t("segments")}</span>
    <span class="badge badge-primary px-2 py-1 rounded-full text-xs"
      >{appState.segments.length}</span
    >
  </div>

  <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
    {#each appState.segments as seg, index (seg.id || index)}
      <div
        class="bg-base-100 border border-base-300 rounded-lg p-3 flex flex-col gap-2"
      >
        <div class="flex justify-between items-center w-full gap-2">
          <div class="flex gap-1 items-center flex-1 justify-center" dir="ltr">
            <input
              id="seg-{index}-start"
              type="text"
              class="input input-sm input-ghost w-20 text-center focus:input-primary"
              value={formatTime(seg.start)}
              onchange={(e) => updateSegment(index, "start", e.target.value)}
            />
            <span class="text-base-content/50 mx-1">
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
              class="input input-sm input-ghost w-20 text-center focus:input-primary"
              value={formatTime(seg.end)}
              onchange={(e) => updateSegment(index, "end", e.target.value)}
            />
          </div>
          <div class="flex gap-1">
            <button
              class="btn btn-sm btn-square btn-secondary"
              onclick={() => cutSingleSegment(index)}
              title={i18n.t("cutSegment")}
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
                class="lucide lucide-scissors"
                ><circle cx="6" cy="6" r="3" /><circle
                  cx="6"
                  cy="18"
                  r="3"
                /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line
                  x1="14.47"
                  y1="14.48"
                  x2="20"
                  y2="20"
                /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg
              >
            </button>
            <button
              class="btn btn-sm btn-square btn-ghost"
              onclick={() => playSegment(index)}
              title={i18n.t("play")}
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
              class="btn btn-sm btn-square btn-error"
              onclick={() => deleteSegment(index)}
              title={i18n.t("delete")}
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

  <div class="p-4 border-t border-base-300">
    <button
      id="btn-cut"
      class="btn btn-success w-full font-bold"
      disabled={appState.segments.length === 0}
      onclick={() => cutVideo()}
    >
      {i18n.t("cutAll")}
    </button>
  </div>
</div>

<!-- Quality Confirmation Modal -->
{#if showQualityModal}
  <dialog class="modal modal-open">
    <div class="modal-box" dir={i18n.lang === "ar" ? "rtl" : "ltr"}>
      <h3 class="font-bold text-lg text-center mb-4">
        {i18n.t("selectQuality")}
      </h3>

      <div
        class="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4 custom-scrollbar"
      >
        {#each Object.entries(qualityLabels) as [value, label]}
          {@const available = isQualityAvailable(value)}
          {#if available || value === "best"}
            <label
              class="label cursor-pointer hover:bg-base-200 rounded-lg px-2 border border-base-200 {appState.youtubeQuality ===
              value
                ? 'bg-base-200 border-primary'
                : ''}"
            >
              <span class="label-text font-medium">{label}</span>
              <input
                type="radio"
                name="quality"
                class="radio radio-primary"
                {value}
                bind:group={appState.youtubeQuality}
              />
            </label>
          {/if}
        {/each}
      </div>

      {#if qualityWarning}
        <div role="alert" class="alert alert-warning text-sm py-2 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            /></svg
          >
          <span>{qualityWarning}</span>
        </div>
      {/if}

      <div class="modal-action">
        <form method="dialog" class="flex gap-2 w-full">
          <button
            class="btn btn-success flex-1"
            type="button"
            onclick={confirmQuality}>{i18n.t("confirm")}</button
          >
          <button
            class="btn btn-ghost flex-1"
            type="button"
            onclick={() => (showQualityModal = false)}
            >{i18n.t("cancel")}</button
          >
        </form>
      </div>
    </div>
    <div
      class="modal-backdrop bg-black/50"
      role="button"
      tabindex="0"
      onclick={() => (showQualityModal = false)}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") showQualityModal = false;
      }}
    ></div>
  </dialog>
{/if}
