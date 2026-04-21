"use client";

import { useState, useEffect } from "react";
import { formatPrecio } from "@/lib/servicios";

type Reserva = {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_nombre: string;
  fecha: string;
  hora: string;
  precio: number;
  anticipo: number;
  pago_saldo?: number;
  estado: "pendiente" | "confirmada" | "completada" | "cancelada";
  expira_en: string;
};

type Vista = "hoy" | "pendientes" | "todas" | "clientes";

export default function AdminPage() {
  const [logueado, setLogueado] = useState(false);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [vista, setVista] = useState<Vista>("hoy");
  const [cargando, setCargando] = useState(false);

  async function login() {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave }),
    });
    if (res.ok) {
      setLogueado(true);
      cargarReservas();
    } else {
      setError("Contraseña incorrecta");
    }
  }

  async function cargarReservas() {
    setCargando(true);
    const res = await fetch("/api/reservas");
    const data = await res.json();
    setReservas(Array.isArray(data) ? data : []);
    setCargando(false);
  }

  async function actualizarEstado(id: string, estado: string, pagoSaldo?: number) {
    const body: Record<string, unknown> = { estado };
    if (pagoSaldo !== undefined) body.pago_saldo = pagoSaldo;
    await fetch(`/api/reservas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    cargarReservas();
  }

  const hoy = new Date().toISOString().split("T")[0];
  const reservasHoy = reservas.filter((r) => r.fecha === hoy && r.estado !== "cancelada");
  const pendientes = reservas.filter((r) => r.estado === "pendiente");

  if (!logueado) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(180deg,#fff0f5,#fff8f0)" }}>
        <div className="card-elegant p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-2">👑</div>
          <h1 className="font-script text-2xl font-bold mb-1" style={{ color: "#c9a84c" }}>Leila Studio</h1>
          <p className="text-xs tracking-widest mb-6" style={{ color: "#a07830" }}>PANEL ADMIN</p>
          <input
            type="password"
            placeholder="Contraseña"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="mb-3"
          />
          {error && <p className="text-xs mb-3" style={{ color: "#e91e8c" }}>{error}</p>}
          <button onClick={login} className="btn-gold w-full">Entrar</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(180deg,#fff0f5,#fff8f0)" }}>
      {/* Header */}
      <header className="py-4 px-6 flex justify-between items-center" style={{ borderBottom: "2px solid #f0d080", background: "#fff0f5" }}>
        <div>
          <h1 className="font-script text-2xl font-bold" style={{ color: "#c9a84c" }}>Leila Studio</h1>
          <p className="text-xs tracking-widest" style={{ color: "#a07830" }}>PANEL ADMIN</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargarReservas} className="text-xs px-3 py-1 rounded-full" style={{ background: "#f0d080", color: "#a07830" }}>
            ↻ Actualizar
          </button>
          <button onClick={() => setLogueado(false)} className="text-xs px-3 py-1 rounded-full" style={{ background: "#fce4ec", color: "#e91e8c" }}>
            Salir
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <StatCard label="Citas hoy" value={reservasHoy.length} color="#c9a84c" />
        <StatCard label="Pendientes" value={pendientes.length} color="#e91e8c" />
        <StatCard label="Total reservas" value={reservas.filter(r => r.estado !== "cancelada").length} color="#888" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto">
        {([
          { id: "hoy", label: "Hoy" },
          { id: "pendientes", label: `Pendientes ${pendientes.length > 0 ? `(${pendientes.length})` : ""}` },
          { id: "todas", label: "Todas" },
          { id: "clientes", label: "Clientes" },
        ] as { id: Vista; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setVista(tab.id)}
            className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={
              vista === tab.id
                ? { background: "linear-gradient(135deg,#c9a84c,#f0d080)", color: "white" }
                : { background: "#f0e0e8", color: "#888" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="px-4 pb-8">
        {cargando && <p className="text-center text-sm" style={{ color: "#888" }}>Cargando...</p>}

        {vista === "hoy" && (
          <ListaReservas
            reservas={reservasHoy}
            titulo={`Citas de hoy — ${hoy}`}
            onActualizar={actualizarEstado}
            vacio="No hay citas para hoy"
          />
        )}

        {vista === "pendientes" && (
          <ListaReservas
            reservas={pendientes}
            titulo="Reservas pendientes de confirmación de pago"
            onActualizar={actualizarEstado}
            vacio="No hay reservas pendientes"
          />
        )}

        {vista === "todas" && (
          <ListaReservas
            reservas={reservas.filter(r => r.estado !== "cancelada")}
            titulo="Todas las reservas"
            onActualizar={actualizarEstado}
            vacio="No hay reservas"
          />
        )}

        {vista === "clientes" && (
          <TablaClientes reservas={reservas} />
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card-elegant p-3 text-center">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "#888" }}>{label}</p>
    </div>
  );
}

function ListaReservas({
  reservas, titulo, onActualizar, vacio,
}: {
  reservas: Reserva[];
  titulo: string;
  onActualizar: (id: string, estado: string, saldo?: number) => void;
  vacio: string;
}) {
  if (reservas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">🌸</p>
        <p className="text-sm" style={{ color: "#888" }}>{vacio}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title mb-4">{titulo}</h2>
      <div className="space-y-4">
        {reservas.map((r) => (
          <TarjetaReserva key={r.id} reserva={r} onActualizar={onActualizar} />
        ))}
      </div>
    </div>
  );
}

function TarjetaReserva({ reserva: r, onActualizar }: { reserva: Reserva; onActualizar: (id: string, estado: string, saldo?: number) => void }) {
  const [saldo, setSaldo] = useState(r.precio - r.anticipo);
  const colores: Record<string, string> = {
    pendiente: "#f59e0b",
    confirmada: "#10b981",
    completada: "#6366f1",
    cancelada: "#ef4444",
  };

  return (
    <div className="card-elegant p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold">{r.cliente_nombre}</p>
          <p className="text-sm" style={{ color: "#888" }}>📱 {r.cliente_telefono}</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: colores[r.estado] + "22", color: colores[r.estado] }}>
          {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
        </span>
      </div>

      <div className="text-sm space-y-1 mb-3">
        <p>💅 <span className="font-semibold">{r.servicio_nombre}</span></p>
        <p>📅 {r.fecha} a las {r.hora}</p>
        <div className="flex gap-4 mt-2">
          <p>Total: <span className="font-bold" style={{ color: "#c9a84c" }}>{formatPrecio(r.precio)}</span></p>
          <p>Anticipo: <span className="font-bold" style={{ color: "#10b981" }}>{formatPrecio(r.anticipo)}</span></p>
        </div>
      </div>

      {r.estado === "pendiente" && (
        <div className="flex gap-2">
          <button
            onClick={() => onActualizar(r.id, "confirmada")}
            className="flex-1 py-2 rounded-full text-xs font-bold"
            style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b981" }}
          >
            ✓ Confirmar pago
          </button>
          <button
            onClick={() => onActualizar(r.id, "cancelada")}
            className="flex-1 py-2 rounded-full text-xs font-bold"
            style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef4444" }}
          >
            ✗ Cancelar
          </button>
        </div>
      )}

      {r.estado === "confirmada" && (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={saldo}
              onChange={(e) => setSaldo(Number(e.target.value))}
              placeholder="Saldo final"
              className="text-sm py-1"
            />
            <button
              onClick={() => onActualizar(r.id, "completada", saldo)}
              className="whitespace-nowrap py-2 px-3 rounded-full text-xs font-bold"
              style={{ background: "#6366f122", color: "#6366f1", border: "1px solid #6366f1" }}
            >
              Completar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TablaClientes({ reservas }: { reservas: Reserva[] }) {
  const clientes = reservas.reduce((acc, r) => {
    const key = r.cliente_telefono;
    if (!acc[key]) {
      acc[key] = { nombre: r.cliente_nombre, telefono: r.cliente_telefono, citas: [], total: 0 };
    }
    if (r.estado !== "cancelada") {
      acc[key].citas.push(r);
      acc[key].total += r.precio;
    }
    return acc;
  }, {} as Record<string, { nombre: string; telefono: string; citas: Reserva[]; total: number }>);

  const lista = Object.values(clientes).sort((a, b) => b.citas.length - a.citas.length);

  if (lista.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">🌸</p>
        <p className="text-sm" style={{ color: "#888" }}>No hay clientes aún</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title mb-4">👤 Clientes</h2>
      <div className="space-y-3">
        {lista.map((c) => (
          <div key={c.telefono} className="card-elegant p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{c.nombre}</p>
                <p className="text-sm" style={{ color: "#888" }}>📱 {c.telefono}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: "#c9a84c" }}>{c.citas.length} cita{c.citas.length !== 1 ? "s" : ""}</p>
                <p className="text-xs" style={{ color: "#888" }}>Total: {formatPrecio(c.total)}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {c.citas.slice(-3).map((ci) => (
                <p key={ci.id} className="text-xs" style={{ color: "#aaa" }}>
                  • {ci.fecha} — {ci.servicio_nombre}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
