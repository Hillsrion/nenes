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

    <div class="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-10 2xl:grid-cols-2 lg:py-12">
      <section class="rounded-[2rem] border border-[#8f2b4b]/15 bg-white p-5 shadow-[0_20px_70px_rgba(179,70,112,0.1)] md:p-7">
        <div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9d2146]">Nouveau dépôt</p>
            <h2 class="mt-2 text-2xl font-bold">Préparer une génération</h2>
          </div>
        </div>

        <p class="mt-4 max-w-xl text-sm leading-relaxed text-[#6a2944]">
          Ajoutez une à quatre vues cohérentes, dans l’ordre indiqué ci-dessous. Le modèle 3D utilisera leurs points de vue pour reconstruire le volume.
        </p>

        <section class="mt-6 rounded-3xl border border-[#e4bdcb] bg-[#fffafd] p-5 shadow-[0_12px_35px_rgba(111,35,65,0.07)]">
          <div class="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.18em] text-[#9d2146]">Repères de prise de vues</p>
              <h3 class="mt-1 text-lg font-bold text-[#4c1830]">Quatre angles réguliers donnent le meilleur volume</h3>
            </div>
          </div>
          <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <article v-for="view in photoViews" :key="view.step" class="rounded-2xl border border-[#efd1dc] bg-white p-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold tracking-[0.18em] text-[#9d2146]">{{ view.step }}</span>
                <span class="rounded-full bg-[#fff0f5] px-2 py-1 text-xs font-semibold text-[#7e1f3d]">{{ view.angle }}</span>
              </div>
              <div class="relative mt-3 h-40 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_35%,#ffe8f0,transparent_60%),linear-gradient(135deg,#f8d4df,#fff5f8)]">
                <ThreeBustViewer
                  :model-url="modelUrl"
                  :auto-rotate="false"
                  :enable-zoom="false"
                  :interactive="false"
                  compact
                  material-style="original"
                  :initial-rotation-y="view.rotationY"
                />
              </div>
              <h4 class="mt-3 text-sm font-bold text-[#4c1830]">{{ view.title }}</h4>
              <p class="mt-1 text-xs leading-5 text-[#6a2944]">{{ view.description }}</p>
            </article>
          </div>
          <ul class="mt-5 grid gap-x-6 gap-y-2 text-sm leading-6 text-[#5e2540] md:grid-cols-2">
            <li><span class="font-semibold text-[#7e1f3d]">Distance :</span> téléphone à hauteur de poitrine, à environ 1,5 m, sans zoom ni grand-angle.</li>
            <li><span class="font-semibold text-[#7e1f3d]">Cadrage :</span> de la base du cou au-dessus du nombril ; gardez les bras hors du buste.</li>
            <li><span class="font-semibold text-[#7e1f3d]">Cheveux et bijoux :</span> attachez les cheveux s’ils sont longs et retirez colliers, boucles d’oreilles et autres bijoux.</li>
            <li><span class="font-semibold text-[#7e1f3d]">Tenue :</span> privilégiez une culotte lisse, sans coutures marquées, petits nœuds ni éléments décoratifs qui modifieraient le volume.</li>
            <li><span class="font-semibold text-[#7e1f3d]">Fond :</span> placez-vous devant un fond neutre, uni et dégagé.</li>
            <li><span class="font-semibold text-[#7e1f3d]">Lumière :</span> si possible, choisissez une lumière douce, homogène et face au sujet ; évitez flash, contre-jour et filtres.</li>
            <li><span class="font-semibold text-[#7e1f3d]">Stabilité :</span> gardez la même posture, le même fond et les mêmes réglages pour les quatre photos.</li>
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
              <span class="mt-1 text-xs text-[#6a2944]">Ordre : face, profil gauche, dos, profil droit · 12 Mo max. par photo.</span>
            </span>
          </label>

          <div v-if="photos.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <article v-for="(photo, index) in photos" :key="photo.id" class="relative overflow-hidden rounded-2xl border border-[#8f2b4b]/15 bg-[#fff9fb]">
              <img :src="photo.previewUrl" :alt="photo.name" class="aspect-square w-full object-cover" />
              <button
                type="button"
                class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-lg leading-none text-[#7e1f3d] shadow-md transition hover:bg-[#fff0f4]"
                :aria-label="`Supprimer ${photo.name}`"
                @click="removePhoto(photo.id)"
              >
                ×
              </button>
              <div class="p-2">
                <p class="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#9d2146]">{{ photoViews[index]?.title }}</p>
                <p class="truncate text-[10px] font-bold">{{ photo.name }}</p>
                <p class="mt-0.5 text-[10px] text-[#6a2944]">{{ photo.sizeLabel }}</p>
              </div>
            </article>
          </div>

          <p v-if="message" class="rounded-2xl px-4 py-3 text-sm" :class="messageTone">
            {{ message }}
          </p>

          <button
            type="submit"
            class="w-full rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-[#a9365f] disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="isSubmitting || photos.length === 0"
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
          </div>
        </div>

        <div class="h-[30rem] border-y border-[#8f2b4b]/10 bg-[radial-gradient(circle_at_58%_38%,#fff_0%,#ffe9f1_52%,#f8d6e2_100%)]">
          <ThreeBustViewer :model-url="modelUrl" :auto-rotate="true" :enable-zoom="true" material-style="glass" />
        </div>

        <div class="px-5 py-5 md:px-7">
          <p class="text-sm leading-relaxed text-[#6a2944]">
            Seuls les modèles finalisés et explicitement publiés apparaissent ici. Les brouillons de travail n’apparaissent pas dans la démo.
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
    rotationY: 0,
  },
  {
    step: "02",
    angle: "90° gauche",
    title: "Profil gauche",
    description: "Tournez le buste d’un quart de tour, sans avancer une épaule.",
    rotationY: Math.PI / 2,
  },
  {
    step: "03",
    angle: "180°",
    title: "Dos",
    description: "Gardez la même distance et la même hauteur de téléphone.",
    rotationY: Math.PI,
  },
  {
    step: "04",
    angle: "90° droite",
    title: "Profil droit",
    description: "Reproduisez le profil opposé avec les épaules détendues.",
    rotationY: -Math.PI / 2,
  },
];
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

function removePhoto(photoId: string) {
  const photoIndex = photos.value.findIndex((photo) => photo.id === photoId);
  if (photoIndex === -1) return;

  const [photo] = photos.value.splice(photoIndex, 1);
  if (photo) URL.revokeObjectURL(photo.previewUrl);
  message.value = "";
}

function selectPhotos(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  message.value = "";

  if (files.length === 0) return;
  if (photos.value.length + files.length > maxPhotoCount) {
    isError.value = true;
    message.value = `Tu peux ajouter au maximum ${maxPhotoCount} photos au total.`;
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

  photos.value = [
    ...photos.value,
    ...files.map((file) => ({
      file,
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} Mo`,
    })),
  ];
  input.value = "";
}

async function submitPhotos() {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  message.value = "";

  try {
    const session = await $fetch<{
      submissionId: string;
      uploads: Array<{ key: string; url: string }>;
    }>("/api/3d/upload-session", {
      method: "POST",
      body: {
        photos: photos.value.map((photo) => ({ contentType: photo.file.type, bytes: photo.file.size })),
      },
    });
    await Promise.all(session.uploads.map(async (upload, index) => {
      const response = await fetch(upload.url, {
        method: "PUT",
        headers: { "content-type": photos.value[index].file.type },
        body: photos.value[index].file,
      });
      if (!response.ok) throw new Error(`R2_UPLOAD_${response.status}`);
    }));
    const result = await $fetch<{ submissionId: string; photoCount: number; requestId?: string }>(
      `/api/3d/submissions/${session.submissionId}/complete`,
      { method: "POST", body: {} }
    );
    isError.value = false;
    message.value = `${result.photoCount} photo(s) reçue(s). Référence : ${result.submissionId}.`;
    clearPhotos();
  } catch (error: any) {
    isError.value = true;
    const requestId = error?.response?.headers?.get?.("x-3d-upload-request-id");
    const detail = error?.data?.statusMessage || "L’envoi a échoué avant d’atteindre le stockage sécurisé.";
    message.value = requestId ? `${detail} Référence : ${requestId}.` : detail;
  } finally {
    isSubmitting.value = false;
  }
}

onBeforeUnmount(clearPhotos);
</script>
