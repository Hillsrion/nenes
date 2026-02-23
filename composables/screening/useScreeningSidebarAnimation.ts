import { type Ref } from "vue";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";

interface UseScreeningSidebarAnimationOptions {
  sidebarRef: Ref<HTMLElement | null>;
  sectionRef: Ref<HTMLElement | null>;
  titleRef: Ref<HTMLElement | null>;
  lastImageRef: Ref<HTMLImageElement | null>;
  containerRef: Ref<HTMLElement | null>;
}

export const useScreeningSidebarAnimation = ({
  sidebarRef,
  sectionRef,
  titleRef,
  lastImageRef,
  containerRef,
}: UseScreeningSidebarAnimationOptions) => {
  let sidebarScrollTrigger: ScrollTrigger | null = null;
  let sidebarAnimationTimeline: gsap.core.Timeline | null = null;

  const initializeSidebarAnimation = () => {
    if (
      !sidebarRef.value ||
      !sectionRef.value ||
      !titleRef.value ||
      !lastImageRef.value ||
      !containerRef.value
    ) {
      return;
    }

    const triggerElement = containerRef.value.parentElement;
    if (!triggerElement) {
      return;
    }

    const titleRect = titleRef.value.getBoundingClientRect();
    const lastImageRect = lastImageRef.value.getBoundingClientRect();
    const sidebarRect = sidebarRef.value.getBoundingClientRect();

    const titleTopRelativeToSidebar = titleRect.top - sidebarRect.top;
    const lastImageTopRelativeToSidebar = lastImageRect.top - sidebarRect.top;
    const maxOffset = lastImageTopRelativeToSidebar - titleTopRelativeToSidebar;

    sidebarAnimationTimeline = gsap.timeline();
    sidebarAnimationTimeline.fromTo(
      sidebarRef.value,
      { y: 0 },
      {
        y: -maxOffset,
        ease: "none",
      }
    );

    sidebarScrollTrigger = ScrollTrigger.create({
      trigger: triggerElement,
      start: "top top",
      end: "center top",
      scrub: true,
      pin: false,
      animation: sidebarAnimationTimeline,
    });
  };

  const cleanupSidebarAnimation = () => {
    sidebarScrollTrigger?.kill();
    sidebarAnimationTimeline?.kill();
    sidebarScrollTrigger = null;
    sidebarAnimationTimeline = null;
  };

  return {
    initializeSidebarAnimation,
    cleanupSidebarAnimation,
  };
};
