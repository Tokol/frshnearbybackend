import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import { Sidebar } from "@/components/sidebar";
import "./styles.css";
import "leaflet/dist/leaflet.css";
import "./location-map.css";

export const metadata: Metadata = {
  title: "FRSH Operations",
  description: "FRSH Nearby administration",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Sidebar />
          <main className="shell">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
