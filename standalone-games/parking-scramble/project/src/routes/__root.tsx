import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import "../styles.css";
import appCss from "../styles.css?url";

const APP_NAME = "Parking Scramble";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${APP_NAME} · Lake Louise & Moraine Lake` },
      { name: "description", content: "A dawn arcade about the Lake Louise and Moraine Lake parking scramble. Beat the convoy. Stop inside the lines." },
      { name: "theme-color", content: "#102033" },
    ],
    links: [
      { rel: "stylesheet", href: import.meta.env.DEV ? appCss : "/game.css" },
      { rel: "icon", sizes: "16x16 32x32 48x48 64x64", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon.png" },

      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,650&family=Outfit:wght@380;500;600&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
