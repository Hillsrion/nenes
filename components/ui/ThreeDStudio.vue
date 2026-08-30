<template>
  <main class="min-h-screen bg-[#fff5f8] text-primary">
    <header class="border-b border-primary/10 bg-white/85 px-5 py-4 backdrop-blur md:px-10">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e95678]">
            Studio privé
          </p>
          <h1 class="mt-1 text-xl font-bold md:text-2xl">Photos vers modèle 3D</h1>
        </div>
        <a
          href="/"
          class="rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-bold transition hover:border-primary/30"
        >
          Retour au site
        </a>
      </div>
    </header>

    <div class="mx-auto grid max-w-6xl gap-7 px-5 py-8 md:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:py-12">
      <section class="rounded-[2rem] border border-primary/10 bg-white p-5 shadow-[0_20px_70px_rgba(179,70,112,0.1)] md:p-7">
        <div class="flex items-start justify-between gap-5">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e95678]">Nouveau dépôt</p>
            <h2 class="mt-2 text-2xl font-bold">Préparer une génération</h2>
          </div>
          <span class="rounded-full bg-[#fff0f4] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#c74368]">
            R2 privé
          </span>
        </div>

        <p class="mt-4 max-w-xl text-sm leading-relaxed text-secondary">
          Ajoute une à quatre vues cohérentes. Les photos sont déposées dans un bucket privé, sans URL publique ni ajout à Git.
        </p>

        <form class="mt-7 space-y-5" @submit.prevent="submitPhotos">
          <label
            class="group block cursor-pointer rounded-3xl border border-dashed border-primary/25 bg-[#fff9fb] p-6 transition hover:border-[#e95678]/50 hover:bg-[#fff5f8]"
            :class="{ 'border-[#e95678]/60 bg-[#fff0f4]': photos.length > 0 }"
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
              <span class="mt-1 text-xs text-secondary">JPEG, PNG ou WebP · 12 Mo max. par photo · 4 vues max.</span>
            </span>
          </label>

          <div v-if="photos.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <article v-for="photo in photos" :key="photo.id" class="overflow-hidden rounded-2xl border border-primary/10 bg-[#fff9fb]">
              <img :src="photo.previewUrl" :alt="photo.name" class="aspect-square w-full object-cover" />
              <div class="p-2">
                <p class="truncate text-[10px] font-bold">{{ photo.name }}</p>
                <p class="mt-0.5 text-[10px] text-secondary">{{ photo.sizeLabel }}</p>
              </div>
            </article>
          </div>

          <label class="block">
            <span class="text-xs font-bold uppercase tracking-[0.13em] text-secondary">Code d’accès équipe</span>
            <input
              v-model="accessCode"
              type="password"
              autocomplete="off"
              required
              class="mt-2 w-full rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e95678]/60 focus:ring-4 focus:ring-[#e95678]/10"
              placeholder="Code configuré côté serveur"
            />
          </label>

          <label class="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#fff9fb] p-4 text-xs leading-relaxed text-secondary">
            <input v-model="hasConsent" type="checkbox" class="mt-0.5 h-4 w-4 accent-[#e95678]" />
            <span>Je confirme disposer du consentement explicite pour déposer ces photos et lancer leur traitement en modèle 3D.</span>
          </label>

          <p v-if="message" class="rounded-2xl px-4 py-3 text-sm" :class="messageTone">
            {{ message }}
          </p>

          <button
            type="submit"
            class="w-full rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-[#a9365f] disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="isSubmitting || photos.length === 0 || !hasConsent || !accessCode"
          >
            {{ isSubmitting ? "Dépôt privé en cours…" : "Envoyer vers le dépôt privé" }}
          </button>
        </form>
      </section>

      <section class="overflow-hidden rounded-[2rem] border border-primary/10 bg-white shadow-[0_20px_70px_rgba(179,70,112,0.1)]">
        <div class="flex items-start justify-between gap-5 px-5 pb-4 pt-6 md:px-7">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e95678]">Bibliothèque publiée</p>
            <h2 class="mt-2 text-2xl font-bold">{{ defaultBustModel.label }}</h2>
            <p class="mt-1 text-xs text-secondary">{{ defaultBustModel.fileName }} · servi depuis R2</p>
          </div>
          <a
            :href="modelUrl"
            target="_blank"
            rel="noreferrer"
            class="rounded-full border border-primary/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition hover:border-primary/30"
          >
            GLB
          </a>
        </div>

        <div class="h-[30rem] border-y border-primary/8 bg-[radial-gradient(circle_at_58%_38%,#fff_0%,#ffe9f1_52%,#f8d6e2_100%)]">
          <ThreeBustViewer :model-url="modelUrl" :auto-rotate="true" :enable-zoom="true" material-style="glass" />
        </div>

        <div class="px-5 py-5 md:px-7">
          <p class="text-sm leading-relaxed text-secondary">
            Seuls les GLB finalisés et explicitement publiés apparaissent ici. Les brouillons et photos de travail restent locaux ou privés.
          </p>
          <a
            :href="previewHref"
            class="mt-4 inline-flex rounded-full bg-[#fff0f4] px-4 py-2 text-xs font-bold text-[#be3f63] transition hover:bg-[#ffe4ed]"
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
const accessCode = ref("");
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
  body.set("accessCode", accessCode.value);
  body.set("consent", String(hasConsent.value));
  isSubmitting.value = true;
  message.value = "";

  try {
    const result = await $fetch<{ submissionId: string; photoCount: number }>("/api/3d/submissions", {
      method: "POST",
      body,
    });
    isError.value = false;
    message.value = `${result.photoCount} photo(s) reçue(s) dans le dépôt privé. Référence : ${result.submissionId}.`;
    clearPhotos();
    accessCode.value = "";
    hasConsent.value = false;
  } catch (error: any) {
    isError.value = true;
    message.value = error?.data?.statusMessage || "Le dépôt a échoué. Vérifie la configuration privée du serveur.";
  } finally {
    isSubmitting.value = false;
  }
}

onBeforeUnmount(clearPhotos);
</script>
