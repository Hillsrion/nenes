<template>
  <div
    class="relative rounded-2xl border border-black/[0.06] shadow-[0_14px_32px_rgba(36,66,219,0.08),0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300"
    :style="{ backgroundColor: backgroundHex }"
  >
    <!-- Punched binder holes on left margin -->
    <div
      class="absolute left-2.5 sm:left-3 top-0 bottom-0 flex flex-col justify-around items-center py-4 pointer-events-none"
      aria-hidden="true"
    >
      <span
        v-for="i in holeCount"
        :key="i"
        class="w-2 h-2 rounded-full bg-[#dce1e8]/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.22)] border border-black/[0.05]"
      />
    </div>

    <!-- Post-it text content -->
    <div class="pl-9 sm:pl-10 pr-6 py-5 sm:py-6">
      <p
        class="text-primary font-sans font-medium text-sm sm:text-base lg:text-[1.05rem] leading-relaxed select-none"
        v-html="renderedContent"
      ></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  content: string;
  stepNumber?: number;
  colorScheme?: "white" | "grey" | "rose" | "cream" | "blush";
}

const props = withDefaults(defineProps<Props>(), {
  stepNumber: 1,
  colorScheme: "white",
});

const holeCount = 10;

const backgroundHex = computed(() => {
  switch (props.colorScheme) {
    case "grey":
      return "#f4f5f8";
    case "rose":
      return "#fef0f3";
    case "cream":
      return "#fcfbf8";
    case "blush":
      return "#fef3f5";
    case "white":
    default:
      return "#ffffff";
  }
});

// Format words in parentheses to italics like in the reference mockup: (légère, moyenne, forte)
const renderedContent = computed(() => {
  if (!props.content) return "";
  return props.content.replace(
    /(\([^)]+\))/g,
    '<span class="italic font-normal opacity-90">$1</span>'
  );
});
</script>
