import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

// staleTime 0 + refetch beim Mounten/Fokus -> beim View-Wechsel werden Daten frisch geladen
// (kein Strg+F5 mehr). Mutationen invalidieren gezielt via queryClient.invalidateQueries.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: "always", retry: 1 },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
