<script>
    import { onMount } from "svelte";
    import {
        appState,
        formatTime,
        addSegment,
        sortSegments,
    } from "./lib/state.svelte.js";

    let canvas;
    let isDragging = false;
    let dragStartTime = 0;

    // Resizing State
    let resizingSegmentIndex = -1;
    let resizingEdge = null; // 'start' or 'end'
    const EDGE_THRESHOLD_PX = 5;

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

        // Calculate Lanes for Overlap
        const lanes = [];
        const sortedSegments = appState.segments
            .map((s, i) => ({ ...s, originalIndex: i }))
            .sort((a, b) => a.start - b.start);

        sortedSegments.forEach((seg) => {
            let laneIndex = -1;
            for (let i = 0; i < lanes.length; i++) {
                if (seg.start >= lanes[i] + 0.5) {
                    // Add small buffer
                    laneIndex = i;
                    break;
                }
            }
            if (laneIndex === -1) {
                laneIndex = lanes.length;
                lanes.push(seg.end);
            } else {
                lanes[laneIndex] = seg.end;
            }
            seg.lane = laneIndex;
        });

        // Draw Segments
        const laneHeight = 12;
        const laneSpacing = 4;
        const totalLanesHeight =
            lanes.length * (laneHeight + laneSpacing) - laneSpacing;
        const startYBase = (height - totalLanesHeight) / 2;

        sortedSegments.forEach((seg) => {
            const startX = (seg.start / appState.duration) * width;
            const endX = (seg.end / appState.duration) * width;
            const segWidth = Math.max(endX - startX, 2);
            const segY = startYBase + seg.lane * (laneHeight + laneSpacing);

            ctx.fillStyle = "#10b981"; // Success color
            ctx.fillRect(startX, segY, segWidth, laneHeight);

            // Draw borders for better visibility
            ctx.strokeStyle = "#065f46";
            ctx.lineWidth = 1;
            ctx.strokeRect(startX, segY, segWidth, laneHeight);
        });

        // Draw Current Start Marker (Manual Mode)
        if (appState.currentStart !== null) {
            const startX = (appState.currentStart / appState.duration) * width;
            const currentX = (appState.currentTime / appState.duration) * width;
            drawHighlight(
                ctx,
                startX,
                currentX,
                height,
                "rgba(245, 158, 11, 0.3)",
                "#f59e0b",
                "البداية",
            );
        }

        // Draw Drag Selection (Drag Mode)
        if (
            isDragging &&
            Math.abs(appState.currentTime - dragStartTime) > 0.5
        ) {
            const startX = (dragStartTime / appState.duration) * width;
            const currentX = (appState.currentTime / appState.duration) * width;
            drawHighlight(
                ctx,
                startX,
                currentX,
                height,
                "rgba(59, 130, 246, 0.3)",
                "#3b82f6",
                "",
            );
        }

        function drawHighlight(
            ctx,
            startX,
            endX,
            height,
            fillColor,
            lineColor,
            label,
        ) {
            let hStart = startX;
            let hWidth = endX - startX;

            if (hWidth < 0) {
                hStart = endX;
                hWidth = startX - endX;
            }

            ctx.fillStyle = fillColor;
            ctx.fillRect(hStart, height / 2 - 4, hWidth, 8);

            // Marker Line at Start
            ctx.fillStyle = lineColor;
            ctx.fillRect(startX - 1, 0, 2, height);

            if (label) {
                ctx.font = "10px Cairo";
                ctx.fillStyle = lineColor;
                ctx.fillText(label, startX + 4, 12);
            }
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

        // Draw Hover Line
        if (appState.isHoveringTimeline && appState.hoverTime !== null) {
            const hoverX = (appState.hoverTime / appState.duration) * width;
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.fillRect(hoverX - 0.5, 0, 1, height);

            // Draw Time Badge
            const timeText = formatTime(appState.hoverTime);
            ctx.font = "10px monospace";
            const textMetrics = ctx.measureText(timeText);
            const textWidth = textMetrics.width;
            const padding = 4;
            const badgeWidth = textWidth + padding * 2;
            const badgeHeight = 16;

            let badgeX = hoverX - badgeWidth / 2;
            // Clamp to canvas edges
            if (badgeX < 0) badgeX = 0;
            if (badgeX + badgeWidth > width) badgeX = width - badgeWidth;

            const badgeY = 0; // Top of canvas

            // Badge Background
            ctx.fillStyle = "#0f172a"; // slate-900
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
            ctx.fill();
            ctx.strokeStyle = "#334155"; // slate-700
            ctx.stroke();

            // Badge Text
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#e2e8f0"; // slate-200
            ctx.fillText(
                timeText,
                badgeX + badgeWidth / 2,
                badgeY + badgeHeight / 2 + 1,
            );

            // Reset text align for other draws if necessary (though we redraw everything)
            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";
        }
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
        appState.currentTime;
        appState.segments.length; // Track length for reactivity
        appState.currentStart;
        appState.hoverTime; // Redraw on hover change

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

    function getHoveredEdge(time) {
        const width = canvas.width;
        const pxPerSec = width / appState.duration;
        const thresholdSec = EDGE_THRESHOLD_PX / pxPerSec;

        for (let i = 0; i < appState.segments.length; i++) {
            const seg = appState.segments[i];
            if (Math.abs(time - seg.start) < thresholdSec)
                return { index: i, edge: "start" };
            if (Math.abs(time - seg.end) < thresholdSec)
                return { index: i, edge: "end" };
        }
        return null;
    }

    function handleMouseDown(e) {
        if (appState.duration <= 0) return;

        const time = getTimeFromEvent(e);

        // Check for resize first
        const hover = getHoveredEdge(time);
        if (hover) {
            resizingSegmentIndex = hover.index;
            resizingEdge = hover.edge;
            isDragging = true; // Use same flag or separate? Let's reuse but distinguish via resizingSegmentIndex
            appState.isDragging = true;
            return;
        }

        dragStartTime = time;
        isDragging = true;
        appState.isDragging = true;

        // Always seek on click
        seekVideo(time);
        appState.currentTime = time;
    }

    function handleMouseMove(e) {
        if (appState.duration <= 0) return;
        const time = getTimeFromEvent(e);

        // Hover effect
        if (!isDragging) {
            appState.hoverTime = time;
            appState.isHoveringTimeline = true;
            const hover = getHoveredEdge(time);
            canvas.style.cursor = hover ? "ew-resize" : "pointer";
            return;
        }

        if (resizingSegmentIndex !== -1) {
            // Handle Resizing
            const seg = appState.segments[resizingSegmentIndex];
            if (resizingEdge === "start") {
                // Constrain: 0 <= start < end
                const newStart = Math.max(0, Math.min(time, seg.end - 0.1));
                seg.start = newStart;
            } else {
                // Constrain: start < end <= duration
                const newEnd = Math.min(
                    appState.duration,
                    Math.max(time, seg.start + 0.1),
                );
                seg.end = newEnd;
            }
            // Real-time seek to show frame
            seekVideo(time);
            appState.currentTime = time;
            return;
        }

        // Handle Selection Drag
        if (isDragging) {
            seekVideo(time);
            appState.currentTime = time;
        }
    }

    function handleMouseUp(e) {
        if (!isDragging) return;

        if (resizingSegmentIndex !== -1) {
            // Finish Resizing
            resizingSegmentIndex = -1;
            resizingEdge = null;
            isDragging = false;
            appState.isDragging = false;
            // Sort after resize to keep order
            // Import sortSegments if needed or trigger it via state
            // We need to import sortSegments in script
            return;
        }

        isDragging = false;
        appState.isDragging = false;

        if (appState.duration <= 0) return;

        const time = getTimeFromEvent(e);

        // If dragged significantly, create a segment
        if (Math.abs(time - dragStartTime) > 0.5) {
            finishSelection(time, dragStartTime);
        }
    }

    function finishSelection(endTime, startTime = appState.currentStart) {
        if (startTime === null) return;

        let start = startTime;
        let end = endTime;

        if (end < start) {
            [start, end] = [end, start];
        }

        addSegment(start, end);
        appState.currentStart = null; // Reset manual start if it was set
    }

    function handleMouseLeave() {
        appState.isHoveringTimeline = false;
        appState.hoverTime = null;

        if (isDragging && resizingSegmentIndex !== -1) {
            // Commit resize on leave? Or just stop dragging?
            // For now just stop
            resizingSegmentIndex = -1;
            resizingEdge = null;
            isDragging = false;
            appState.isDragging = false;
            sortSegments();
        }
    }
</script>

<div class="bg-slate-800 border-t border-slate-700 px-4 py-3 mt-3">
    <!-- Time Display -->
    <div
        class="flex justify-between items-center mb-2 font-mono text-sm"
        dir="ltr"
    >
        <div class="relative group">
            <input
                type="text"
                value={formatTime(appState.currentTime)}
                onkeydown={(e) => {
                    if (e.key === "Enter") {
                        e.target.blur();
                    }
                }}
                onblur={(e) => {
                    const parts = e.target.value.split(/[:.]/);
                    let seconds = 0;
                    if (parts.length === 3) {
                        seconds =
                            parseInt(parts[0]) * 60 +
                            parseInt(parts[1]) +
                            parseFloat("0." + parts[2]);
                    } else if (parts.length === 2) {
                        seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                    }
                    if (
                        !isNaN(seconds) &&
                        seconds >= 0 &&
                        seconds <= appState.duration
                    ) {
                        if (appState.mode === "upload") {
                            const video = document.getElementById("main-video");
                            if (video) video.currentTime = seconds;
                        } else if (
                            appState.mode === "youtube" &&
                            appState.youtubePlayer
                        ) {
                            appState.youtubePlayer.seekTo(seconds, true);
                        }
                        appState.currentTime = seconds;
                    }
                    e.target.value = formatTime(appState.currentTime);
                }}
                class="bg-slate-700/50 text-blue-400 w-24 text-center px-2 py-1 rounded border border-slate-600 hover:border-blue-400 focus:border-blue-500 outline-none transition-all cursor-text"
            />
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="absolute left-1 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            >
                <path
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                ></path>
                <path
                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                ></path>
            </svg>
        </div>
        <span class="text-slate-400">{formatTime(appState.duration)}</span>
    </div>

    <!-- Timeline Canvas -->
    <canvas
        bind:this={canvas}
        class="w-full h-10 cursor-pointer"
        onmousedown={handleMouseDown}
        onmousemove={handleMouseMove}
        onmouseup={handleMouseUp}
        onmouseleave={handleMouseLeave}
    ></canvas>
</div>
