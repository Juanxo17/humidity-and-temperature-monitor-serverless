import { Dashboard } from "@/components/Dashboard";

// page.tsx = la ruta "/". Es un Server Component: en el build genera el HTML
// inicial (el esqueleto de carga) y el navegador "hidrata" <Dashboard />,
// que es un Client Component y hace todo el fetch.
export default function Home() {
  return <Dashboard />;
}
