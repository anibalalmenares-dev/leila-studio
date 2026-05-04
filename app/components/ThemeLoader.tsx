"use client";
import { useEffect } from "react";
import { aplicarTema, getTema } from "@/lib/temas";

export default function ThemeLoader() {
  useEffect(() => {
    // Aplicar tema guardado en localStorage inmediatamente (sin flash)
    const cached = localStorage.getItem("tema_id");
    if (cached) aplicarTema(getTema(cached));

    // Luego verificar con el servidor
    fetch("/api/tema")
      .then(r => r.json())
      .then(d => {
        const tema = getTema(d.id || "default");
        aplicarTema(tema);
        localStorage.setItem("tema_id", tema.id);
      })
      .catch(() => {});
  }, []);

  return null;
}
