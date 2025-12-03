<script>
  import { appState } from "./lib/state.svelte.js";

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
      appState.mode = "upload"; // Ensure mode is set to upload

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
  <div>
    <button
      class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
      onclick={handleFileSelect}>اختر ملف فيديو</button
    >
  </div>

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
