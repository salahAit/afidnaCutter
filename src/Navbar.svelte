<script>
  import { appState } from "./lib/state.svelte.js";
  import { i18n } from "./stores/i18n.svelte.js";
  import logo from "../cutter-logo-64.webp";

  let aboutModal;
  let guideModal;

  function setTheme(theme) {
    document.documentElement.classList.remove("ocean", "midnight", "sunset");
    if (theme !== "light") {
      document.documentElement.classList.add(theme);
    }
    appState.theme = theme;
  }

  function setLanguage(lang) {
    i18n.lang = lang;
  }

  function openAbout() {
    aboutModal?.showModal();
  }

  function openGuide() {
    guideModal?.showModal();
  }

  // Get current language display
  function getCurrentLangDisplay() {
    return i18n.lang === "ar"
      ? { flag: "🇩🇿", name: "العربية" }
      : { flag: "🇺🇸", name: "English" };
  }

  // Get current theme display
  function getCurrentThemeDisplay() {
    const isArabic = i18n.lang === "ar";
    const themes = {
      midnight: { icon: "🌑", name: isArabic ? "منتصف الليل" : "Midnight" },
      ocean: { icon: "🌊", name: isArabic ? "المحيط" : "Ocean" },
      sunset: { icon: "🌅", name: isArabic ? "الغروب" : "Sunset" },
    };
    return themes[appState.theme] || themes.midnight;
  }
</script>

<div
  class="navbar bg-base-100 shadow-md px-4"
  dir={i18n.lang === "ar" ? "rtl" : "ltr"}
>
  <!-- Menu Button (Left) -->
  <div class="flex-none">
    <details class="dropdown dropdown-end">
      <summary tabindex="0" role="button" class="btn btn-ghost btn-circle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      </summary>
      <ul
        tabindex="-1"
        class="menu dropdown-content bg-base-200 rounded-box z-10 mt-3 w-52 p-2 shadow-lg border border-base-300"
      >
        <li>
          <button type="button" onclick={openGuide}>📖 {i18n.t("guide")}</button
          >
        </li>
        <li>
          <button type="button" onclick={openAbout}>ℹ️ {i18n.t("about")}</button
          >
        </li>
        <li>
          <button type="button" class="text-error">🚪 {i18n.t("quit")}</button>
        </li>
      </ul>
    </details>
  </div>

  <!-- App Title (Center) -->
  <div class="flex-1 text-center">
    <div class="btn btn-ghost text-xl normal-case gap-2 font-bold mx-auto">
      <img src={logo} alt="Logo" class="w-8 h-8 rounded-full" />
      {i18n.t("appTitle")}
    </div>
  </div>

  <!-- Right Controls -->
  <div class="flex items-stretch gap-1">
    <!-- Theme Dropdown -->
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-ghost rounded-field gap-1">
        <span class="text-lg">{getCurrentThemeDisplay().icon}</span>
        <span class="hidden sm:inline text-sm"
          >{getCurrentThemeDisplay().name}</span
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      <ul
        tabindex="-1"
        class="menu dropdown-content bg-base-200 rounded-box z-10 mt-3 w-48 p-2 shadow-lg border border-base-300"
      >
        <li>
          <button
            type="button"
            onclick={() => setTheme("midnight")}
            class:font-bold={appState.theme === "midnight"}
            >🌑 {i18n.lang === "ar" ? "منتصف الليل" : "Midnight"}</button
          >
        </li>
        <li>
          <button
            type="button"
            onclick={() => setTheme("ocean")}
            class:font-bold={appState.theme === "ocean"}
            >🌊 {i18n.lang === "ar" ? "المحيط" : "Ocean"}</button
          >
        </li>
        <li>
          <button
            type="button"
            onclick={() => setTheme("sunset")}
            class:font-bold={appState.theme === "sunset"}
            >🌅 {i18n.lang === "ar" ? "الغروب" : "Sunset"}</button
          >
        </li>
      </ul>
    </div>

    <!-- Language Dropdown -->
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-ghost rounded-field gap-1">
        <span class="text-lg">{getCurrentLangDisplay().flag}</span>
        <span class="hidden sm:inline text-sm"
          >{getCurrentLangDisplay().name}</span
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      <ul
        tabindex="-1"
        class="menu dropdown-content bg-base-200 rounded-box z-10 mt-3 w-40 p-2 shadow-lg border border-base-300"
      >
        <li>
          <button
            type="button"
            onclick={() => setLanguage("ar")}
            class:font-bold={i18n.lang === "ar"}>🇩🇿 العربية</button
          >
        </li>
        <li>
          <button
            type="button"
            onclick={() => setLanguage("en")}
            class:font-bold={i18n.lang === "en"}>🇺🇸 English</button
          >
        </li>
      </ul>
    </div>
  </div>
</div>

<!-- About Modal -->
<dialog bind:this={aboutModal} class="modal">
  <div class="modal-box" dir={i18n.lang === "ar" ? "rtl" : "ltr"}>
    <h3 class="font-bold text-lg flex items-center gap-2">
      <img src={logo} alt="Logo" class="w-10 h-10 rounded-full" />
      {i18n.t("appTitle")}
    </h3>
    <p class="py-4">
      {i18n.lang === "ar"
        ? "برنامج احترافي لقص وتحرير مقاطع الفيديو. يدعم الملفات المحلية وروابط يوتيوب."
        : "A professional video cutting and editing application. Supports local files and YouTube links."}
    </p>
    <p class="text-sm opacity-70">
      {i18n.lang === "ar" ? "الإصدار: 1.0.1" : "Version: 1.0.1"}
    </p>
    <div class="modal-action">
      <form method="dialog">
        <button class="btn">{i18n.lang === "ar" ? "إغلاق" : "Close"}</button>
      </form>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>

<!-- Guide Modal -->
<dialog bind:this={guideModal} class="modal">
  <div class="modal-box max-w-2xl" dir={i18n.lang === "ar" ? "rtl" : "ltr"}>
    <h3 class="font-bold text-lg">📖 {i18n.t("guide")}</h3>
    <div class="py-4 space-y-3">
      {#if i18n.lang === "ar"}
        <div class="flex gap-2">
          <span class="text-primary font-bold">1.</span>
          <span>اختر ملف فيديو محلي أو أدخل رابط يوتيوب.</span>
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">2.</span>
          <span>اضغط على الفيديو أو اسحب على شريط الوقت لتحديد مقطع.</span>
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">3.</span>
          <span>استخدم أزرار "بداية" و "نهاية" لتحديد نقاط القص بدقة.</span>
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">4.</span>
          <span>اضغط "قص وتصدير" لحفظ المقاطع المحددة.</span>
        </div>
      {:else}
        <div class="flex gap-2">
          <span class="text-primary font-bold">1.</span>
          <span>Select a local video file or enter a YouTube URL.</span>
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">2.</span>
          <span
            >Click on the video or drag on the timeline to select a segment.</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">3.</span>
          <span
            >Use "Start" and "End" buttons to precisely mark cut points.</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">4.</span>
          <span>Press "Trim & Export" to save the selected segments.</span>
        </div>
      {/if}
    </div>
    <div class="modal-action">
      <form method="dialog">
        <button class="btn">{i18n.lang === "ar" ? "إغلاق" : "Close"}</button>
      </form>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>
