"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { CATEGORIAS, formatPrecio, formatDuracion } from "@/lib/servicios";
import type { Servicio } from "@/lib/servicios";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const visto = sessionStorage.getItem("splash_visto");
    if (visto) setShowSplash(false);
  }, []);

  const continuar = useCallback(() => {
    sessionStorage.setItem("splash_visto", "1");
    setShowSplash(false);
  }, []);

  if (!mounted) return <SplashScreen onContinuar={() => {}} />;
  if (showSplash) return <SplashScreen onContinuar={continuar} />;
  return <HomeContent />;
}

/* ─────────────── SPLASH SCREEN ─────────────── */

function SplashScreen({ onContinuar }: { onContinuar: () => void }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #fff0f5 0%, #fffaf0 50%, #fce4ec 100%)" }}
    >
      {/* Overlay degradado */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,240,245,0.85) 0%, rgba(255,248,240,0.7) 40%, rgba(252,228,236,0.9) 100%)",
        }}
      />

      {/* Contenido */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-md mx-auto px-6 py-10 flex-1">
        {/* Logo */}
        <div className="mt-4 mb-6 text-center">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #f8bbd0, #fff0f5)",
              border: "3px solid #c9a84c",
              boxShadow: "0 8px 32px rgba(201,168,76,0.35), 0 2px 12px rgba(233,30,140,0.1)",
            }}
          >
            <div className="text-center">
              <div className="text-4xl">👑</div>
              <div className="text-xs font-bold tracking-wider" style={{ color: "#c9a84c" }}>
                Leila
              </div>
            </div>
          </div>
          <h1
            className="font-script text-5xl font-bold mb-1"
            style={{ color: "#c9a84c", textShadow: "0 2px 8px rgba(201,168,76,0.2)" }}
          >
            Leila Studio
          </h1>
          <p className="tracking-[0.35em] text-xs font-semibold" style={{ color: "#a07830" }}>
            NAILS BEAUTY
          </p>
          <div className="flex justify-center gap-2 mt-2">
            {["✦", "✦", "✦"].map((s, i) => (
              <span key={i} style={{ color: "#f0d080", fontSize: "0.7rem" }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Mensaje bienvenida */}
        <div className="text-center mb-8 px-2">
          <p
            className="font-script text-2xl font-bold mb-2"
            style={{ color: "#c9a84c" }}
          >
            Bienvenida a tu espacio de belleza
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#a07830" }}>
            Donde cada detalle transforma tu imagen.
            <br />
            Uñas con alma, arte con precisión. ✨
          </p>
        </div>

        {/* Botón continuar */}
        <button
          onClick={onContinuar}
          className="btn-gold text-lg w-full max-w-xs"
          style={{ letterSpacing: "0.05em" }}
        >
          💅 Continuar con tu agenda
        </button>

        <p className="mt-4 text-xs" style={{ color: "#bbb" }}>
          Horario: 7:00 AM — 6:00 PM
        </p>
      </div>
    </div>
  );
}

/* ─────────────── HOME CONTENT ─────────────── */

function HomeContent() {
  const [servicios, setServicios] = useState<Servicio[]>([]);

  useEffect(() => {
    fetch("/api/servicios").then((r) => r.json()).then((d) => setServicios(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  return (
    <main
      className="min-h-screen"
      style={{ background: "linear-gradient(180deg, #fff0f5 0%, #fff8f0 100%)" }}
    >
      <header className="text-center py-10 px-4">
        <div className="inline-flex flex-col items-center">
          <div
            className="w-36 h-36 rounded-full flex items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, #f8bbd0, #e91e8c22)",
              border: "3px solid #c9a84c",
              boxShadow: "0 8px 30px rgba(201,168,76,0.3)",
            }}
          >
            <div className="text-center">
              <div className="text-4xl">👑</div>
              <div className="font-script text-lg font-bold" style={{ color: "#c9a84c" }}>
                Leila Studio
              </div>
              <div className="text-xs tracking-widest" style={{ color: "#a07830" }}>
                NAILS BEAUTY
              </div>
            </div>
          </div>
          <h1 className="font-script text-4xl font-bold" style={{ color: "#c9a84c" }}>
            Leila Studio
          </h1>
          <p className="tracking-[0.3em] text-sm mt-1" style={{ color: "#a07830" }}>
            NAILS BEAUTY
          </p>
          <div className="mt-2 flex gap-1 justify-center">
            {["✦", "✦", "✦"].map((c, i) => (
              <span key={i} style={{ color: "#f0d080" }}>{c}</span>
            ))}
          </div>
        </div>
      </header>

      <div className="text-center mb-8 px-4">
        <Link href="/reservar" className="btn-gold inline-block text-lg">
          💅 Reservar mi cita
        </Link>
        <p className="mt-3 text-sm" style={{ color: "#888" }}>
          Horario de atención: 7:00 AM — 6:00 PM
        </p>
      </div>

      <section className="max-w-2xl mx-auto px-4 pb-12">
        <h2
          className="text-center text-2xl font-bold mb-8 font-script"
          style={{ color: "#c9a84c" }}
        >
          Nuestros Servicios
        </h2>

        {CATEGORIAS.map((cat) => {
          const srvCat = servicios.filter((s) => s.categoria === cat.id);
          if (!srvCat.length) return null;
          return (
            <div key={cat.id} className="mb-6">
              <h3 className="section-title">
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </h3>
              <div className="space-y-3">
                {srvCat.map((s) => (
                  <div
                    key={s.id}
                    className="card-elegant p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold" style={{ color: "#2d2d2d" }}>
                        {s.nombre}
                      </p>
                      <p className="text-sm mt-1" style={{ color: "#888" }}>
                        ⏱ {formatDuracion(s.duracionMin)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg" style={{ color: "#c9a84c" }}>
                        {formatPrecio(s.precio)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div
          className="mt-6 p-4 rounded-xl text-center text-sm"
          style={{
            background: "#fff0f5",
            border: "1px dashed #f0d080",
            color: "#888",
          }}
        >
          💬{" "}
          <span className="font-semibold" style={{ color: "#c9a84c" }}>
            Uña adicional (mantenimiento):
          </span>{" "}
          $2.500 por uña
        </div>

        <div className="text-center mt-8">
          <Link href="/reservar" className="btn-gold inline-block text-lg">
            Reservar ahora ✨
          </Link>
        </div>
      </section>
    </main>
  );
}
