/**
 * File System Access API + IndexedDB
 * Permite ler/escrever num ficheiro JSON real em disco.
 * O FileSystemFileHandle é guardado em IndexedDB para persistir entre sessões.
 */

const DB_NAME = "balanceamento_fsa_v1";
const DB_VERSION = 2;
const STORE_NAME = "handles";
const HANDLE_KEY = "session";
const STORE_SESSION_NAME = "session_data";
const SESSION_KEY = "current";

// ─── IndexedDB helpers ───────────────────────────────────────────────────────

function abrirIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORE_SESSION_NAME)) {
        db.createObjectStore(STORE_SESSION_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarHandleIDB(handle: FileSystemFileHandle): Promise<void> {
  const db = await abrirIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function carregarHandleIDB(): Promise<FileSystemFileHandle | null> {
  const db = await abrirIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = () => resolve((req.result as FileSystemFileHandle) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function limparHandleIDB(): Promise<void> {
  const db = await abrirIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function guardarSessaoIDB(dados: any): Promise<void> {
  const db = await abrirIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSION_NAME, "readwrite");
    tx.objectStore(STORE_SESSION_NAME).put(dados, SESSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function carregarSessaoIDB(): Promise<any | null> {
  const db = await abrirIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSION_NAME, "readonly");
    const req = tx.objectStore(STORE_SESSION_NAME).get(SESSION_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function limparSessaoIDB(): Promise<void> {
  const db = await abrirIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSION_NAME, "readwrite");
    tx.objectStore(STORE_SESSION_NAME).delete(SESSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── File System Access API ──────────────────────────────────────────────────

export function suportaFSA(): boolean {
  return "showSaveFilePicker" in window;
}

export async function verificarPermissao(handle: FileSystemFileHandle): Promise<PermissionState> {
  // @ts-ignore - FileSystemPermissionMode
  return handle.queryPermission({ mode: "readwrite" });
}

export async function pedirPermissao(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    // @ts-ignore
    const result = await handle.requestPermission({ mode: "readwrite" });
    return result === "granted";
  } catch {
    return false;
  }
}

export async function criarNovoFicheiro(): Promise<FileSystemFileHandle | null> {
  try {
    // @ts-ignore
    const handle: FileSystemFileHandle = await window.showSaveFilePicker({
      suggestedName: "balanceamento_sessao.json",
      types: [
        {
          description: "Ficheiro de Sessão JSON",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    return handle;
  } catch (e: any) {
    if (e.name === "AbortError") return null;
    throw e;
  }
}

export async function abrirFicheiroExistente(): Promise<FileSystemFileHandle | null> {
  try {
    // @ts-ignore
    const [handle]: FileSystemFileHandle[] = await window.showOpenFilePicker({
      types: [
        {
          description: "Ficheiro de Sessão JSON",
          accept: { "application/json": [".json"] },
        },
      ],
      multiple: false,
    });
    return handle;
  } catch (e: any) {
    if (e.name === "AbortError") return null;
    throw e;
  }
}

export async function lerFicheiro(handle: FileSystemFileHandle): Promise<any> {
  const file = await handle.getFile();
  const text = await file.text();
  if (!text.trim()) return null;
  return JSON.parse(text);
}

export async function escreverFicheiro(handle: FileSystemFileHandle, dados: any): Promise<void> {
  // @ts-ignore
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(dados, null, 2));
  await writable.close();
}

// OPFS (Origin Private File System) fallback:
// ficheiro persistente interno do browser, sem picker/permissoes manuais.
const OPFS_FILENAME = "balanceamento_sessao_opfs.json";

export function suportaOPFS(): boolean {
  return typeof navigator !== "undefined" && "storage" in navigator && "getDirectory" in (navigator.storage as any);
}

async function obterRaizOPFS(): Promise<any> {
  // @ts-ignore - API experimental
  return navigator.storage.getDirectory();
}

export async function lerSessaoOPFS(): Promise<any | null> {
  if (!suportaOPFS()) return null;

  try {
    const root = await obterRaizOPFS();
    const handle = await root.getFileHandle(OPFS_FILENAME, { create: false });
    const file = await handle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;
    return JSON.parse(text);
  } catch (e: any) {
    if (e?.name === "NotFoundError") return null;
    throw e;
  }
}

export async function escreverSessaoOPFS(dados: any): Promise<void> {
  if (!suportaOPFS()) return;

  const root = await obterRaizOPFS();
  const handle = await root.getFileHandle(OPFS_FILENAME, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(dados, null, 2));
  await writable.close();
}
