import assert from 'node:assert/strict';
import test from 'node:test';
import { trackVisibleViewport } from '../utils/visible-viewport';

function setup(height: number) {
  const viewport = Object.assign(new EventTarget(), { height, scale: 1 });
  const frames = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  const target = Object.assign(new EventTarget(), {
    innerHeight: height,
    visualViewport: viewport,
    requestAnimationFrame(callback: FrameRequestCallback) { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id: number) { frames.delete(id); },
  });
  const properties = new Map<string, string>();
  const root = { style: {
    setProperty(name: string, value: string) { properties.set(name, value); },
    removeProperty(name: string) { properties.delete(name); },
  } };
  const flush = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(0));
  };
  const cleanup = trackVisibleViewport(target as unknown as Window, root as unknown as HTMLElement);
  return { target, viewport, frames, properties, flush, cleanup };
}

for (const [small, large] of [[664, 744], [980, 1060]]) {
  test(`toolbar collapse and expansion cover the viewport (${small}–${large})`, () => {
    const state = setup(small!);
    const height = () => state.properties.get('--visible-viewport-height');
    assert.equal(height(), `${small}px`);
    // Safari can report the new visible height before window.innerHeight updates.
    state.viewport.height = large! - 0.25;
    state.viewport.dispatchEvent(new Event('resize'));
    state.viewport.dispatchEvent(new Event('resize'));
    assert.equal(state.frames.size, 1, 'resize bursts share one animation frame');
    state.flush();
    assert.equal(height(), `${large}px`);
    state.viewport.height = small!;
    state.viewport.dispatchEvent(new Event('resize'));
    state.flush();
    assert.equal(height(), `${small}px`);
    // A rotation changes both width and height through the normal window event.
    state.target.innerHeight = 390;
    state.viewport.height = 390;
    state.target.dispatchEvent(new Event('resize'));
    state.flush();
    assert.equal(height(), '390px');
    state.viewport.scale = 2;
    state.viewport.height = 195;
    state.viewport.dispatchEvent(new Event('resize'));
    state.flush();
    assert.equal(height(), '390px', 'pinch zoom preserves scene layout');
    state.cleanup();
    state.target.dispatchEvent(new Event('resize'));
    state.viewport.dispatchEvent(new Event('resize'));
    assert.equal(state.frames.size, 0);
    assert.equal(height(), undefined);
  });
}

test('browsers without VisualViewport use window height and restore on pageshow', () => {
  const state = setup(768);
  state.cleanup();
  Object.assign(state.target, { visualViewport: null });
  const cleanup = trackVisibleViewport(state.target as unknown as Window, { style: {
    setProperty(name: string, value: string) { state.properties.set(name, value); },
    removeProperty(name: string) { state.properties.delete(name); },
  } } as unknown as HTMLElement);
  state.target.innerHeight = 1024;
  state.target.dispatchEvent(new Event('pageshow'));
  state.flush();
  assert.equal(state.properties.get('--visible-viewport-height'), '1024px');
  cleanup();
});
