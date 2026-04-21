import Link from "next/link";
import { SERVICIOS, CATEGORIAS, formatPrecio, formatDuracion } from "@/lib/servicios";

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(180deg, #fff0f5 0%, #fff8f0 100%)" }}>
      {/* Header */}
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
              <div className="font-script text-lg font-bold" style={{ color: "#c9a84c" }}>Leila Studio</div>
              <div className="text-xs tracking-widest" style={{ color: "#a07830" }}>NAILS BEAUTY</div>
            </div>
          </div>
          <h1 className="font-script text-4xl font-bold" style={{ color: "#c9a84c" }}>
            Leila Studio
          </h1>
          <p className="tracking-[0.3em] text-sm mt-1" style={{ color: "#a07830" }}>NAILS BEAUTY</p>
          <div className="mt-2 flex gap-1 justify-center">
            {"✦✦✦".split("").map((c, i) => (
              <span key={i} style={{ color: "#f0d080" }}>{c}</span>
            ))}
          </div>
        </div>
      </header>

      {/* Botón reservar */}
      <div className="text-center mb-8 px-4">
        <Link href="/reservar" className="btn-gold inline-block text-lg">
          💅 Reservar mi cita
        </Link>
        <p className="mt-3 text-sm" style={{ color: "#888" }}>
          Horario de atención: 7:00 AM — 6:00 PM
        </p>
      </div>

      {/* Servicios */}
      <section className="max-w-2xl mx-auto px-4 pb-12">
        <h2 className="text-center text-2xl font-bold mb-8 font-script" style={{ color: "#c9a84c" }}>
          Nuestros Servicios
        </h2>

        {CATEGORIAS.map((cat) => {
          const servicios = SERVICIOS.filter((s) => s.categoria === cat.id);
          if (!servicios.length) return null;
          return (
            <div key={cat.id} className="mb-6">
              <h3 className="section-title">
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </h3>
              <div className="space-y-3">
                {servicios.map((s) => (
                  <div key={s.id} className="card-elegant p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold" style={{ color: "#2d2d2d" }}>{s.nombre}</p>
                      <p className="text-sm mt-1" style={{ color: "#888" }}>⏱ {formatDuracion(s.duracionMin)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg" style={{ color: "#c9a84c" }}>{formatPrecio(s.precio)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Nota uña adicional */}
        <div
          className="mt-6 p-4 rounded-xl text-center text-sm"
          style={{ background: "#fff0f5", border: "1px dashed #f0d080", color: "#888" }}
        >
          💬 <span className="font-semibold" style={{ color: "#c9a84c" }}>Uña adicional (mantenimiento):</span> $2.500 por uña
        </div>

        {/* Botón reservar abajo */}
        <div className="text-center mt-8">
          <Link href="/reservar" className="btn-gold inline-block text-lg">
            Reservar ahora ✨
          </Link>
        </div>
      </section>
    </main>
  );
}
