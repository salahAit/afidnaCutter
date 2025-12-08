<script>
  import { appState } from "./lib/state.svelte.js";
  import { i18n } from "./stores/i18n.svelte.js";
  import logo from "../cutter-logo-64.webp";

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
</script>

<div
  class="navbar bg-base-100 shadow-md px-4"
  dir={i18n.lang === "ar" ? "rtl" : "ltr"}
>
  <div class="flex-none">
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
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
      </div>
      <ul
        tabindex="0"
        class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
      >
        <li><a>{i18n.t("settings")}</a></li>
        <li>
          <details>
            <summary>{i18n.t("theme")}</summary>
            <ul>
              <li><a onclick={() => setTheme("midnight")}>Midnight</a></li>
              <li><a onclick={() => setTheme("ocean")}>Ocean</a></li>
              <li><a onclick={() => setTheme("sunset")}>Sunset</a></li>
            </ul>
          </details>
        </li>
        <li>
          <details>
            <summary>{i18n.t("language")}</summary>
            <ul>
              <li><a onclick={() => setLanguage("ar")}>العربية</a></li>
              <li><a onclick={() => setLanguage("en")}>English</a></li>
            </ul>
          </details>
        </li>
        <li><a>{i18n.t("about")}</a></li>
        <li><a class="text-error">{i18n.t("quit")}</a></li>
      </ul>
    </div>
  </div>
  <div class="flex-1 text-center">
    <a class="btn btn-ghost text-xl normal-case gap-2 font-bold mx-auto">
      <img src={logo} alt="Logo" class="w-8 h-8 rounded-full" />
      {i18n.t("appTitle")}
    </a>
  </div>
  <div class="flex-none gap-2">
    <!-- Theme Controller (Sun/Moon) -->
    <label class="swap swap-rotate btn btn-ghost btn-circle">
      <input
        type="checkbox"
        onchange={(e) => setTheme(e.target.checked ? "sunset" : "midnight")}
        checked={appState.theme === "sunset"}
      />
      <svg
        class="swap-on fill-current w-6 h-6"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        ><path
          d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,5.64,7.05Zm13.52,13.37A1,1,0,1,1,17.75,19,1,1,0,0,1,19.16,20.42Zm-1.41-1.37a1,1,0,0,0,0-1.41l-.71-.71a1,1,0,0,0-1.41,1.41l.71.71A1,1,0,0,0,17.75,19.05ZM21,11a1,1,0,0,0-1,1h1a1,1,0,0,0,0-2h-1A1,1,0,0,0,21,11Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,6.64A1,1,0,0,0,17,4.79,9,9,0,0,1,18.36,6.64Z"
        /></svg
      >
      <svg
        class="swap-off fill-current w-6 h-6"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        ><path
          d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Z"
        /></svg
      >
    </label>
  </div>
</div>
