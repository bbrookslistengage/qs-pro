import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startEmbeddedJwtListener } from "@/services/embedded-jwt";
import "./index.css";

const queryClient = new QueryClient();

startEmbeddedJwtListener();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
