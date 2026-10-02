import { nextTick, watch, onMounted, onUnmounted, type Ref } from "vue";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";
import { useAnimationsStore } from "~/stores";

interface ScreeningSequenceOptions {
  backgroundRef: Ref<HTMLElement | null>;
  trackRef: Ref<HTMLElement | null>;
  titleRef: Ref<HTMLElement | null>;
  modelRef: Ref<HTMLElement | null>;
  screeningPolaroidRef: Ref<HTMLElement | null>;
  screeningNoteRef: Ref<HTMLElement | null>;
  selfExamPolaroidRef: Ref<HTMLElement | null>;
  selfExamNoteRef: Ref<HTMLElement | null>;
  onSecondModelOpacityChange: (opacity: number) => void;
}

export function useScreeningScrollSequence({
  backgroundRef, trackRef, titleRef, modelRef, screeningPolaroidRef, screeningNoteRef, selfExamPolaroidRef, selfExamNoteRef, onSecondModelOpacityChange,
}: ScreeningSequenceOptions) {
  const store = useAnimationsStore();
  let scrollTimeline: gsap.core.Timeline | null = null;
  let scrollTrigger: ScrollTrigger | null = null;
  let mediaQuery: gsap.MatchMedia | null = null;
  let hasInitializedScrollSequence = false;
  let titleSplit: SplitType | null = null;

  const initializeScrollSequence = () => {
    const background = backgroundRef.value;
    const track = trackRef.value;
    const title = titleRef.value;
    const model = modelRef.value;
    const screeningPolaroid = screeningPolaroidRef.value;
    const screeningNote = screeningNoteRef.value;
    const selfExamPolaroid = selfExamPolaroidRef.value;
    const selfExamNote = selfExamNoteRef.value;

    if (
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
    const paperRestingRotations = new Map<HTMLElement, number>([
      [screeningPolaroid, -6],
      [screeningNote, 1.5],
      [selfExamPolaroid, 7],
      [selfExamNote, -4],
    ]);
    const blue = "#335ede";

    titleSplit?.revert();
    titleSplit = new SplitType(title, {
      types: "words",
      wordClass: "screening-word",
      tagName: "span",
    });
    const titleWords = titleSplit.words ?? [];

    gsap.set(model, { autoAlpha: 0, y: 0, scale: 1 });
    gsap.set(paper, { autoAlpha: 0, y: 45, scale: 0.95 });
    gsap.set(titleWords, { opacity: 0.14 });
    paperRestingRotations.forEach((rotation, element) => {
      gsap.set(element, {
        rotation: rotation + 2.5,
        transformOrigin: "50% 70%",
      });
    });

    gsap.set(background, { opacity: 1 });
    gsap.set(title, { color: "white" });
    onSecondModelOpacityChange(0);

    scrollTimeline = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    const secondModelReveal = { opacity: 0 };

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
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotation: paperRestingRotations.get(screeningPolaroid),
          duration: 0.22,
          ease: "power2.out",
        },
        0.64
      )
      .to(
        screeningNote,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotation: paperRestingRotations.get(screeningNote),
          duration: 0.2,
          ease: "power2.out",
        },
        0.7
      )
      .to(
        selfExamPolaroid,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotation: paperRestingRotations.get(selfExamPolaroid),
          duration: 0.22,
          ease: "power2.out",
        },
        0.78
      )
      .to(
        selfExamNote,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotation: paperRestingRotations.get(selfExamNote),
          duration: 0.2,
          ease: "power2.out",
        },
        0.84
      )
      .to(secondModelReveal, {
        opacity: 1,
        duration: 0.2,
        ease: "power2.out",
        onUpdate: () => onSecondModelOpacityChange(secondModelReveal.opacity),
      }, 0.84)
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
    if (store.getSectionState("loading") === "isComplete") {
      initializeScrollSequenceAfterLoading();
    }
  });

  onUnmounted(() => {
    mediaQuery?.revert();
    scrollTrigger?.kill();
    scrollTimeline?.kill();
    titleSplit?.revert();
  });
}
