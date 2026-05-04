"use client";
import { useEffect, useState } from "react";

type Seccion = "inicio" | "reservar" | "admin" | "login" | "confirmacion";

export function useFondo(seccion: Seccion) {
  const [fondo, setFondo] = useState("gradiente");

  useEffect(() => {
    fetch("/api/fondo-config")
      .then(r => r.json())
      .then(d => setFondo(d[seccion] || "gradiente"))
      .catch(() => {});
  }, [seccion]);

  if (fondo === "gradiente") return { style: {}, overlay: false, className: "" };

  return {
    style: {
      backgroundImage: `url('/fondos/${fondo}.png')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    },
    overlay: true,
    className: "",
  };
}
