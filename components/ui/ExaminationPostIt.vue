<template>
  <div
    class="relative rounded-2xl sm:rounded-3xl border border-black/[0.06] shadow-[0_16px_36px_rgba(36,66,219,0.09),0_3px_8px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 min-h-[260px] sm:min-h-[290px] lg:min-h-[310px] flex flex-col justify-between"
    :style="{ backgroundColor: backgroundHex }"
  >
    <!-- Punched binder holes on left margin -->
    <div
      class="absolute left-2.5 sm:left-3.5 top-0 bottom-0 flex flex-col justify-around items-center py-5 pointer-events-none"
      aria-hidden="true"
    >
      <span
        v-for="i in holeCount"
        :key="i"
        class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#dce1e8]/75 shadow-[inset_0_1px_2px_rgba(0,0,0,0.22)] border border-black/[0.05]"
      />
    </div>

    <!-- Post-it text content -->
    <div class="pl-10 sm:pl-12 lg:pl-14 pr-7 sm:pr-8 py-7 sm:py-9 my-auto">
      <p
        class="text-primary font-sans font-medium text-base sm:text-lg lg:text-[1.12rem] leading-relaxed sm:leading-loose select-none"
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

const holeCount = 13;

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
