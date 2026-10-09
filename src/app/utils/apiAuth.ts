/**
 * Autenticação por PIN de acesso à API PPS8.
 *
 * A API exige o header `X-API-PIN` em todos os endpoints `/api/...`.
 * Não há sessão nem cookie — o PIN é guardado no browser (sessionStorage)
 * e injectado automaticamente em todos os pedidos axios via interceptor.
 */

import axios from "axios";
import { API_BASE_URL } from "../config";

const PIN_STORAGE_KEY = "pps8_api_pin";

/** Disparado no `window` sempre que a API responde 401 (PIN errado/expirado). */
export const UNAUTHORIZED_EVENT = "pps8:unauthorized";

export function getStoredPin(): string | null {
  return sessionStorage.getItem(PIN_STORAGE_KEY);
}

export function setStoredPin(pin: string): void {
  sessionStorage.setItem(PIN_STORAGE_KEY, pin);
}

export function clearStoredPin(): void {
  sessionStorage.removeItem(PIN_STORAGE_KEY);
}

let interceptorsRegistados = false;

/**
 * Regista os interceptors axios globais (uma única vez).
 * Como todas as páginas importam a instância default do axios,
 * isto cobre todos os pedidos à API sem ser necessário alterar cada chamada.
 */
export function setupApiAuthInterceptors(): void {
  if (interceptorsRegistados) return;
  interceptorsRegistados = true;

  axios.interceptors.request.use((config) => {
    const pin = getStoredPin();
    if (pin) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["X-API-PIN"] = pin;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        clearStoredPin();
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      return Promise.reject(error);
    }
  );
}

/** Testa um PIN directamente contra a API (sem depender do interceptor). */
export async function validatePin(pin: string): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/families/`, {
      headers: { "X-API-PIN": pin },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
