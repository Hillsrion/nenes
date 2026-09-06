export const useDemoBustModelUrls = () => {
  const runtimeConfig = useRuntimeConfig();
  const modelsPublicUrl = String(runtimeConfig.public.r2.modelsPublicUrl || "").replace(
    /\/+$/,
    ""
  );
  const monoviewFileName = String(runtimeConfig.public.r2.demoMonoviewModel || "");
  const multiviewFileName = String(runtimeConfig.public.r2.demoMultiviewModel || "");

  const getModelUrl = (fileName: string) => {
    if (!fileName) return "";
    const encodedName = fileName.split("/").map(encodeURIComponent).join("/");
    if (import.meta.dev) return `/models/${encodedName}`;
    return modelsPublicUrl
      ? `${modelsPublicUrl}/models/${encodedName}`
      : `/models/${encodedName}`;
  };

  return {
    monoviewFileName,
    multiviewFileName,
    getModelUrl,
  };
};
