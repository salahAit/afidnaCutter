<script>
  import { appState, formatTime } from './lib/state.svelte.js';

  function playSegment(index) {
    const seg = appState.segments[index];
    if (appState.mode === 'upload') {
      const video = document.getElementById('main-video');
      if (video) {
        video.currentTime = seg.start;
        video.play();
      }
    } else if (appState.mode === 'youtube' && appState.youtubePlayer) {
      appState.youtubePlayer.seekTo(seg.start, true);
      appState.youtubePlayer.playVideo();
    }
  }

  function deleteSegment(index) {
    appState.segments.splice(index, 1);
  }

  async function cutVideo() {
    if (!appState.sessionId || appState.segments.length === 0) return;

    const btn = document.getElementById('btn-cut');
    if (btn) {
        btn.disabled = true;
        btn.textContent = "جاري القص...";
    }

    try {
        const response = await window.electron.invoke('cut-video', {
            filename: appState.videoFilename,
            session_id: appState.sessionId,
            segments: $state.snapshot(appState.segments) // Use snapshot to get plain object
        });

        // Show success modal (handled in App.svelte or via a store)
        // For now let's just alert or dispatch an event
        const event = new CustomEvent('cut-complete', { detail: response.output_files });
        window.dispatchEvent(event);

    } catch (error) {
        console.error(error);
        alert('فشل عملية القص');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "قص وتصدير";
        }
    }
  }
</script>

<div class="w-[350px] bg-slate-800 border-l border-slate-700 flex flex-col">
  <div class="p-4 border-b border-slate-700 font-bold flex justify-between items-center text-slate-100">
    <span>المقاطع</span>
    <span class="bg-slate-900 px-2 py-1 rounded-full text-xs">{appState.segments.length}</span>
  </div>
  
  <div class="flex-1 overflow-y-auto p-4 space-y-2">
    {#each appState.segments as seg, index}
      <div class="bg-white/5 border border-slate-700 rounded-lg p-3 flex justify-between items-center">
        <div class="text-sm text-slate-200">
          {formatTime(seg.start)} - {formatTime(seg.end)}
        </div>
        <div class="flex gap-2">
          <button class="px-2 py-1 text-xs border border-slate-600 rounded text-slate-200 hover:bg-white/5" onclick={() => playSegment(index)}>تشغيل</button>
          <button class="px-2 py-1 text-xs bg-red-500/80 text-white rounded hover:bg-red-600" onclick={() => deleteSegment(index)}>حذف</button>
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
