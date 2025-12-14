<script>
    import { onMount } from "svelte";
    import Navbar from "./Navbar.svelte";
    import Sidebar from "./Sidebar.svelte";
    import InputSection from "./InputSection.svelte";
    import VideoPlayer from "./VideoPlayer.svelte";
    import Timeline from "./Timeline.svelte";
    import Controls from "./Controls.svelte";
    import Modal from "./Modal.svelte";
    import { appState } from "./lib/state.svelte.js";
    import { i18n } from "./stores/i18n.svelte.js";

    let showSuccessModal = $state(false);
    let createdFiles = $state([]);

    onMount(() => {
        // Keyboard Shortcuts
        const handleKeydown = (e) => {
            if (e.target.tagName === "INPUT") return;
            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    // Toggle play logic is in Controls/VideoPlayer but we can trigger it via state or event
                    // Ideally we should expose a toggle function or use a store action.
                    // For now let's just simulate a click on the play button if possible or duplicate logic.
                    // Duplicating logic for simplicity here as it's small.
                    if (appState.mode === "upload") {
                        const video = document.getElementById("main-video");
                        if (video) video.paused ? video.play() : video.pause();
                    }
                    break;
                case "KeyI":
                    appState.currentStart = appState.currentTime;
                    break;
                case "KeyO":
                    if (
                        appState.currentStart !== null &&
                        appState.currentTime > appState.currentStart
                    ) {
                        appState.segments.push({
                            start: appState.currentStart,
                            end: appState.currentTime,
                        });
                        appState.currentStart = null;
                    }
                    break;
                case "ArrowLeft":
                    // Step back
                    // Logic needs to be centralized ideally
                    break;
                case "ArrowRight":
                    // Step fwd
                    break;
            }
        };

        window.addEventListener("keydown", handleKeydown);

        // Listen for cut complete
        const handleCutComplete = (e) => {
            createdFiles = e.detail;
            showSuccessModal = true;
        };
        window.addEventListener("cut-complete", handleCutComplete);

        if (window.electron && window.electron.on) {
            window.electron.on("open-about", () => {
                appState.showAboutModal = true;
            });
        }

        // Prevent Electron from navigating to dropped files (global)
        document.addEventListener("dragover", preventDrag);
        document.addEventListener("drop", preventDrag);

        return () => {
            window.removeEventListener("keydown", handleKeydown);
            window.removeEventListener("cut-complete", handleCutComplete);
            document.removeEventListener("dragover", preventDrag);
            document.removeEventListener("drop", preventDrag);
        };
    });

    // Prevent Electron from navigating to dropped files
    function preventDrag(e) {
        e.preventDefault();
    }

    async function openFolder() {
        await window.electron.invoke("open-folder", appState.sessionId);
    }
</script>

<div
    class="flex flex-col h-screen bg-base-100 text-base-content font-sans overflow-hidden"
    dir="rtl"
>
    <Navbar />

    <div class="flex flex-1 overflow-hidden flex-col md:flex-row">
        <!-- Main Content -->
        <div class="flex-1 flex flex-col p-4 pb-4 overflow-y-auto">
            <InputSection />
            <VideoPlayer />
        </div>

        <!-- Sidebar -->
        <Sidebar />
    </div>

    <!-- Timeline -->
    <Timeline />

    <!-- Controls (Bottom) -->
    <Controls />

    <!-- Success Modal -->
    <Modal
        isOpen={showSuccessModal}
        title={i18n.lang === "ar" ? "تم بنجاح!" : "Success!"}
        onClose={() => (showSuccessModal = false)}
    >
        <p>
            {i18n.lang === "ar"
                ? "تم إنشاء المقاطع التالية:"
                : "The following clips were created:"}
        </p>
        <ul class="list-none mt-4 space-y-2">
            {#each createdFiles as file}
                <li
                    class="flex justify-between items-center bg-base-200 p-2 rounded-box"
                >
                    <span class="text-sm truncate max-w-[200px]" title={file}
                        >{file}</span
                    >
                    <button class="btn btn-xs btn-outline" onclick={openFolder}
                        >{i18n.lang === "ar"
                            ? "فتح المجلد"
                            : "Open Folder"}</button
                    >
                </li>
            {/each}
        </ul>
    </Modal>

    <!-- About Modal -->
    <Modal
        isOpen={appState.showAboutModal}
        title={i18n.lang === "ar" ? "حول البرنامج" : "About"}
        onClose={() => (appState.showAboutModal = false)}
    >
        <div
            class="space-y-4"
            dir={i18n.lang === "ar" ? "rtl" : "ltr"}
            style={i18n.lang === "ar"
                ? "text-align: right;"
                : "text-align: left;"}
        >
            <div class="flex flex-col items-center mb-4 gap-2">
                <img
                    src={i18n.lang === "ar" ? "logo-Ar.webp" : "logo-EN.webp"}
                    alt="Logo"
                    class="w-24 h-24 object-contain"
                />
                <h2 class="text-xl font-bold text-primary">
                    {i18n.lang === "ar"
                        ? "منتجات أفدنا كلاود"
                        : "AFIDNA Cloud Products"}
                </h2>
            </div>
            <p class="text-base-content/80">
                {i18n.lang === "ar"
                    ? "برنامج احترافي لتقطيع الفيديو، يهدف لتسهيل وتسريع عملية المونتاج."
                    : "A professional video cutting application, designed to simplify and speed up the editing process."}
            </p>

            <div class="border-t border-base-300 pt-4">
                <p class="font-bold text-secondary mb-2">
                    {i18n.lang === "ar" ? "المطور:" : "Developer:"}
                </p>
                <p>
                    {i18n.lang === "ar"
                        ? "صالح أيت أمقران"
                        : "Salah AIT AMOKRANE"}
                </p>
            </div>

            <div class="border-t border-base-300 pt-4">
                <p class="font-bold text-accent mb-2">
                    {i18n.lang === "ar" ? "سياق المشروع:" : "Project Context:"}
                </p>
                <p>
                    {#if i18n.lang === "ar"}
                        هذا البرنامج جزء من مشروع <a
                            href="https://afidna.cloud"
                            target="_blank"
                            class="link link-primary">أدوات أفدنا كلاود</a
                        >، التابع لمنصة
                        <a
                            href="https://afidna.com"
                            target="_blank"
                            class="link link-primary">أفدنا للعلوم الشرعية</a
                        >.
                    {:else}
                        This application is part of the <a
                            href="https://afidna.cloud"
                            target="_blank"
                            class="link link-primary">AFIDNA Cloud Tools</a
                        >
                        project, affiliated with
                        <a
                            href="https://afidna.com"
                            target="_blank"
                            class="link link-primary"
                            >AFIDNA for Islamic Sciences</a
                        >.
                    {/if}
                </p>
            </div>

            <div
                class="border-t border-base-300 pt-4 flex flex-col gap-2 text-sm"
            >
                <a
                    href="https://afidna.cloud"
                    target="_blank"
                    class="flex items-center gap-2 text-base-content/60 hover:text-primary transition-colors"
                >
                    <span
                        >🌐 {i18n.lang === "ar"
                            ? "موقع أفدنا كلاود:"
                            : "AFIDNA Cloud:"}</span
                    >
                    <span dir="ltr">afidna.cloud</span>
                </a>
                <a
                    href="https://afidna.com"
                    target="_blank"
                    class="flex items-center gap-2 text-base-content/60 hover:text-primary transition-colors"
                >
                    <span
                        >🌐 {i18n.lang === "ar"
                            ? "منصة أفدنا للعلوم الشرعية:"
                            : "AFIDNA Islamic Sciences:"}</span
                    >
                    <span dir="ltr">afidna.com</span>
                </a>
            </div>

            <div class="border-t border-base-300 pt-4 text-center">
                <p class="text-sm opacity-70">
                    {i18n.lang === "ar" ? "الإصدار:" : "Version:"} 2.0.0
                </p>
            </div>
        </div>
    </Modal>
</div>
