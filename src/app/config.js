const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:7860/api";
const DEFAULT_DEV_CITEVE_API_BASE_URL = "http://dev.citeve.pt/texpact-wp2-pps8-balancer-api/api";
const DEFAULT_DEV_CITEVE_ML_SUGGEST_API_BASE_URL = "http://dev.citeve.pt/texpact-wp2-pps8-ml-suggest-api/api";
const DEFAULT_SRV_PUBLIC_API_BASE_URL = "http://194.65.119.155:7860/api";
const ENV_API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL;
const ENV_ML_SUGGEST_API_BASE_URL = import.meta?.env?.VITE_ML_SUGGEST_API_BASE_URL;

const normalizeBaseUrl = (url) => {
  if (typeof url !== "string") return "";
  return url.trim().replace(/\/+$/, "");
};

const getApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return normalizeBaseUrl(ENV_API_BASE_URL || DEFAULT_LOCAL_API_BASE_URL);
  }

  const { hostname } = window.location;

  if (hostname === "dev.citeve.pt") {
    return normalizeBaseUrl(DEFAULT_DEV_CITEVE_API_BASE_URL);
  }

  // Em ambiente local, força sempre a API local com URL absoluta fixa.
  // Isto evita qualquer contaminação por base path da app (ex: /texpact-wp2-pps8-balancer-api).
  if (hostname === "localhost") {
    return normalizeBaseUrl(DEFAULT_LOCAL_API_BASE_URL);
  }
  if (hostname === "192.168.54.202" || hostname === "192.168.105.83") {
    // Cada máquina serve a sua própria API — nunca cruzar para o outro IP.
    return normalizeBaseUrl(`http://${hostname}:7860/api`);
  } else if (hostname === "194.65.119.155") {
    return normalizeBaseUrl(DEFAULT_SRV_PUBLIC_API_BASE_URL);
  } else {
    return normalizeBaseUrl(DEFAULT_DEV_CITEVE_API_BASE_URL);
  }
};

export const API_BASE_URL = getApiBaseUrl();
export const ML_SUGGEST_API_BASE_URL = normalizeBaseUrl(
  ENV_ML_SUGGEST_API_BASE_URL || DEFAULT_DEV_CITEVE_ML_SUGGEST_API_BASE_URL
);
