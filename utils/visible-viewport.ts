/** Keep visual stages in sync with Safari's toolbar without refreshing scroll timelines. */
export function trackVisibleViewport(target: Window, root: HTMLElement): () => void {
  const viewport = target.visualViewport;
  let frame = 0;
  let previousHeight = 0;

  const update = () => {
    frame = 0;
    // Pinch zoom should magnify the scene, not change its layout or camera framing.
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
    const height = Math.ceil(Math.max(target.innerHeight, viewport?.height ?? 0));
    if (height > 0 && height !== previousHeight) {
      root.style.setProperty('--visible-viewport-height', `${height}px`);
      previousHeight = height;
    }
  };
  const scheduleUpdate = () => {
    if (!frame) frame = target.requestAnimationFrame(update);
  };

  update();
  target.addEventListener('resize', scheduleUpdate, { passive: true });
  target.addEventListener('pageshow', scheduleUpdate);
  viewport?.addEventListener('resize', scheduleUpdate, { passive: true });

  return () => {
    target.cancelAnimationFrame(frame);
    target.removeEventListener('resize', scheduleUpdate);
    target.removeEventListener('pageshow', scheduleUpdate);
    viewport?.removeEventListener('resize', scheduleUpdate);
    root.style.removeProperty('--visible-viewport-height');
  };
}
