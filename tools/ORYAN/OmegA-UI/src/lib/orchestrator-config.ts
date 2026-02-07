const getStoredValue = (key: string) => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || "";
};

export const getOrchestratorUrl = () => {
  return (
    getStoredValue("omega_orchestrator_url") ||
    import.meta.env.VITE_OMEGA_ORCHESTRATOR_URL ||
    "http://localhost:8080"
  );
};

export const getOrchestratorKey = () => {
  return getStoredValue("omega_api_key") || import.meta.env.VITE_OMEGA_API_KEY || "";
};

export const getUtilsEnabled = () => {
  const stored = getStoredValue("omega_utils_enabled");
  if (stored) return stored === "1";
  return import.meta.env.VITE_OMEGA_UTILS_ENABLED === "1";
};

export const setOrchestratorConfig = (config: {
  url?: string;
  apiKey?: string;
  utilsEnabled?: boolean;
}) => {
  if (typeof window === "undefined") return;
  if (config.url !== undefined) {
    window.localStorage.setItem("omega_orchestrator_url", config.url);
  }
  if (config.apiKey !== undefined) {
    window.localStorage.setItem("omega_api_key", config.apiKey);
  }
  if (config.utilsEnabled !== undefined) {
    window.localStorage.setItem("omega_utils_enabled", config.utilsEnabled ? "1" : "0");
  }
};

export const getBrainBaseUrl = () => {
  return (
    getStoredValue("omega_brain_url") ||
    import.meta.env.VITE_BRAIN_BASE_URL ||
    ""
  );
};

export const getBrainToken = () => {
  return getStoredValue("omega_brain_token") || import.meta.env.VITE_BRAIN_TOKEN || "";
};

export const setBrainConfig = (config: {
  url?: string;
  token?: string;
}) => {
  if (typeof window === "undefined") return;
  if (config.url !== undefined) {
    window.localStorage.setItem("omega_brain_url", config.url);
  }
  if (config.token !== undefined) {
    window.localStorage.setItem("omega_brain_token", config.token);
  }
};
