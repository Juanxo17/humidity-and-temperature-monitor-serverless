import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Fuente variable: pesos 100–700 y ancho 75–100 (condensada) en un solo archivo.
// next/font la descarga al compilar y la sirve desde el propio sitio.
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-plex",
  display: "swap",
});

// Server Component: se ejecuta en el build y genera <head> con estos metadatos.
export const metadata: Metadata = {
  title: "Monitor de racks · rack01",
  description: "Temperatura, humedad y control de ventilación de racks de TI en tiempo real.",
};

export const viewport: Viewport = {
  themeColor: "#0d141c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${plex.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
