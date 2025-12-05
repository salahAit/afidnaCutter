<script>
  import { appState } from "./lib/state.svelte.js";
  import { onMount } from "svelte";

  const themes = [
    { id: "midnight", name: "شفق منتصف الليل", icon: "🌙", color: "#7c3aed" },
    { id: "ocean", name: "نسيم المحيط", icon: "☀️", color: "#0284c7" },
    { id: "sunset", name: "جمرة الغروب", icon: "🔥", color: "#f97316" },
  ];

  let showThemeMenu = $state(false);

  function setTheme(themeId) {
    // Remove all theme classes
    document.documentElement.classList.remove("midnight", "ocean", "sunset");
    // Add new theme class
    document.documentElement.classList.add(themeId);
    appState.theme = themeId;
    showThemeMenu = false;
    // Save to localStorage
    localStorage.setItem("theme", themeId);
  }

  onMount(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem("theme") || "midnight";
    setTheme(savedTheme);
  });

  function getCurrentTheme() {
    return themes.find((t) => t.id === appState.theme) || themes[0];
  }
</script>

<nav
  class="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 px-6 py-3 flex items-center justify-between z-10"
>
  <div class="flex items-center gap-3">
    <img src="logo.webp" alt="Logo" class="w-9 h-9 object-contain" />
    <div
      class="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"
    >
      قاطع الفيديو الاحترافي
    </div>
  </div>

  <div class="flex items-center gap-2">
    <!-- Theme Selector -->
    <div class="relative">
      <button
        class="flex items-center gap-2 text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
        onclick={() => (showThemeMenu = !showThemeMenu)}
      >
        <span class="text-lg">{getCurrentTheme().icon}</span>
        <span class="text-sm hidden sm:inline">{getCurrentTheme().name}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {#if showThemeMenu}
        <!-- Backdrop -->
        <div
          class="fixed inset-0 z-40"
          onclick={() => (showThemeMenu = false)}
        ></div>

        <!-- Theme Menu -->
        <div
          class="absolute left-0 top-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 min-w-[200px] overflow-hidden"
        >
          <div class="p-2 border-b border-slate-700">
            <span class="text-xs text-slate-400 px-2">اختر الثيم</span>
          </div>
          {#each themes as theme}
            <button
              class="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-white/10 transition-colors {appState.theme ===
              theme.id
                ? 'bg-white/5'
                : ''}"
              onclick={() => setTheme(theme.id)}
            >
              <span
                class="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                style="background-color: {theme.color}20; border: 2px solid {theme.color}"
              >
                {theme.icon}
              </span>
              <div class="flex-1">
                <div class="text-white text-sm font-medium">{theme.name}</div>
                <div class="text-xs text-slate-400">{theme.id}</div>
              </div>
              {#if appState.theme === theme.id}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  class="text-green-400"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <button
      class="text-slate-300 hover:text-white transition-colors font-medium px-3 py-2 rounded-lg hover:bg-white/5"
      onclick={() => (appState.showAboutModal = true)}
    >
      حول
    </button>
  </div>
</nav>
