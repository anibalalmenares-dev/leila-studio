import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leila Studio — Nails Beauty",
  description: "Reserva tu cita de manicura y pedicura en Leila Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
