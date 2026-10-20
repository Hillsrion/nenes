import { CLOUDFLARE_BEACON_SRC, getCloudflareBeaconConfig } from "~/utils/cloudflare-analytics";

export default defineNuxtPlugin(() => {
  const { token, hosts } = useRuntimeConfig().public.cloudflareAnalytics;
  const beacon = getCloudflareBeaconConfig({
    token,
    hosts,
    url: window.location.href,
    development: import.meta.dev,
    doNotTrack: navigator.doNotTrack,
    globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
  });

  if (!beacon) return;

  // Avoid a second beacon if Cloudflare already injected one at the edge.
  if (document.querySelector('script[data-cf-beacon], script[src*="cloudflareinsights.com/beacon.min.js"]')) return;

  const script = document.createElement("script");
  script.type = "module";
  script.async = true;
  script.src = CLOUDFLARE_BEACON_SRC;
  script.dataset.cfBeacon = JSON.stringify(beacon);
  document.head.appendChild(script);
});
