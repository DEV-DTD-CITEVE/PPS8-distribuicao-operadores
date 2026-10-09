import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { StorageProvider } from "./contexts/StorageContext";
import LoginPin from "./pages/LoginPin";
import { getStoredPin, setupApiAuthInterceptors, UNAUTHORIZED_EVENT } from "./utils/apiAuth";

setupApiAuthInterceptors();

export default function App() {
  const [autenticado, setAutenticado] = useState(() => !!getStoredPin());

  useEffect(() => {
    function handleUnauthorized() {
      setAutenticado(false);
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  if (!autenticado) {
    return <LoginPin onSuccess={() => setAutenticado(true)} />;
  }

  return (
    <StorageProvider>
      <RouterProvider router={router} />
    </StorageProvider>
  );
}
