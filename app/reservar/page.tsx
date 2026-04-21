"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SERVICIOS, CATEGORIAS, formatPrecio, formatDuracion, calcularAnticipo } from "@/lib/servicios";
import type { Servicio } from "@/lib/servicios";

type Paso = "servicio" | "fecha" | "datos" | "pago";

export default function ReservarPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("servicio");
  const [servicioSel, setServicioSel] = useState<Servicio | null>(null);
  const [fechaSel, setFechaSel] = useState("");
  const [horaSel, setHoraSel] = useState("");
  const [horasDisp, setHorasDisp] = useState<string[]>([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(false);
  const [reservaId, setReservaId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  async function cargarHoras(fecha: string, servicio: Servicio) {
    setCargando(true);
    const res = await fetch(`/api/horas-disponibles?fecha=${fecha}&duracion=${servicio.duracionMin}`);
    const data = await res.json();
    setHorasDisp(data.horas || []);
    setCargando(false);
  }

  async function confirmarReserva() {
    if (!servicioSel || !fechaSel || !horaSel || !nombre || !telefono) return;
    setCargando(true);
    const res = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servicio_id: servicioSel.id,
        servicio_nombre: servicioSel.nombre,
        precio: servicioSel.precio,
        duracion_min: servicioSel.duracionMin,
        fecha: fechaSel,
        hora: horaSel,
        cliente_nombre: nombre,
        cliente_telefono: telefono,
      }),
    });
    const data = await res.json();
    if (data.id) {
      setReservaId(data.id);
      setPaso("pago");
    }
    setCargando(false);
  }

  if (paso === "pago" && servicioSel && reservaId) {
    const anticipo = calcularAnticipo(servicioSel.precio);
    return (
      <PagoPendiente
        reservaId={reservaId}
        servicio={servicioSel}
        fecha={fechaSel}
        hora={horaSel}
        nombre={nombre}
        anticipo={anticipo}
        onVolver={() => router.push("/")}
      />
    );
  }

  return (
    <main className="min-h-screen py-8 px-4" style={{ background: "linear-gradient(180deg, #fff0f5 0%, #fff8f0 100%)" }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-script text-3xl font-bold" style={{ color: "#c9a84c" }}>Leila Studio</h1>
          <p className="tracking-widest text-xs mt-1" style={{ color: "#a07830" }}>RESERVA TU CITA</p>
        </div>

        {/* Indicador de pasos */}
        <PasoIndicador paso={paso} />

        {/* PASO 1: Seleccionar servicio */}
        {paso === "servicio" && (
          <div>
            <h2 className="section-title text-xl mb-4">💅 Elige tu servicio</h2>
            {CATEGORIAS.map((cat) => {
              const servicios = SERVICIOS.filter((s) => s.categoria === cat.id);
              if (!servicios.length) return null;
              return (
                <div key={cat.id} className="mb-5">
                  <h3 className="font-semibold mb-2" style={{ color: "#c9a84c" }}>
                    {cat.emoji} {cat.label}
                  </h3>
                  <div className="space-y-2">
                    {servicios.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setServicioSel(s);
                          setPaso("fecha");
                        }}
                        className="card-elegant w-full p-4 flex justify-between items-center text-left hover:shadow-lg transition-all"
                        style={servicioSel?.id === s.id ? { borderColor: "#c9a84c", background: "#fff0f5" } : {}}
                      >
                        <div>
                          <p className="font-semibold text-sm">{s.nombre}</p>
                          <p className="text-xs mt-1" style={{ color: "#888" }}>⏱ {formatDuracion(s.duracionMin)}</p>
                        </div>
                        <p className="font-bold" style={{ color: "#c9a84c" }}>{formatPrecio(s.precio)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="mt-4 p-3 rounded-xl text-center text-xs" style={{ background: "#fff0f5", border: "1px dashed #f0d080", color: "#888" }}>
              💬 Uña adicional (mantenimiento): $2.500 por uña
            </div>
          </div>
        )}

        {/* PASO 2: Fecha y hora */}
        {paso === "fecha" && servicioSel && (
          <div>
            <button onClick={() => setPaso("servicio")} className="text-sm mb-4 flex items-center gap-1" style={{ color: "#c9a84c" }}>
              ← Cambiar servicio
            </button>
            <div className="card-elegant p-4 mb-4 flex justify-between">
              <div>
                <p className="font-semibold">{servicioSel.nombre}</p>
                <p className="text-sm" style={{ color: "#888" }}>⏱ {formatDuracion(servicioSel.duracionMin)}</p>
              </div>
              <p className="font-bold" style={{ color: "#c9a84c" }}>{formatPrecio(servicioSel.precio)}</p>
            </div>

            <h2 className="section-title text-xl mb-4">📅 Elige la fecha</h2>
            <input
              type="date"
              min={today}
              value={fechaSel}
              onChange={async (e) => {
                setFechaSel(e.target.value);
                setHoraSel("");
                await cargarHoras(e.target.value, servicioSel);
              }}
              className="mb-6"
            />

            {fechaSel && (
              <>
                <h2 className="section-title text-xl mb-4">🕐 Elige la hora</h2>
                {cargando ? (
                  <p className="text-center text-sm" style={{ color: "#888" }}>Cargando horarios...</p>
                ) : horasDisp.length === 0 ? (
                  <p className="text-center text-sm" style={{ color: "#e91e8c" }}>No hay horas disponibles para este día. Elige otra fecha.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {horasDisp.map((h) => (
                      <button
                        key={h}
                        onClick={() => setHoraSel(h)}
                        className="py-2 rounded-lg text-sm font-semibold transition-all"
                        style={
                          horaSel === h
                            ? { background: "linear-gradient(135deg,#c9a84c,#f0d080)", color: "white" }
                            : { background: "#fff0f5", border: "1px solid #f0d080", color: "#c9a84c" }
                        }
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {horaSel && (
              <button
                onClick={() => setPaso("datos")}
                className="btn-gold w-full mt-2"
              >
                Continuar →
              </button>
            )}
          </div>
        )}

        {/* PASO 3: Datos del cliente */}
        {paso === "datos" && servicioSel && (
          <div>
            <button onClick={() => setPaso("fecha")} className="text-sm mb-4 flex items-center gap-1" style={{ color: "#c9a84c" }}>
              ← Cambiar fecha/hora
            </button>
            <div className="card-elegant p-4 mb-6">
              <p className="font-semibold">{servicioSel.nombre}</p>
              <p className="text-sm mt-1" style={{ color: "#888" }}>📅 {fechaSel} a las {horaSel}</p>
              <p className="font-bold mt-1" style={{ color: "#c9a84c" }}>{formatPrecio(servicioSel.precio)}</p>
            </div>

            <h2 className="section-title text-xl mb-4">👤 Tus datos</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1" style={{ color: "#888" }}>Nombre completo</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1" style={{ color: "#888" }}>Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="Ej: 3001234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl" style={{ background: "#fff0f5", border: "1px solid #f0d080" }}>
              <p className="text-sm font-semibold mb-1" style={{ color: "#c9a84c" }}>Anticipo requerido (30%)</p>
              <p className="text-2xl font-bold" style={{ color: "#c9a84c" }}>{formatPrecio(calcularAnticipo(servicioSel.precio))}</p>
              <p className="text-xs mt-1" style={{ color: "#888" }}>
                Deberás pagar este anticipo para confirmar tu reserva. Tienes 30 minutos después de reservar.
              </p>
            </div>

            <button
              onClick={confirmarReserva}
              disabled={!nombre || !telefono || cargando}
              className="btn-gold w-full mt-6"
              style={!nombre || !telefono ? { opacity: 0.5 } : {}}
            >
              {cargando ? "Procesando..." : "Confirmar reserva →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function PasoIndicador({ paso }: { paso: Paso }) {
  const pasos = [
    { id: "servicio", label: "Servicio" },
    { id: "fecha", label: "Fecha" },
    { id: "datos", label: "Datos" },
    { id: "pago", label: "Pago" },
  ];
  const idx = pasos.findIndex((p) => p.id === paso);
  return (
    <div className="flex justify-center gap-2 mb-8">
      {pasos.map((p, i) => (
        <div key={p.id} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={
              i <= idx
                ? { background: "linear-gradient(135deg,#c9a84c,#f0d080)", color: "white" }
                : { background: "#f0e0e8", color: "#bbb" }
            }
          >
            {i + 1}
          </div>
          {i < pasos.length - 1 && (
            <div className="w-6 h-0.5" style={{ background: i < idx ? "#c9a84c" : "#f0e0e8" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function PagoPendiente({
  reservaId, servicio, fecha, hora, nombre, anticipo, onVolver,
}: {
  reservaId: string;
  servicio: Servicio;
  fecha: string;
  hora: string;
  nombre: string;
  anticipo: number;
  onVolver: () => void;
}) {
  return (
    <main className="min-h-screen py-8 px-4" style={{ background: "linear-gradient(180deg, #fff0f5 0%, #fff8f0 100%)" }}>
      <div className="max-w-xl mx-auto text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="font-script text-3xl font-bold mb-2" style={{ color: "#c9a84c" }}>¡Reserva recibida!</h1>
        <p className="text-sm mb-6" style={{ color: "#888" }}>Hola {nombre}, tu cita está pendiente de confirmación de pago.</p>

        <div className="card-elegant p-6 text-left mb-6">
          <p className="font-semibold text-lg mb-3" style={{ color: "#c9a84c" }}>Resumen de tu cita</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: "#888" }}>Servicio:</span><span className="font-semibold">{servicio.nombre}</span></div>
            <div className="flex justify-between"><span style={{ color: "#888" }}>Fecha:</span><span className="font-semibold">{fecha}</span></div>
            <div className="flex justify-between"><span style={{ color: "#888" }}>Hora:</span><span className="font-semibold">{hora}</span></div>
            <div className="flex justify-between"><span style={{ color: "#888" }}>Total:</span><span className="font-semibold">{formatPrecio(servicio.precio)}</span></div>
            <hr style={{ borderColor: "#f0d080" }} />
            <div className="flex justify-between text-base font-bold">
              <span style={{ color: "#c9a84c" }}>Anticipo a pagar (30%):</span>
              <span style={{ color: "#c9a84c" }}>{formatPrecio(anticipo)}</span>
            </div>
          </div>
        </div>

        <div className="card-elegant p-6 text-left mb-4">
          <p className="font-semibold mb-3" style={{ color: "#c9a84c" }}>💳 Métodos de pago</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#fff0f5" }}>
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-semibold text-sm">Nequi</p>
                <p className="font-bold text-lg" style={{ color: "#c9a84c" }}>3234661252</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#fff0f5" }}>
              <span className="text-2xl">🏦</span>
              <div>
                <p className="font-semibold text-sm">Bancolombia</p>
                <p className="font-bold text-lg" style={{ color: "#c9a84c" }}>65629075474</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl mb-6 text-sm" style={{ background: "#fff3cd", border: "1px solid #f0d080" }}>
          ⚠️ <strong>Importante:</strong> Tienes <strong>30 minutos</strong> para realizar el pago del anticipo. Después de pagar, envía el comprobante por WhatsApp para confirmar tu cita.
        </div>

        <p className="text-xs mb-6" style={{ color: "#aaa" }}>ID de reserva: {reservaId}</p>

        <button onClick={onVolver} className="btn-rose">
          Volver al inicio
        </button>
      </div>
    </main>
  );
}
