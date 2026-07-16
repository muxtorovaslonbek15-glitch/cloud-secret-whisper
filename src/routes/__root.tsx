import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LanguageProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AGRO YORDAMCHI — Qishloq xo'jaligi texnika va ustalar platformasi" },
      { name: "description", content: "Fermerlar uchun texnika ijarasi, usta chaqirish, AI diagnostika, hosil bozori va agro xizmatlar — barchasi bitta platformada." },
      { name: "author", content: "AGRO YORDAMCHI" },
      { property: "og:title", content: "AGRO YORDAMCHI — Qishloq xo'jaligi texnika va ustalar platformasi" },
      { property: "og:description", content: "Fermerlar uchun texnika ijarasi, usta chaqirish, AI diagnostika, hosil bozori va agro xizmatlar — barchasi bitta platformada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@agroyordamchi" },
      { name: "twitter:title", content: "AGRO YORDAMCHI — Qishloq xo'jaligi texnika va ustalar platformasi" },
      { name: "twitter:description", content: "Fermerlar uchun texnika ijarasi, usta chaqirish, AI diagnostika, hosil bozori va agro xizmatlar — barchasi bitta platformada." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/919c7626-1578-4c1e-9d49-61fdb75df594" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/919c7626-1578-4c1e-9d49-61fdb75df594" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
    ],
    scripts: [
      {
        children: `if('serviceWorker' in navigator){const h=location.hostname;const bad=h.startsWith('id-preview--')||h.startsWith('preview--')||h.endsWith('.lovableproject.com')||h.endsWith('.lovableproject-dev.com')||h.endsWith('.beta.lovable.dev')||window.self!==window.top||new URLSearchParams(location.search).get('sw')==='off';if(bad){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>{if((r.active&&r.active.scriptURL||'').endsWith('/sw.js'))r.unregister();}));}}`,
      },
    ],
  }),
  head: () => ({
    meta: [
      { name: "theme-color", content: "#16a34a" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster richColors position="top-right" />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
