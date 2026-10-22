import { trackVisibleViewport } from '~/utils/visible-viewport';

export default defineNuxtPlugin((nuxtApp) => {
  const cleanup = trackVisibleViewport(window, document.documentElement);
  nuxtApp.vueApp.onUnmount(cleanup);
  import.meta.hot?.dispose(cleanup);
});
