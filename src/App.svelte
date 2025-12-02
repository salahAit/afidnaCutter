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
                    } else if (
                        appState.mode === "youtube" &&
                        appState.youtubePlayer
                    ) {
                        const state = appState.youtubePlayer.getPlayerState();
                        state === 1
                            ? appState.youtubePlayer.pauseVideo()
                            : appState.youtubePlayer.playVideo();
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

    <div class="flex flex-1 overflow-hidden">
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
</div>
