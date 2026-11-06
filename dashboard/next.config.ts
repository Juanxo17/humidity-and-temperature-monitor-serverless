import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera un sitio 100 % estático en ./out (HTML + CSS + JS) para alojarlo en S3.
  // No hay servidor: nada de rutas API, server actions ni SSR.
  output: "export",

  // El optimizador de imágenes de Next necesita un servidor; en export estático se desactiva.
  images: { unoptimized: true },

  // /ruta -> /ruta/index.html. S3 sirve index.html dentro de cada "carpeta" sin reglas extra.
  trailingSlash: true,

  // Tailwind v4 procesado por Turbopack (generado por create-next-app).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
