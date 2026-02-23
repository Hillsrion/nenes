import { type Ref } from "vue";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";

interface UseScreeningFadeOutOptions {
  containerRef: Ref<HTMLElement | null>;
  sidebarRef: Ref<HTMLElement | null>;
  sectionRef: Ref<HTMLElement | null>;
}

const vh = (percentage: number): string => {
  if (percentage < 0 || percentage > 100) {
    throw new Error("Percentage must be between 0 and 100");
  }

  const viewportHeight = window.innerHeight;
  const pixels = (viewportHeight * percentage) / 100;
  return `${Math.round(pixels)}px`;
};

export const useScreeningFadeOut = ({
  containerRef,
  sidebarRef,
  sectionRef,
}: UseScreeningFadeOutOptions) => {
  let fadeOutScrollTrigger: ScrollTrigger | null = null;
  let containerFadeOutScrollTrigger: ScrollTrigger | null = null;
  let fadeOutAnimation1: gsap.core.Timeline | null = null;
  let fadeOutAnimation2: gsap.core.Timeline | null = null;

  const initializeFadeOutAnimation = () => {
    if (!containerRef.value || !sidebarRef.value || !sectionRef.value) {
      return;
    }

    const sidebarElements = Array.from(sidebarRef.value.children);
    const otherElements = sidebarElements.slice(0, -1);
    const lastElement = sidebarElements[sidebarElements.length - 1];
    const lastElementTitle = lastElement?.querySelector("h3");
    const lastElementParagraph = lastElement?.querySelector("p");

    const elementsToFade: Element[] = [...otherElements];
    if (lastElementTitle) {
      elementsToFade.push(lastElementTitle);
    }
    if (lastElementParagraph) {
      elementsToFade.push(lastElementParagraph);
    }

    if (elementsToFade.length > 0) {
      fadeOutAnimation1 = gsap.timeline();
      fadeOutAnimation1.to(elementsToFade, {
        opacity: 0,
        ease: "power2.out",
      });

      fadeOutScrollTrigger = ScrollTrigger.create({
        trigger: sectionRef.value,
        start: `center top+=${vh(20)}`,
        end: `bottom top+=${vh(35)}`,
        scrub: true,
        animation: fadeOutAnimation1,
      });
    }

    fadeOutAnimation2 = gsap.timeline();
    fadeOutAnimation2.to(containerRef.value, {
      scale: 0.7,
      opacity: 0,
      y: vh(30),
      ease: "power2.out",
    });

    containerFadeOutScrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.value,
      start: "center top",
      end: "bottom top",
      scrub: true,
      animation: fadeOutAnimation2,
    });
  };

  const cleanupFadeOutAnimation = () => {
    fadeOutScrollTrigger?.kill();
    containerFadeOutScrollTrigger?.kill();
    fadeOutAnimation1?.kill();
    fadeOutAnimation2?.kill();

    fadeOutScrollTrigger = null;
    containerFadeOutScrollTrigger = null;
    fadeOutAnimation1 = null;
    fadeOutAnimation2 = null;
  };

  return {
    initializeFadeOutAnimation,
    cleanupFadeOutAnimation,
  };
};
