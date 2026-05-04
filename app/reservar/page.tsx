"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIAS, formatPrecio, formatDuracion, calcularAnticipo } from "@/lib/servicios";
import type { Servicio } from "@/lib/servicios";
import { useFondo } from "@/lib/useFondo";

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
}

type Paso = "servicio" | "fecha" | "trabajador" | "datos" | "pago";
type TrabajadorDisp = { id: string; nombre: string; especialidad: string };
type RifaInfo = { id: string; nombre: string; premio: string; fecha_sorteo: string; tipo: "gratis" | "pago"; precio_ticket: number; max_tickets: number; max_por_persona: number; tickets_confirmados: number };
type PasoRifa = "banner" | "formulario" | "pago_ticket" | "listo" | null;

export default function ReservarPage() {
  return <Suspense><ReservarInner /></Suspense>;
}

function ReservarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramServicioId = searchParams.get("servicio");
  const paramRifaId = searchParams.get("rifa");
  const paramNombre = searchParams.get("pnombre") || "";
  const paramTel = searchParams.get("ptel") || "";
  const esPremio = !!paramServicioId;
  const [paso, setPaso] = useState<Paso>("servicio");
  const [cargandoInicio, setCargandoInicio] = useState(!!paramServicioId);
  const [servicioSel, setServicioSel] = useState<Servicio | null>(null);
  const [fechaSel, setFechaSel] = useState("");
  const [horaSel, setHoraSel] = useState("");
  const [horasDisp, setHorasDisp] = useState<string[]>([]);
  const [nombre, setNombre] = useState(paramNombre);
  const [telefono, setTelefono] = useState(paramTel);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [reservaId, setReservaId] = useState<string | null>(null);
  const [domingoSel, setDomingoSel] = useState(false);
  const [trabajadores, setTrabajadores] = useState<TrabajadorDisp[]>([]);
  const [trabajadorSel, setTrabajadorSel] = useState<string>("cualquiera");
  const [mostrarTrabajadores, setMostrarTrabajadores] = useState(false);
  const [anticipoActivo, setAnticipoActivo] = useState(true);
  const [anticipoTipo, setAnticipoTipo] = useState<"fijo" | "porcentaje">("fijo");
  const [anticipoMonto, setAnticipoMonto] = useState(10000);
  const [anticipoPorcentaje, setAnticipoPorcentaje] = useState(30);
  const [promo, setPromo] = useState<{ activa: boolean; porcentaje: number } | null>(null);
  const [unaAdicional, setUnaAdicional] = useState(2500);
  const [rifa, setRifa] = useState<RifaInfo | null>(null);
  const [bannerCerrado, setBannerCerrado] = useState(false);
  const [pasoRifa, setPasoRifa] = useState<PasoRifa>(null);
  const [rifaNombre, setRifaNombre] = useState("");
  const [rifaTelefono, setRifaTelefono] = useState("");
  const [rifaCantidad, setRifaCantidad] = useState(1);
  const [rifaTicketId, setRifaTicketId] = useState("");
  const [rifaTotal, setRifaTotal] = useState(0);
  const [rifaNumeros, setRifaNumeros] = useState<string[]>([]);
  const [rifaCargando, setRifaCargando] = useState(false);
  const [metodosPago, setMetodosPago] = useState<{ id: string; nombre: string; numero: string }[]>([]);
  const [premioRifaNombre, setPremioRifaNombre] = useState("");
  const fondo = useFondo("reservar");

  useEffect(() => {
    fetch("/api/servicios").then((r) => r.json()).then((d) => {
      const lista = Array.isArray(d) ? d : [];
      setServicios(lista);
      if (paramServicioId) {
        const srv = lista.find((s: { id: string }) => s.id === paramServicioId);
        if (srv) { setServicioSel(srv); setPaso("fecha"); }
      }
      setCargandoInicio(false);
    }).catch(() => { setCargandoInicio(false); });
    fetch("/api/rifas").then(r => r.json()).then(d => { if (d && d.id) { setRifa(d); if (esPremio) setPremioRifaNombre(d.nombre || ""); } }).catch(() => {});
    if (paramRifaId && (!paramNombre || !paramTel)) {
      fetch(`/api/rifas/${paramRifaId}`).then(r => r.json()).then(d => {
        if (d.ganador_nombre && !paramNombre) setNombre(d.ganador_nombre);
        if (d.ganador_telefono && !paramTel) setTelefono(d.ganador_telefono);
        if (d.nombre && esPremio) setPremioRifaNombre(d.nombre);
      }).catch(() => {});
    }
    fetch("/api/metodos-pago").then(r => r.json()).then(d => setMetodosPago(d.metodos || [])).catch(() => {});
    fetch("/api/anticipo-config").then(r => r.json()).then(d => {
      setAnticipoActivo(d.activo !== false);
      setAnticipoTipo(d.tipo === "porcentaje" ? "porcentaje" : "fijo");
      setAnticipoMonto(Number(d.monto ?? 10000));
      setAnticipoPorcentaje(Number(d.porcentaje ?? 30));
    }).catch(() => {});
    fetch("/api/promocion-activa").then(r => r.json()).then(d => setPromo(d)).catch(() => {});
    fetch("/api/extras-config").then(r => r.json()).then(d => setUnaAdicional(Number(d.unaAdicional ?? 2500))).catch(() => {});
  }, []);

  async function cargarPromo(fecha: string) {
    fetch(`/api/promocion-activa?fecha=${fecha}`).then(r => r.json()).then(d => setPromo(d)).catch(() => {});
  }

  function precioFinal(precio: number): number {
    if (!promo?.activa) return precio;
    return Math.round(precio * (1 - promo.porcentaje / 100));
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  function esDomingo(fecha: string): boolean {
    const [y, m, d] = fecha.split("-").map(Number);
    return new Date(y, m - 1, d).getDay() === 0;
  }

  async function cargarHoras(fecha: string, servicio: Servicio) {
    if (esDomingo(fecha)) { setDomingoSel(true); setHorasDisp([]); return; }
    setDomingoSel(false);
    setCargando(true);
    cargarPromo(fecha);
    const res = await fetch(`/api/horas-disponibles?fecha=${fecha}&duracion=${servicio.duracionMin}&categoria=${servicio.categoria}`);
    const data = await res.json();
    setHorasDisp(data.horas || []);
    setCargando(false);
  }

  async function seleccionarHora(hora: string) {
    setHoraSel(hora);
    if (!servicioSel || !fechaSel) return;
    const res = await fetch(`/api/trabajadores-disponibles?fecha=${fechaSel}&hora=${hora}&duracion=${servicioSel.duracionMin}&categoria=${servicioSel.categoria}`);
    const data = await res.json();
    const lista: TrabajadorDisp[] = data.trabajadores || [];
    setTrabajadores(lista);
    setTrabajadorSel(lista.length === 1 ? lista[0].id : "cualquiera");
    setMostrarTrabajadores(lista.length >= 1);
  }

  async function inscribirseRifa() {
    if (!rifa || !rifaNombre || !rifaTelefono) return;
    setRifaCargando(true);
    const res = await fetch(`/api/rifas/${rifa.id}/inscribir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: rifaNombre, telefono: rifaTelefono, cantidad: rifaCantidad }),
    });
    const data = await res.json();
    setRifaCargando(false);
    if (!res.ok) { alert(data.error || "Error al inscribirse"); return; }
    setRifaTicketId(data.ticket_id);
    setRifaTotal(data.total);
    setRifaNumeros(data.numeros || []);
    if (data.estado === "confirmado") {
      setPasoRifa("listo");
    } else {
      setPasoRifa("pago_ticket");
    }
  }

  async function confirmarReserva() {
    if (!servicioSel || !fechaSel || !horaSel || !nombre || !telefono) return;
    setCargando(true);
    const trabajadorElegido = trabajadorSel === "cualquiera"
      ? (trabajadores.length === 1 ? trabajadores[0] : null)
      : trabajadores.find(t => t.id === trabajadorSel) || null;

    const res = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        servicio_id: servicioSel.id,
        servicio_nombre: servicioSel.nombre,
        precio: precioFinal(servicioSel.precio),
        duracion_min: servicioSel.duracionMin,
        fecha: fechaSel,
        hora: horaSel,
        cliente_nombre: nombre,
        cliente_telefono: telefono,
        trabajador_id: trabajadorElegido?.id || null,
        trabajador_nombre: trabajadorElegido?.nombre || null,
        ...(esPremio ? { es_premio_rifa: true, rifa_id: paramRifaId, rifa_nombre: premioRifaNombre } : {}),
      }),
    });
    const data = await res.json();
    if (data.id) {
      setReservaId(data.id);
      setPaso("pago");
    }
    setCargando(false);
  }

  if (cargandoInicio) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, var(--c-primary-bg) 0%, var(--c-bg-to) 100%)" }}>
        <div className="text-center">
          <p className="text-3xl mb-3">💅</p>
          <p className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>Preparando tu premio...</p>
        </div>
      </main>
    );
  }

  if (paso === "pago" && servicioSel && reservaId) {
    if (esPremio) {
      return (
        <main className="min-h-screen flex items-center justify-center py-8 px-4"
          style={{ background: "linear-gradient(180deg,#fef9c3 0%,#fef3c7 100%)" }}>
          <div className="max-w-sm w-full text-center">
            <p className="text-5xl mb-4">🏆</p>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#92400e" }}>¡Cita agendada!</h2>
            <p className="text-sm mb-1" style={{ color: "#a16207" }}>Tu premio ha sido reservado exitosamente</p>
            <div className="my-5 card-elegant p-5 text-left">
              <p className="font-semibold mb-1">📋 Resumen</p>
              <p className="text-sm" style={{ color: "#555" }}>💅 {servicioSel.nombre}</p>
              <p className="text-sm mt-1" style={{ color: "#555" }}>📅 {fechaSel.split("-").reverse().join("/")} · 🕐 {horaSel}</p>
              <p className="text-sm mt-1" style={{ color: "#555" }}>👤 {nombre}</p>
            </div>
            <p className="text-xs mb-5" style={{ color: "#a16207" }}>Pronto te contactaremos para confirmar los detalles. ¡Te esperamos! 💖</p>
            <button onClick={() => router.push("/")} className="btn-gold w-full">Volver al inicio</button>
          </div>
        </main>
      );
    }
    return (
      <PagoPendiente
        reservaId={reservaId}
        servicio={servicioSel}
        precioTotal={precioFinal(servicioSel.precio)}
        fecha={fechaSel}
        hora={horaSel}
        nombre={nombre}
        anticipo={anticipoActivo ? (anticipoTipo === "porcentaje" && servicioSel ? Math.round(precioFinal(servicioSel.precio) * anticipoPorcentaje / 100) : anticipoMonto) : 0}
        anticipoActivo={anticipoActivo}
        onVolver={() => router.push("/")}
      />
    );
  }

  return (
    <main className="min-h-screen py-8 px-4 relative"
      style={fondo.overlay ? fondo.style : { background: "linear-gradient(180deg, var(--c-primary-bg) 0%, var(--c-bg-to) 100%)" }}>
      {fondo.overlay && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px]" style={{ zIndex: 0 }} />}
      <div className="max-w-xl mx-auto relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-script text-3xl font-bold" style={{ color: "var(--c-primary)" }}>Leila Studio</h1>
          <p className="tracking-widest text-xs mt-1" style={{ color: "var(--c-primary-dark)" }}>RESERVA TU CITA</p>
        </div>

        {/* Banner Premio Rifa */}
        {esPremio && servicioSel && (
          <div className="mb-6 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#fef9c3,#fef3c7)", border: "2px solid #f59e0b" }}>
            <span className="text-2xl">🏆</span>
            <div>
              <p className="font-bold text-sm" style={{ color: "#92400e" }}>Estás agendando tu premio</p>
              <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>{servicioSel.nombre}{premioRifaNombre ? ` · ${premioRifaNombre}` : ""}</p>
              <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>Solo elige fecha y hora — el servicio ya está listo para ti 💖</p>
            </div>
          </div>
        )}

        {/* Banner Rifa */}
        {rifa && !bannerCerrado && paso === "servicio" && !pasoRifa && !esPremio && (
          <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: "2px solid #a78bfa", boxShadow: "0 4px 20px rgba(167,139,250,0.25)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)" }}>
              <p className="text-white font-bold text-sm">🎟️ ¡Participa en nuestra rifa!</p>
              <button onClick={() => setBannerCerrado(true)} className="text-white/80 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="px-4 py-4" style={{ background: "#faf5ff" }}>
              <p className="font-semibold text-sm mb-0.5" style={{ color: "#4c1d95" }}>{rifa.nombre}</p>
              <p className="text-sm mb-1" style={{ color: "#6d28d9" }}>🎁 {rifa.premio}</p>
              <div className="flex items-center gap-3 text-xs mb-3" style={{ color: "#7c3aed" }}>
                {rifa.max_tickets > 0 && <span>🎫 {rifa.max_tickets - rifa.tickets_confirmados} tickets disponibles</span>}
                {rifa.tipo === "pago" && <span>💵 {formatPrecio(rifa.precio_ticket)} por ticket</span>}
                {rifa.tipo === "gratis" && <span>🆓 ¡Entrada gratis!</span>}
                <span>📅 Sorteo: {rifa.fecha_sorteo.split("-").reverse().join("/")}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setRifaNombre(nombre); setRifaTelefono(telefono); setPasoRifa("formulario"); }}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)" }}>
                  🎟️ Quiero participar
                </button>
                <button onClick={() => setBannerCerrado(true)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "white", border: "1.5px solid #c4b5fd", color: "#7c3aed" }}>
                  No, gracias
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal inscripción rifa — formulario */}
        {pasoRifa === "formulario" && rifa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
            <div className="card-elegant p-6 w-full max-w-sm">
              <h3 className="font-bold text-lg mb-1" style={{ color: "#7c3aed" }}>🎟️ {rifa.nombre}</h3>
              <p className="text-sm mb-4" style={{ color: "#888" }}>🎁 {rifa.premio}</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Tu nombre completo</label>
                  <input type="text" placeholder="Nombre" value={rifaNombre} onChange={e => setRifaNombre(toTitleCase(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Tu WhatsApp</label>
                  <input type="tel" placeholder="3001234567" value={rifaTelefono} onChange={e => setRifaTelefono(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>
                    ¿Cuántos tickets?
                    {rifa.max_por_persona > 0 && <span style={{ color: "#bbb" }}> (máx. {rifa.max_por_persona})</span>}
                  </label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setRifaCantidad(c => Math.max(1, c - 1))}
                      className="w-10 h-10 rounded-full text-xl font-bold flex items-center justify-center"
                      style={{ background: "var(--c-primary-bg)", border: "1.5px solid var(--c-primary-light)", color: "var(--c-primary)" }}>−</button>
                    <span className="text-2xl font-bold w-8 text-center" style={{ color: "#333" }}>{rifaCantidad}</span>
                    <button onClick={() => setRifaCantidad(c => rifa.max_por_persona > 0 ? Math.min(rifa.max_por_persona, c + 1) : c + 1)}
                      className="w-10 h-10 rounded-full text-xl font-bold flex items-center justify-center"
                      style={{ background: "var(--c-primary-bg)", border: "1.5px solid var(--c-primary-light)", color: "var(--c-primary)" }}>+</button>
                    {rifa.tipo === "pago" && (
                      <span className="text-sm font-semibold" style={{ color: "#7c3aed" }}>
                        = {formatPrecio(rifa.precio_ticket * rifaCantidad)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => { setPasoRifa(null); setBannerCerrado(false); }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "white", border: "1.5px solid var(--c-border-soft)", color: "#888" }}>
                  Cancelar
                </button>
                <button onClick={inscribirseRifa} disabled={!rifaNombre || !rifaTelefono || rifaCargando}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", opacity: !rifaNombre || !rifaTelefono ? 0.5 : 1 }}>
                  {rifaCargando ? "Procesando..." : rifa.tipo === "gratis" ? "✅ Confirmar participación" : "Continuar →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal inscripción rifa — instrucciones de pago */}
        {pasoRifa === "pago_ticket" && rifa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
            <div className="card-elegant p-6 w-full max-w-sm" style={{ maxHeight: "90vh", overflowY: "auto" }}>
              <div className="text-center mb-4">
                <p className="text-3xl mb-2">🎟️</p>
                <p className="font-bold text-lg" style={{ color: "#7c3aed" }}>¡Casi listo!</p>
                <p className="text-sm mt-1" style={{ color: "#888" }}>Realiza el pago para confirmar tu participación</p>
              </div>

              {/* Total */}
              <div className="p-4 rounded-xl mb-4 text-center" style={{ background: "#f5f3ff", border: "2px solid #a78bfa" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#7c3aed" }}>Total a pagar</p>
                <p className="text-3xl font-bold" style={{ color: "#7c3aed" }}>{formatPrecio(rifaTotal)}</p>
                <p className="text-xs mt-1" style={{ color: "#888" }}>{rifaCantidad} ticket{rifaCantidad > 1 ? "s" : ""} × {formatPrecio(rifa.precio_ticket)}</p>
              </div>

              {/* Métodos de pago */}
              {metodosPago.length > 0 ? (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2" style={{ color: "var(--c-primary)" }}>💳 Métodos de pago</p>
                  <div className="space-y-2">
                    {metodosPago.map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--c-primary-bg)", border: "1px solid var(--c-primary-light)" }}>
                        <span className="text-xl">{iconoMP(m.nombre)}</span>
                        <div>
                          <p className="font-semibold text-sm">{m.nombre}</p>
                          <p className="font-bold text-base" style={{ color: "var(--c-primary)" }}>{m.numero}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-2" style={{ color: "#888" }}>Después de pagar, avísanos por WhatsApp y confirmaremos tu ticket. 💖</p>
                </div>
              ) : (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "var(--c-primary-bg)" }}>
                  <p className="font-semibold mb-1" style={{ color: "var(--c-primary)" }}>💳 Instrucciones de pago</p>
                  <p style={{ color: "#666" }}>Comunícate con nosotras por WhatsApp para recibir los datos de pago.</p>
                </div>
              )}

              {rifaNumeros.length > 0 && (
                <div className="p-3 rounded-xl mb-4" style={{ background: "#ede9fe", border: "1.5px solid #c4b5fd" }}>
                  <p className="text-xs font-semibold mb-2 text-center" style={{ color: "#6d28d9" }}>🎫 Tus tickets asignados</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {rifaNumeros.map(n => (
                      <span key={n} className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: "#7c3aed", color: "white" }}>{n}</span>
                    ))}
                  </div>
                  <p className="text-xs mt-2 text-center" style={{ color: "#7c3aed" }}>¡Guárdalos, pueden ser los ganadores! 🍀</p>
                </div>
              )}

              <a href={`https://wa.me/573234661252?text=${encodeURIComponent(`Hola! 🎟️ Acabo de inscribirme en la ${rifa.nombre}.\n\nNombre: ${rifaNombre}\nTickets: ${rifaCantidad}${rifaNumeros.length > 0 ? ` (${rifaNumeros.join(", ")})` : ""} (${formatPrecio(rifaTotal)})\n\nYa realicé el pago. ¡Quedo pendiente de confirmación! 💅`)}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-gold w-full mb-3 flex items-center justify-center gap-2 text-sm"
                style={{ textDecoration: "none" }}>
                📲 Ya pagué — Avisar por WhatsApp
              </a>
              <button onClick={() => { setPasoRifa(null); setBannerCerrado(true); }}
                className="w-full py-2 rounded-xl text-sm font-semibold"
                style={{ background: "white", border: "1.5px solid var(--c-border-soft)", color: "#888" }}>
                Cerrar y continuar reservando
              </button>
            </div>
          </div>
        )}

        {/* Modal inscripción rifa — confirmación gratis */}
        {pasoRifa === "listo" && rifa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
            <div className="card-elegant p-6 w-full max-w-sm text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-bold text-lg mb-1" style={{ color: "#7c3aed" }}>¡Ya estás participando!</p>
              <p className="text-sm mb-4" style={{ color: "#888" }}>Tu ticket para la <strong>{rifa.nombre}</strong> ha sido registrado.</p>
              <div className="p-4 rounded-xl mb-4" style={{ background: "#f5f3ff", border: "2px solid #a78bfa" }}>
                <p className="font-semibold text-sm" style={{ color: "#4c1d95" }}>🎁 Premio: {rifa.premio}</p>
                <p className="text-xs mt-1" style={{ color: "#7c3aed" }}>📅 Sorteo: {rifa.fecha_sorteo.split("-").reverse().join("/")}</p>
              </div>
              {rifaNumeros.length > 0 && (
                <div className="p-3 rounded-xl mb-4" style={{ background: "#ede9fe", border: "1.5px solid #c4b5fd" }}>
                  <p className="text-xs font-semibold mb-2 text-center" style={{ color: "#6d28d9" }}>🎫 Tus tickets asignados</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {rifaNumeros.map(n => (
                      <span key={n} className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: "#7c3aed", color: "white" }}>{n}</span>
                    ))}
                  </div>
                  <p className="text-xs mt-2 text-center" style={{ color: "#7c3aed" }}>¡Guárdalos, pueden ser los ganadores! 🍀</p>
                </div>
              )}
              <button onClick={() => { setPasoRifa(null); setBannerCerrado(true); }}
                className="btn-gold w-full">
                ¡Perfecto! Continuar reservando →
              </button>
            </div>
          </div>
        )}

        {/* Indicador de pasos */}
        <PasoIndicador paso={paso} conTrabajador={mostrarTrabajadores} />

        {/* PASO 1: Seleccionar servicio */}
        {paso === "servicio" && (
          <div>
            <h2 className="section-title text-xl mb-4">💅 Elige tu servicio</h2>

            {/* Banner promoción */}
            {promo?.activa && (
              <div className="mb-5 p-4 rounded-2xl text-center"
                style={{ background: "linear-gradient(135deg,#fef9c3,#fef3c7)", border: "2px solid #f59e0b", boxShadow: "0 4px 16px rgba(245,158,11,0.2)" }}>
                <p className="text-base font-black" style={{ color: "#b45309" }}>
                  🎉 ¡Hoy tienes {promo.porcentaje}% de descuento en todos los servicios!
                </p>
                <p className="text-xs mt-1" style={{ color: "#92400e" }}>Solo por hoy 🌸 — Los precios ya se muestran con el descuento</p>
              </div>
            )}

            {CATEGORIAS.map((cat) => {
              const srvCat = servicios.filter((s) => s.categoria === cat.id);
              if (!srvCat.length) return null;
              return (
                <div key={cat.id} className="mb-5">
                  <h3 className="font-semibold mb-2" style={{ color: "var(--c-primary)" }}>
                    {cat.emoji} {cat.label}
                  </h3>
                  <div className="space-y-2">
                    {srvCat.map((s) => {
                      const conDesc = precioFinal(s.precio);
                      const hayDesc = promo?.activa && conDesc !== s.precio;
                      return (
                        <button
                          key={s.id}
                          onClick={() => { setServicioSel(s); setPaso("fecha"); }}
                          className="card-elegant w-full p-4 flex justify-between items-center text-left hover:shadow-lg transition-all"
                          style={servicioSel?.id === s.id ? { borderColor: "var(--c-primary)", background: "var(--c-primary-bg)" } : {}}
                        >
                          <div>
                            <p className="font-semibold text-sm">{s.nombre}</p>
                            <p className="text-xs mt-1" style={{ color: "#888" }}>⏱ {formatDuracion(s.duracionMin)}</p>
                          </div>
                          <div className="text-right">
                            {hayDesc && (
                              <p className="text-xs line-through" style={{ color: "#bbb" }}>{formatPrecio(s.precio)}</p>
                            )}
                            <p className="font-bold" style={{ color: hayDesc ? "#10b981" : "var(--c-primary)" }}>
                              {formatPrecio(conDesc)}
                              {hayDesc && <span className="ml-1 text-xs font-semibold" style={{ color: "#10b981" }}>-{promo!.porcentaje}%</span>}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="mt-4 p-3 rounded-xl text-center text-xs" style={{ background: "var(--c-primary-bg)", border: "1px dashed var(--c-primary-light)", color: "#888" }}>
              💬 Uña adicional (mantenimiento): {formatPrecio(unaAdicional)} por uña
            </div>
          </div>
        )}

        {/* PASO 2: Fecha y hora */}
        {paso === "fecha" && servicioSel && (
          <div>
            {!esPremio && (
              <button onClick={() => setPaso("servicio")} className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--c-primary)" }}>
                ← Cambiar servicio
              </button>
            )}
            <div className="card-elegant p-4 mb-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{servicioSel.nombre}</p>
                <p className="text-sm" style={{ color: "#888" }}>⏱ {formatDuracion(servicioSel.duracionMin)}</p>
              </div>
              {!esPremio && (
                <div className="text-right">
                  {promo?.activa && precioFinal(servicioSel.precio) !== servicioSel.precio && (
                    <p className="text-xs line-through" style={{ color: "#bbb" }}>{formatPrecio(servicioSel.precio)}</p>
                  )}
                  <p className="font-bold" style={{ color: promo?.activa && precioFinal(servicioSel.precio) !== servicioSel.precio ? "#10b981" : "var(--c-primary)" }}>
                    {formatPrecio(precioFinal(servicioSel.precio))}
                  </p>
                </div>
              )}
              {esPremio && <span className="text-sm font-bold" style={{ color: "#15803d" }}>🎁 Premio</span>}
            </div>

            <h2 className="section-title text-xl mb-4">📅 Elige la fecha</h2>
            <input
              type="date"
              min={today}
              value={fechaSel}
              onChange={async (e) => {
                setFechaSel(e.target.value);
                setHoraSel("");
                setDomingoSel(false);
                await cargarHoras(e.target.value, servicioSel);
              }}
              className="mb-6"
            />

            {fechaSel && (
              <>
                <h2 className="section-title text-xl mb-4">🕐 Elige la hora</h2>
                {cargando ? (
                  <p className="text-center text-sm" style={{ color: "#888" }}>Cargando horarios...</p>
                ) : domingoSel ? (
                  <div className="text-center p-4 rounded-xl" style={{ background: "var(--c-primary-bg)", border: "1px dashed var(--c-primary-light)" }}>
                    <p className="text-2xl mb-2">🌸</p>
                    <p className="font-semibold text-sm" style={{ color: "var(--c-primary)" }}>Los domingos no atendemos</p>
                    <p className="text-xs mt-1" style={{ color: "#888" }}>Por favor elige otro día. Atendemos de lunes a sábado. 💅</p>
                  </div>
                ) : horasDisp.length === 0 ? (
                  <p className="text-center text-sm" style={{ color: "#e91e8c" }}>No hay horas disponibles para este día. Elige otra fecha.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {horasDisp.map((h) => (
                      <button
                        key={h}
                        onClick={() => seleccionarHora(h)}
                        className="py-2 rounded-lg text-sm font-semibold transition-all"
                        style={
                          horaSel === h
                            ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
                            : { background: "var(--c-primary-bg)", border: "1px solid var(--c-primary-light)", color: "var(--c-primary)" }
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
                onClick={() => setPaso(mostrarTrabajadores ? "trabajador" : "datos")}
                className="btn-gold w-full mt-2"
              >
                Continuar →
              </button>
            )}
          </div>
        )}

        {/* PASO 3: Selección de trabajador */}
        {paso === "trabajador" && servicioSel && (
          <div>
            <button onClick={() => setPaso("fecha")} className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--c-primary)" }}>
              ← Cambiar hora
            </button>
            <div className="card-elegant p-4 mb-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">{servicioSel.nombre}</p>
                <p className="text-sm" style={{ color: "#888" }}>📅 {fechaSel} · 🕐 {horaSel}</p>
              </div>
              <div className="text-right">
                {promo?.activa && precioFinal(servicioSel.precio) !== servicioSel.precio && (
                  <p className="text-xs line-through" style={{ color: "#bbb" }}>{formatPrecio(servicioSel.precio)}</p>
                )}
                <p className="font-bold" style={{ color: promo?.activa && precioFinal(servicioSel.precio) !== servicioSel.precio ? "#10b981" : "var(--c-primary)" }}>
                  {formatPrecio(precioFinal(servicioSel.precio))}
                </p>
              </div>
            </div>

            <h2 className="section-title text-xl mb-4">✨ ¿Con quién quieres tu cita?</h2>
            <div className="space-y-3 mb-6">
              {[...(trabajadores.length > 1 ? [{ id: "cualquiera", nombre: "Cualquiera disponible", especialidad: "Te asignamos a quien esté libre" }] : []), ...trabajadores].map((t) => {
                const sel = trabajadorSel === t.id;
                const esCualquiera = t.id === "cualquiera";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTrabajadorSel(t.id)}
                    className="w-full text-left transition-all"
                    style={{
                      background: sel ? "linear-gradient(135deg,var(--c-primary-bg),#fffbe8)" : "white",
                      border: sel ? "2px solid var(--c-primary)" : "1.5px solid var(--c-border-soft)",
                      borderRadius: "16px",
                      padding: "16px",
                      boxShadow: sel ? "0 4px 16px var(--c-primary)22" : "0 1px 4px #00000008",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      {/* Avatar */}
                      <div style={{
                        width: "48px", height: "48px", borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
                        background: sel
                          ? "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))"
                          : esCualquiera ? "var(--c-primary-bg)" : "#f5f0ff",
                        border: sel ? "none" : "1.5px solid var(--c-border-soft)",
                      }}>
                        {esCualquiera ? "✨" : "👩"}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontWeight: 700, fontSize: "15px",
                          color: sel ? "var(--c-primary)" : "#333",
                          marginBottom: "2px",
                        }}>{t.nombre}</p>
                        {t.especialidad && (
                          <p style={{ fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {t.especialidad}
                          </p>
                        )}
                      </div>
                      {/* Check */}
                      <div style={{
                        width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: sel ? "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))" : "var(--c-border-soft)",
                        fontSize: "13px",
                      }}>
                        {sel ? "✓" : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={() => setPaso("datos")} className="btn-gold w-full">
              Continuar →
            </button>
          </div>
        )}

        {/* PASO 4: Datos del cliente */}
        {paso === "datos" && servicioSel && (
          <div>
            <button onClick={() => setPaso("fecha")} className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--c-primary)" }}>
              ← Cambiar fecha/hora
            </button>
            <div className="card-elegant p-4 mb-6 flex justify-between items-center">
              <div>
                <p className="font-semibold">{servicioSel.nombre}</p>
                <p className="text-sm mt-1" style={{ color: "#888" }}>📅 {fechaSel} a las {horaSel}</p>
              </div>
              {!esPremio ? (
                <div className="text-right">
                  {promo?.activa && precioFinal(servicioSel.precio) !== servicioSel.precio && (
                    <p className="text-xs line-through" style={{ color: "#bbb" }}>{formatPrecio(servicioSel.precio)}</p>
                  )}
                  <p className="font-bold" style={{ color: promo?.activa && precioFinal(servicioSel.precio) !== servicioSel.precio ? "#10b981" : "var(--c-primary)" }}>
                    {formatPrecio(precioFinal(servicioSel.precio))}
                  </p>
                </div>
              ) : (
                <span className="text-sm font-bold" style={{ color: "#15803d" }}>🎁 Premio</span>
              )}
            </div>

            <h2 className="section-title text-xl mb-4">👤 Tus datos</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1" style={{ color: "#888" }}>Nombre completo</label>
                {esPremio && nombre ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "#f3f4f6", border: "1.5px solid #e5e7eb", color: "#555" }}>
                    <span>🔒</span><span className="font-semibold">{nombre}</span>
                  </div>
                ) : (
                  <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(toTitleCase(e.target.value))} />
                )}
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1" style={{ color: "#888" }}>Teléfono / WhatsApp</label>
                {esPremio && telefono ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "#f3f4f6", border: "1.5px solid #e5e7eb", color: "#555" }}>
                    <span>🔒</span><span className="font-semibold">{telefono}</span>
                  </div>
                ) : (
                  <input type="tel" placeholder="Ej: 3001234567" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                )}
              </div>
            </div>

            {!esPremio && anticipoActivo && (
              <div className="mt-6 p-4 rounded-xl" style={{ background: "var(--c-primary-bg)", border: "1px solid var(--c-primary-light)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--c-primary)" }}>Anticipo requerido</p>
                <p className="text-2xl font-bold" style={{ color: "var(--c-primary)" }}>{formatPrecio(anticipoTipo === "porcentaje" ? Math.round(precioFinal(servicioSel.precio) * anticipoPorcentaje / 100) : anticipoMonto)}</p>
                <p className="text-xs mt-1" style={{ color: "#888" }}>
                  Deberás pagar este anticipo para confirmar tu reserva. Tienes 30 minutos después de reservar.
                </p>
              </div>
            )}

            <button
              onClick={confirmarReserva}
              disabled={!nombre || !telefono || cargando}
              className="btn-gold w-full mt-6"
              style={!nombre || !telefono ? { opacity: 0.5 } : {}}
            >
              {cargando ? "Procesando..." : esPremio ? "🏆 Confirmar mi premio →" : "Confirmar reserva →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function PasoIndicador({ paso, conTrabajador }: { paso: Paso; conTrabajador: boolean }) {
  const pasos = conTrabajador
    ? [
        { id: "servicio", label: "Servicio" },
        { id: "fecha", label: "Fecha" },
        { id: "trabajador", label: "Profesional" },
        { id: "datos", label: "Datos" },
        { id: "pago", label: "Pago" },
      ]
    : [
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
                ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
                : { background: "var(--c-border-soft)", color: "#bbb" }
            }
          >
            {i + 1}
          </div>
          {i < pasos.length - 1 && (
            <div className="w-6 h-0.5" style={{ background: i < idx ? "var(--c-primary)" : "var(--c-border-soft)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

type MetodoPago = { id: string; nombre: string; numero: string };

const ICONOS_MP: Record<string, string> = {
  nequi: "📱", bancolombia: "🏦", daviplata: "💜", efecty: "💵", pse: "🖥️",
};
function iconoMP(nombre: string) {
  const n = nombre.toLowerCase();
  for (const [k, v] of Object.entries(ICONOS_MP)) if (n.includes(k)) return v;
  return "💳";
}

function PagoPendiente({
  reservaId, servicio, precioTotal, fecha, hora, nombre, anticipo, anticipoActivo, onVolver,
}: {
  reservaId: string;
  servicio: Servicio;
  precioTotal: number;
  fecha: string;
  hora: string;
  nombre: string;
  anticipo: number;
  anticipoActivo: boolean;
  onVolver: () => void;
}) {
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const fondoConf = useFondo("confirmacion");

  useEffect(() => {
    fetch("/api/metodos-pago").then(r => r.json())
      .then(d => setMetodos(d.metodos || []))
      .catch(() => setMetodos([
        { id: "1", nombre: "Nequi", numero: "3234661252" },
        { id: "2", nombre: "Bancolombia", numero: "65629075474" },
      ]));
  }, []);

  const primerNumero = metodos[0]?.numero || "3234661252";
  const nombresMetodos = metodos.map(m => m.nombre).join(" o ") || "Nequi o Bancolombia";

  return (
    <main className="min-h-screen py-8 px-4 relative"
      style={fondoConf.overlay ? fondoConf.style : { background: "linear-gradient(180deg, var(--c-primary-bg) 0%, var(--c-bg-to) 100%)" }}>
      {fondoConf.overlay && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px]" style={{ zIndex: 0 }} />}
      <div className="max-w-xl mx-auto text-center relative" style={{ zIndex: 1 }}>
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="font-script text-3xl font-bold mb-2" style={{ color: "var(--c-primary)" }}>¡Reserva recibida!</h1>
        <p className="text-sm mb-6" style={{ color: "#888" }}>
          {anticipoActivo
            ? `Hola ${nombre}, tu cita está pendiente de confirmación de pago.`
            : `Hola ${nombre}, tu cita ha sido recibida y está pendiente de confirmación.`}
        </p>

        {/* Resumen */}
        <div className="card-elegant p-6 text-left mb-6">
          <p className="font-semibold text-lg mb-3" style={{ color: "var(--c-primary)" }}>Resumen de tu cita</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span style={{ color: "#888" }}>Servicio:</span><span className="font-semibold">{servicio.nombre}</span></div>
            <div className="flex justify-between"><span style={{ color: "#888" }}>Fecha:</span><span className="font-semibold">{fecha}</span></div>
            <div className="flex justify-between"><span style={{ color: "#888" }}>Hora:</span><span className="font-semibold">{hora}</span></div>
            <hr style={{ borderColor: "var(--c-primary-light)" }} />
            {anticipoActivo ? (
              <>
                <div className="flex justify-between"><span style={{ color: "#888" }}>Total:</span><span className="font-semibold">{formatPrecio(precioTotal)}</span></div>
                <div className="flex justify-between text-base font-bold">
                  <span style={{ color: "var(--c-primary)" }}>Anticipo a pagar:</span>
                  <span style={{ color: "var(--c-primary)" }}>{formatPrecio(anticipo)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-base font-bold">
                <span style={{ color: "var(--c-primary)" }}>Total a pagar el día de tu cita:</span>
                <span style={{ color: "var(--c-primary)" }}>{formatPrecio(precioTotal)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pasos a seguir */}
        <div className="card-elegant p-5 text-left mb-4">
          <p className="font-semibold mb-4 text-center" style={{ color: "var(--c-primary)" }}>📋 ¿Qué debes hacer ahora?</p>
          <div className="space-y-4">
            {anticipoActivo ? (
              <>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))" }}>1</div>
                  <div>
                    <p className="font-semibold text-sm">Realiza el pago del anticipo</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>Paga <strong>{formatPrecio(anticipo)}</strong> por {nombresMetodos} al número <strong>{primerNumero}</strong>. Tienes <strong>30 minutos</strong>.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))" }}>2</div>
                  <div>
                    <p className="font-semibold text-sm">Envía el comprobante por WhatsApp</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>Manda el pantallazo del pago al WhatsApp de Leila Studio para que confirmen tu cita.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))" }}>3</div>
                  <div>
                    <p className="font-semibold text-sm">Espera la confirmación</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>Una vez verificado el pago, tu cita quedará confirmada.</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))" }}>1</div>
                  <div>
                    <p className="font-semibold text-sm">Espera la confirmación de tu cita</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>Revisaremos tu solicitud y te confirmaremos por WhatsApp a la brevedad.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))" }}>2</div>
                  <div>
                    <p className="font-semibold text-sm">El pago lo realizas el día de tu cita</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>Tendrás que pagar <strong>{formatPrecio(precioTotal)}</strong> directamente en el estudio.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Métodos de pago — solo si anticipo activo */}
        {anticipoActivo && metodos.length > 0 && (
          <div className="card-elegant p-5 text-left mb-4">
            <p className="font-semibold mb-3" style={{ color: "var(--c-primary)" }}>💳 Métodos de pago</p>
            <div className="space-y-3">
              {metodos.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--c-primary-bg)" }}>
                  <span className="text-2xl">{iconoMP(m.nombre)}</span>
                  <div>
                    <p className="font-semibold text-sm">{m.nombre}</p>
                    <p className="font-bold text-lg" style={{ color: "var(--c-primary)" }}>{m.numero}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón WhatsApp */}
        <a
          href={anticipoActivo
            ? `https://wa.me/573234661252?text=${encodeURIComponent(`Hola Leila Studio 👋 Acabo de reservar una cita.\n\n📋 *Reserva:* ${servicio.nombre}\n📅 *Fecha:* ${fecha} a las ${hora}\n👤 *Nombre:* ${nombre}\n\nTe envío el comprobante del anticipo de ${formatPrecio(anticipo)} 👇`)}`
            : `https://wa.me/573234661252?text=${encodeURIComponent(`Hola Leila Studio 👋 Acabo de reservar una cita.\n\n📋 *Reserva:* ${servicio.nombre}\n📅 *Fecha:* ${fecha} a las ${hora}\n👤 *Nombre:* ${nombre}\n\nQuedo atenta a la confirmación 😊`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold w-full mb-4 flex items-center justify-center gap-2 text-base"
          style={{ textDecoration: "none" }}
        >
          <span>📲</span> {anticipoActivo ? "Enviar comprobante por WhatsApp" : "Escribir a Leila Studio"}
        </a>

        {/* Aviso política — solo si anticipo activo */}
        {anticipoActivo && (
          <div className="p-4 rounded-xl mb-4 text-sm text-left" style={{ background: "#fff0f0", border: "1px solid #ef9090" }}>
            <p className="font-bold mb-1" style={{ color: "#c0392b" }}>⚠️ Política de anticipo</p>
            <p style={{ color: "#7f3333" }}>
              El anticipo pagado <strong>no es reembolsable</strong>. Si realizas el pago y no asistes a tu cita sin cancelar con anticipación, <strong>perderás el valor del anticipo</strong>.
            </p>
          </div>
        )}

        <p className="text-xs mb-6 text-center" style={{ color: "#aaa" }}>ID de reserva: {reservaId}</p>

        <button onClick={onVolver} className="btn-rose w-full">
          Volver al inicio
        </button>
      </div>
    </main>
  );
}
