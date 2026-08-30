<template>
  <main class="min-h-screen bg-[#fff5f8] text-[#4c1830]">
    <header class="border-b border-[#8f2b4b]/15 bg-white/90 px-5 py-4 backdrop-blur md:px-10">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9d2146]">
            Studio 3D
          </p>
          <h1 class="mt-1 text-xl font-bold md:text-2xl">Photos vers modèle 3D</h1>
        </div>
        <a
          href="/"
          class="rounded-full border border-[#8f2b4b]/25 bg-white px-4 py-2 text-sm font-bold text-[#5e2540] transition hover:border-[#8f2b4b]/50"
        >
          Retour au site
        </a>
      </div>
    </header>

    <div class="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-10 lg:grid-cols-2 lg:py-12">
      <section class="rounded-[2rem] border border-[#8f2b4b]/15 bg-white p-5 shadow-[0_20px_70px_rgba(179,70,112,0.1)] md:p-7">
        <div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9d2146]">Nouveau dépôt</p>
            <h2 class="mt-2 text-2xl font-bold">Préparer une génération</h2>
          </div>
        </div>

        <p class="mt-4 max-w-xl text-sm leading-relaxed text-[#6a2944]">
          Ajoutez une à quatre vues cohérentes. Le modèle 3D utilisera leurs points de vue pour reconstruire le volume.
        </p>

        <section class="mt-6 rounded-3xl border border-[#e4bdcb] bg-[#fffafd] p-5 shadow-[0_12px_35px_rgba(111,35,65,0.07)]">
          <div class="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#9d2146]">Repères de prise de vues</p>
              <h3 class="mt-1 text-lg font-bold text-[#4c1830]">Quatre angles réguliers donnent le meilleur volume</h3>
            </div>
            <span class="rounded-full bg-[#f7dce6] px-3 py-1 text-xs font-semibold text-[#7e1f3d]">Même cadrage · même lumière</span>
          </div>
          <div class="mt-5 grid grid-cols-2 gap-3">
            <article v-for="view in photoViews" :key="view.step" class="rounded-2xl border border-[#efd1dc] bg-white p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold tracking-[0.18em] text-[#9d2146]">{{ view.step }}</span>
                <span class="rounded-full bg-[#fff0f5] px-2 py-1 text-xs font-semibold text-[#7e1f3d]">{{ view.angle }}</span>
              </div>
              <div class="relative mt-3 flex h-20 items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_35%,#ffe8f0,transparent_60%),linear-gradient(135deg,#f8d4df,#fff5f8)] [perspective:14rem]">
                <div class="absolute bottom-2 h-12 w-14 rounded-[50%_50%_32%_32%] border border-[#b94e73] bg-[#f0a8be] shadow-[0_5px_10px_rgba(137,38,76,0.18)]" :style="{ transform: view.transform }">
                  <span class="absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full border border-[#b94e73] bg-[#ffe3eb]" />
                </div>
                <div class="absolute bottom-1 h-px w-24 bg-[#c66b88]/60" />
              </div>
              <h4 class="mt-3 text-sm font-bold text-[#4c1830]">{{ view.title }}</h4>
              <p class="mt-1 text-xs leading-5 text-[#6a2944]">{{ view.description }}</p>
            </article>
          </div>
          <ul class="mt-5 grid gap-x-6 gap-y-2 text-sm leading-6 text-[#5e2540] md:grid-cols-2">
            <li><span class="font-semibold text-[#7e1f3d]">Distance :</span> téléphone à hauteur de poitrine, à environ 1,5 m, sans zoom ni grand-angle.</li>
            <li><span class="font-semibold text-[#7e1f3d]">Cadrage :</span> de la base du cou au-dessus du nombril ; gardez les bras hors du buste.</li>
            <li><span class="font-semibold text-[#7e1f3d]">Lumière :</span> lumière douce et homogène face au sujet, sans flash, contre-jour ni filtre.</li>
            <li><span class="font-semibold text-[#7e1f3d]">Stabilité :</span> même posture, fond uni et réglages pour les quatre photos.</li>
          </ul>
        </section>

        <form class="mt-7 space-y-5" @submit.prevent="submitPhotos">
          <label
            class="group block cursor-pointer rounded-3xl border border-dashed border-[#8f2b4b]/35 bg-[#fff9fb] p-6 transition hover:border-[#9d2146]/60 hover:bg-[#fff5f8]"
            :class="{ 'border-[#9d2146]/60 bg-[#fff0f4]': photos.length > 0 }"
          >
            <input
              class="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              @change="selectPhotos"
            />
            <span class="flex flex-col items-center text-center">
              <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">＋</span>
              <span class="mt-3 text-sm font-bold">Déposer les photos ou choisir des fichiers</span>
              <span class="mt-1 text-xs text-[#6a2944]">JPEG, PNG ou WebP · 12 Mo max. par photo · 4 vues max.</span>
            </span>
          </label>

          <div v-if="photos.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <article v-for="photo in photos" :key="photo.id" class="overflow-hidden rounded-2xl border border-[#8f2b4b]/15 bg-[#fff9fb]">
              <img :src="photo.previewUrl" :alt="photo.name" class="aspect-square w-full object-cover" />
              <div class="p-2">
                <p class="truncate text-[10px] font-bold">{{ photo.name }}</p>
                <p class="mt-0.5 text-[10px] text-[#6a2944]">{{ photo.sizeLabel }}</p>
              </div>
            </article>
          </div>

          <label class="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#fff9fb] p-4 text-xs leading-relaxed text-[#65213b]">
            <input v-model="hasConsent" type="checkbox" class="mt-0.5 h-4 w-4 accent-[#9d2146]" />
            <span>Je confirme disposer du consentement explicite pour déposer ces photos et lancer leur traitement en modèle 3D.</span>
          </label>

          <p v-if="message" class="rounded-2xl px-4 py-3 text-sm" :class="messageTone">
            {{ message }}
          </p>

          <button
            type="submit"
            class="w-full rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-[#a9365f] disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="isSubmitting || photos.length === 0 || !hasConsent"
          >
            {{ isSubmitting ? "Envoi en cours…" : "Envoyer les photos" }}
          </button>
        </form>
      </section>

      <section class="overflow-hidden rounded-[2rem] border border-[#8f2b4b]/15 bg-white shadow-[0_20px_70px_rgba(179,70,112,0.1)]">
        <div class="flex items-start justify-between gap-5 px-5 pb-4 pt-6 md:px-7">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9d2146]">Bibliothèque publiée</p>
            <h2 class="mt-2 text-2xl font-bold">{{ defaultBustModel.label }}</h2>
            <p class="mt-1 text-xs text-[#6a2944]">{{ defaultBustModel.fileName }}</p>
          </div>
          <a
            :href="modelUrl"
            target="_blank"
            rel="noreferrer"
            class="rounded-full border border-[#8f2b4b]/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#5e2540] transition hover:border-[#8f2b4b]/50"
          >
            GLB
          </a>
        </div>

        <div class="h-[30rem] border-y border-[#8f2b4b]/10 bg-[radial-gradient(circle_at_58%_38%,#fff_0%,#ffe9f1_52%,#f8d6e2_100%)]">
          <ThreeBustViewer :model-url="modelUrl" :auto-rotate="true" :enable-zoom="true" material-style="glass" />
        </div>

        <div class="px-5 py-5 md:px-7">
          <p class="text-sm leading-relaxed text-[#6a2944]">
            Seuls les GLB finalisés et explicitement publiés apparaissent ici. Les brouillons de travail n’apparaissent pas dans la démo.
          </p>
          <a
            :href="previewHref"
            class="mt-4 inline-flex rounded-full bg-[#fff0f4] px-4 py-2 text-xs font-bold text-[#8e2345] transition hover:bg-[#ffe4ed]"
          >
            Ouvrir le viewer complet
          </a>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { defaultBustModel } from "~/config/bust-models";
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";

type SelectedPhoto = {
  file: File;
  id: string;
  name: string;
  previewUrl: string;
  sizeLabel: string;
};

const maxPhotoCount = 4;
const maxFileSize = 12 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const runtimeConfig = useRuntimeConfig();
const baseModelsUrl = String(runtimeConfig.public.r2.modelsPublicUrl || "").replace(/\/+$/, "");
const modelUrl = computed(() => `${baseModelsUrl}/models/${defaultBustModel.fileName}`);
const previewHref = computed(
  () => `/?preview3d=photo&model=${encodeURIComponent(defaultBustModel.fileName)}&material=glass`
);

const photos = ref<SelectedPhoto[]>([]);
const photoViews = [
  {
    step: "01",
    angle: "0°",
    title: "Face",
    description: "Regard droit ; l’axe du téléphone est perpendiculaire au buste.",
    transform: "rotateY(0deg)",
  },
  {
    step: "02",
    angle: "45° gauche",
    title: "Trois-quarts gauche",
    description: "Tournez lentement le buste vers la droite, sans avancer une épaule.",
    transform: "rotateY(42deg)",
  },
  {
    step: "03",
    angle: "45° droite",
    title: "Trois-quarts droit",
    description: "Reproduisez exactement le même angle de l’autre côté.",
    transform: "rotateY(-42deg)",
  },
  {
    step: "04",
    angle: "90°",
    title: "Profil",
    description: "Gardez le menton neutre et les épaules détendues pour lire la projection.",
    transform: "rotateY(72deg)",
  },
];
const hasConsent = ref(false);
const isSubmitting = ref(false);
const message = ref("");
const isError = ref(false);
const messageTone = computed(() =>
  isError.value
    ? "border border-red-200 bg-red-50 text-red-700"
    : "border border-emerald-200 bg-emerald-50 text-emerald-800"
);

function clearPhotos() {
  photos.value.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  photos.value = [];
}

function selectPhotos(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  clearPhotos();
  message.value = "";

  if (files.length === 0) return;
  if (files.length > maxPhotoCount) {
    isError.value = true;
    message.value = "Sélectionne au maximum quatre photos.";
    input.value = "";
    return;
  }

  const invalidFile = files.find(
    (file) => !acceptedTypes.has(file.type) || file.size === 0 || file.size > maxFileSize
  );
  if (invalidFile) {
    isError.value = true;
    message.value = "Chaque photo doit être un JPEG, PNG ou WebP de 12 Mo maximum.";
    input.value = "";
    return;
  }

  photos.value = files.map((file) => ({
    file,
    id: crypto.randomUUID(),
    name: file.name,
    previewUrl: URL.createObjectURL(file),
    sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} Mo`,
  }));
  input.value = "";
}

async function submitPhotos() {
  if (isSubmitting.value) return;

  const body = new FormData();
  photos.value.forEach((photo) => body.append("photos", photo.file));
  body.set("consent", String(hasConsent.value));
  isSubmitting.value = true;
  message.value = "";

  try {
    const result = await $fetch<{ submissionId: string; photoCount: number }>("/api/3d/submissions", {
      method: "POST",
      body,
    });
    isError.value = false;
    message.value = `${result.photoCount} photo(s) reçue(s). Référence : ${result.submissionId}.`;
    clearPhotos();
    hasConsent.value = false;
  } catch (error: any) {
    isError.value = true;
    message.value = error?.data?.statusMessage || "L’envoi a échoué. Vérifiez les fichiers puis réessayez.";
  } finally {
    isSubmitting.value = false;
  }
}

onBeforeUnmount(clearPhotos);
</script>
