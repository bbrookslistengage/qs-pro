import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuthStore } from "@/store/auth-store";
import { Toaster } from "@/components/ui/sonner";
import { PreviewEditorWorkspacePage } from "@/preview/PreviewEditorWorkspacePage";

const PREVIEW_USER = {
  id: "preview-user",
  sfUserId: "preview-sf-user",
  email: "preview@example.com",
  name: "Preview User",
};

const PREVIEW_TENANT = {
  id: "preview-tenant",
  eid: "preview-eid",
  tssd: "preview",
};

export default function App() {
  const { isAuthenticated, setAuth } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) return;
    setAuth(PREVIEW_USER, PREVIEW_TENANT, null);
  }, [isAuthenticated, setAuth]);

  return (
    <AppShell
      topNotice={
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium">
            Preview Mode — using local sample metadata (no org connection).
          </span>
          <span className="text-[11px] opacity-80">
            Run the normal dev server to connect to an org.
          </span>
        </div>
      }
    >
      <PreviewEditorWorkspacePage />
      <Toaster />
    </AppShell>
  );
}
