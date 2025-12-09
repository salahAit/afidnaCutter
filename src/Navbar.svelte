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
  class="navbar bg-base-100 shadow-md px-2 relative z-[1000]"
  dir={i18n.lang === "ar" ? "rtl" : "ltr"}
>
  <!-- Navbar Start -->
  <div class="navbar-start gap-2">
    <!-- Hamburger Menu (Mobile Only - Guide & About) -->
    <div class="dropdown lg:hidden">
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
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
      </div>
      <ul
        tabindex="0"
        class="menu menu-sm dropdown-content bg-base-200 rounded-box z-[100] mt-3 w-52 p-2 shadow-lg border border-base-300"
      >
        <li>
          <button type="button" onclick={openGuide}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            {i18n.t("guide")}
          </button>
        </li>
        <li>
          <button type="button" onclick={openAbout}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            {i18n.t("about")}
          </button>
        </li>
      </ul>
    </div>

    <!-- Desktop Buttons (Guide & About) -->
    <div class="hidden lg:flex gap-1">
      <button
        type="button"
        class="btn btn-ghost btn-sm gap-2"
        onclick={openGuide}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-4 h-4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
        {i18n.t("guide")}
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm gap-2"
        onclick={openAbout}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-4 h-4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        {i18n.t("about")}
      </button>
    </div>

    <!-- Logo (Larger) & Title -->
    <div class="flex items-center gap-2">
      <img src={logo} alt="Logo" class="w-12 h-12 rounded-full" />
      <!-- Small Screens: Short Title -->
      <span class="text-xl font-bold lg:hidden">{i18n.t("appTitleShort")}</span>
      <!-- Large Screens: Long Title -->
      <span class="text-xl font-bold hidden lg:inline"
        >{i18n.t("appTitleLong")}</span
      >
    </div>
  </div>

  <!-- Navbar Center (Hidden mostly to allow space) -->
  <div class="navbar-center hidden lg:flex">
    <!-- Title could go here if centered desired, but left is fine for now -->
  </div>

  <!-- Navbar End (Theme & Language - Always Visible) -->
  <div class="navbar-end gap-1 flex-none">
    <!-- Theme Dropdown -->
    <div class="dropdown dropdown-end">
      <div
        tabindex="0"
        role="button"
        class="btn btn-ghost btn-sm h-8 w-8 px-0 rounded-full sm:rounded-btn sm:h-auto sm:w-auto sm:px-3 gap-2"
      >
        <span class="text-xl">{getCurrentThemeDisplay().icon}</span>
        <span class="hidden sm:inline text-sm"
          >{getCurrentThemeDisplay().name}</span
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3 hidden sm:block"
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
        tabindex="0"
        class="menu dropdown-content bg-base-200 rounded-box z-[100] mt-3 w-48 p-2 shadow-lg border border-base-300"
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
      <div
        tabindex="0"
        role="button"
        class="btn btn-ghost btn-sm h-8 w-8 px-0 rounded-full sm:rounded-btn sm:h-auto sm:w-auto sm:px-3 gap-2"
      >
        <span class="text-xl">{getCurrentLangDisplay().flag}</span>
        <span class="hidden sm:inline text-sm"
          >{getCurrentLangDisplay().name}</span
        >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3 hidden sm:block"
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
        tabindex="0"
        class="menu dropdown-content bg-base-200 rounded-box z-[100] mt-3 w-40 p-2 shadow-lg border border-base-300"
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
      {i18n.t("appTitleLong")}
    </h3>
    <p class="py-4">
      {i18n.lang === "ar"
        ? "برنامج احترافي لقص وتحرير مقاطع الفيديو. يدعم الملفات المحلية وروابط يوتيوب."
        : "A professional video cutting and editing application. Supports local files and YouTube links."}
    </p>
    <p class="text-sm opacity-70">
      {i18n.lang === "ar" ? "الإصدار: 2.0.0" : "Version: 2.0.0"}
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
    <h3 class="font-bold text-lg flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
      {i18n.t("guide")}
    </h3>
    <div class="py-4 space-y-3">
      {#if i18n.lang === "ar"}
        <div class="flex gap-2">
          <span class="text-primary font-bold">1.</span><span
            >اختر ملف فيديو محلي أو أدخل رابط يوتيوب.</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">2.</span><span
            >اضغط على الفيديو أو اسحب على شريط الوقت لتحديد مقطع.</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">3.</span><span
            >استخدم أزرار "بداية" و "نهاية" لتحديد نقاط القص بدقة.</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">4.</span><span
            >اضغط "قص وتصدير" لحفظ المقاطع المحددة.</span
          >
        </div>
      {:else}
        <div class="flex gap-2">
          <span class="text-primary font-bold">1.</span><span
            >Select a local video file or enter a YouTube URL.</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">2.</span><span
            >Click on the video or drag on the timeline to select a segment.</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">3.</span><span
            >Use "Start" and "End" buttons to precisely mark cut points.</span
          >
        </div>
        <div class="flex gap-2">
          <span class="text-primary font-bold">4.</span><span
            >Press "Trim & Export" to save the selected segments.</span
          >
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
