"use client";

import { useState, useEffect, useRef } from "react";
import { formatPrecio, formatDuracion, CATEGORIAS } from "@/lib/servicios";
import type { Servicio } from "@/lib/servicios";

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

type Vista = "hoy" | "pendientes" | "todas" | "clientes" | "servicios" | "bloqueos" | "config" | "respaldo";

/* ═══════════════════════════════════════════════════ */
/*                  PÁGINA PRINCIPAL                   */
/* ═══════════════════════════════════════════════════ */

export default function AdminPage() {
  const [logueado, setLogueado] = useState(false);
  const [primerIngreso, setPrimerIngreso] = useState(false);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [vista, setVista] = useState<Vista>("hoy");
  const [cargando, setCargando] = useState(false);
  const [modoReset, setModoReset] = useState(false);
  const [token, setToken] = useState("");

  function authHeader(): HeadersInit {
    return { Authorization: `Bearer ${token}` };
  }

  // Capa 6: validateSession cada 5 minutos
  useEffect(() => {
    if (!logueado) return;
    const interval = setInterval(async () => {
      const t = sessionStorage.getItem("admin_token");
      if (!t) { handleLogout(); return; }
      const res = await fetch("/api/admin/validate", { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) handleLogout();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [logueado]);

  async function login() {
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave }),
    });
    if (res.ok) {
      const data = await res.json();
      sessionStorage.setItem("admin_token", data.token);
      setToken(data.token);
      setPrimerIngreso(data.primer_ingreso === true);
      setLogueado(true);
      if (!data.primer_ingreso) cargarReservas(data.token);
    } else {
      const data = await res.json();
      setError(data.error || "Contraseña incorrecta");
    }
  }

  function handleLogout() {
    const t = sessionStorage.getItem("admin_token") || token;
    if (t) fetch("/api/admin/logout", { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    sessionStorage.removeItem("admin_token");
    setToken("");
    setLogueado(false);
  }

  async function cargarReservas(authToken?: string) {
    const t = authToken || token;
    setCargando(true);
    const res = await fetch("/api/reservas", { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    setReservas(Array.isArray(data) ? data : []);
    setCargando(false);
  }

  async function actualizarEstado(id: string, estado: string, pagoSaldo?: number) {
    const body: Record<string, unknown> = { estado };
    if (pagoSaldo !== undefined) body.pago_saldo = pagoSaldo;
    await fetch(`/api/reservas/${id}`, {
      method: "PATCH",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    cargarReservas();
  }

  async function eliminarReserva(id: string) {
    await fetch(`/api/reservas/${id}`, { method: "DELETE", headers: authHeader() });
    cargarReservas();
  }

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const reservasHoy = reservas.filter((r) => r.fecha === hoy && r.estado !== "cancelada");
  const pendientes = reservas.filter((r) => r.estado === "pendiente");

  /* ── LOGIN ── */
  if (!logueado) {
    if (modoReset) {
      return (
        <PinReset
          onVolver={() => setModoReset(false)}
          onOk={() => { setModoReset(false); setError("Clave restablecida. Ingresa con tu nueva clave."); }}
        />
      );
    }
    return (
      <main className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "linear-gradient(180deg,#fff0f5,#fff8f0)" }}>
        <div className="card-elegant p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-2">👑</div>
          <h1 className="font-script text-2xl font-bold mb-1" style={{ color: "#c9a84c" }}>Leila Studio</h1>
          <p className="text-xs tracking-widest mb-6" style={{ color: "#a07830" }}>PANEL ADMIN</p>
          <input
            type="password" placeholder="Contraseña"
            value={clave} onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="mb-3"
          />
          {error && <p className="text-xs mb-3" style={{ color: "#e91e8c" }}>{error}</p>}
          <button onClick={login} className="btn-gold w-full mb-3">Entrar</button>
          <button onClick={() => setModoReset(true)}
            className="text-xs underline" style={{ color: "#c9a84c" }}>
            ¿Olvidaste tu clave?
          </button>
        </div>
      </main>
    );
  }

  /* ── PRIMER INGRESO ── */
  if (primerIngreso) {
    return (
      <PrimerIngreso
        token={token}
        onCompletado={() => { setPrimerIngreso(false); cargarReservas(); }}
      />
    );
  }

  /* ── DASHBOARD ── */
  return (
    <main className="min-h-screen" style={{ background: "linear-gradient(180deg,#fff0f5,#fff8f0)" }}>
      <header className="py-4 px-6 flex justify-between items-center"
        style={{ borderBottom: "2px solid #f0d080", background: "#fff0f5" }}>
        <div>
          <h1 className="font-script text-2xl font-bold" style={{ color: "#c9a84c" }}>Leila Studio</h1>
          <p className="text-xs tracking-widest" style={{ color: "#a07830" }}>PANEL ADMIN</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => cargarReservas()}
            className="text-xs px-3 py-1 rounded-full" style={{ background: "#f0d080", color: "#a07830" }}>
            ↻
          </button>
          <button onClick={handleLogout}
            className="text-xs px-3 py-1 rounded-full" style={{ background: "#fce4ec", color: "#e91e8c" }}>
            Salir
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <StatCard label="Citas hoy" value={reservasHoy.length} color="#c9a84c" />
        <StatCard label="Pendientes" value={pendientes.length} color="#e91e8c" />
        <StatCard label="Total" value={reservas.filter((r) => r.estado !== "cancelada").length} color="#888" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1">
        {([
          { id: "hoy", label: "Hoy" },
          { id: "pendientes", label: `Pend. ${pendientes.length > 0 ? `(${pendientes.length})` : ""}` },
          { id: "todas", label: "Todas" },
          { id: "clientes", label: "Clientes" },
          { id: "servicios", label: "💅 Servicios" },
          { id: "bloqueos", label: "⛔ Bloqueos" },
          { id: "config", label: "⚙️ Config" },
          { id: "respaldo", label: "💾 Respaldo" },
        ] as { id: Vista; label: string }[]).map((tab) => (
          <button key={tab.id} onClick={() => setVista(tab.id)}
            className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all flex-shrink-0"
            style={
              vista === tab.id
                ? { background: "linear-gradient(135deg,#c9a84c,#f0d080)", color: "white" }
                : { background: "#f0e0e8", color: "#888" }
            }>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="px-4 pb-8">
        {cargando && <p className="text-center text-sm py-4" style={{ color: "#888" }}>Cargando...</p>}

        {vista === "hoy" && (
          <ListaReservas reservas={reservasHoy} titulo={`Citas de hoy — ${formatFecha(hoy)}`}
            onActualizar={actualizarEstado} onEliminar={eliminarReserva} vacio="No hay citas para hoy" />
        )}
        {vista === "pendientes" && (
          <ListaReservas reservas={pendientes} titulo="Reservas pendientes de pago"
            onActualizar={actualizarEstado} onEliminar={eliminarReserva} vacio="No hay reservas pendientes" />
        )}
        {vista === "todas" && (
          <ListaReservas reservas={reservas.filter((r) => r.estado !== "cancelada")}
            titulo="Todas las reservas" onActualizar={actualizarEstado} onEliminar={eliminarReserva} vacio="No hay reservas" />
        )}
        {vista === "clientes" && <TablaClientes reservas={reservas} />}
        {vista === "servicios" && <TabServicios token={token} />}
        {vista === "bloqueos" && <TabBloqueos token={token} />}
        {vista === "config" && <TabConfig token={token} />}
        {vista === "respaldo" && <TabRespaldo token={token} />}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════ */
/*               PRIMER INGRESO (setup)                */
/* ═══════════════════════════════════════════════════ */

function PrimerIngreso({ token, onCompletado }: { token: string; onCompletado: () => void }) {
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [pin, setPin] = useState("");
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function guardar() {
    setError("");
    if (nuevaClave.length < 6) return setError("La clave debe tener al menos 6 caracteres");
    if (nuevaClave !== confirmar) return setError("Las claves no coinciden");
    if (!/^\d{6}$/.test(pin)) return setError("El PIN debe ser exactamente 6 dígitos");
    setCargando(true);
    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: nuevaClave, pin, nombre, whatsapp, primer_ingreso: false }),
    });
    setCargando(false);
    onCompletado();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg,#fff0f5,#fff8f0)" }}>
      <div className="card-elegant p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔐</div>
          <h2 className="font-script text-xl font-bold" style={{ color: "#c9a84c" }}>Primer Ingreso</h2>
          <p className="text-xs mt-1" style={{ color: "#888" }}>Crea tu clave y PIN de seguridad</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Tu nombre</label>
            <input type="text" placeholder="Ej: Leila" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>WhatsApp (para notificaciones)</label>
            <input type="tel" placeholder="+57 300 000 0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nueva contraseña</label>
            <input type="password" placeholder="Mínimo 6 caracteres" value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Confirmar contraseña</label>
            <input type="password" placeholder="Repite la contraseña" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>PIN de seguridad (6 dígitos)</label>
            <input type="tel" placeholder="Ej: 123456" maxLength={6} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <p className="text-xs mt-1" style={{ color: "#bbb" }}>Úsalo para recuperar tu clave si la olvidas</p>
          </div>
        </div>
        {error && <p className="text-xs mt-3 text-center" style={{ color: "#e91e8c" }}>{error}</p>}
        <button onClick={guardar} disabled={cargando} className="btn-gold w-full mt-5">
          {cargando ? "Guardando..." : "Activar panel ✓"}
        </button>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════ */
/*               RECUPERAR CLAVE CON PIN               */
/* ═══════════════════════════════════════════════════ */

function PinReset({ onVolver, onOk }: { onVolver: () => void; onOk: () => void }) {
  const [paso, setPaso] = useState<"pin" | "nueva">("pin");
  const [pin, setPin] = useState("");
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function verificarPin() {
    setError("");
    if (!/^\d{6}$/.test(pin)) return setError("El PIN debe ser de 6 dígitos");
    setCargando(true);
    const res = await fetch("/api/admin/pin-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setCargando(false);
    if (res.ok) { setPaso("nueva"); }
    else { const d = await res.json(); setError(d.error || "PIN incorrecto"); }
  }

  async function cambiarClave() {
    setError("");
    if (nuevaClave.length < 6) return setError("La clave debe tener al menos 6 caracteres");
    if (nuevaClave !== confirmar) return setError("Las claves no coinciden");
    setCargando(true);
    const res = await fetch("/api/admin/pin-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, nueva_clave: nuevaClave }),
    });
    setCargando(false);
    if (res.ok) { onOk(); }
    else { const d = await res.json(); setError(d.error || "Error al cambiar clave"); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg,#fff0f5,#fff8f0)" }}>
      <div className="card-elegant p-8 w-full max-w-sm text-center">
        <div className="text-3xl mb-2">{paso === "pin" ? "🔢" : "🔑"}</div>
        <h2 className="font-script text-xl font-bold mb-1" style={{ color: "#c9a84c" }}>
          {paso === "pin" ? "Recuperar acceso" : "Nueva contraseña"}
        </h2>
        <p className="text-xs mb-5" style={{ color: "#888" }}>
          {paso === "pin" ? "Ingresa tu PIN de 6 dígitos" : "Elige tu nueva contraseña"}
        </p>

        {paso === "pin" ? (
          <>
            <input type="tel" placeholder="PIN de 6 dígitos" maxLength={6}
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mb-3 text-center text-2xl tracking-widest" />
            {error && <p className="text-xs mb-3" style={{ color: "#e91e8c" }}>{error}</p>}
            <button onClick={verificarPin} disabled={cargando} className="btn-gold w-full mb-3">
              {cargando ? "Verificando..." : "Verificar PIN"}
            </button>
          </>
        ) : (
          <>
            <div className="space-y-3 text-left mb-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nueva contraseña</label>
                <input type="password" placeholder="Mínimo 6 caracteres" value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Confirmar contraseña</label>
                <input type="password" placeholder="Repite la contraseña" value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-xs mb-3" style={{ color: "#e91e8c" }}>{error}</p>}
            <button onClick={cambiarClave} disabled={cargando} className="btn-gold w-full mb-3">
              {cargando ? "Guardando..." : "Guardar nueva clave"}
            </button>
          </>
        )}
        <button onClick={onVolver} className="text-xs underline" style={{ color: "#c9a84c" }}>
          Volver al inicio
        </button>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                TAB CONFIGURACIÓN                    */
/* ═══════════════════════════════════════════════════ */

function TabConfig({ token }: { token: string }) {
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [nuevoPin, setNuevoPin] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setNombre(d.nombre || ""); setWhatsapp(d.whatsapp || ""); })
      .catch(() => {});
  }, [token]);

  async function guardar() {
    setMsg(null);
    if (nuevaClave && nuevaClave.length < 6)
      return setMsg({ ok: false, texto: "La clave debe tener al menos 6 caracteres" });
    if (nuevaClave && nuevaClave !== confirmarClave)
      return setMsg({ ok: false, texto: "Las claves no coinciden" });
    if (nuevoPin && !/^\d{6}$/.test(nuevoPin))
      return setMsg({ ok: false, texto: "El PIN debe ser exactamente 6 dígitos" });

    setCargando(true);
    const body: Record<string, string> = { nombre, whatsapp };
    if (nuevaClave) body.password = nuevaClave;
    if (nuevoPin) body.pin = nuevoPin;

    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setCargando(false);
    setNuevaClave("");
    setConfirmarClave("");
    setNuevoPin("");
    setMsg({ ok: true, texto: "✓ Configuración guardada" });
  }

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="section-title mb-5">⚙️ Mi perfil</h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nombre</label>
          <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>WhatsApp</label>
          <input type="tel" placeholder="+57 300 000 0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <hr style={{ borderColor: "#f0d080" }} />
        <p className="text-xs font-semibold" style={{ color: "#888" }}>Cambiar contraseña (opcional)</p>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nueva contraseña</label>
          <input type="password" placeholder="Dejar vacío para no cambiar" value={nuevaClave}
            onChange={(e) => setNuevaClave(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Confirmar contraseña</label>
          <input type="password" placeholder="Repite la nueva contraseña" value={confirmarClave}
            onChange={(e) => setConfirmarClave(e.target.value)} />
        </div>
        <hr style={{ borderColor: "#f0d080" }} />
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Cambiar PIN de seguridad (opcional)</label>
          <input type="tel" placeholder="Nuevo PIN de 6 dígitos" maxLength={6}
            value={nuevoPin} onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
        </div>
      </div>

      {msg && (
        <p className="text-xs mt-3 text-center"
          style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>
          {msg.texto}
        </p>
      )}
      <button onClick={guardar} disabled={cargando} className="btn-gold w-full mt-5">
        {cargando ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                  TAB RESPALDO                       */
/* ═══════════════════════════════════════════════════ */

function TabRespaldo({ token }: { token: string }) {
  const [restaurando, setRestaurando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [archivoData, setArchivoData] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function exportar() {
    const res = await fetch("/api/admin/backup", { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leila-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function leerArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setArchivoData(ev.target?.result as string);
      setConfirmar(true);
      setMsg(null);
    };
    reader.readAsText(file);
  }

  async function restaurar() {
    if (!archivoData) return;
    setRestaurando(true);
    setMsg(null);
    try {
      const backup = JSON.parse(archivoData);
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(backup),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, texto: `✓ Restaurado: ${data.restaurados.reservas} reservas, ${data.restaurados.clientes} clientes` });
      } else {
        setMsg({ ok: false, texto: data.error || "Error al restaurar" });
      }
    } catch {
      setMsg({ ok: false, texto: "Archivo inválido o corrupto" });
    }
    setRestaurando(false);
    setConfirmar(false);
    setArchivoData(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="section-title mb-5">💾 Respaldo de datos</h2>

      {/* Exportar */}
      <div className="card-elegant p-4 mb-4">
        <p className="font-semibold text-sm mb-1" style={{ color: "#c9a84c" }}>📤 Exportar respaldo</p>
        <p className="text-xs mb-3" style={{ color: "#888" }}>
          Descarga un archivo JSON con todas las reservas, clientes y configuración.
        </p>
        <button onClick={exportar} className="btn-gold w-full text-sm" style={{ padding: "0.6rem 1rem" }}>
          Descargar respaldo
        </button>
      </div>

      {/* Restaurar */}
      <div className="card-elegant p-4">
        <p className="font-semibold text-sm mb-1" style={{ color: "#e91e8c" }}>📥 Restaurar respaldo</p>
        <p className="text-xs mb-3" style={{ color: "#888" }}>
          ⚠️ Esto sobreescribirá los datos actuales con los del archivo.
        </p>
        <button onClick={() => inputRef.current?.click()}
          className="w-full py-2 rounded-full text-xs font-bold mb-2"
          style={{ background: "#fce4ec", color: "#e91e8c", border: "1px solid #e91e8c" }}>
          Seleccionar archivo .json
        </button>
        <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={leerArchivo} />

        {confirmar && (
          <div className="mt-3">
            <p className="text-xs text-center mb-2 font-semibold" style={{ color: "#e91e8c" }}>
              ¿Confirmas la restauración? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={restaurar} disabled={restaurando}
                className="flex-1 py-2 rounded-full text-xs font-bold"
                style={{ background: "#e91e8c", color: "white" }}>
                {restaurando ? "Restaurando..." : "Sí, restaurar"}
              </button>
              <button onClick={() => { setConfirmar(false); setArchivoData(null); if (inputRef.current) inputRef.current.value = ""; }}
                className="flex-1 py-2 rounded-full text-xs font-bold"
                style={{ background: "#f0e0e8", color: "#888" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <p className="text-xs mt-4 text-center font-semibold"
          style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*              COMPONENTES EXISTENTES                 */
/* ═══════════════════════════════════════════════════ */

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card-elegant p-3 text-center">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "#888" }}>{label}</p>
    </div>
  );
}

function ListaReservas({ reservas, titulo, onActualizar, onEliminar, vacio }: {
  reservas: Reserva[]; titulo: string;
  onActualizar: (id: string, estado: string, saldo?: number) => void;
  onEliminar: (id: string) => void;
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
          <TarjetaReserva key={r.id} reserva={r} onActualizar={onActualizar} onEliminar={onEliminar} />
        ))}
      </div>
    </div>
  );
}

function TarjetaReserva({ reserva: r, onActualizar, onEliminar }: {
  reserva: Reserva;
  onActualizar: (id: string, estado: string, saldo?: number) => void;
  onEliminar: (id: string) => void;
}) {
  const [saldo, setSaldo] = useState(r.precio - r.anticipo);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const colores: Record<string, string> = {
    pendiente: "#f59e0b", confirmada: "#10b981", completada: "#6366f1", cancelada: "#ef4444",
  };

  async function handleEliminar() {
    setEliminando(true);
    await onEliminar(r.id);
  }

  const puedeEliminar = r.estado === "pendiente" || r.estado === "confirmada";

  return (
    <div className="card-elegant p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold">{r.cliente_nombre}</p>
          <p className="text-sm" style={{ color: "#888" }}>📱 {r.cliente_telefono}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full font-semibold"
            style={{ background: colores[r.estado] + "22", color: colores[r.estado] }}>
            {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
          </span>
          {puedeEliminar && !confirmandoEliminar && (
            <button
              onClick={() => setConfirmandoEliminar(true)}
              title="Eliminar cita"
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef4444" }}>
              🗑
            </button>
          )}
        </div>
      </div>

      {confirmandoEliminar && (
        <div className="mb-3 p-3 rounded-xl text-center" style={{ background: "#fff0f0", border: "1px solid #ef4444" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#ef4444" }}>
            ¿Eliminar esta cita? No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleEliminar}
              disabled={eliminando}
              className="flex-1 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "#ef4444", color: "white" }}>
              {eliminando ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button
              onClick={() => setConfirmandoEliminar(false)}
              className="flex-1 py-1.5 rounded-full text-xs font-bold"
              style={{ background: "#f0e0e8", color: "#888" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="text-sm space-y-1 mb-3">
        <p>💅 <span className="font-semibold">{r.servicio_nombre}</span></p>
        <p>📅 {formatFecha(r.fecha)} a las {r.hora}</p>
        <div className="flex gap-4 mt-2">
          <p>Total: <span className="font-bold" style={{ color: "#c9a84c" }}>{formatPrecio(r.precio)}</span></p>
          <p>Anticipo: <span className="font-bold" style={{ color: "#10b981" }}>{formatPrecio(r.anticipo)}</span></p>
        </div>
      </div>
      {r.estado === "pendiente" && (
        <div className="flex gap-2">
          <button onClick={() => onActualizar(r.id, "confirmada")}
            className="flex-1 py-2 rounded-full text-xs font-bold"
            style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b981" }}>
            ✓ Confirmar pago
          </button>
          <button onClick={() => onActualizar(r.id, "cancelada")}
            className="flex-1 py-2 rounded-full text-xs font-bold"
            style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef4444" }}>
            ✗ Cancelar
          </button>
        </div>
      )}
      {r.estado === "confirmada" && (
        <div className="flex gap-2 items-center">
          <input type="number" value={saldo} onChange={(e) => setSaldo(Number(e.target.value))}
            placeholder="Saldo final" className="text-sm py-1" />
          <button onClick={() => onActualizar(r.id, "completada", saldo)}
            className="whitespace-nowrap py-2 px-3 rounded-full text-xs font-bold"
            style={{ background: "#6366f122", color: "#6366f1", border: "1px solid #6366f1" }}>
            Completar
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                  TAB SERVICIOS                      */
/* ═══════════════════════════════════════════════════ */

type FormServicio = {
  nombre: string;
  esCombo: boolean;
  categoria: string;
  precio: string;
  duracion: string;
};

const DURACIONES = [
  { valor: "30", label: "30 min" },
  { valor: "45", label: "45 min" },
  { valor: "60", label: "1 h" },
  { valor: "90", label: "1:30 h" },
  { valor: "120", label: "2 h" },
  { valor: "150", label: "2:30 h" },
  { valor: "180", label: "3 h" },
  { valor: "210", label: "3:30 h" },
  { valor: "240", label: "4 h" },
];

const FORM_INICIAL: FormServicio = {
  nombre: "", esCombo: false, categoria: "individual", precio: "", duracion: "60",
};

function TabServicios({ token }: { token: string }) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [form, setForm] = useState<FormServicio>(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoBorrar, setConfirmandoBorrar] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const res = await fetch("/api/servicios", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setServicios(Array.isArray(data) ? data : []);
  }

  function iniciarEdicion(s: Servicio) {
    setEditandoId(s.id);
    setForm({
      nombre: s.nombre,
      esCombo: s.categoria === "combo",
      categoria: s.categoria === "combo" ? "individual" : s.categoria,
      precio: String(s.precio),
      duracion: String(s.duracionMin),
    });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setMsg(null);
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.precio || !form.duracion)
      return setMsg({ ok: false, texto: "Completa todos los campos" });

    const categoria = form.esCombo ? "combo" : form.categoria;
    const body = {
      nombre: form.nombre.trim(),
      categoria,
      precio: Number(form.precio),
      duracion_min: Number(form.duracion),
    };

    setCargando(true);
    setMsg(null);

    if (editandoId) {
      const res = await fetch(`/api/servicios/${editandoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      setCargando(false);
      if (res.ok) { setMsg({ ok: true, texto: "Servicio actualizado ✓" }); cancelarEdicion(); cargar(); }
      else { const d = await res.json(); setMsg({ ok: false, texto: d.error || "Error al actualizar" }); }
    } else {
      const res = await fetch("/api/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      setCargando(false);
      if (res.ok) { setMsg({ ok: true, texto: "Servicio creado ✓" }); setForm(FORM_INICIAL); cargar(); }
      else { const d = await res.json(); setMsg({ ok: false, texto: d.error || "Error al crear" }); }
    }
  }

  async function borrar(id: string) {
    await fetch(`/api/servicios/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setConfirmandoBorrar(null);
    if (editandoId === id) cancelarEdicion();
    cargar();
  }

  const categoriasIndividuales = CATEGORIAS.filter((c) => c.id !== "combo");

  return (
    <div>
      <h2 className="section-title mb-1">💅 Gestionar servicios</h2>
      <p className="text-xs mb-4" style={{ color: "#888" }}>
        Crea, edita o elimina los servicios que ofreces. Los cambios se reflejan de inmediato en la app de reservas.
      </p>

      {/* Formulario crear / editar */}
      <div className="card-elegant p-4 mb-6" style={editandoId ? { border: "1.5px solid #c9a84c" } : {}}>
        <p className="text-sm font-semibold mb-4" style={{ color: "#c9a84c" }}>
          {editandoId ? "✏️ Editar servicio" : "+ Nuevo servicio"}
        </p>

        {/* Nombre */}
        <div className="mb-3">
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nombre del servicio</label>
          <input
            type="text"
            placeholder="Ej: Manicura tradicional"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>

        {/* Tipo: individual o combo */}
        <div className="mb-3">
          <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>Tipo</label>
          <div className="flex gap-2">
            {[
              { val: false, label: "💅 Individual" },
              { val: true, label: "🌸 Combo" },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                onClick={() => setForm({ ...form, esCombo: val, categoria: val ? "combo" : "individual" })}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                style={
                  form.esCombo === val
                    ? { background: "linear-gradient(135deg,#c9a84c,#f0d080)", color: "white" }
                    : { background: "#f0e0e8", color: "#888" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Categoría (solo si individual) */}
        {!form.esCombo && (
          <div className="mb-3">
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className="w-full"
            >
              {categoriasIndividuales.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Precio y duración en fila */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Precio ($)</label>
            <input
              type="number"
              placeholder="35000"
              min="0"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Duración</label>
            <select
              value={form.duracion}
              onChange={(e) => setForm({ ...form, duracion: e.target.value })}
              className="w-full"
            >
              {DURACIONES.map((d) => (
                <option key={d.valor} value={d.valor}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={guardar}
            disabled={cargando}
            className="btn-gold flex-1"
          >
            {cargando ? "Guardando..." : editandoId ? "Guardar cambios" : "+ Agregar servicio"}
          </button>
          {editandoId && (
            <button
              onClick={cancelarEdicion}
              className="py-2 px-4 rounded-full text-sm font-semibold"
              style={{ background: "#f0e0e8", color: "#888" }}
            >
              Cancelar
            </button>
          )}
        </div>

        {msg && (
          <p className="text-xs mt-3 text-center font-semibold"
            style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>
            {msg.texto}
          </p>
        )}
      </div>

      {/* Lista de servicios agrupados por categoría */}
      {servicios.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">💅</p>
          <p className="text-sm" style={{ color: "#888" }}>No hay servicios aún</p>
        </div>
      ) : (
        CATEGORIAS.map((cat) => {
          const lista = servicios.filter((s) => s.categoria === cat.id);
          if (!lista.length) return null;
          return (
            <div key={cat.id} className="mb-5">
              <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#c9a84c" }}>
                {cat.emoji} {cat.label}
              </p>
              <div className="space-y-2">
                {lista.map((s) => (
                  <div key={s.id} className="card-elegant p-3"
                    style={editandoId === s.id ? { border: "1.5px solid #c9a84c", background: "#fffdf5" } : {}}>

                    {confirmandoBorrar === s.id ? (
                      <div className="text-center">
                        <p className="text-xs font-semibold mb-2" style={{ color: "#ef4444" }}>
                          ¿Eliminar "{s.nombre}"?
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => borrar(s.id)}
                            className="flex-1 py-1.5 rounded-full text-xs font-bold"
                            style={{ background: "#ef4444", color: "white" }}>
                            Sí, eliminar
                          </button>
                          <button onClick={() => setConfirmandoBorrar(null)}
                            className="flex-1 py-1.5 rounded-full text-xs font-bold"
                            style={{ background: "#f0e0e8", color: "#888" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-sm">{s.nombre}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#888" }}>
                            {formatPrecio(s.precio)} · ⏱ {formatDuracion(s.duracionMin)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => iniciarEdicion(s)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                            style={{ background: "#fff0f5", border: "1px solid #f0d080", color: "#c9a84c" }}>
                            ✏️
                          </button>
                          <button
                            onClick={() => setConfirmandoBorrar(s.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                            style={{ background: "#ef444422", border: "1px solid #ef4444", color: "#ef4444" }}>
                            🗑
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                  TAB BLOQUEOS                       */
/* ═══════════════════════════════════════════════════ */

type TipoBloqueo = "todo" | "manana" | "tarde";
type DiaBloqueado = { id: string; fecha: string; tipo: TipoBloqueo; motivo: string };

function TabBloqueos({ token }: { token: string }) {
  const [fechaSel, setFechaSel] = useState("");
  const [tipo, setTipo] = useState<TipoBloqueo>("todo");
  const [motivo, setMotivo] = useState("");
  const [bloqueos, setBloqueos] = useState<DiaBloqueado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const res = await fetch("/api/admin/dias-bloqueados", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBloqueos(Array.isArray(data) ? data : []);
  }

  async function bloquear() {
    if (!fechaSel) return setMsg({ ok: false, texto: "Selecciona una fecha" });
    setCargando(true);
    setMsg(null);
    const res = await fetch("/api/admin/dias-bloqueados", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fecha: fechaSel, tipo, motivo }),
    });
    setCargando(false);
    if (res.ok) {
      setMsg({ ok: true, texto: "Día bloqueado correctamente ✓" });
      setFechaSel("");
      setMotivo("");
      cargar();
    } else {
      const d = await res.json();
      setMsg({ ok: false, texto: d.error || "Error al bloquear" });
    }
  }

  async function desbloquear(fecha: string) {
    await fetch("/api/admin/dias-bloqueados", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fecha }),
    });
    cargar();
  }

  const tipoLabels: Record<TipoBloqueo, string> = {
    todo: "Todo el día",
    manana: "Solo mañana (7am – 12pm)",
    tarde: "Solo tarde (2pm – 7pm)",
  };

  const tipoColors: Record<TipoBloqueo, string> = {
    todo: "#ef4444",
    manana: "#f59e0b",
    tarde: "#6366f1",
  };

  const futuros = bloqueos.filter((b) => b.fecha >= today);
  const pasados = bloqueos.filter((b) => b.fecha < today);

  return (
    <div>
      <h2 className="section-title mb-1">⛔ Bloquear días</h2>
      <p className="text-xs mb-4" style={{ color: "#888" }}>
        Bloquea fechas en las que no puedes atender. Los clientes no podrán reservar en esos horarios.
      </p>

      {/* Formulario */}
      <div className="card-elegant p-4 mb-5">
        <p className="text-sm font-semibold mb-3" style={{ color: "#c9a84c" }}>Selecciona la fecha</p>
        <input
          type="date"
          min={today}
          value={fechaSel}
          onChange={(e) => { setFechaSel(e.target.value); setMsg(null); }}
          className="mb-4"
        />

        <p className="text-sm font-semibold mb-2" style={{ color: "#888" }}>Tipo de bloqueo</p>
        <div className="space-y-2 mb-4">
          {(["todo", "manana", "tarde"] as TipoBloqueo[]).map((t) => (
            <label
              key={t}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
              style={
                tipo === t
                  ? { background: "#fff0f5", border: `1.5px solid ${tipoColors[t]}` }
                  : { background: "#fafafa", border: "1px solid #f0e0e8" }
              }
            >
              <input
                type="radio"
                name="tipo_bloqueo"
                value={t}
                checked={tipo === t}
                onChange={() => setTipo(t)}
              />
              <div>
                <p className="text-sm font-semibold" style={{ color: tipo === t ? tipoColors[t] : "#555" }}>
                  {t === "todo" && "🔴 "}
                  {t === "manana" && "🌅 "}
                  {t === "tarde" && "🌆 "}
                  {tipoLabels[t]}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Motivo (opcional)</label>
          <input
            type="text"
            placeholder="Ej: cita médica, viaje familiar, descanso..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        <button
          onClick={bloquear}
          disabled={cargando || !fechaSel}
          className="btn-gold w-full"
          style={!fechaSel ? { opacity: 0.5 } : {}}
        >
          {cargando ? "Bloqueando..." : "⛔ Bloquear este día"}
        </button>

        {msg && (
          <p className="text-xs mt-3 text-center font-semibold"
            style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>
            {msg.texto}
          </p>
        )}
      </div>

      {/* Lista de bloqueos futuros */}
      <p className="text-sm font-semibold mb-2" style={{ color: "#555" }}>
        Próximos días bloqueados ({futuros.length})
      </p>

      {futuros.length === 0 ? (
        <div className="text-center py-6 mb-4 rounded-xl" style={{ background: "#f0fff4", border: "1px dashed #10b981" }}>
          <p className="text-2xl mb-1">✅</p>
          <p className="text-sm" style={{ color: "#10b981" }}>Sin bloqueos próximos</p>
        </div>
      ) : (
        <div className="space-y-2 mb-5">
          {futuros.map((b) => (
            <div key={b.fecha} className="card-elegant p-3 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">{formatFecha(b.fecha)}</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: tipoColors[b.tipo] }}>
                  {tipoLabels[b.tipo]}
                </p>
                {b.motivo && <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>{b.motivo}</p>}
              </div>
              <button
                onClick={() => desbloquear(b.fecha)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b981" }}>
                Desbloquear
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bloqueos pasados */}
      {pasados.length > 0 && (
        <>
          <p className="text-xs font-semibold mb-2" style={{ color: "#bbb" }}>Historial</p>
          <div className="space-y-2">
            {pasados.slice(-5).reverse().map((b) => (
              <div key={b.fecha} className="card-elegant p-3 flex justify-between items-center" style={{ opacity: 0.5 }}>
                <div>
                  <p className="font-bold text-sm">{formatFecha(b.fecha)}</p>
                  <p className="text-xs mt-0.5" style={{ color: tipoColors[b.tipo] }}>{tipoLabels[b.tipo]}</p>
                  {b.motivo && <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>{b.motivo}</p>}
                </div>
                <button
                  onClick={() => desbloquear(b.fecha)}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                  style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef4444" }}>
                  Borrar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TablaClientes({ reservas }: { reservas: Reserva[] }) {
  const clientes = reservas.reduce((acc, r) => {
    const key = r.cliente_telefono;
    if (!acc[key]) acc[key] = { nombre: r.cliente_nombre, telefono: r.cliente_telefono, citas: [], total: 0 };
    if (r.estado !== "cancelada") { acc[key].citas.push(r); acc[key].total += r.precio; }
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
                <p className="text-sm font-semibold" style={{ color: "#c9a84c" }}>
                  {c.citas.length} cita{c.citas.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs" style={{ color: "#888" }}>Total: {formatPrecio(c.total)}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {c.citas.slice(-3).map((ci) => (
                <p key={ci.id} className="text-xs" style={{ color: "#aaa" }}>
                  • {formatFecha(ci.fecha)} — {ci.servicio_nombre}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
