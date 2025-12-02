<script>
    import { onMount } from "svelte";
    import { appState, formatTime } from "./lib/state.svelte.js";

    let canvas;
    let isDragging = false;

    function drawTimeline() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Background Track
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, height / 2 - 4, width, 8);

        if (appState.duration <= 0) return;

        // Draw Segments
        appState.segments.forEach((seg) => {
            const startX = (seg.start / appState.duration) * width;
            const endX = (seg.end / appState.duration) * width;
            const segWidth = Math.max(endX - startX, 2);

            ctx.fillStyle = "#10b981"; // Success color
            ctx.fillRect(startX, height / 2 - 4, segWidth, 8);
        });

        // Draw Current Start Marker
        if (appState.currentStart !== null) {
            const startX = (appState.currentStart / appState.duration) * width;

            // Highlight from start to current cursor (preview)
            const currentX = (appState.currentTime / appState.duration) * width;

            // Determine range to highlight
            let hStart = startX;
            let hWidth = currentX - startX;

            if (hWidth < 0) {
                hStart = currentX;
                hWidth = startX - currentX;
            }

            ctx.fillStyle = "rgba(245, 158, 11, 0.3)"; // Warning with opacity
            ctx.fillRect(hStart, height / 2 - 4, hWidth, 8);

            // Marker Line
            ctx.fillStyle = "#f59e0b"; // Warning color
            ctx.fillRect(startX - 1, 0, 2, height);

            // Label
            ctx.font = "10px Cairo";
            ctx.fillStyle = "#f59e0b";
            ctx.fillText("البداية", startX + 4, 12);
        }

        // Draw Playhead
        const playheadX = (appState.currentTime / appState.duration) * width;
        ctx.fillStyle = "#3b82f6"; // Primary color
        ctx.fillRect(playheadX - 1, 0, 2, height);

        // Playhead Knob
        ctx.beginPath();
        ctx.arc(playheadX, height / 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
    }

    function resizeCanvas() {
        if (canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            drawTimeline();
        }
    }

    onMount(() => {
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();
        return () => window.removeEventListener("resize", resizeCanvas);
    });

    // React to state changes to redraw
    $effect(() => {
        // Dependency tracking
        appState.duration;
        appState.currentTime;
        appState.segments.length; // Track length for reactivity
        appState.currentStart;

        requestAnimationFrame(drawTimeline);
    });

    function getTimeFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        return percentage * appState.duration;
    }

    function seekVideo(time) {
        if (appState.mode === "upload") {
            const video = document.getElementById("main-video");
            if (video) video.currentTime = time;
        } else if (appState.mode === "youtube" && appState.youtubePlayer) {
            appState.youtubePlayer.seekTo(time, true);
        }
    }

    function handleMouseDown(e) {
        if (appState.duration <= 0) return;

        const time = getTimeFromEvent(e);

        if (appState.currentStart !== null && !isDragging) {
            finishSelection(time);
            return;
        }

        appState.currentStart = time;
        isDragging = true;
        appState.isDragging = true; // Global state if needed

        seekVideo(time);
        appState.currentTime = time;
    }

    function handleMouseMove(e) {
        if (appState.duration <= 0) return;

        if (isDragging || appState.currentStart !== null) {
            const time = getTimeFromEvent(e);
            seekVideo(time);
            appState.currentTime = time;
        }
    }

    function handleMouseUp(e) {
        if (!isDragging) return;
        isDragging = false;
        appState.isDragging = false;

        if (appState.duration <= 0) return;

        const time = getTimeFromEvent(e);

        if (Math.abs(time - appState.currentStart) > 0.5) {
            finishSelection(time);
        }
    }

    function finishSelection(endTime) {
        let start = appState.currentStart;
        let end = endTime;

        if (end < start) {
            [start, end] = [end, start];
        }

        appState.segments.push({ start, end });
        appState.currentStart = null;
    }
</script>

<div
    class="bg-slate-800 border-t border-slate-700 p-4 h-[80px] flex items-center justify-center"
>
    <canvas
        bind:this={canvas}
        class="w-full h-full cursor-pointer"
        onmousedown={handleMouseDown}
        onmousemove={handleMouseMove}
        onmouseup={handleMouseUp}
    ></canvas>
</div>
