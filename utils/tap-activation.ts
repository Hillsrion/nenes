/** Preserve native keyboard/mouse clicks and activate touch taps even when a
 * scroll observer has suppressed the compatibility click on iPad. */
export function createTapActivation() {
  let press: { id: number; target: EventTarget | null; x: number; y: number; moved: boolean } | null = null;
  let activation: { target: EventTarget | null; time: number } | null = null;
  const moved = (event: PointerEvent) => !!press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10;
  return {
    down(event: PointerEvent) {
      if (!event.isPrimary && press) {
        press.moved = true;
        return;
      }
      press = event.isPrimary && event.button === 0 && ["touch", "pen"].includes(event.pointerType)
        ? { id: event.pointerId, target: event.currentTarget, x: event.clientX, y: event.clientY, moved: false }
        : null;
    },
    move(event: PointerEvent) {
      if (press?.id === event.pointerId && moved(event)) press.moved = true;
    },
    cancel(event?: PointerEvent) {
      if (press && event) activation = { target: press.target, time: event.timeStamp };
      press = null;
    },
    up(event: PointerEvent, action: () => void) {
      if (!press || press.id !== event.pointerId) return;
      const tap = press.target === event.currentTarget && !press.moved && !moved(event);
      press = null;
      // Some browsers still send a click after a drag with touch-action:none.
      // Suppress that compatibility click for both accepted and rejected taps.
      activation = { target: event.currentTarget, time: event.timeStamp };
      if (tap) action();
    },
    click(event: MouseEvent, action: () => void) {
      const pointerType = (event as PointerEvent).pointerType;
      const compatibilityClick = pointerType === "touch" || pointerType === "pen" || event.detail > 0;
      if (compatibilityClick && activation?.target === event.currentTarget && event.timeStamp - activation.time < 700) return;
      action();
    },
  };
}
