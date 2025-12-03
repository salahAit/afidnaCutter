<script>
    let { isOpen = false, title = "", children, onClose } = $props();
</script>

{#if isOpen}
    <div
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 transition-opacity"
    >
        <div
            class="bg-slate-800 p-8 rounded-2xl w-[90%] max-w-[500px] border border-slate-700 shadow-2xl"
        >
            <h3 class="text-2xl font-bold mb-4 text-emerald-500 text-center">
                {title}
            </h3>
            <div class="mb-6 text-slate-300">
                {@render children()}
            </div>
            <button
                class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg"
                onclick={onClose}>إغلاق</button
            >
        </div>
    </div>
{/if}
