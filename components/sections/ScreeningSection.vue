<template>
  <div ref="trackRef" class="relative lg:h-[470svh]">
    <section
      ref="sectionRef"
      class="relative z-30 overflow-hidden rounded-t-4xl bg-white text-primary lg:sticky lg:top-0 lg:z-auto lg:h-[100svh]"
    >
      <div
        ref="backgroundRef"
        aria-hidden="true"
        class="absolute inset-0 z-0 bg-primary opacity-100"
      />

      <div
        class="relative z-10 mx-auto min-h-[100svh] max-w-[1366px] px-5 py-24 sm:px-10 lg:h-full lg:px-12 lg:py-0"
      >
        <div class="relative z-20 max-w-[50rem] lg:pt-[17vh]">
          <p
            ref="titleRef"
            class="text-3xl font-medium leading-title text-white sm:text-4xl lg:text-5xl"
          >
            {{ title }}
          </p>
        </div>

        <!-- The mono-view model replaces the former desktop sidebar. On desktop
             it lives inside the shared journey stage instead (see app.vue). -->
        <div
          ref="modelRef"
          class="relative z-10 mx-auto mt-10 h-[48svh] w-full max-w-[34rem] lg:hidden"
        >
          <ThreeBustViewer
            :model-url="monoviewModelUrl"
            material-style="glass"
            :auto-rotate="true"
            :interactive="false"
            :compact="true"
            :model-scale="2.2"
            :show-backdrop="false"
            :show-loading-indicator="false"
          />
        </div>

        <!-- Desktop editorial layer: the former sidebar content becomes moving paper. -->
        <div
          class="pointer-events-none absolute inset-0 z-30 hidden lg:block"
          aria-hidden="true"
        >
          <figure
            ref="screeningPolaroidRef"
            class="polaroid polaroid--screening"
          >
            <img
              src="/images/screening/screening-01_regular.webp"
              alt=""
              width="312"
              height="468"
            />
            <figcaption>dépistage</figcaption>
          </figure>

          <article
            ref="screeningNoteRef"
            class="paper-note paper-note--screening"
          >
            <p>{{ sidebarElements[0]?.content }}</p>
          </article>

          <figure
            ref="selfExamPolaroidRef"
            class="polaroid polaroid--self-exam"
          >
            <img
              src="/images/screening/screening-02_regular.webp"
              alt=""
              width="312"
              height="468"
            />
            <figcaption>autopalpation</figcaption>
          </figure>

          <article
            ref="selfExamNoteRef"
            class="paper-note paper-note--self-exam"
          >
            <p>{{ sidebarElements[1]?.content }}</p>
          </article>
        </div>

        <!-- Keep the information available and calm on touch layouts. -->
        <div class="relative z-20 mt-12 grid gap-10 lg:hidden">
          <article
            v-for="element in sidebarElements"
            :key="element.title"
            class="rounded-[1.5rem] bg-white p-5 text-primary shadow-[0_16px_35px_rgba(42,82,194,0.12)] ring-1 ring-primary/10"
          >
            <img
              :src="element.image.replace('.jpg', '_regular.webp')"
              :alt="element.title"
              width="312"
              height="468"
              class="mb-5 aspect-[2/3] w-full rounded-[1rem] object-cover"
              loading="lazy"
            />
            <h3 class="text-sm uppercase tracking-title-sm">
              {{ element.title }}
            </h3>
            <p class="mt-3 text-base leading-7">{{ element.content }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import { useScreeningWarmup } from "~/composables/screening/useScreeningWarmup";
import { useAnimationsStore } from "~/stores";

interface SidebarElement {
  title: string;
  content: string;
  image: string;
}

interface Props {
  sidebarElements: SidebarElement[];
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  sidebarElements: () => [],
  title: "",
});

const store = useAnimationsStore();
const { monoviewFileName, getModelUrl } = useDemoBustModelUrls();
const monoviewModelUrl = computed(() => getModelUrl(monoviewFileName));

const trackRef = ref<HTMLElement | null>(null);
const sectionRef = ref<HTMLElement | null>(null);
const backgroundRef = ref<HTMLElement | null>(null);
const titleRef = ref<HTMLElement | null>(null);
const modelRef = ref<HTMLElement | null>(null);
const screeningPolaroidRef = ref<HTMLElement | null>(null);
const screeningNoteRef = ref<HTMLElement | null>(null);
const selfExamPolaroidRef = ref<HTMLElement | null>(null);
const selfExamNoteRef = ref<HTMLElement | null>(null);

let scrollTimeline: gsap.core.Timeline | null = null;
let scrollTrigger: ScrollTrigger | null = null;
let mediaQuery: gsap.MatchMedia | null = null;
let hasInitializedScrollSequence = false;
let titleSplit: SplitType | null = null;

const { setupScreeningPreloadObserver, cleanupWarmupObserver } =
  useScreeningWarmup({
    sectionRef,
    modelUrl: monoviewModelUrl,
    imageUrls: props.sidebarElements.map((element) =>
      element.image.replace(".jpg", "_regular.webp")
    ),
  });

useHead(() => ({
  link: [
    {
      rel: "preload",
      href: monoviewModelUrl.value,
      as: "fetch",
      crossorigin: "anonymous",
    },
  ],
}));

const initializeScrollSequence = () => {
  const section = sectionRef.value;
  const background = backgroundRef.value;
  const track = trackRef.value;
  const title = titleRef.value;
  const model = modelRef.value;
  const screeningPolaroid = screeningPolaroidRef.value;
  const screeningNote = screeningNoteRef.value;
  const selfExamPolaroid = selfExamPolaroidRef.value;
  const selfExamNote = selfExamNoteRef.value;

  if (
    !section ||
    !background ||
    !track ||
    !title ||
    !model ||
    !screeningPolaroid ||
    !screeningNote ||
    !selfExamPolaroid ||
    !selfExamNote
  ) {
    return;
  }

  const paper = [
    screeningPolaroid,
    screeningNote,
    selfExamPolaroid,
    selfExamNote,
  ];
  const notes = [screeningNote, selfExamNote];
  const polaroids = [screeningPolaroid, selfExamPolaroid];
  const blue = "#335ede";

  titleSplit?.revert();
  titleSplit = new SplitType(title, {
    types: "words",
    wordClass: "screening-word",
    tagName: "span",
  });
  const titleWords = titleSplit.words ?? [];

  gsap.set(model, { autoAlpha: 0, y: 0, scale: 1 });
  gsap.set(paper, { autoAlpha: 0, y: "110vh" });
  gsap.set(titleWords, { opacity: 0.14 });
  // Each sheet enters a little looser than its final resting angle. The two
  // stacks intentionally do not mirror each other, as in frame V2-44.
  gsap.set(screeningPolaroid, { rotation: -14, transformOrigin: "50% 70%" });
  gsap.set(screeningNote, { rotation: 8, transformOrigin: "50% 70%" });
  gsap.set(selfExamPolaroid, { rotation: 16, transformOrigin: "50% 70%" });
  gsap.set(selfExamNote, { rotation: -13, transformOrigin: "50% 70%" });

  gsap.set(background, { opacity: 1 });
  gsap.set(title, { color: "white" });

  scrollTimeline = gsap.timeline({ defaults: { ease: "power2.inOut" } });

  // Keep the full blue background while the bust fades in. Only once it is
  // fully present do we fade that single blue layer away to stable white.
  // The 3D canvas never participates in the background transition.
  scrollTimeline
    .to(background, { opacity: 0, duration: 0.2, ease: "none" }, 0.38)
    .to(title, { color: blue, duration: 0.18, ease: "none" }, 0.4);

  scrollTimeline
    .to(
      titleWords,
      {
        opacity: 1,
        duration: 0.12,
        stagger: { amount: 0.2, from: "start" },
        ease: "power1.out",
      },
      0.04
    )
    .to(model, { autoAlpha: 1, duration: 0.2 }, 0.14)
    .to(
      screeningPolaroid,
      { autoAlpha: 1, y: 0, rotation: -6, duration: 0.22 },
      0.64
    )
    .to(
      screeningNote,
      { autoAlpha: 1, y: 0, rotation: 1.5, duration: 0.2 },
      0.7
    )
    .to(
      selfExamPolaroid,
      { autoAlpha: 1, y: 0, rotation: 7, duration: 0.22 },
      0.78
    )
    .to(selfExamNote, { autoAlpha: 1, y: 0, rotation: -4, duration: 0.2 }, 0.84)
    // The loose notes leave first, then their Polaroids, the main copy, and finally the bust.
    .to(notes, { autoAlpha: 0, y: "-24vh", duration: 0.16 }, 1.16)
    .to(polaroids, { autoAlpha: 0, y: "-18vh", duration: 0.14 }, 1.22)
    .to(title, { autoAlpha: 0, y: "-10vh", duration: 0.16 }, 1.31)
    .to(model, { autoAlpha: 0, duration: 0.17 }, 1.43);

  scrollTrigger = ScrollTrigger.create({
    trigger: track,
    start: "top top",
    end: "bottom bottom",
    scrub: 0.6,
    invalidateOnRefresh: true,
    animation: scrollTimeline,
    onUpdate: (self) => {
      // The navigation mark must stay visible on the white phase.
      store.updateLogoColor(self.progress > 0.08);
    },
  });
};

const initializeScrollSequenceAfterLoading = () => {
  if (hasInitializedScrollSequence) return;
  hasInitializedScrollSequence = true;

  mediaQuery = gsap.matchMedia();
  mediaQuery.add("(min-width: 1024px)", () => {
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          initializeScrollSequence();
          ScrollTrigger.refresh();
        });
      });
    });
  });
};

watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (loadingState === "isComplete") {
      initializeScrollSequenceAfterLoading();
    }
  },
  { immediate: true }
);

onMounted(() => {
  setupScreeningPreloadObserver();

  if (store.getSectionState("loading") === "isComplete") {
    initializeScrollSequenceAfterLoading();
  }
});

onUnmounted(() => {
  mediaQuery?.revert();
  scrollTrigger?.kill();
  scrollTimeline?.kill();
  titleSplit?.revert();
  cleanupWarmupObserver();
});
</script>

<style scoped>
.polaroid,
.paper-note {
  position: absolute;
  background: #fff;
  box-shadow: 0 18px 36px rgb(42 82 194 / 16%);
}

.polaroid {
  width: clamp(10rem, 15vw, 13.5rem);
  padding: 0.7rem 0.7rem 2.1rem;
}

.polaroid img {
  display: block;
  aspect-ratio: 0.78;
  width: 100%;
  object-fit: cover;
}

.polaroid figcaption {
  bottom: 0.45rem;
  color: var(--color-primary);
  font-family: "Dawning of a New Day", cursive;
  font-size: clamp(1.15rem, 1.8vw, 1.6rem);
  left: 50%;
  line-height: 1;
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

.paper-note {
  background: #f7f7f7;
  color: var(--color-primary);
  font-size: clamp(0.85rem, 1.25vw, 1.1rem);
  line-height: 1.45;
  padding: clamp(1.3rem, 2vw, 2rem);
  width: clamp(12rem, 18vw, 17rem);
}

.paper-note p {
  margin: 0;
}

.polaroid--screening {
  left: 25%;
  top: 18%;
}

.paper-note--screening {
  --hole-radius: clamp(0.3rem, 0.43vw, 0.42rem);

  /* A mask cuts actual holes out of the sheet, so the photograph/model below
     remains visible through every perforation. */
  -webkit-mask-image: radial-gradient(
    circle at 1.4rem 1.05rem,
    transparent 0 var(--hole-radius),
    #000 calc(var(--hole-radius) + 1px)
  );
  -webkit-mask-position: 0 0;
  -webkit-mask-repeat: repeat-y;
  -webkit-mask-size: 100% 2.25rem;
  filter: drop-shadow(0 18px 22px rgb(42 82 194 / 16%));
  left: 38%;
  mask-image: radial-gradient(
    circle at 1.4rem 1.05rem,
    transparent 0 var(--hole-radius),
    #000 calc(var(--hole-radius) + 1px)
  );
  mask-position: 0 0;
  mask-repeat: repeat-y;
  mask-size: 100% 2.25rem;
  padding-left: clamp(3rem, 3.6vw, 3.35rem);
  top: 35%;
  width: clamp(13rem, 19vw, 18rem);
}

.polaroid--self-exam {
  /* Bring the two paper stacks just into one another, as in V2-44. */
  right: 30%;
  top: 19%;
}

.paper-note--self-exam {
  /* The second note is a separate torn sheet, not the perforated notebook
     paper used for screening. */
  clip-path: polygon(
    0 0.8%,
    10% 0,
    22% 0.7%,
    36% 0.2%,
    51% 0.9%,
    66% 0,
    82% 0.6%,
    100% 0,
    100% 96.5%,
    94% 97.6%,
    87% 96.8%,
    78% 98.6%,
    69% 97.2%,
    59% 99.2%,
    49% 97.4%,
    39% 99%,
    30% 97.5%,
    20% 98.8%,
    11% 97.2%,
    0 99.2%
  );
  right: 15%;
  top: 39%;
}
</style>
