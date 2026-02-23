import { defineStore } from "pinia";

interface MediaState {
  preloadedVideoUrls: Record<string, true>;
}

export const useMediaStore = defineStore("media", {
  state: (): MediaState => ({
    preloadedVideoUrls: {},
  }),
  getters: {
    isVideoLoaded: (state) => (url: string): boolean => {
      return Boolean(url && state.preloadedVideoUrls[url]);
    },
  },
  actions: {
    markVideoLoaded(url: string) {
      if (!url) {
        return;
      }

      this.preloadedVideoUrls[url] = true;
    },
    markVideosLoaded(urls: string[]) {
      urls.forEach((url) => {
        if (url) {
          this.preloadedVideoUrls[url] = true;
        }
      });
    },
    reset() {
      this.preloadedVideoUrls = {};
    },
  },
});
