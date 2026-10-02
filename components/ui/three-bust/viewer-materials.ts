import * as THREE from "three";
import type { Ref } from "vue";
import type { MaterialStyle } from "./types";
import type { SymptomType } from "./symptom-effects";
import { createGeneratedShapeMaterial, createGlassMaterial, createIridescentMaterial } from "./materials";

interface MaterialContext {
  getRenderer: () => THREE.WebGLRenderer | null;
  getScene: () => THREE.Scene | null;
  getCamera: () => THREE.PerspectiveCamera | null;
  containerRef: Ref<HTMLDivElement | null>;
  isDisposed: () => boolean;
  getStyle: () => MaterialStyle;
  getSymptom: () => SymptomType;
  applyTint: (symptom: SymptomType) => void;
  scheduleRender: () => void;
}

export function createViewerMaterials(context: MaterialContext) {
  const modelMaterialEntries: Array<{
    mesh: THREE.Mesh;
    originalMaterial: THREE.Material | THREE.Material[];
    hasTexture: boolean;
  }> = [];
  let composer: import("three/examples/jsm/postprocessing/EffectComposer.js").EffectComposer | null = null;
  let bloomPass: import("three/examples/jsm/postprocessing/UnrealBloomPass.js").UnrealBloomPass | null = null;
  let composerSetupPromise: Promise<void> | null = null;

  // Neutral clay material for shape-only photogrammetry exports.
  const generatedShapeMaterial = createGeneratedShapeMaterial();

  const glassMaterial = createGlassMaterial();

  const glowMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x160315,
    emissive: 0xff087f,
    emissiveIntensity: 0.72,
    roughness: 0.34,
    metalness: 0.08,
    envMapIntensity: 0.3,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
  });

  const iridescentMaterial = createIridescentMaterial();

  const materialForStyle = (style: MaterialStyle) => {
    if (style === "glass") return glassMaterial;
    if (style === "glow") return glowMaterial;
    if (style === "iridescent") return iridescentMaterial;
    return null;
  };

  const applyMaterialStyle = (style: MaterialStyle) => {
    const experimentMaterial = materialForStyle(style);

    if (context.getScene()) {
      context.getScene()!.background = style === "glow" ? new THREE.Color(0x080411) : null;
    }

    modelMaterialEntries.forEach(({ mesh, originalMaterial, hasTexture }) => {
      mesh.material =
        style === "original"
          ? hasTexture
            ? originalMaterial
            : generatedShapeMaterial
          : experimentMaterial ?? originalMaterial;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        material.needsUpdate = true;
      });
    });

    if (bloomPass) {
      bloomPass.strength = style === "glow" ? 0.68 : 0;
      bloomPass.radius = style === "glow" ? 0.46 : 0.2;
      bloomPass.threshold = style === "glow" ? 0.58 : 0.78;
    }

    if (context.getRenderer()) {
      context.getRenderer()!.toneMappingExposure =
        style === "glow" ? 0.72 : style === "glass" ? 1.2 : style === "iridescent" ? 0.9 : 1.1;
    }

    context.applyTint(context.getSymptom());
  };

  const ensureComposer = () => {
    const activeRenderer = context.getRenderer();
    const activeScene = context.getScene();
    const activeCamera = context.getCamera();
    if (composer || composerSetupPromise || !activeRenderer || !activeScene || !activeCamera) {
      return composerSetupPromise ?? Promise.resolve();
    }

    composerSetupPromise = Promise.all([
      import("three/examples/jsm/postprocessing/EffectComposer.js"),
      import("three/examples/jsm/postprocessing/RenderPass.js"),
      import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
    ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }]) => {
      if (context.isDisposed() || context.getRenderer() !== activeRenderer) return;
      const rect = context.containerRef.value?.getBoundingClientRect();
      const width = rect?.width ?? 1;
      const height = rect?.height ?? 1;
      composer = new EffectComposer(activeRenderer);
      composer.addPass(new RenderPass(activeScene, activeCamera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0, 0.2, 0.78);
      composer.addPass(bloomPass);
      applyMaterialStyle(context.getStyle());
      context.scheduleRender();
    });

    return composerSetupPromise;
  };

  const registerModelMaterials = (root: THREE.Object3D, keepUntexturedOriginal = false) => {
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.preserveMaterial) return;

      const sourceMaterials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      const hasTexture =
        keepUntexturedOriginal ||
        sourceMaterials.some((material) =>
          Boolean((material as THREE.MeshStandardMaterial | undefined)?.map)
        );

      modelMaterialEntries.push({
        mesh: child,
        originalMaterial: child.material,
        hasTexture,
      });
    });

    applyMaterialStyle(context.getStyle());
  };

  return {
    applyMaterialStyle, ensureComposer, registerModelMaterials,
    resize(width: number, height: number) { composer?.setSize(width, height); },
    render(elapsedTime: number) {
      if (context.getStyle() !== "glow") return false;
      glowMaterial.emissiveIntensity = 0.7 + Math.sin(elapsedTime * 1.8) * 0.08;
      if (!composer) return false;
      composer.render();
      return true;
    },
    dispose() {
      composer?.dispose();
      generatedShapeMaterial.dispose();
      glassMaterial.dispose();
      glowMaterial.dispose();
      iridescentMaterial.dispose();
      const originalMaterials = new Set<THREE.Material>();
      modelMaterialEntries.forEach(({ originalMaterial }) => {
        (Array.isArray(originalMaterial) ? originalMaterial : [originalMaterial])
          .forEach(material => originalMaterials.add(material));
      });
      originalMaterials.forEach(material => {
        Object.values(material).forEach(value => {
          if (value instanceof THREE.Texture) value.dispose();
        });
        material.dispose();
      });
      modelMaterialEntries.length = 0;
      composer = null;
      bloomPass = null;
      composerSetupPromise = null;
    },
  };
}
