const DEFAULT_LOCAL_API_BASE_URL = "http://192.168.54.202:7860/api";
const DEFAULT_DEV_CITEVE_API_BASE_URL = "http://dev.citeve.pt/texpact-wp2-pps8-balancer-api/api";
const ENV_API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL;

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
  if (hostname === "192.168.54.202") {
    return "http://192.168.54.202:7860/api";
  }

  return normalizeBaseUrl(ENV_API_BASE_URL || DEFAULT_LOCAL_API_BASE_URL);
};

export const API_BASE_URL = getApiBaseUrl();
