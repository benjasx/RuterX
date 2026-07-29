import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // 🚀 1. IMPORTAMOS TANSTACK
import "./index.css";
import "leaflet/dist/leaflet.css";
import RuterMapas from "./RuterMapas";

// 🚀 2. CREAMOS EL CEREBRO DE LA CACHÉ
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos sin volver a consultar a Firebase (0 lecturas gastadas)
      refetchOnWindowFocus: false, // No recargar automáticamente al cambiar de pestaña
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* 🚀 3. ENVOLVEMOS TU APP */}
    <QueryClientProvider client={queryClient}>
      <RuterMapas />
    </QueryClientProvider>
  </StrictMode>,
);
