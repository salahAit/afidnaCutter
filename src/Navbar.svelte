<script>
  import { appState } from "./lib/state.svelte.js";
</script>

<nav
  class="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 px-8 py-4 flex items-center justify-between z-10"
>
  <div class="flex items-center gap-3">
    <img src="/logo.webp" alt="Logo" class="w-10 h-10 object-contain" />
    <div
      class="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
    >
      قاطع الفيديو الاحترافي
    </div>
  </div>
  <button
    class="text-slate-300 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/5"
    onclick={() => (appState.showAboutModal = true)}
  >
    حول
  </button>
</nav>
