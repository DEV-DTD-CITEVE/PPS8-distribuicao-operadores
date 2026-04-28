const LOCAL_API_BASE_URL =
  ((import.meta?.env?.VITE_API_BASE_URL) || "http://192.168.54.202:7860/api");

const DEV_CITEVE_API_BASE_URL = "http://dev.citeve.pt/texpact-wp2-pps8-balancer-api/api";

const getApiBaseUrl = () => {
  if (typeof window === "undefined") return LOCAL_API_BASE_URL;

  const { hostname } = window.location;

  if (hostname === "dev.citeve.pt") {
    return DEV_CITEVE_API_BASE_URL;
  }

  if (hostname === "localhost" || hostname === "192.168.54.202") {
    return LOCAL_API_BASE_URL;
  }

  return LOCAL_API_BASE_URL;
};

export const API_BASE_URL = getApiBaseUrl();
