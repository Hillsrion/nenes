import { useBustModelCatalog } from './useBustModelCatalog';

export const useDemoBustModelUrls = () => {
  const runtimeConfig = useRuntimeConfig();
  const catalog = useBustModelCatalog();
  const modelsPublicUrl = String(runtimeConfig.public.r2.modelsPublicUrl || "").replace(
    /\/+$/,
    ""
  );
  const monoviewFileName = String(runtimeConfig.public.r2.demoMonoviewModel || "");
  const palpationFileName = String(runtimeConfig.public.r2.palpationModel || "");
  const multiviewFileName = String(runtimeConfig.public.r2.demoMultiviewModel || "");

  const getModelUrl = (fileName: string) => {
    if (!fileName) return "";
    const availableFile = catalog.value.find(model => model.fileName === fileName && model.optimizedFileName)?.optimizedFileName || fileName;
    const encodedName = availableFile.split("/").map(encodeURIComponent).join("/");
    if (import.meta.dev) return `/models/${encodedName}`;
    return modelsPublicUrl
      ? `${modelsPublicUrl}/models/${encodedName}`
      : `/models/${encodedName}`;
  };

  return {
    palpationFileName,
    monoviewFileName,
    multiviewFileName,
    getModelUrl,
  };
};
