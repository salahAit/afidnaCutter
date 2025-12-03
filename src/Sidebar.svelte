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

  async function cutVideo() {
    if (!appState.sessionId || appState.segments.length === 0) return;

    const btn = document.getElementById("btn-cut");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "جاري القص...";
    }

    try {
      const response = await window.electron.invoke("cut-video", {
        filename: appState.videoFilename,
        session_id: appState.sessionId,
        segments: $state.snapshot(appState.segments), // Use snapshot to get plain object
      });

      // Show success modal (handled in App.svelte or via a store)
      // For now let's just alert or dispatch an event
      const event = new CustomEvent("cut-complete", {
        detail: response.output_files,
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error(error);
      alert("فشل عملية القص");
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
