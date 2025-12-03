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

        return () => {
            window.removeEventListener("keydown", handleKeydown);
            window.removeEventListener("cut-complete", handleCutComplete);
        };
    });

    async function openFolder() {
        await window.electron.invoke("open-folder", appState.sessionId);
    }
</script>

<div
    class="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden"
    dir="rtl"
>
    <Navbar />

    <div class="flex flex-1 overflow-hidden flex-col md:flex-row">
        <!-- Main Content -->
        <div class="flex-1 flex flex-col p-4 overflow-y-auto">
            <InputSection />
            <VideoPlayer />
        </div>

        <!-- Sidebar -->
        <Sidebar />
    </div>

    <!-- Timeline -->
    <Timeline />

    <!-- Bottom Controls -->
    <Controls />

    <!-- Success Modal -->
    <Modal
        isOpen={showSuccessModal}
        title="تم بنجاح!"
        onClose={() => (showSuccessModal = false)}
    >
        <p>تم إنشاء المقاطع التالية:</p>
        <ul class="list-none mt-4 space-y-2">
            {#each createdFiles as file}
                <li
                    class="flex justify-between items-center bg-white/5 p-2 rounded"
                >
                    <span class="text-sm truncate max-w-[200px]" title={file}
                        >{file}</span
                    >
                    <button
                        class="text-xs border border-slate-500 px-2 py-1 rounded hover:bg-white/10"
                        onclick={openFolder}>فتح المجلد</button
                    >
                </li>
            {/each}
        </ul>
    </Modal>

    <!-- About Modal -->
    <Modal
        isOpen={appState.showAboutModal}
        title="حول البرنامج"
        onClose={() => (appState.showAboutModal = false)}
    >
        <div class="space-y-4 text-right" dir="rtl">
            <div class="flex flex-col items-center mb-4 gap-2">
                <img
                    src="/logo.webp"
                    alt="Logo"
                    class="w-24 h-24 object-contain"
                />
                <h2 class="text-xl font-bold text-white">منتجات أفدنا كلاود</h2>
            </div>
            <p class="text-slate-300">
                برنامج احترافي لتقطيع الفيديو، يهدف لتسهيل وتسريع عملية
                المونتاج.
            </p>

            <div class="border-t border-slate-700 pt-4">
                <p class="font-bold text-emerald-400 mb-2">المطور:</p>
                <p>صالح أيت أمقران</p>
            </div>

            <div class="border-t border-slate-700 pt-4">
                <p class="font-bold text-blue-400 mb-2">سياق المشروع:</p>
                <p>
                    هذا البرنامج جزء من مشروع <a
                        href="https://afidna.cloud"
                        target="_blank"
                        class="text-blue-400 hover:underline"
                        >أدوات أفدنا كلاود</a
                    >، التابع لمنصة
                    <a
                        href="https://afidna.com"
                        target="_blank"
                        class="text-blue-400 hover:underline"
                        >أفدنا للعلوم الشرعية</a
                    >.
                </p>
            </div>

            <div
                class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mt-2"
            >
                <p class="text-sm text-slate-400">
                    هذه النسخة خاصة بالشيخ <span class="text-white font-bold"
                        >أبو معاذ محمد مرابط</span
                    >، ضمن أدوات العمل في قناته على اليوتيوب لتسهيل وتسريع قطع
                    المقاطع المرئية والصوتية.
                </p>
            </div>

            <div
                class="border-t border-slate-700 pt-4 flex flex-col gap-2 text-sm"
            >
                <a
                    href="https://afidna.cloud"
                    target="_blank"
                    class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <span>🌐 موقع أفدنا كلاود:</span>
                    <span dir="ltr">afidna.cloud</span>
                </a>
                <a
                    href="https://afidna.com"
                    target="_blank"
                    class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <span>🌐 منصة أفدنا للعلوم االشرعية:</span>
                    <span dir="ltr">afidna.com</span>
                </a>
            </div>
        </div>
    </Modal>
</div>
