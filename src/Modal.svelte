<script>
    let { isOpen = false, title = "", children, onClose } = $props();
</script>

{#if isOpen}
    <div
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity"
        role="dialog"
        aria-modal="true"
    >
        <div
            class="bg-base-100 p-8 rounded-2xl w-[90%] max-w-[500px] border border-base-300 shadow-2xl"
            role="document"
        >
            <h3 class="text-2xl font-bold mb-4 text-primary text-center">
                {title}
            </h3>
            <div class="mb-6 text-base-content/80">
                {@render children()}
            </div>
            <button class="btn btn-primary w-full" onclick={onClose}
                >إغلاق</button
            >
        </div>
    </div>
{/if}
