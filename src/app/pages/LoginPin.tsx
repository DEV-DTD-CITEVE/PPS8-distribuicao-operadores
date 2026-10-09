import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { setStoredPin, validatePin } from "../utils/apiAuth";

export default function LoginPin({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState(false);
  const [aValidar, setAValidar] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pinLimpo = pin.trim();
    if (!pinLimpo || aValidar) return;

    setAValidar(true);
    setErro(false);

    const valido = await validatePin(pinLimpo);

    setAValidar(false);

    if (!valido) {
      setErro(true);
      return;
    }

    setStoredPin(pinLimpo);
    onSuccess();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-[360px] bg-white border border-gray-200 rounded-sm shadow-xl p-8 space-y-5"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-[#2d2d2d] rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-lg font-semibold text-gray-900">Acesso restrito</h1>
            <p className="text-sm text-gray-500">
              Introduza o PIN de acesso para continuar.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Input
            type="password"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setErro(false);
            }}
            placeholder="PIN de acesso"
            aria-invalid={erro}
          />
          {erro && (
            <p role="alert" className="text-xs text-red-600">
              PIN inválido. Tente novamente.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={aValidar || !pin.trim()}
          className="w-full bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {aValidar && <Loader2 className="w-4 h-4 animate-spin" />}
          {aValidar ? "A validar..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
