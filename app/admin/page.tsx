"use client";

import { useState, useEffect, useRef } from "react";
import { formatPrecio, formatDuracion, CATEGORIAS } from "@/lib/servicios";
import type { Servicio } from "@/lib/servicios";
import { TEMAS, getTema, aplicarTema } from "@/lib/temas";
import { useFondo } from "@/lib/useFondo";

const toTitleCase = (s: string) => s.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
const soloNumeros = (s: string) => s.replace(/\D/g, "");

/* ── Tipos de permisos ── */
type PermReservas = { visible: boolean; cambiarEstado: boolean; cancelar: boolean; eliminar: boolean; descargarPDF: boolean; descargarPDFMasivo: boolean };
type PermCompletadas = { visible: boolean; eliminar: boolean; descargarPDF: boolean; descargarPDFMasivo: boolean; reenviarWhatsApp: boolean; multipleReenvio: boolean };
type PermRifas = { visible: boolean; crear: boolean; editar: boolean; eliminar: boolean; cerrar: boolean; toggleBanner: boolean; verParticipantes: boolean; confirmarPagos: boolean; cancelarTickets: boolean; sorteoAutomatico: boolean; sorteoManual: boolean; notificarGanador: boolean; verBannerGanador: boolean; verPlantillas: boolean };
type Permisos = {
  hoy: PermReservas; pendientes: PermReservas; confirmadas: PermReservas; canceladas: PermReservas; todas: PermReservas;
  completadas: PermCompletadas;
  vistasConfig: { reservasVista: "lista" | "tabs" };
  clientes: { visible: boolean; historial: boolean };
  servicios: { visible: boolean; crear: boolean; editar: boolean; eliminar: boolean };
  trabajadores: { visible: boolean; crear: boolean; editar: boolean; eliminar: boolean; toggleActivo: boolean; verAgenda: boolean };
  cumpleanos: { visible: boolean; crear: boolean; eliminar: boolean; enviar: boolean };
  promociones: { visible: boolean; crearRecurrente: boolean; crearPuntual: boolean; eliminar: boolean; copiarMensaje: boolean };
  rifas: PermRifas;
  comisiones: { visible: boolean; verMontos: boolean; verResumen: boolean; verDetalleTrabajadoras: boolean };
  ganancias: { visible: boolean; descargarPDF: boolean; verKpis: boolean; verTrabajadoras: boolean };
  informes: { visible: boolean; descargarPDF: boolean; verKpiCitas: boolean; verFinanzas: boolean; verEstados: boolean; verTopServicios: boolean; verTopClientes: boolean; verTopDias: boolean };
  graficas: { visible: boolean; verIngresos: boolean; verComposicion: boolean; verTrabajadoras: boolean; verTopServicios: boolean; verTendencia: boolean };
  horarios: { visible: boolean; editar: boolean };
  config: { visible: boolean; cambiarTema: boolean; metodosPago: boolean; anticipo: boolean; extras: boolean };
  respaldo: { visible: boolean; exportar: boolean; restaurar: boolean };
  accesos: { visible: boolean };
  navConfig: { adminPuedeCambiarVista: boolean };
};
const PR: PermReservas = { visible: true, cambiarEstado: true, cancelar: true, eliminar: true, descargarPDF: true, descargarPDFMasivo: true };
const PC: PermCompletadas = { visible: true, eliminar: true, descargarPDF: true, descargarPDFMasivo: true, reenviarWhatsApp: true, multipleReenvio: true };
const PERM_RIFAS_DEFAULT: PermRifas = { visible: true, crear: true, editar: true, eliminar: true, cerrar: true, toggleBanner: true, verParticipantes: true, confirmarPagos: true, cancelarTickets: true, sorteoAutomatico: true, sorteoManual: true, notificarGanador: true, verBannerGanador: true, verPlantillas: true };
const PERMISOS_DEFAULT: Permisos = {
  hoy: { ...PR }, pendientes: { ...PR }, confirmadas: { ...PR }, canceladas: { ...PR }, todas: { ...PR },
  completadas: { ...PC },
  vistasConfig: { reservasVista: "tabs" },
  clientes: { visible: true, historial: true },
  servicios: { visible: true, crear: true, editar: true, eliminar: true },
  trabajadores: { visible: true, crear: true, editar: true, eliminar: true, toggleActivo: true, verAgenda: true },
  cumpleanos: { visible: true, crear: true, eliminar: true, enviar: true },
  promociones: { visible: true, crearRecurrente: true, crearPuntual: true, eliminar: true, copiarMensaje: true },
  rifas: { ...PERM_RIFAS_DEFAULT },
  comisiones: { visible: true, verMontos: true, verResumen: true, verDetalleTrabajadoras: true },
  ganancias: { visible: true, descargarPDF: true, verKpis: true, verTrabajadoras: true },
  informes: { visible: true, descargarPDF: true, verKpiCitas: true, verFinanzas: true, verEstados: true, verTopServicios: true, verTopClientes: true, verTopDias: true },
  graficas: { visible: true, verIngresos: true, verComposicion: true, verTrabajadoras: true, verTopServicios: true, verTendencia: true },
  horarios: { visible: true, editar: true },
  config: { visible: true, cambiarTema: true, metodosPago: true, anticipo: true, extras: true },
  respaldo: { visible: true, exportar: true, restaurar: true },
  accesos: { visible: true },
  navConfig: { adminPuedeCambiarVista: true },
};
function mergePermisos(data: Record<string, unknown>): Permisos {
  const p = { ...PERMISOS_DEFAULT };
  for (const k of Object.keys(p) as (keyof Permisos)[]) {
    if (data[k] && typeof data[k] === "object")
      (p as Record<string, unknown>)[k] = { ...(p[k] as object), ...(data[k] as object) };
  }
  return p;
}

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
  duracion_min?: number;
  estado: "pendiente" | "confirmada" | "en_proceso" | "completada" | "cancelada";
  expira_en: string;
  trabajador_id?: string;
  trabajador_nombre?: string;
  es_premio_rifa?: boolean;
  rifa_nombre?: string;
};

type Vista = "hoy" | "pendientes" | "confirmadas" | "todas" | "completadas" | "canceladas" | "reservas" | "clientes" | "servicios" | "trabajadores" | "cumpleanos" | "comisiones" | "ganancias" | "informes" | "config" | "respaldo" | "accesos" | "permisos" | "fondos" | "graficas" | "horarios" | "promociones" | "rifas";

/* ═══════════════════════════════════════════════════ */
/*                  PÁGINA PRINCIPAL                   */
/* ═══════════════════════════════════════════════════ */

export default function AdminPage() {
  const [logueado, setLogueado] = useState(false);
  const [primerIngreso, setPrimerIngreso] = useState(false);
  const [rol, setRol] = useState<"admin" | "root">("admin");
  const [clave, setClave] = useState("");
  const [usuario, setUsuario] = useState("");
  const [modoRoot, setModoRoot] = useState(false);
  const [iconClicks, setIconClicks] = useState(0);
  const [error, setError] = useState("");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [vista, setVista] = useState<Vista>("hoy");
  const [cargando, setCargando] = useState(false);
  const [waEnviados, setWaEnviados] = useState<Set<string>>(new Set());
  const [modoReset, setModoReset] = useState(false);
  const [modoResetRoot, setModoResetRoot] = useState(false);
  const [showRootModal, setShowRootModal] = useState(false);
  const [vistaReservas, setVistaReservas] = useState<"lista" | "tabs">(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("vistaReservas");
      if (guardado === "lista" || guardado === "tabs") return guardado;
    }
    return "tabs";
  });
  const [vistaNav, setVistaNav] = useState<"tabs" | "lista">(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("vistaNav");
      if (guardado === "lista" || guardado === "tabs") return guardado;
    }
    return "tabs";
  });
  const [token, setToken] = useState("");
  const [permisos, setPermisos] = useState<Permisos>(PERMISOS_DEFAULT);

  // Si el tab activo queda oculto por permisos, volver a "hoy"
  useEffect(() => {
    const tabsConVisible: (keyof Permisos)[] = ["clientes","servicios","trabajadores","cumpleanos","promociones","comisiones","ganancias","informes","graficas","horarios","config","respaldo"];
    if (tabsConVisible.includes(vista as keyof Permisos)) {
      const p = permisos[vista as keyof Permisos] as { visible: boolean };
      if (p && !p.visible) setVista("hoy");
    }
  }, [permisos, vista]);

  const [avisoInactividad, setAvisoInactividad] = useState(false);
  const [cumpleanosHoy, setCumpleanosHoy] = useState<{ id: string; nombre: string; whatsapp: string }[]>([]);
  const fondo = useFondo("admin");
  const fondoLogin = useFondo("login");
  const escapeRef = useRef(0);
  const escapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modoRootRef = useRef(false);
  const inactividadRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restaurar sesión admin desde localStorage al cargar
  useEffect(() => {
    const t = localStorage.getItem("admin_token");
    const r = localStorage.getItem("admin_rol");
    const exp = localStorage.getItem("admin_token_exp");
    if (t && r === "admin" && exp && Date.now() < Number(exp)) {
      setToken(t);
      setRol("admin");
      setLogueado(true);
      cargarReservas(t);
      cargarCumpleanosHoy(t);
      fetch("/api/admin/permisos", { headers: { Authorization: `Bearer ${t}` } })
        .then(res => res.json()).then(d => setPermisos(mergePermisos(d))).catch(() => {});
    }
  }, []);

  function handleIconClick() {
    if (logueado) return;
    const next = iconClicks + 1;
    setIconClicks(next);
    if (iconTimerRef.current) clearTimeout(iconTimerRef.current);
    if (next >= 2) {
      const nuevoModo = !modoRootRef.current;
      modoRootRef.current = nuevoModo;
      setModoRoot(nuevoModo);
      setIconClicks(0);
      setError(""); setClave(""); setUsuario("");
    } else {
      iconTimerRef.current = setTimeout(() => setIconClicks(0), 500);
    }
  }

  function authHeader(): HeadersInit {
    return { Authorization: `Bearer ${token}` };
  }

  // Capa 6: validateSession cada 5 minutos
  useEffect(() => {
    if (!logueado) return;
    const interval = setInterval(async () => {
      const t = getStoredToken();
      if (!t) { handleLogout(); return; }
      // Verificar expiración local para admin (localStorage)
      const exp = localStorage.getItem("admin_token_exp");
      if (exp && Date.now() > Number(exp)) { handleLogout(); return; }
      const res = await fetch("/api/admin/validate", { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) handleLogout();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [logueado]);

  // Auto-logout por inactividad: admin 4h, root 30 min
  useEffect(() => {
    if (!logueado) return;
    const AVISO_MS = rol === "root" ? 25 * 60 * 1000 : 3.5 * 60 * 60 * 1000;
    const LOGOUT_MS = rol === "root" ? 30 * 60 * 1000 : 4 * 60 * 60 * 1000;

    function resetTimer() {
      setAvisoInactividad(false);
      if (avisoRef.current) clearTimeout(avisoRef.current);
      if (inactividadRef.current) clearTimeout(inactividadRef.current);
      avisoRef.current = setTimeout(() => setAvisoInactividad(true), AVISO_MS);
      inactividadRef.current = setTimeout(() => handleLogout(), LOGOUT_MS);
    }

    const eventos = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    eventos.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      eventos.forEach(e => window.removeEventListener(e, resetTimer));
      if (avisoRef.current) clearTimeout(avisoRef.current);
      if (inactividadRef.current) clearTimeout(inactividadRef.current);
    };
  }, [logueado]);

  // Escape x3 en pantalla de login → reset según modo (admin o root)
  useEffect(() => {
    if (logueado) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      escapeRef.current += 1;
      if (escapeTimerRef.current) clearTimeout(escapeTimerRef.current);
      if (escapeRef.current >= 3) {
        escapeRef.current = 0;
        if (modoRootRef.current) {
          setModoResetRoot(true);
        } else {
          setModoReset(true);
        }
      } else {
        escapeTimerRef.current = setTimeout(() => { escapeRef.current = 0; }, 1000);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logueado]);

  async function login() {
    setError("");
    const body: Record<string, string> = { clave };
    if (modoRoot) body.usuario = usuario;
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      // Si intentó ingresar como root pero el servidor devolvió admin → rechazar
      if (modoRoot && data.rol !== "root") {
        setError("Credenciales de SuperAdmin incorrectas");
        return;
      }
      if (data.rol === "root") {
        sessionStorage.setItem("admin_token", data.token);
        sessionStorage.setItem("admin_rol", "root");
      } else {
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("admin_rol", "admin");
        localStorage.setItem("admin_token_exp", String(Date.now() + 24 * 60 * 60 * 1000));
      }
      setToken(data.token);
      setRol(data.rol === "root" ? "root" : "admin");
      setPrimerIngreso(data.primer_ingreso === true);
      setLogueado(true);
      if (!data.primer_ingreso) {
        cargarReservas(data.token);
        cargarCumpleanosHoy(data.token);
        if (data.rol !== "root") {
          fetch("/api/admin/permisos", { headers: { Authorization: `Bearer ${data.token}` } })
            .then(r => r.json()).then(d => setPermisos(mergePermisos(d))).catch(() => {});
        } else {
          setPermisos(PERMISOS_DEFAULT);
        }
      }
    } else {
      const data = await res.json();
      setError(data.error || "Contraseña incorrecta");
    }
  }

  function getStoredToken(): string {
    return sessionStorage.getItem("admin_token") || localStorage.getItem("admin_token") || "";
  }

  function clearStoredSession() {
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_rol");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_rol");
    localStorage.removeItem("admin_token_exp");
  }

  function handleLogout() {
    const t = getStoredToken() || token;
    if (t) fetch("/api/admin/logout", { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    clearStoredSession();
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

  async function cargarCumpleanosHoy(authToken?: string) {
    const t = authToken || token;
    try {
      const res = await fetch("/api/admin/cumpleanos", { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const hoyMD = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(5);
      const hoy = data.filter((c: Record<string, string>) => {
        const fn = c.fecha_nacimiento || "";
        return fn.slice(5) === hoyMD;
      });
      setCumpleanosHoy(hoy);
    } catch { /* silencioso */ }
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
  const pendientes = reservas.filter((r) => r.estado === "pendiente" || r.estado === "en_proceso");

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
    if (modoResetRoot) {
      return (
        <PinResetRoot
          onCerrar={() => setModoResetRoot(false)}
          onOk={() => { setModoResetRoot(false); setError("Clave root restablecida. Ingresa con tu nueva clave."); }}
        />
      );
    }
    return (
      <main className="min-h-screen flex items-center justify-center px-4 relative"
        style={fondoLogin.overlay ? fondoLogin.style : { background: "linear-gradient(180deg,var(--c-primary-bg),var(--c-bg-to))" }}>
        {fondoLogin.overlay && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px]" style={{ zIndex: 0 }} />}
        <div className="relative" style={{ zIndex: 1 }}>
        <div className="card-elegant p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-2 select-none cursor-pointer" onClick={handleIconClick}
            style={modoRoot ? { filter: "drop-shadow(0 0 8px #6366f1)" } : {}}>
            {modoRoot ? "👑" : "💅"}
          </div>
          <h1 className="font-script text-2xl font-bold mb-1"
            style={{ color: modoRoot ? "#6366f1" : "var(--c-primary)" }}>
            Leila Studio
          </h1>
          <p className="text-xs tracking-widest mb-6"
            style={{ color: modoRoot ? "#818cf8" : "var(--c-primary-dark)" }}>
            {modoRoot ? "ACCESO SUPERADMIN" : "PANEL ADMIN"}
          </p>
          {modoRoot && (
            <input type="text" placeholder="Usuario"
              value={usuario} onChange={(e) => setUsuario(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              className="mb-3" autoComplete="off" />
          )}
          <input
            type="password" placeholder="Contraseña"
            value={clave} onChange={(e) => setClave(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="mb-3"
          />
          {error && <p className="text-xs mb-3" style={{ color: "#e91e8c" }}>{error}</p>}
          <button onClick={login} className="btn-gold w-full mb-3"
            style={modoRoot ? { background: "linear-gradient(135deg,#6366f1,#818cf8)" } : {}}>
            Entrar
          </button>
          {modoRoot && (
            <button onClick={() => { setModoRoot(false); setClave(""); setUsuario(""); setError(""); }}
              className="text-xs underline" style={{ color: "#888" }}>
              Volver al login normal
            </button>
          )}
        </div>
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
    <main className="min-h-screen relative"
      style={fondo.overlay ? fondo.style : { background: "linear-gradient(180deg,var(--c-primary-bg),var(--c-bg-to))" }}>
      {fondo.overlay && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px]" style={{ zIndex: 0 }} />}
      <div className="relative" style={{ zIndex: 1 }}>
      {avisoInactividad && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3 text-sm font-semibold"
          style={{ background: "#f59e0b", color: "#1a1a1a" }}>
          <span>⚠️ Sesión inactiva. Cierre automático en 5 minutos.</span>
          <button onClick={() => setAvisoInactividad(false)}
            className="ml-4 px-3 py-1 rounded-lg text-xs font-bold"
            style={{ background: "#1a1a1a22" }}>
            Seguir activo
          </button>
        </div>
      )}
      {cumpleanosHoy.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 text-sm font-semibold"
          style={{ background: "linear-gradient(135deg,#ec4899,#f472b6)", color: "white" }}>
          <span>🎂 Hoy cumplen años: {cumpleanosHoy.map(c => c.nombre).join(", ")} · ¡No olvides enviarles su saludo!</span>
          <button onClick={() => setVista("cumpleanos")}
            className="ml-4 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap"
            style={{ background: "rgba(255,255,255,0.25)" }}>
            Ver →
          </button>
        </div>
      )}
      <header className="py-4 px-6 flex justify-between items-center"
        style={{ borderBottom: "2px solid var(--c-primary-light)", background: "var(--c-primary-bg)" }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl select-none cursor-default"
              onDoubleClick={() => rol !== "root" && setShowRootModal(true)}>
              {rol === "root" ? "👑" : "💅"}
            </span>
            <h1 className="font-script text-2xl font-bold" style={{ color: "var(--c-primary)" }}>
              Leila Studio
            </h1>
            {rol === "root" && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#6366f1", color: "white" }}>👑 SuperAdmin</span>
            )}
          </div>
          <p className="text-xs tracking-widest" style={{ color: "var(--c-primary-dark)" }}>PANEL ADMIN</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => cargarReservas()}
            className="text-xs px-3 py-1 rounded-full" style={{ background: "var(--c-primary-light)", color: "var(--c-primary-dark)" }}>
            ↻
          </button>
          <button onClick={handleLogout}
            className="text-xs px-3 py-1 rounded-full" style={{ background: "#fce4ec", color: "#e91e8c" }}>
            Salir
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 p-4">
        <StatCard label="Citas hoy" value={reservasHoy.length} color="var(--c-primary)" />
        <StatCard label="Pendientes" value={pendientes.length} color="#f59e0b" />
        <StatCard label="Confirmadas" value={reservas.filter(r => r.estado === "confirmada").length} color="#10b981" />
        <StatCard label="Canceladas" value={reservas.filter(r => r.estado === "cancelada").length} color="#ef4444" />
        <StatCard label="Completadas" value={reservas.filter(r => r.estado === "completada").length} color="#6366f1" />
        <StatCard label="Total" value={reservas.length} color="#888" />
      </div>

      {/* ── Navegación agrupada ── */}
      {(() => {
        const isVisible = (id: string) =>
          rol === "root" || (permisos[id as keyof Permisos] as { visible: boolean })?.visible !== false;

        const puedeToggleNav = rol === "root" || permisos.navConfig?.adminPuedeCambiarVista !== false;

        const tabsReservas: { id: Vista; label: string }[] = vistaReservas === "tabs" ? [
          { id: "hoy", label: "Hoy" },
          { id: "pendientes", label: pendientes.length > 0 ? `Pend. (${pendientes.length})` : "Pendientes" },
          { id: "confirmadas" as Vista, label: "Confirmadas" },
          { id: "canceladas" as Vista, label: "Canceladas" },
          ...(permisos.completadas?.visible !== false ? [{ id: "completadas" as Vista, label: "✅ Completadas" }] : []),
          { id: "todas", label: "Todas" },
        ] : [{ id: "reservas" as Vista, label: `Reservas (${reservas.filter(r => r.estado !== "cancelada").length})` }];

        const tabsGestion: { id: Vista; label: string }[] = [
          ...(permisos.clientes.visible ? [{ id: "clientes" as Vista, label: "Clientes" }] : []),
          ...(permisos.servicios.visible ? [{ id: "servicios" as Vista, label: "Servicios" }] : []),
          ...(permisos.trabajadores.visible ? [{ id: "trabajadores" as Vista, label: "Trabajadoras" }] : []),
          ...(permisos.cumpleanos.visible ? [{ id: "cumpleanos" as Vista, label: cumpleanosHoy.length > 0 ? `🎂 Cumpleaños (${cumpleanosHoy.length})` : "🎂 Cumpleaños" }] : []),
          ...(permisos.promociones.visible ? [{ id: "promociones" as Vista, label: "🎉 Promociones" }] : []),
          ...(permisos.rifas.visible ? [{ id: "rifas" as Vista, label: "🎟️ Rifas" }] : []),
        ];

        const tabsFinanzas: { id: Vista; label: string }[] = [
          ...(permisos.comisiones.visible ? [{ id: "comisiones" as Vista, label: "Comisiones" }] : []),
          ...(permisos.ganancias.visible ? [{ id: "ganancias" as Vista, label: "Ganancias" }] : []),
          ...(permisos.informes.visible ? [{ id: "informes" as Vista, label: "Informes" }] : []),
          ...(permisos.graficas.visible ? [{ id: "graficas" as Vista, label: "Gráficas" }] : []),
        ];

        const tabsSistema: { id: Vista; label: string }[] = [
          ...(permisos.config.visible ? [{ id: "config" as Vista, label: "Config" }] : []),
          ...(permisos.respaldo.visible ? [{ id: "respaldo" as Vista, label: "Respaldo" }] : []),
          ...(permisos.horarios.visible ? [{ id: "horarios" as Vista, label: "Horarios" }] : []),
          ...(rol === "root" ? [
            { id: "accesos" as Vista, label: "Accesos" },
            { id: "permisos" as Vista, label: "Permisos" },
            { id: "fondos" as Vista, label: "Fondos" },
          ] : []),
        ];

        function BotonTab({ tab }: { tab: { id: Vista; label: string } }) {
          const activo = vista === tab.id;
          return (
            <button onClick={() => setVista(tab.id)}
              className="whitespace-nowrap px-2 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={activo
                ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white", boxShadow: "0 2px 8px var(--c-card-shadow)" }
                : { color: "#999" }}>
              {tab.label}
            </button>
          );
        }

        function GrupoCard({ emoji, nombre, tabs }: { emoji: string; nombre: string; tabs: { id: Vista; label: string }[] }) {
          const vis = tabs.filter(t => isVisible(t.id));
          if (!vis.length) return null;
          const activo = vis.some(t => t.id === vista);
          return (
            <div className="rounded-2xl p-4 transition-all"
              style={activo
                ? { background: "var(--c-primary-bg)", border: "2px solid var(--c-primary)", boxShadow: "0 4px 16px var(--c-card-shadow-base), 0 8px 32px var(--c-card-shadow)" }
                : { background: "var(--c-primary-bg)", border: "1.5px solid var(--c-border-soft)", boxShadow: "0 4px 16px var(--c-card-shadow-base), 0 8px 32px var(--c-card-shadow)" }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background: "linear-gradient(135deg,var(--c-primary-bg),var(--c-border-soft))", color: "var(--c-primary)", border: "1px solid var(--c-primary-light)" }}>
                  {emoji} {nombre}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vis.map(tab => <BotonTab key={tab.id} tab={tab} />)}
              </div>
            </div>
          );
        }

        const ToggleVista = () => (
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1.5px solid var(--c-border-soft)", alignSelf: "flex-start" }}>
            <button onClick={() => { setVistaNav("tabs"); localStorage.setItem("vistaNav", "tabs"); }}
              className="px-3 py-1 text-xs font-semibold transition-all"
              style={vistaNav === "tabs"
                ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
                : { background: "transparent", color: "#bbb" }}>
              🗂 Tabs
            </button>
            <button onClick={() => { setVistaNav("lista"); localStorage.setItem("vistaNav", "lista"); }}
              className="px-3 py-1 text-xs font-semibold transition-all"
              style={vistaNav === "lista"
                ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
                : { background: "transparent", color: "#bbb" }}>
              📋 Lista
            </button>
          </div>
        );

        const ToggleReservas = () => (
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1.5px solid var(--c-border-soft)", alignSelf: "flex-start" }}>
            <button onClick={() => { setVistaReservas("tabs"); localStorage.setItem("vistaReservas", "tabs"); if (vista === "reservas") setVista("hoy"); }}
              className="px-3 py-1 text-xs font-semibold transition-all"
              style={vistaReservas === "tabs"
                ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
                : { background: "transparent", color: "#bbb" }}>
              🗂 Tabs
            </button>
            <button onClick={() => { setVistaReservas("lista"); localStorage.setItem("vistaReservas", "lista"); if (["hoy","pendientes","confirmadas","canceladas","completadas","todas"].includes(vista)) setVista("reservas" as Vista); }}
              className="px-3 py-1 text-xs font-semibold transition-all"
              style={vistaReservas === "lista"
                ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
                : { background: "transparent", color: "#bbb" }}>
              📋 Lista
            </button>
          </div>
        );

        if (vistaNav === "lista") {
          // ── MODO LISTA: una tira horizontal con todos los grupos ──
          const grupos = [
            { emoji: "📅", nombre: "Reservas", tabs: tabsReservas },
            { emoji: "🏢", nombre: "Gestión", tabs: tabsGestion },
            { emoji: "💰", nombre: "Finanzas", tabs: tabsFinanzas },
            { emoji: "⚙️", nombre: "Sistema", tabs: tabsSistema },
          ].filter(g => g.tabs.filter(t => isVisible(t.id)).length > 0);

          return (
            <div className="px-4 mb-5 space-y-2">
              {puedeToggleNav && (
                <div className="flex justify-end">
                  <ToggleVista />
                </div>
              )}
              <div className="rounded-2xl p-3 overflow-x-auto"
                style={{ background: "var(--c-primary-bg)", border: "1.5px solid var(--c-border-soft)", boxShadow: "0 4px 16px var(--c-card-shadow-base)" }}>
                <div className="flex items-center gap-1 min-w-max">
                  {grupos.map((g, gi) => {
                    const vis = g.tabs.filter(t => isVisible(t.id));
                    return (
                      <div key={g.nombre} className="flex items-center gap-1">
                        {gi > 0 && <span className="w-px h-5 mx-1 rounded-full" style={{ background: "var(--c-border-soft)", display: "inline-block" }} />}
                        <span className="text-[9px] font-black uppercase tracking-widest px-1" style={{ color: "var(--c-primary-light)" }}>
                          {g.emoji}
                        </span>
                        {vis.map(tab => (
                          <button key={tab.id} onClick={() => setVista(tab.id)}
                            className="whitespace-nowrap px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={vista === tab.id
                              ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white", boxShadow: "0 2px 8px var(--c-card-shadow)" }
                              : { color: "#999" }}>
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        // ── MODO TABS: grid de cards ──
        return (
          <div className="px-4 mb-5 space-y-2">
            {puedeToggleNav && (
              <div className="flex justify-end">
                <ToggleVista />
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <GrupoCard emoji="📅" nombre="Reservas" tabs={tabsReservas} />
              <GrupoCard emoji="🏢" nombre="Gestión" tabs={tabsGestion} />
              <GrupoCard emoji="💰" nombre="Finanzas" tabs={tabsFinanzas} />
              <GrupoCard emoji="⚙️" nombre="Sistema" tabs={tabsSistema} />
            </div>
          </div>
        );
      })()}

      {/* Contenido */}
      <div className="px-4 pb-8">
        {cargando && <p className="text-center text-sm py-4" style={{ color: "#888" }}>Cargando...</p>}

        {vista === "reservas" && (
          <ListaReservas reservas={reservas} titulo="Todas las reservas" modoLista
            onActualizar={actualizarEstado} onEliminar={eliminarReserva} onRefresh={cargarReservas}
            vacio="No hay reservas" esRoot={rol === "root"} perm={permisos.todas}
            permCompletadas={permisos.completadas} token={token}
            waEnviados={waEnviados} onWaEnviado={(id) => setWaEnviados(prev => new Set([...prev, id]))} />
        )}
        {vista === "hoy" && (
          <ListaReservas reservas={reservasHoy} titulo={`Citas de hoy — ${formatFecha(hoy)}`}
            onActualizar={actualizarEstado} onEliminar={eliminarReserva} onRefresh={cargarReservas}
            vacio="No hay citas para hoy" esRoot={rol === "root"} perm={permisos.hoy}
            permCompletadas={permisos.completadas} token={token}
            waEnviados={waEnviados} onWaEnviado={(id) => setWaEnviados(prev => new Set([...prev, id]))} />
        )}
        {vista === "pendientes" && (
          <ListaReservas reservas={pendientes} titulo="Reservas pendientes de pago"
            onActualizar={actualizarEstado} onEliminar={eliminarReserva} onRefresh={cargarReservas}
            vacio="No hay reservas pendientes" esRoot={rol === "root"} perm={permisos.pendientes}
            permCompletadas={permisos.completadas} token={token}
            waEnviados={waEnviados} onWaEnviado={(id) => setWaEnviados(prev => new Set([...prev, id]))} />
        )}
        {vista === "confirmadas" && (
          <ListaReservas reservas={reservas.filter(r => r.estado === "confirmada")}
            titulo="Citas confirmadas" onActualizar={actualizarEstado} onEliminar={eliminarReserva}
            onRefresh={cargarReservas} vacio="No hay citas confirmadas" esRoot={rol === "root"} perm={permisos.confirmadas}
            permCompletadas={permisos.completadas} token={token}
            waEnviados={waEnviados} onWaEnviado={(id) => setWaEnviados(prev => new Set([...prev, id]))} />
        )}
        {vista === "todas" && (
          <ListaReservas reservas={reservas.filter((r) => r.estado !== "cancelada")}
            titulo="Todas las reservas" onActualizar={actualizarEstado} onEliminar={eliminarReserva}
            onRefresh={cargarReservas} vacio="No hay reservas" esRoot={rol === "root"} perm={permisos.todas}
            permCompletadas={permisos.completadas} token={token}
            waEnviados={waEnviados} onWaEnviado={(id) => setWaEnviados(prev => new Set([...prev, id]))} />
        )}
        {vista === "completadas" && (
          <TabCompletadas reservas={reservas} token={token} perm={permisos.completadas}
            esRoot={rol === "root"} onRefresh={cargarReservas}
            waEnviados={waEnviados} onWaEnviado={(id) => setWaEnviados(prev => new Set([...prev, id]))} />
        )}
        {vista === "canceladas" && (
          <ListaReservas reservas={reservas.filter(r => r.estado === "cancelada")}
            titulo="Citas canceladas" onActualizar={actualizarEstado} onEliminar={eliminarReserva}
            onRefresh={cargarReservas} vacio="No hay citas canceladas" esRoot={rol === "root"} perm={permisos.canceladas}
            permCompletadas={permisos.completadas} token={token}
            waEnviados={waEnviados} onWaEnviado={(id) => setWaEnviados(prev => new Set([...prev, id]))} />
        )}
        {vista === "clientes" && <TablaClientes reservas={reservas} perm={permisos.clientes} />}
        {vista === "servicios" && <TabServicios token={token} perm={permisos.servicios} />}
        {vista === "trabajadores" && <TabTrabajadores token={token} perm={permisos.trabajadores} />}
        {vista === "cumpleanos" && <TabCumpleanos token={token} perm={permisos.cumpleanos} onCumpleanosHoyChange={setCumpleanosHoy} />}
        {vista === "promociones" && <TabPromociones token={token} perm={permisos.promociones} />}
        {vista === "graficas" && <TabGraficas reservas={reservas} token={token} perm={permisos.graficas} />}
        {vista === "horarios" && <TabHorarios token={token} esRoot={rol === "root"} perm={permisos.horarios} />}
        {vista === "comisiones" && <TabComisiones reservas={reservas} token={token} perm={permisos.comisiones} />}
        {vista === "ganancias" && <TabGanancias reservas={reservas} token={token} perm={permisos.ganancias} />}
        {vista === "informes" && <TabInformes reservas={reservas} token={token} perm={permisos.informes} />}
        {vista === "rifas" && <TabRifas token={token} perm={permisos.rifas} esRoot={rol === "root"} />}
        {vista === "accesos" && rol === "root" && <TabAccesos token={token} />}
        {vista === "permisos" && rol === "root" && <TabPermisos token={token} />}
        {vista === "fondos" && rol === "root" && <TabFondos token={token} />}
        {vista === "config" && <TabConfig token={token} esRoot={rol === "root"} perm={permisos.config} />}
        {vista === "respaldo" && <TabRespaldo token={token} perm={permisos.respaldo} />}
      </div>

      {showRootModal && (
        <ModalLoginRoot
          onClose={() => setShowRootModal(false)}
          onSuccess={(t) => {
            sessionStorage.setItem("admin_token", t);
            sessionStorage.setItem("admin_rol", "root");
            setToken(t);
            setRol("root");
            setShowRootModal(false);
          }}
        />
      )}
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
      style={{ background: "linear-gradient(180deg,var(--c-primary-bg),var(--c-bg-to))" }}>
      <div className="card-elegant p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🔐</div>
          <h2 className="font-script text-xl font-bold" style={{ color: "var(--c-primary)" }}>Primer Ingreso</h2>
          <p className="text-xs mt-1" style={{ color: "#888" }}>Crea tu clave y PIN de seguridad</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Tu nombre</label>
            <input type="text" placeholder="Ej: Leila" value={nombre} onChange={(e) => setNombre(toTitleCase(e.target.value))} />
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
/*           MODAL LOGIN ROOT (desde dashboard)         */
/* ═══════════════════════════════════════════════════ */

function ModalLoginRoot({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (token: string) => void;
}) {
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [cargando, setCargando] = useState(false);
  const [modoResetRoot, setModoResetRoot] = useState(false);
  const escRef = useRef(0);
  const escTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      escRef.current += 1;
      if (escTimer.current) clearTimeout(escTimer.current);
      if (escRef.current >= 3) {
        escRef.current = 0;
        setModoResetRoot(true);
      } else {
        escTimer.current = setTimeout(() => { escRef.current = 0; }, 1000);
        if (escRef.current === 1) onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function login() {
    setErr(""); setCargando(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave: pwd, usuario: usr }),
    });
    setCargando(false);
    if (res.ok) {
      const data = await res.json();
      if (data.rol !== "root") { setErr("Credenciales incorrectas"); return; }
      onSuccess(data.token);
    } else {
      const data = await res.json();
      setErr(data.error || "Credenciales incorrectas");
    }
  }

  if (modoResetRoot) {
    return (
      <PinResetRoot
        onCerrar={() => setModoResetRoot(false)}
        onOk={() => { setModoResetRoot(false); setErr("Clave root restablecida. Intenta de nuevo."); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="card-elegant p-8 w-full max-w-sm text-center relative">
        <button onClick={onClose}
          className="absolute top-3 right-4 text-xl font-bold"
          style={{ color: "#aaa", background: "none", border: "none" }}>✕</button>
        <div className="text-4xl mb-2">👑</div>
        <h2 className="font-script text-2xl font-bold mb-1" style={{ color: "#6366f1" }}>SuperAdmin</h2>
        <p className="text-xs tracking-widest mb-6" style={{ color: "#818cf8" }}>ACCESO ROOT</p>
        <input type="text" placeholder="Usuario" value={usr}
          onChange={e => setUsr(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          className="mb-3" autoComplete="off" />
        <input type="password" placeholder="Contraseña" value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()}
          className="mb-3" />
        {err && <p className="text-xs mb-3" style={{ color: "#e91e8c" }}>{err}</p>}
        <button onClick={login} disabled={cargando} className="btn-gold w-full"
          style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}>
          {cargando ? "Verificando..." : "Entrar como SuperAdmin"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*         RESET CLAVE ROOT CON PIN (modal)            */
/* ═══════════════════════════════════════════════════ */

function PinResetRoot({ onCerrar, onOk }: { onCerrar: () => void; onOk: () => void }) {
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
    const res = await fetch("/api/admin/root-pin-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setCargando(false);
    if (res.ok) setPaso("nueva");
    else { const d = await res.json(); setError(d.error || "PIN incorrecto"); }
  }

  async function cambiarClave() {
    setError("");
    if (nuevaClave.length < 4) return setError("Mínimo 4 caracteres");
    if (nuevaClave !== confirmar) return setError("Las claves no coinciden");
    setCargando(true);
    const res = await fetch("/api/admin/root-pin-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, nueva_clave: nuevaClave }),
    });
    setCargando(false);
    if (res.ok) onOk();
    else { const d = await res.json(); setError(d.error || "Error al cambiar"); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="card-elegant p-8 w-full max-w-sm text-center relative">
        <button onClick={onCerrar}
          className="absolute top-3 right-4 text-xl font-bold"
          style={{ color: "#aaa", background: "none", border: "none" }}>✕</button>
        <div className="text-3xl mb-2">{paso === "pin" ? "🔢" : "🔑"}</div>
        <h2 className="font-script text-xl font-bold mb-1" style={{ color: "#6366f1" }}>
          {paso === "pin" ? "PIN de seguridad root" : "Nueva clave root"}
        </h2>
        <p className="text-xs mb-5" style={{ color: "#888" }}>
          {paso === "pin" ? "Ingresa tu PIN de 6 dígitos" : "Elige la nueva contraseña root"}
        </p>
        {paso === "pin" ? (
          <>
            <input type="password" inputMode="numeric" placeholder="PIN de 6 dígitos" maxLength={6}
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mb-3 text-center text-2xl tracking-widest" />
            {error && <p className="text-xs mb-3" style={{ color: "#e91e8c" }}>{error}</p>}
            <button onClick={verificarPin} disabled={cargando} className="btn-gold w-full"
              style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}>
              {cargando ? "Verificando..." : "Verificar PIN"}
            </button>
          </>
        ) : (
          <>
            <div className="space-y-3 text-left mb-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nueva contraseña</label>
                <input type="password" placeholder="Mínimo 4 caracteres" value={nuevaClave}
                  onChange={e => setNuevaClave(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Confirmar contraseña</label>
                <input type="password" placeholder="Repite la contraseña" value={confirmar}
                  onChange={e => setConfirmar(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-xs mb-3" style={{ color: "#e91e8c" }}>{error}</p>}
            <button onClick={cambiarClave} disabled={cargando} className="btn-gold w-full"
              style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}>
              {cargando ? "Guardando..." : "Guardar nueva clave"}
            </button>
          </>
        )}
      </div>
    </div>
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
      style={{ background: "linear-gradient(180deg,var(--c-primary-bg),var(--c-bg-to))" }}>
      <div className="card-elegant p-8 w-full max-w-sm text-center">
        <div className="text-3xl mb-2">{paso === "pin" ? "🔢" : "🔑"}</div>
        <h2 className="font-script text-xl font-bold mb-1" style={{ color: "var(--c-primary)" }}>
          {paso === "pin" ? "Recuperar acceso" : "Nueva contraseña"}
        </h2>
        <p className="text-xs mb-5" style={{ color: "#888" }}>
          {paso === "pin" ? "Ingresa tu PIN de 6 dígitos" : "Elige tu nueva contraseña"}
        </p>

        {paso === "pin" ? (
          <>
            <input type="password" inputMode="numeric" placeholder="PIN de 6 dígitos" maxLength={6}
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
        <button onClick={onVolver} className="text-xs underline" style={{ color: "var(--c-primary)" }}>
          Volver al inicio
        </button>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                TAB CONFIGURACIÓN                    */
/* ═══════════════════════════════════════════════════ */

function TabConfig({ token, esRoot, perm }: { token: string; esRoot?: boolean; perm: Permisos["config"] }) {
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
    <div>
      <h2 className="section-title mb-4">⚙️ {esRoot ? "Perfil del admin" : "Mi perfil"}</h2>
      {esRoot && (
        <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: "#ede9fe", border: "1px solid #818cf8", color: "#6366f1" }}>
          👑 Estás como SuperAdmin. Para cambiar claves y PINs ve a la tab <strong>🔑 Accesos</strong>.
        </div>
      )}

      {/* ── Fila 1: Perfil | Estilo ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="card-elegant p-5">
          <p className="text-sm font-bold mb-4" style={{ color: "var(--c-primary)" }}>👤 Perfil</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nombre</label>
              <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(toTitleCase(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>WhatsApp</label>
              <input type="tel" placeholder="+57 300 000 0000" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            {!esRoot && (
              <>
                <hr style={{ borderColor: "var(--c-primary-light)" }} />
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
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>PIN de seguridad (opcional)</label>
                  <input type="password" inputMode="numeric" placeholder="Nuevo PIN de 6 dígitos" maxLength={6}
                    value={nuevoPin} onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                </div>
              </>
            )}
          </div>
          {msg && <p className="text-xs mt-3 text-center" style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>{msg.texto}</p>}
          <button onClick={guardar} disabled={cargando} className="btn-gold w-full mt-4">
            {cargando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        {perm.cambiarTema && (
          <div className="card-elegant p-5">
            <SelectorTema token={token} esRoot={esRoot} />
          </div>
        )}
      </div>

      {/* ── Fila 2: Métodos de pago | Anticipo ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {perm.metodosPago && (
          <div className="card-elegant p-5">
            <GestorMetodosPago token={token} />
          </div>
        )}
        {perm.anticipo && (
          <div className="card-elegant p-5">
            <GestorAnticipo token={token} esRoot={esRoot} />
          </div>
        )}
      </div>

      {/* ── Fila 3: Valores del negocio ── */}
      {perm.extras && (
        <div className="card-elegant p-5 mb-5">
          <GestorExtras token={token} />
        </div>
      )}

      {/* ── Diagnóstico WhatsApp (solo root) ── */}
      {esRoot && <DiagnosticoWhatsApp token={token} />}
    </div>
  );
}

type Restricciones = { activoEditable: boolean; tipoEditable: boolean; montoEditable: boolean };

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button onClick={() => !disabled && onChange(!on)} disabled={disabled}
      className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
      style={{ background: on ? "var(--c-primary)" : "#d1d5db", opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
        style={{ left: on ? "calc(100% - 22px)" : "2px" }} />
    </button>
  );
}

function GestorExtras({ token }: { token: string }) {
  const [unaAdicional, setUnaAdicional] = useState("2500");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/extras-config", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUnaAdicional(String(d.unaAdicional ?? 2500)))
      .catch(() => {});
  }, [token]);

  async function guardar() {
    setCargando(true); setMsg(null);
    const res = await fetch("/api/admin/extras-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ unaAdicional: Number(unaAdicional) || 0 }),
    });
    setCargando(false);
    setMsg(res.ok ? { ok: true, texto: "✓ Guardado" } : { ok: false, texto: "Error al guardar" });
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div>
      <p className="text-sm font-bold mb-4" style={{ color: "var(--c-primary)" }}>🔧 Valores del negocio</p>
      <div>
        <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>
          💅 Precio uña adicional (mantenimiento)
        </label>
        <input
          type="number" min="0" step="100"
          value={unaAdicional}
          onChange={e => setUnaAdicional(e.target.value)}
        />
        <p className="text-xs mt-1" style={{ color: "#aaa" }}>Se muestra en la página de reservas y en el catálogo</p>
      </div>
      {msg && <p className="text-xs mt-3 text-center" style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>{msg.texto}</p>}
      <button onClick={guardar} disabled={cargando} className="btn-gold w-full mt-4">
        {cargando ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

function GestorAnticipo({ token, esRoot }: { token: string; esRoot?: boolean }) {
  const [activo, setActivo] = useState(true);
  const [tipo, setTipo] = useState<"fijo" | "porcentaje">("fijo");
  const [monto, setMonto] = useState("10000");
  const [porcentaje, setPorcentaje] = useState("30");
  const [restricciones, setRestricciones] = useState<Restricciones>({ activoEditable: true, tipoEditable: true, montoEditable: true });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/anticipo-config", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setActivo(d.activo !== false);
        setTipo(d.tipo === "porcentaje" ? "porcentaje" : "fijo");
        setMonto(String(d.monto ?? 10000));
        setPorcentaje(String(d.porcentaje ?? 30));
        if (d.restricciones) setRestricciones({ activoEditable: d.restricciones.activoEditable !== false, tipoEditable: d.restricciones.tipoEditable !== false, montoEditable: d.restricciones.montoEditable !== false });
      }).catch(() => {});
  }, [token]);

  async function guardar() {
    setCargando(true); setMsg(null);
    const body: Record<string, unknown> = { activo, tipo, monto: Number(monto) || 0, porcentaje: Number(porcentaje) || 0 };
    if (esRoot) body.restricciones = restricciones;
    const res = await fetch("/api/admin/anticipo-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setCargando(false);
    setMsg(res.ok ? { ok: true, texto: "✓ Guardado" } : { ok: false, texto: "Error al guardar" });
    setTimeout(() => setMsg(null), 3000);
  }

  const ejemploPrecio = 80000;
  const ejemploAnticipo = tipo === "porcentaje" ? Math.round(ejemploPrecio * (Number(porcentaje) / 100)) : Number(monto) || 0;

  return (
    <div>
      <p className="text-sm font-bold mb-4" style={{ color: "var(--c-primary)" }}>💳 Anticipo de reserva</p>

      {/* Toggle ON/OFF */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold">Solicitar anticipo al cliente</p>
          <p className="text-xs mt-0.5" style={{ color: "#888" }}>
            {activo ? "El cliente paga anticipo al reservar" : "El cliente paga el total el día de la cita"}
          </p>
        </div>
        <Toggle on={activo} onChange={setActivo} disabled={!esRoot && !restricciones.activoEditable} />
      </div>

      {activo && (
        <>
          {/* Selector tipo */}
          <div className="mb-4">
            <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>Tipo de anticipo</label>
            <div className="flex gap-2">
              {[{ id: "fijo", label: "💵 Fijo" }, { id: "porcentaje", label: "📊 Porcentaje" }].map(t => (
                <button key={t.id} onClick={() => (!esRoot && !restricciones.tipoEditable) ? null : setTipo(t.id as "fijo" | "porcentaje")}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: tipo === t.id ? "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))" : "var(--c-primary-bg)",
                    color: tipo === t.id ? "white" : "#888",
                    border: tipo === t.id ? "none" : "1.5px solid var(--c-border-soft)",
                    opacity: (!esRoot && !restricciones.tipoEditable) ? 0.5 : 1,
                    cursor: (!esRoot && !restricciones.tipoEditable) ? "not-allowed" : "pointer",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input según tipo */}
          <div className="mb-4" style={{ opacity: (!esRoot && !restricciones.montoEditable) ? 0.5 : 1 }}>
            {tipo === "fijo" ? (
              <>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Monto fijo</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "#888" }}>$</span>
                  <input type="text" inputMode="numeric" value={monto}
                    onChange={e => (!esRoot && !restricciones.montoEditable) ? null : setMonto(e.target.value.replace(/\D/g, ""))}
                    readOnly={!esRoot && !restricciones.montoEditable}
                    className="flex-1" placeholder="10000" />
                </div>
              </>
            ) : (
              <>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Porcentaje del precio del servicio</label>
                <div className="flex items-center gap-2">
                  <input type="text" inputMode="numeric" value={porcentaje}
                    onChange={e => { if (!esRoot && !restricciones.montoEditable) return; const v = Math.min(100, Number(e.target.value.replace(/\D/g, "")) || 0); setPorcentaje(String(v)); }}
                    readOnly={!esRoot && !restricciones.montoEditable}
                    className="flex-1" placeholder="30" />
                  <span className="text-sm font-bold" style={{ color: "#888" }}>%</span>
                </div>
              </>
            )}
            <p className="text-xs mt-2 p-2 rounded-lg" style={{ background: "var(--c-primary-bg)", color: "var(--c-primary-dark)" }}>
              Vista previa: servicio de <strong>$80.000</strong> → anticipo <strong style={{ color: "var(--c-primary)" }}>${ejemploAnticipo.toLocaleString("es-CO")}</strong>
            </p>
          </div>
        </>
      )}

      {/* Restricciones — solo SuperAdmin */}
      {esRoot && (
        <div className="mt-4 pt-4" style={{ borderTop: "1.5px dashed var(--c-border-soft)" }}>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#6366f1" }}>👑 Restricciones para el Admin</p>
          <div className="space-y-3">
            {[
              { key: "activoEditable", label: "Puede activar/desactivar el anticipo" },
              { key: "tipoEditable", label: "Puede cambiar tipo (fijo/porcentaje)" },
              { key: "montoEditable", label: "Puede cambiar el monto o porcentaje" },
            ].map(r => (
              <div key={r.key} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#555" }}>{r.label}</span>
                <Toggle on={restricciones[r.key as keyof Restricciones]}
                  onChange={v => setRestricciones(prev => ({ ...prev, [r.key]: v }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && <p className="text-xs mb-3 mt-3 text-center" style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>{msg.texto}</p>}
      <button onClick={guardar} disabled={cargando} className="btn-gold w-full mt-4">
        {cargando ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

function SelectorTema({ token, esRoot }: { token: string; esRoot?: boolean }) {
  const [temaActual, setTemaActual] = useState("default");
  const [temasActivos, setTemasActivos] = useState<string[]>(TEMAS.map(t => t.id));
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/tema").then(r => r.json()).then(d => setTemaActual(d.id || "default")).catch(() => {});
    fetch("/api/admin/temas-activos", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d.activos)) setTemasActivos(d.activos); }).catch(() => {});
  }, [token]);

  async function cambiarTema(id: string) {
    if (!temasActivos.includes(id) && !esRoot) return;
    setTemaActual(id);
    aplicarTema(getTema(id));
    localStorage.setItem("tema_id", id);
    setGuardando(true);
    const res = await fetch("/api/tema", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    setGuardando(false);
    setMsg(res.ok ? "✓ Tema guardado" : "Error al guardar");
    setTimeout(() => setMsg(""), 2000);
  }

  async function toggleActivo(id: string) {
    const nuevos = temasActivos.includes(id)
      ? temasActivos.filter(t => t !== id)
      : [...temasActivos, id];
    setTemasActivos(nuevos);
    await fetch("/api/admin/temas-activos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activos: nuevos }),
    });
  }

  const temasVisibles = esRoot ? TEMAS : TEMAS.filter(t => temasActivos.includes(t.id));

  return (
    <div>
      <p className="text-sm font-bold mb-1" style={{ color: "var(--c-primary)" }}>🎨 Estilo de la app</p>
      <p className="text-xs mb-4" style={{ color: "#888" }}>
        {esRoot ? "Activa o desactiva temas para el admin. El ojo los oculta." : "Cambia los colores de toda la aplicación."}
      </p>
      <div className="grid grid-cols-1 gap-2">
        {(esRoot ? TEMAS : temasVisibles).map(t => {
          const activo = temasActivos.includes(t.id);
          return (
            <div key={t.id} className="flex items-center gap-2">
              <button onClick={() => cambiarTema(t.id)} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all flex-1"
                style={temaActual === t.id
                  ? { border: "2px solid var(--c-primary)", background: "var(--c-primary-bg)" }
                  : { border: "1.5px solid var(--c-border-soft)", background: activo || esRoot ? "white" : "#f9f9f9", opacity: !activo && esRoot ? 0.5 : 1 }}>
                <div className="flex gap-1 flex-shrink-0">
                  {t.preview.map((c, i) => (
                    <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: "1px solid #ddd" }} />
                  ))}
                </div>
                <span className="text-sm font-semibold" style={{ color: temaActual === t.id ? "var(--c-primary)" : "#555" }}>
                  {t.nombre}{t.id === "default" && " (predeterminado)"}
                </span>
                {temaActual === t.id && <span className="ml-auto text-xs font-bold" style={{ color: "var(--c-primary)" }}>✓</span>}
              </button>
              {esRoot && (
                <button onClick={() => toggleActivo(t.id)} title={activo ? "Desactivar para admin" : "Activar para admin"}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition-all"
                  style={{ background: activo ? "#f0fff4" : "#fce4ec", border: `1px solid ${activo ? "#10b981" : "#ef4444"}`, color: activo ? "#10b981" : "#ef4444" }}>
                  {activo ? "👁" : "🚫"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {msg && <p className="text-xs mt-2 text-center font-semibold" style={{ color: "#10b981" }}>{msg}</p>}
      {guardando && <p className="text-xs mt-2 text-center" style={{ color: "#888" }}>Guardando...</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*              GESTOR MÉTODOS DE PAGO                 */
/* ═══════════════════════════════════════════════════ */

type MetodoPago = { id: string; nombre: string; numero: string };

const ICONOS_METODO: Record<string, string> = {
  nequi: "📱", bancolombia: "🏦", daviplata: "💜", efecty: "💵", pse: "🖥️",
};

function iconoMetodo(nombre: string) {
  const n = nombre.toLowerCase();
  for (const [key, icon] of Object.entries(ICONOS_METODO)) {
    if (n.includes(key)) return icon;
  }
  return "💳";
}

function GestorMetodosPago({ token }: { token: string }) {
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [confirmandoEliminarMetodo, setConfirmandoEliminarMetodo] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setCargandoLista(true);
    fetch("/api/admin/metodos-pago", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setMetodos(Array.isArray(d.metodos) ? d.metodos : []); setCargandoLista(false); })
      .catch(() => { setCargandoLista(false); });
  }, [token]);

  async function guardar(lista: MetodoPago[]): Promise<boolean> {
    setCargando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/metodos-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ metodos: lista }),
      });
      setCargando(false);
      if (res.ok) {
        setMetodos(lista);
        setMsg({ ok: true, texto: "✓ Guardado" });
        setTimeout(() => setMsg(null), 2000);
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg({ ok: false, texto: err.error || "Error al guardar" });
        return false;
      }
    } catch {
      setCargando(false);
      setMsg({ ok: false, texto: "Error de conexión" });
      return false;
    }
  }

  async function eliminar(id: string) {
    await guardar(metodos.filter(m => m.id !== id));
  }

  async function guardarEdicion(id: string, nombre: string, numero: string) {
    const ok = await guardar(metodos.map(m => m.id === id ? { ...m, nombre: nombre.trim(), numero: numero.trim() } : m));
    if (ok) setEditando(null);
  }

  async function agregar() {
    if (!nuevoNombre.trim() || !nuevoNumero.trim()) return;
    const nuevo: MetodoPago = { id: Date.now().toString(), nombre: nuevoNombre.trim(), numero: nuevoNumero.trim() };
    const ok = await guardar([...metodos, nuevo]);
    if (ok) { setNuevoNombre(""); setNuevoNumero(""); setAgregando(false); }
  }

  return (
    <div>
      <p className="text-sm font-bold mb-1" style={{ color: "var(--c-primary)" }}>💳 Métodos de pago</p>
      <p className="text-xs mb-4" style={{ color: "#888" }}>Número de Nequi, cuenta bancaria o llave.</p>

      {cargandoLista ? (
        <p className="text-xs text-center py-3" style={{ color: "#aaa" }}>Cargando...</p>
      ) : (
        <div className="space-y-2 mb-3">
          {metodos.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: "#aaa" }}>Sin métodos de pago. Agrega uno.</p>
          )}
          {metodos.map(m => (
            <div key={m.id} className="rounded-xl p-3" style={{ border: "1.5px solid var(--c-border-soft)", background: "white" }}>
              {editando === m.id ? (
                <EditarMetodo
                  nombre={m.nombre} numero={m.numero}
                  onGuardar={(n, num) => guardarEdicion(m.id, n, num)}
                  onCancelar={() => setEditando(null)}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{iconoMetodo(m.nombre)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{m.nombre}</p>
                    <p className="font-bold text-base truncate" style={{ color: "var(--c-primary)" }}>{m.numero}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditando(m.id)}
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: "var(--c-primary-bg)", color: "var(--c-primary)" }}>
                      ✏️
                    </button>
                    {confirmandoEliminarMetodo === m.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => { setConfirmandoEliminarMetodo(null); eliminar(m.id); }}
                          className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: "#ef4444", color: "white" }}>
                          Sí
                        </button>
                        <button onClick={() => setConfirmandoEliminarMetodo(null)}
                          className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: "var(--c-border-soft)", color: "#888" }}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmandoEliminarMetodo(m.id)}
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{ background: "#fff0f0", color: "#e53935" }}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {agregando ? (
        <div className="rounded-xl p-3 mb-2" style={{ border: "1.5px solid var(--c-primary)", background: "var(--c-primary-bg)" }}>
          <p className="text-xs font-bold mb-2" style={{ color: "var(--c-primary)" }}>Nuevo método</p>
          <div className="space-y-2">
            <input type="text" placeholder="Nombre (ej: Nequi, Bancolombia)" value={nuevoNombre}
              onChange={e => setNuevoNombre(toTitleCase(e.target.value))} className="text-sm" />
            <input type="text" placeholder="Número / cuenta / llave" value={nuevoNumero}
              onChange={e => setNuevoNumero(e.target.value)} className="text-sm" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={agregar} disabled={cargando}
              className="btn-gold text-xs flex-1" style={{ padding: "0.4rem 1rem" }}>
              {cargando ? "Guardando..." : "Agregar"}
            </button>
            <button onClick={() => { setAgregando(false); setNuevoNombre(""); setNuevoNumero(""); }}
              disabled={cargando}
              className="text-xs flex-1 rounded-full font-medium"
              style={{ border: "1px solid var(--c-border-soft)", color: "#888" }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAgregando(true)}
          className="w-full text-sm font-semibold py-2 rounded-xl"
          style={{ border: "1.5px dashed var(--c-primary)", color: "var(--c-primary)", background: "transparent" }}>
          + Agregar método de pago
        </button>
      )}

      {msg && (
        <p className="text-xs mt-2 text-center font-semibold"
          style={{ color: msg.ok ? "#10b981" : "#e53935" }}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}

function EditarMetodo({ nombre, numero, onGuardar, onCancelar }: {
  nombre: string; numero: string;
  onGuardar: (n: string, num: string) => Promise<void>;
  onCancelar: () => void;
}) {
  const [n, setN] = useState(nombre);
  const [num, setNum] = useState(numero);
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    setGuardando(true);
    await onGuardar(n, num);
    setGuardando(false);
  }

  return (
    <div className="space-y-2">
      <input type="text" value={n} onChange={e => setN(toTitleCase(e.target.value))} className="text-sm" />
      <input type="text" value={num} onChange={e => setNum(e.target.value)} className="text-sm" />
      <div className="flex gap-2 mt-1">
        <button onClick={handleGuardar} disabled={guardando}
          className="btn-gold text-xs flex-1" style={{ padding: "0.4rem 1rem" }}>
          {guardando ? "Guardando..." : "Guardar"}
        </button>
        <button onClick={onCancelar} disabled={guardando}
          className="text-xs flex-1 rounded-full font-medium"
          style={{ border: "1px solid var(--c-border-soft)", color: "#888" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                  TAB RESPALDO                       */
/* ═══════════════════════════════════════════════════ */

function TabRespaldo({ token, perm }: { token: string; perm: Permisos["respaldo"] }) {
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
    a.download = `leila-backup-${new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })}.json`;
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
    <div>
      <h2 className="section-title mb-5">💾 Respaldo de datos</h2>
      <div className={`grid grid-cols-1 ${perm.exportar && perm.restaurar ? "md:grid-cols-2" : ""} gap-5 items-start`}>

        {/* Exportar */}
        {perm.exportar && <div className="card-elegant p-5">
          <p className="font-semibold text-sm mb-1" style={{ color: "var(--c-primary)" }}>📤 Exportar respaldo</p>
          <p className="text-xs mb-4" style={{ color: "#888" }}>
            Descarga un archivo JSON con todas las reservas, clientes y configuración del sistema.
          </p>
          <div className="rounded-xl p-3 mb-4 space-y-1" style={{ background: "var(--c-primary-bg)", border: "1px solid var(--c-border-soft)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--c-primary)" }}>📦 El archivo incluye:</p>
            <p className="text-xs" style={{ color: "#666" }}>• Reservas y clientes registradas</p>
            <p className="text-xs" style={{ color: "#666" }}>• Servicios y configuración</p>
            <p className="text-xs" style={{ color: "#666" }}>• Trabajadoras y comisiones</p>
          </div>
          <p className="text-xs mb-4" style={{ color: "#aaa" }}>
            💡 Guarda una copia periódica para prevenir pérdida de datos.
          </p>
          <button onClick={exportar} className="btn-gold w-full text-sm" style={{ padding: "0.6rem 1rem" }}>
            Descargar respaldo
          </button>
          {msg && msg.ok && (
            <p className="text-xs mt-3 text-center font-semibold" style={{ color: "#10b981" }}>{msg.texto}</p>
          )}
        </div>}

        {/* Restaurar */}
        {perm.restaurar && <div className="card-elegant p-5">
          <p className="font-semibold text-sm mb-1" style={{ color: "#e91e8c" }}>📥 Restaurar respaldo</p>
          <p className="text-xs mb-4" style={{ color: "#888" }}>
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
                  style={{ background: "var(--c-border-soft)", color: "#888" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
          {msg && !msg.ok && (
            <p className="text-xs mt-3 text-center font-semibold" style={{ color: "#e91e8c" }}>{msg.texto}</p>
          )}
        </div>}

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                  TAB PERMISOS (ROOT)                 */
/* ═══════════════════════════════════════════════════ */


const TABS_PERMISOS = [
  { id: "hoy" as keyof Permisos, label: "📅 Hoy", subs: [{ k: "cambiarEstado", l: "Cambiar estado" }, { k: "cancelar", l: "Cancelar citas" }, { k: "eliminar", l: "Eliminar citas" }, { k: "descargarPDF", l: "Botón PDF individual" }, { k: "descargarPDFMasivo", l: "Exportar PDF masivo" }] },
  { id: "pendientes" as keyof Permisos, label: "⏳ Pendientes", subs: [{ k: "cambiarEstado", l: "Cambiar estado" }, { k: "cancelar", l: "Cancelar citas" }, { k: "eliminar", l: "Eliminar citas" }, { k: "descargarPDF", l: "Botón PDF individual" }, { k: "descargarPDFMasivo", l: "Exportar PDF masivo" }] },
  { id: "confirmadas" as keyof Permisos, label: "✅ Confirmadas", subs: [{ k: "cambiarEstado", l: "Cambiar estado (iniciar atención)" }, { k: "cancelar", l: "Cancelar citas" }, { k: "eliminar", l: "Eliminar citas" }, { k: "descargarPDF", l: "Botón PDF individual" }, { k: "descargarPDFMasivo", l: "Exportar PDF masivo" }] },
  { id: "canceladas" as keyof Permisos, label: "❌ Canceladas", subs: [{ k: "cambiarEstado", l: "Restaurar citas canceladas" }, { k: "eliminar", l: "Eliminar citas" }, { k: "descargarPDFMasivo", l: "Exportar PDF masivo" }] },
  { id: "todas" as keyof Permisos, label: "📋 Todas", subs: [{ k: "cambiarEstado", l: "Cambiar estado" }, { k: "cancelar", l: "Cancelar citas" }, { k: "eliminar", l: "Eliminar citas" }, { k: "descargarPDF", l: "Botón PDF individual" }, { k: "descargarPDFMasivo", l: "Exportar PDF masivo" }] },
  { id: "completadas" as keyof Permisos, label: "✅ Completadas", subs: [{ k: "eliminar", l: "Eliminar citas (requiere PIN)" }, { k: "descargarPDF", l: "Botón PDF individual" }, { k: "descargarPDFMasivo", l: "Exportar PDF masivo" }, { k: "reenviarWhatsApp", l: "Botón reenviar WhatsApp" }, { k: "multipleReenvio", l: "Permitir múltiples reenvíos WA" }] },
  { id: "clientes" as keyof Permisos, label: "👥 Clientes", subs: [{ k: "historial", l: "Ver historial de citas" }] },
  { id: "servicios" as keyof Permisos, label: "💅 Servicios", subs: [{ k: "crear", l: "Crear servicios" }, { k: "editar", l: "Editar servicios" }, { k: "eliminar", l: "Eliminar servicios" }] },
  { id: "trabajadores" as keyof Permisos, label: "👩 Trabajadoras", subs: [{ k: "crear", l: "Agregar trabajadoras" }, { k: "editar", l: "Editar trabajadoras" }, { k: "eliminar", l: "Eliminar trabajadoras" }, { k: "toggleActivo", l: "Habilitar / Inactivar" }, { k: "verAgenda", l: "Ver agenda" }] },
  { id: "cumpleanos" as keyof Permisos, label: "🎂 Cumpleaños", subs: [{ k: "crear", l: "Registrar clientes" }, { k: "eliminar", l: "Eliminar clientes" }, { k: "enviar", l: "Enviar saludo WhatsApp" }] },
  { id: "promociones" as keyof Permisos, label: "🎉 Promociones", subs: [{ k: "crearRecurrente", l: "Agregar promo por día" }, { k: "crearPuntual", l: "Agregar promo por fecha" }, { k: "eliminar", l: "Eliminar promociones" }, { k: "copiarMensaje", l: "Copiar mensaje WhatsApp" }] },
  { id: "rifas" as keyof Permisos, label: "🎟️ Rifas", subs: [
    { k: "crear", l: "Crear rifas" },
    { k: "editar", l: "Editar rifas" },
    { k: "eliminar", l: "Eliminar rifas" },
    { k: "cerrar", l: "Cerrar rifa activa" },
    { k: "toggleBanner", l: "Activar / desactivar banner en /reservar" },
    { k: "verParticipantes", l: "Ver participantes y tickets" },
    { k: "confirmarPagos", l: "Confirmar pagos de tickets" },
    { k: "cancelarTickets", l: "Cancelar tickets" },
    { k: "sorteoAutomatico", l: "Realizar sorteo automático (aleatorio)" },
    { k: "sorteoManual", l: "Realizar sorteo manual (ingresar número)" },
    { k: "notificarGanador", l: "Notificar ganador (abrir WhatsApp)" },
    { k: "verBannerGanador", l: "Ver banner \"ganadora agendó su cita\"" },
    { k: "verPlantillas", l: "Ver y editar plantillas WhatsApp" },
  ] },
  { id: "comisiones" as keyof Permisos, label: "💰 Comisiones", subs: [
    { k: "verMontos", l: "Ver montos y comisiones" },
    { k: "verResumen", l: "Ver resumen general del período" },
    { k: "verDetalleTrabajadoras", l: "Ver detalle por trabajadora" },
  ] },
  { id: "ganancias" as keyof Permisos, label: "📊 Ganancias", subs: [
    { k: "descargarPDF", l: "Descargar PDF" },
    { k: "verKpis", l: "Ver KPIs (ingresos, promedio, neto)" },
    { k: "verTrabajadoras", l: "Ver detalle por trabajadora" },
  ] },
  { id: "informes" as keyof Permisos, label: "📋 Informes", subs: [
    { k: "descargarPDF", l: "Descargar PDF" },
    { k: "verKpiCitas", l: "Ver KPIs de citas" },
    { k: "verFinanzas", l: "Ver KPIs financieros (ingresos, neto)" },
    { k: "verEstados", l: "Ver citas por estado" },
    { k: "verTopServicios", l: "Ver servicios más solicitados" },
    { k: "verTopClientes", l: "Ver clientes frecuentes" },
    { k: "verTopDias", l: "Ver días con más actividad" },
  ] },
  { id: "graficas" as keyof Permisos, label: "📈 Gráficas", subs: [
    { k: "verIngresos", l: "💰 Ingresos por día" },
    { k: "verComposicion", l: "🥧 Composición (ganancia vs comisiones)" },
    { k: "verTrabajadoras", l: "👩 Por trabajadora" },
    { k: "verTopServicios", l: "💅 Top servicios" },
    { k: "verTendencia", l: "📉 Tendencia 8 semanas" },
  ] },
  { id: "horarios" as keyof Permisos, label: "⏰ Horarios", subs: [{ k: "editar", l: "Crear y editar perfiles" }] },
  { id: "config" as keyof Permisos, label: "⚙️ Config", subs: [{ k: "cambiarTema", l: "Cambiar tema/colores" }, { k: "metodosPago", l: "Métodos de pago" }, { k: "anticipo", l: "Gestión de anticipo" }, { k: "extras", l: "Valores del negocio" }] },
  { id: "respaldo" as keyof Permisos, label: "💾 Respaldo", subs: [{ k: "exportar", l: "Exportar datos" }, { k: "restaurar", l: "Restaurar datos" }] },
  { id: "accesos" as keyof Permisos, label: "🔑 Accesos", subs: [], locked: true },
  { id: "navConfig" as keyof Permisos, label: "🗂 Vista de navegación", subs: [{ k: "adminPuedeCambiarVista", l: "Admin puede cambiar entre Tabs y Lista" }] },
];

function TabPermisos({ token }: { token: string }) {
  const [p, setP] = useState<Permisos>(PERMISOS_DEFAULT);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/permisos", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setP(mergePermisos(d))).catch(() => {});
  }, [token]);

  function toggle(tab: keyof Permisos, sub?: string) {
    setP(prev => {
      const cur = prev[tab] as Record<string, boolean>;
      return { ...prev, [tab]: { ...cur, [sub ?? "visible"]: !cur[sub ?? "visible"] } };
    });
  }

  async function guardar() {
    setGuardando(true);
    const res = await fetch("/api/admin/permisos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(p),
    });
    setGuardando(false);
    setMsg(res.ok ? "✓ Permisos guardados" : "Error al guardar");
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h2 className="section-title">🛡️ Control de permisos del Admin</h2>
        <button onClick={guardar} disabled={guardando} className="btn-gold text-sm" style={{ padding: "0.5rem 1.2rem" }}>
          {guardando ? "Guardando..." : "💾 Guardar cambios"}
        </button>
      </div>
      <p className="text-xs mb-5" style={{ color: "#888" }}>Activa o desactiva lo que el admin puede ver y hacer. Los cambios se aplican en el próximo inicio de sesión del admin.</p>
      {msg && <p className="text-xs mb-4 text-center font-semibold" style={{ color: "#10b981" }}>{msg}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {TABS_PERMISOS.map(tab => {
          const cur = p[tab.id] as Record<string, boolean>;
          const visible = cur.visible;
          return (
            <div key={tab.id} className="card-elegant p-5"
              style={tab.locked ? { opacity: 0.6 } : {}}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">{tab.label}</p>
                {tab.locked
                  ? <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#f0fdf4", color: "#10b981" }}>Siempre activo</span>
                  : <Toggle on={visible} onChange={() => toggle(tab.id)} disabled={false} />
                }
              </div>
              {tab.subs.length > 0 && visible && !tab.locked && (
                <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--c-border-soft)" }}>
                  {tab.subs.map(sub => (
                    <div key={sub.k} className="flex items-center justify-between">
                      <p className="text-xs" style={{ color: "#666" }}>{sub.l}</p>
                      <Toggle on={cur[sub.k]} onChange={() => toggle(tab.id, sub.k)} disabled={false} />
                    </div>
                  ))}
                </div>
              )}
              {!visible && !tab.locked && (
                <p className="text-xs mt-1" style={{ color: "#bbb" }}>Tab oculto para el admin</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Configuración de vistas (root) ── */}
      <div className="mt-6 card-elegant p-5">
        <p className="font-semibold text-sm mb-1">⚙️ Configuración de vistas</p>
        <p className="text-xs mb-4" style={{ color: "#888" }}>Define cómo se muestran las reservas. Se aplica para todos los usuarios.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Vista de reservas</p>
              <p className="text-xs" style={{ color: "#aaa" }}>Lista única con filtros, o tabs separados (Hoy/Pendientes/Todas/Completadas)</p>
            </div>
            <select
              value={p.vistasConfig?.reservasVista ?? "lista"}
              onChange={e => setP(prev => ({ ...prev, vistasConfig: { ...prev.vistasConfig, reservasVista: e.target.value as "lista" | "tabs" } }))}
              className="text-xs px-3 py-2 rounded-xl font-semibold"
              style={{ border: "1.5px solid var(--c-primary-light)", background: "var(--c-primary-bg)", color: "var(--c-primary)", minWidth: "140px" }}>
              <option value="lista">📋 Lista única</option>
              <option value="tabs">🗂 Tabs separados</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                   MÓDULO RIFAS                      */
/* ═══════════════════════════════════════════════════ */

type RifaTicket = {
  id: string; numero: number; nombre: string; telefono: string;
  cantidad: number; total: number; estado: "pendiente_pago" | "confirmado" | "cancelado";
  creado_en: string | null; confirmado_en: string | null;
  numeros?: string[];
};

const MSG_CONFIRMACION_DEFAULT = `🎟️ ¡Hola, {nombre}! Tu participación está confirmada ✅\n\nQuedas inscrita en la *{rifa_nombre}* de Leila Studio 💅\n\n🎫 Tu(s) ticket(s): *{ticket}*\n🎁 Premio: *{premio}*\n📅 Sorteo: *{fecha_sorteo}*\n\n¡Guarda tus números, pueden ser los ganadores! 🍀\n— *Leila Studio Nails Beauty* 💖`;
const MSG_GANADOR_DEFAULT = `🎉 ¡FELICITACIONES, {nombre}! 🎉\n\nEres la gran ganadora de la *{rifa_nombre}* en Leila Studio 💅✨\n\n🏆 Ticket ganador: *{ticket}*\n🎁 Premio: *{premio}*\n📅 Sorteo realizado: *{fecha_sorteo}*\n\nPara reclamar tu premio, agenda tu cita aquí 👇\n🔗 {link_reserva}\n\nSolo escoge fecha y hora, ¡el servicio ya está reservado para ti! 💖\n\n— *Leila Studio Nails Beauty*`;

function reemplazarVars(plantilla: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((msg, [k, v]) => msg.split(`{${k}}`).join(v), plantilla);
}

type RifaDoc = {
  id: string; nombre: string; premio: string; fecha_sorteo: string;
  tipo: "gratis" | "pago"; precio_ticket: number; max_tickets: number;
  max_por_persona: number; mostrar_banner: boolean;
  estado: "activa" | "cerrada" | "sorteada";
  tickets_confirmados: number; tickets_pendientes: number;
  servicio_id?: string; servicio_nombre?: string;
  ganador_ticket?: number; ganador_nombre?: string; ganador_telefono?: string;
  ganador_agendado?: boolean; ganador_reserva_fecha?: string; ganador_reserva_hora?: string;
};

function TabRifas({ token, perm, esRoot }: { token: string; perm: PermRifas; esRoot: boolean }) {
  const [rifas, setRifas] = useState<RifaDoc[]>([]);
  const [cargando, setCargando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [rifaSeleccionada, setRifaSeleccionada] = useState<RifaDoc | null>(null);
  const [vistaDetalle, setVistaDetalle] = useState<"participantes" | "sorteo" | null>(null);
  const [serviciosDisp, setServiciosDisp] = useState<{ id: string; nombre: string; categoria: string }[]>([]);
  const [plantillas, setPlantillas] = useState({ confirmacion: MSG_CONFIRMACION_DEFAULT, ganador: MSG_GANADOR_DEFAULT });

  const [fNombre, setFNombre] = useState("");
  const [fServicioId, setFServicioId] = useState("");
  const [fServicioNombre, setFServicioNombre] = useState("");
  const [fFecha, setFfecha] = useState("");
  const [fTipo, setFTipo] = useState<"gratis" | "pago">("pago");
  const [fPrecio, setFPrecio] = useState(5000);
  const [fMaxTickets, setFMaxTickets] = useState(50);
  const [fMaxPersona, setFMaxPersona] = useState(3);
  const [fBanner, setFBanner] = useState(true);
  const [errorCrear, setErrorCrear] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmandoCerrar, setConfirmandoCerrar] = useState<string | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<string | null>(null);
  const [editando, setEditando] = useState<RifaDoc | null>(null);
  const [eNombre, setENombre] = useState("");
  const [eServicioId, setEServicioId] = useState("");
  const [eServicioNombre, setEServicioNombre] = useState("");
  const [eFecha, setEFecha] = useState("");
  const [eTipo, setETipo] = useState<"gratis" | "pago">("pago");
  const [ePrecio, setEPrecio] = useState(5000);
  const [eMaxTickets, setEMaxTickets] = useState(50);
  const [eMaxPersona, setEMaxPersona] = useState(3);
  const [eBanner, setEBanner] = useState(true);
  const [errorEditar, setErrorEditar] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const hdr = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/admin/rifas", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const lista = Array.isArray(data) ? data : [];
    setRifas(lista);
    setCargando(false);
  }

  async function cargarSilencioso() {
    const res = await fetch("/api/admin/rifas", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const lista = Array.isArray(data) ? data : [];
    setRifas(lista);
    setRifaSeleccionada(prev => prev ? (lista.find((r: RifaDoc) => r.id === prev.id) ?? prev) : null);
  }

  useEffect(() => {
    cargar();
    fetch("/api/servicios").then(r => r.json()).then(d => setServiciosDisp(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/admin/rifas-config", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPlantillas({
        confirmacion: d.plantilla_confirmacion || MSG_CONFIRMACION_DEFAULT,
        ganador: d.plantilla_ganador || MSG_GANADOR_DEFAULT,
      })).catch(() => {});
  }, []);

  async function crear() {
    if (!fNombre || !fServicioId || !fFecha) { setErrorCrear("Completa todos los campos"); return; }
    setGuardando(true);
    const res = await fetch("/api/admin/rifas", {
      method: "POST", headers: hdr,
      body: JSON.stringify({ nombre: fNombre, premio: fServicioNombre, servicio_id: fServicioId, servicio_nombre: fServicioNombre, fecha_sorteo: fFecha, tipo: fTipo, precio_ticket: fPrecio, max_tickets: fMaxTickets, max_por_persona: fMaxPersona, mostrar_banner: fBanner }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!res.ok) { setErrorCrear(data.error || "Error al crear"); return; }
    setCreando(false);
    setFNombre(""); setFServicioId(""); setFServicioNombre(""); setFfecha(""); setFTipo("pago"); setFPrecio(5000); setFMaxTickets(50); setFMaxPersona(3); setFBanner(true); setErrorCrear("");
    cargar();
  }

  async function toggleBanner(rifa: RifaDoc) {
    await fetch(`/api/admin/rifas/${rifa.id}`, { method: "PATCH", headers: hdr, body: JSON.stringify({ mostrar_banner: !rifa.mostrar_banner }) });
    cargar();
  }

  async function cerrarRifa(rifaId: string) {
    await fetch(`/api/admin/rifas/${rifaId}`, { method: "PATCH", headers: hdr, body: JSON.stringify({ estado: "cerrada" }) });
    setConfirmandoCerrar(null);
    cargar();
  }

  function abrirEditar(rifa: RifaDoc) {
    setEditando(rifa);
    setENombre(rifa.nombre);
    setEServicioId(rifa.servicio_id || "");
    setEServicioNombre(rifa.servicio_nombre || rifa.premio);
    setEFecha(rifa.fecha_sorteo);
    setETipo(rifa.tipo);
    setEPrecio(rifa.precio_ticket);
    setEMaxTickets(rifa.max_tickets);
    setEMaxPersona(rifa.max_por_persona);
    setEBanner(rifa.mostrar_banner);
    setErrorEditar("");
  }

  async function guardarEditar() {
    if (!editando || !eNombre || !eServicioId || !eFecha) { setErrorEditar("Completa todos los campos"); return; }
    setGuardandoEdit(true);
    const res = await fetch(`/api/admin/rifas/${editando.id}`, {
      method: "PATCH", headers: hdr,
      body: JSON.stringify({ nombre: eNombre, premio: eServicioNombre, servicio_id: eServicioId, servicio_nombre: eServicioNombre, fecha_sorteo: eFecha, tipo: eTipo, precio_ticket: eTipo === "pago" ? ePrecio : 0, max_tickets: eMaxTickets, max_por_persona: eMaxPersona, mostrar_banner: eBanner }),
    });
    const data = await res.json();
    setGuardandoEdit(false);
    if (!res.ok) { setErrorEditar(data.error || "Error al guardar"); return; }
    setEditando(null);
    cargar();
  }

  async function eliminarRifa(rifaId: string) {
    await fetch(`/api/admin/rifas/${rifaId}`, { method: "DELETE", headers: hdr });
    setConfirmandoEliminar(null);
    cargar();
  }

  if (vistaDetalle && rifaSeleccionada) {
    return (
      <div>
        <button onClick={() => { setVistaDetalle(null); setRifaSeleccionada(null); }} className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--c-primary)" }}>
          ← Volver a Rifas
        </button>
        {vistaDetalle === "participantes" && (
          <TabParticipantesRifa rifa={rifaSeleccionada} token={token} perm={perm} plantillas={plantillas} onBack={() => { setVistaDetalle(null); cargar(); }} onRefresh={cargarSilencioso} />
        )}
        {vistaDetalle === "sorteo" && (
          <TabSorteoRifa rifa={rifaSeleccionada} token={token} perm={perm} plantillas={plantillas} onDone={() => { setVistaDetalle(null); cargar(); }} />
        )}
      </div>
    );
  }

  const activa = rifas.find(r => r.estado === "activa");
  const pasadas = rifas.filter(r => r.estado !== "activa");

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="section-title">🎟️ Rifas</h2>
        {perm.crear && !activa && (
          <button onClick={() => setCreando(true)} className="btn-gold text-sm" style={{ padding: "0.5rem 1.2rem" }}>
            + Nueva rifa
          </button>
        )}
      </div>

      {perm.crear && activa && (
        <div className="mb-3 text-xs px-3 py-2 rounded-xl" style={{ background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a" }}>
          ⚠️ Ya hay una rifa activa. Para crear una nueva, primero cierra la actual.
        </div>
      )}

      {/* Modal crear rifa */}
      {creando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="card-elegant p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4" style={{ color: "var(--c-primary)" }}>🎟️ Nueva Rifa</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nombre de la rifa</label>
                <input type="text" placeholder="Ej: Rifa de Mayo" value={fNombre} onChange={e => setFNombre(toTitleCase(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Premio (servicio)</label>
                <select value={fServicioId} onChange={e => {
                  const sel = serviciosDisp.find(s => s.id === e.target.value);
                  setFServicioId(e.target.value);
                  setFServicioNombre(sel?.nombre || "");
                }} className="w-full" style={{ padding: "0.6rem 0.75rem", borderRadius: "0.75rem", border: "1.5px solid var(--c-border-soft)", fontSize: "0.875rem", background: "white" }}>
                  <option value="">Selecciona un servicio...</option>
                  {serviciosDisp.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Fecha del sorteo</label>
                <input type="date" value={fFecha} onChange={e => setFfecha(e.target.value)} min={new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Tipo de ticket</label>
                <div className="flex gap-3">
                  {(["pago", "gratis"] as const).map(t => (
                    <button key={t} onClick={() => setFTipo(t)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={fTipo === t ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" } : { background: "var(--c-primary-bg)", border: "1px solid var(--c-primary-light)", color: "var(--c-primary)" }}>
                      {t === "pago" ? "💵 De pago" : "🆓 Gratis"}
                    </button>
                  ))}
                </div>
              </div>
              {fTipo === "pago" && (
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Precio por ticket ($)</label>
                  <input type="number" min={0} value={fPrecio} onChange={e => setFPrecio(Number(e.target.value))} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Máx. tickets <span style={{ color: "#bbb" }}>(0=ilimitado)</span></label>
                  <input type="number" min={0} value={fMaxTickets} onChange={e => setFMaxTickets(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Máx. por persona <span style={{ color: "#bbb" }}>(0=sin límite)</span></label>
                  <input type="number" min={0} value={fMaxPersona} onChange={e => setFMaxPersona(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Mostrar banner en /reservar</p>
                  <p className="text-xs" style={{ color: "#aaa" }}>Clientes verán la opción de participar al reservar</p>
                </div>
                <Toggle on={fBanner} onChange={() => setFBanner(v => !v)} disabled={false} />
              </div>
            </div>
            {errorCrear && <p className="text-xs mt-3" style={{ color: "#e91e8c" }}>{errorCrear}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setCreando(false); setErrorCrear(""); }} className="btn-rose flex-1">Cancelar</button>
              <button onClick={crear} disabled={guardando} className="btn-gold flex-1">{guardando ? "Creando..." : "✅ Crear y activar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar rifa */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className="card-elegant p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4" style={{ color: "var(--c-primary)" }}>✏️ Editar Rifa</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nombre de la rifa</label>
                <input type="text" placeholder="Ej: Rifa de Mayo" value={eNombre} onChange={e => setENombre(toTitleCase(e.target.value))} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Premio (servicio)</label>
                <select value={eServicioId} onChange={e => {
                  const sel = serviciosDisp.find(s => s.id === e.target.value);
                  setEServicioId(e.target.value);
                  setEServicioNombre(sel?.nombre || "");
                }} className="w-full" style={{ padding: "0.6rem 0.75rem", borderRadius: "0.75rem", border: "1.5px solid var(--c-border-soft)", fontSize: "0.875rem", background: "white" }}>
                  <option value="">Selecciona un servicio...</option>
                  {serviciosDisp.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Fecha del sorteo</label>
                <input type="date" value={eFecha} onChange={e => setEFecha(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Tipo de ticket</label>
                <div className="flex gap-3">
                  {(["pago", "gratis"] as const).map(t => (
                    <button key={t} onClick={() => setETipo(t)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={eTipo === t ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" } : { background: "var(--c-primary-bg)", border: "1px solid var(--c-primary-light)", color: "var(--c-primary)" }}>
                      {t === "pago" ? "💵 De pago" : "🆓 Gratis"}
                    </button>
                  ))}
                </div>
              </div>
              {eTipo === "pago" && (
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Precio por ticket ($)</label>
                  <input type="number" min={0} value={ePrecio} onChange={e => setEPrecio(Number(e.target.value))} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Máx. tickets <span style={{ color: "#bbb" }}>(0=ilimitado)</span></label>
                  <input type="number" min={0} value={eMaxTickets} onChange={e => setEMaxTickets(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Máx. por persona <span style={{ color: "#bbb" }}>(0=sin límite)</span></label>
                  <input type="number" min={0} value={eMaxPersona} onChange={e => setEMaxPersona(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Mostrar banner en /reservar</p>
                  <p className="text-xs" style={{ color: "#aaa" }}>Clientes verán la opción de participar al reservar</p>
                </div>
                <Toggle on={eBanner} onChange={() => setEBanner(v => !v)} disabled={false} />
              </div>
            </div>
            {errorEditar && <p className="text-xs mt-3" style={{ color: "#e91e8c" }}>{errorEditar}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setEditando(null); setErrorEditar(""); }} className="btn-rose flex-1">Cancelar</button>
              <button onClick={guardarEditar} disabled={guardandoEdit} className="btn-gold flex-1">{guardandoEdit ? "Guardando..." : "✅ Guardar cambios"}</button>
            </div>
          </div>
        </div>
      )}

      {cargando && <p className="text-center text-sm py-8" style={{ color: "#888" }}>Cargando...</p>}

      {!cargando && rifas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🎟️</p>
          <p className="font-semibold" style={{ color: "var(--c-primary)" }}>Aún no hay rifas</p>
          <p className="text-sm mt-1" style={{ color: "#888" }}>Crea tu primera rifa para empezar</p>
        </div>
      )}

      {activa && (
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "var(--c-primary)" }}>● RIFA ACTIVA</p>
          <RifaCard rifa={activa} perm={perm}
            onVerParticipantes={perm.verParticipantes ? () => { setRifaSeleccionada(activa); setVistaDetalle("participantes"); } : undefined}
            onSorteo={(perm.sorteoAutomatico || perm.sorteoManual) ? () => { setRifaSeleccionada(activa); setVistaDetalle("sorteo"); } : undefined}
            onToggleBanner={perm.toggleBanner ? () => toggleBanner(activa) : undefined}
            onCerrar={perm.cerrar ? () => setConfirmandoCerrar(activa.id) : undefined}
            confirmandoCerrar={confirmandoCerrar === activa.id}
            onCancelarCerrar={() => setConfirmandoCerrar(null)}
            onConfirmarCerrar={() => cerrarRifa(activa.id)}
            onEditar={perm.editar ? () => abrirEditar(activa) : undefined}
            onEliminar={perm.eliminar ? () => setConfirmandoEliminar(activa.id) : undefined}
            confirmandoEliminar={confirmandoEliminar === activa.id}
            onCancelarEliminar={() => setConfirmandoEliminar(null)}
            onConfirmarEliminar={() => eliminarRifa(activa.id)}
          />
        </div>
      )}

      {pasadas.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#888" }}>RIFAS ANTERIORES</p>
          <div className="space-y-4">
            {pasadas.map(r => (
              <RifaCard key={r.id} rifa={r} perm={perm}
                onVerParticipantes={perm.verParticipantes ? () => { setRifaSeleccionada(r); setVistaDetalle("participantes"); } : undefined}
                onSorteo={undefined} onToggleBanner={undefined} onCerrar={undefined}
                confirmandoCerrar={false} onCancelarCerrar={() => {}} onConfirmarCerrar={() => {}}
                onEditar={perm.editar ? () => abrirEditar(r) : undefined}
                onEliminar={perm.eliminar ? () => setConfirmandoEliminar(r.id) : undefined}
                confirmandoEliminar={confirmandoEliminar === r.id}
                onCancelarEliminar={() => setConfirmandoEliminar(null)}
                onConfirmarEliminar={() => eliminarRifa(r.id)}
              />
            ))}
          </div>
        </div>
      )}

      {perm.verPlantillas && (
        <PlantillasRifasConfig token={token} plantillas={plantillas} onGuardado={p => setPlantillas(p)} />
      )}
    </div>
  );
}

function RifaCard({ rifa, perm, onVerParticipantes, onSorteo, onToggleBanner, onCerrar, confirmandoCerrar, onCancelarCerrar, onConfirmarCerrar, onEditar, onEliminar, confirmandoEliminar, onCancelarEliminar, onConfirmarEliminar }: {
  rifa: RifaDoc; perm: PermRifas;
  onVerParticipantes?: () => void;
  onSorteo?: () => void;
  onToggleBanner?: () => void;
  onCerrar?: () => void;
  confirmandoCerrar: boolean;
  onCancelarCerrar: () => void;
  onConfirmarCerrar: () => void;
  onEditar?: () => void;
  onEliminar?: () => void;
  confirmandoEliminar?: boolean;
  onCancelarEliminar?: () => void;
  onConfirmarEliminar?: () => void;
}) {
  const esActiva = rifa.estado === "activa";
  const esSorteada = rifa.estado === "sorteada";

  return (
    <div className="card-elegant p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-base" style={{ color: "var(--c-primary)" }}>{rifa.nombre}</p>
          <p className="text-sm mt-0.5" style={{ color: "#555" }}>🎁 {rifa.premio}</p>
          <p className="text-xs mt-1" style={{ color: "#888" }}>
            {rifa.tipo === "pago" ? `💵 ${formatPrecio(rifa.precio_ticket)} por ticket` : "🆓 Gratis"}
            {" · "}📅 Sorteo: {formatFecha(rifa.fecha_sorteo)}
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={esActiva ? { background: "#dcfce7", color: "#15803d" } : esSorteada ? { background: "#ede9fe", color: "#6d28d9" } : { background: "#f3f4f6", color: "#6b7280" }}>
          {esActiva ? "● Activa" : esSorteada ? "🎉 Sorteada" : "Cerrada"}
        </span>
      </div>

      {/* Tickets */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-lg text-center" style={{ background: "var(--c-primary-bg)" }}>
          <p className="text-lg font-bold" style={{ color: "var(--c-primary)" }}>{rifa.tickets_confirmados}</p>
          <p className="text-xs" style={{ color: "#888" }}>Confirmados</p>
        </div>
        {esActiva && (
          <div className="p-2 rounded-lg text-center" style={{ background: "#fef9c3" }}>
            <p className="text-lg font-bold" style={{ color: "#92400e" }}>{rifa.tickets_pendientes}</p>
            <p className="text-xs" style={{ color: "#92400e" }}>Pend. pago</p>
          </div>
        )}
        {rifa.max_tickets > 0 && (
          <div className="p-2 rounded-lg text-center" style={{ background: "#f3f4f6" }}>
            <p className="text-lg font-bold" style={{ color: "#374151" }}>{rifa.max_tickets - rifa.tickets_confirmados}</p>
            <p className="text-xs" style={{ color: "#888" }}>Disponibles</p>
          </div>
        )}
      </div>

      {/* Ganador (si sorteada) */}
      {esSorteada && rifa.ganador_nombre && (
        <div className="mb-3 p-3 rounded-xl text-center" style={{ background: "linear-gradient(135deg,#fef9c3,#fef3c7)", border: "2px solid #f59e0b" }}>
          <p className="text-sm font-bold" style={{ color: "#92400e" }}>🎉 Ganador: {rifa.ganador_nombre}</p>
          <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>Ticket #{rifa.ganador_ticket} · {rifa.ganador_telefono}</p>
        </div>
      )}
      {/* Banner ganadora agendó su premio */}
      {esSorteada && perm.verBannerGanador && rifa.ganador_agendado && rifa.ganador_reserva_fecha && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "2px solid #86efac" }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: "#15803d" }}>🏆 La ganadora ya agendó su premio</p>
          <p className="text-xs" style={{ color: "#166534" }}>{rifa.ganador_nombre} · {rifa.servicio_nombre || rifa.premio}</p>
          <p className="text-xs mt-0.5" style={{ color: "#166534" }}>📅 {formatFecha(rifa.ganador_reserva_fecha)}{rifa.ganador_reserva_hora ? ` · 🕐 ${rifa.ganador_reserva_hora}` : ""}</p>
        </div>
      )}

      {/* Banner toggle */}
      {esActiva && onToggleBanner && (
        <div className="flex items-center justify-between mb-3 py-2" style={{ borderTop: "1px solid var(--c-border-soft)" }}>
          <p className="text-xs" style={{ color: "#666" }}>Banner visible en /reservar</p>
          <Toggle on={rifa.mostrar_banner} onChange={onToggleBanner} disabled={false} />
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        {perm.verParticipantes && onVerParticipantes && (
          <button onClick={onVerParticipantes} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "var(--c-primary-bg)", color: "var(--c-primary)", border: "1px solid var(--c-primary-light)" }}>
            👥 Participantes
          </button>
        )}
        {(perm.sorteoAutomatico || perm.sorteoManual) && esActiva && onSorteo && rifa.tickets_confirmados > 0 && (
          <button onClick={onSorteo} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "#ede9fe", color: "#6d28d9", border: "1px solid #c4b5fd" }}>
            🎲 Sortear
          </button>
        )}
        {perm.cerrar && esActiva && onCerrar && !confirmandoCerrar && (
          <button onClick={onCerrar} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}>
            Cerrar rifa
          </button>
        )}
        {confirmandoCerrar && (
          <div className="flex gap-2 w-full mt-1">
            <p className="text-xs flex-1" style={{ color: "#ef4444" }}>¿Cerrar esta rifa?</p>
            <button onClick={onCancelarCerrar} className="text-xs px-3 py-1 rounded-lg" style={{ background: "#f3f4f6", color: "#666" }}>No</button>
            <button onClick={onConfirmarCerrar} className="text-xs px-3 py-1 rounded-lg font-semibold" style={{ background: "#ef4444", color: "white" }}>Sí, cerrar</button>
          </div>
        )}
        {onEditar && !confirmandoCerrar && !confirmandoEliminar && (
          <button onClick={onEditar} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd" }}>
            ✏️ Editar
          </button>
        )}
        {onEliminar && !confirmandoCerrar && !confirmandoEliminar && (
          <button onClick={onEliminar} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
            🗑️ Eliminar
          </button>
        )}
        {confirmandoEliminar && (
          <div className="flex gap-2 w-full mt-1">
            <p className="text-xs flex-1" style={{ color: "#b91c1c" }}>¿Eliminar esta rifa? No se puede deshacer.</p>
            <button onClick={onCancelarEliminar} className="text-xs px-3 py-1 rounded-lg" style={{ background: "#f3f4f6", color: "#666" }}>No</button>
            <button onClick={onConfirmarEliminar} className="text-xs px-3 py-1 rounded-lg font-semibold" style={{ background: "#ef4444", color: "white" }}>Sí, eliminar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TabParticipantesRifa({ rifa, token, perm, plantillas, onBack, onRefresh }: { rifa: RifaDoc; token: string; perm: PermRifas; plantillas: { confirmacion: string; ganador: string }; onBack: () => void; onRefresh?: () => void }) {
  const [tickets, setTickets] = useState<RifaTicket[]>([]);
  const [cargando, setCargando] = useState(true);
  const [confirmandoEstado, setConfirmandoEstado] = useState<{ tid: string; accion: "confirmar" | "cancelar" } | null>(null);
  const hdr = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/admin/rifas/${rifa.id}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setTickets(Array.isArray(data) ? data : []);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function recargarSilencioso() {
    const res = await fetch(`/api/admin/rifas/${rifa.id}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setTickets(Array.isArray(data) ? data : []);
  }

  async function cambiarEstado(tid: string, estado: string) {
    await fetch(`/api/admin/rifas/${rifa.id}/tickets/${tid}`, { method: "PATCH", headers: hdr, body: JSON.stringify({ estado }) });
    setConfirmandoEstado(null);
    recargarSilencioso();
    onRefresh?.();
  }

  function abrirWAConfirmacion(ticket: RifaTicket) {
    const telefono = ticket.telefono.startsWith("57") ? ticket.telefono : `57${ticket.telefono}`;
    const fecha = rifa.fecha_sorteo.split("-").reverse().join("/");
    const msg = reemplazarVars(plantillas.confirmacion, {
      nombre: ticket.nombre,
      ticket: ticket.numeros && ticket.numeros.length > 0 ? ticket.numeros.join(" · ") : `#${ticket.numero}`,
      premio: rifa.premio,
      fecha_sorteo: fecha,
      rifa_nombre: rifa.nombre,
    });
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const confirmados = tickets.filter(t => t.estado === "confirmado");
  const pendientes = tickets.filter(t => t.estado === "pendiente_pago");
  const cancelados = tickets.filter(t => t.estado === "cancelado");

  return (
    <div>
      <h2 className="section-title mb-1">👥 Participantes — {rifa.nombre}</h2>
      <p className="text-sm mb-4" style={{ color: "#888" }}>🎁 {rifa.premio} · {confirmados.length} confirmados{pendientes.length > 0 ? ` · ${pendientes.length} pendientes` : ""}</p>

      {cargando && <p className="text-center text-sm py-8" style={{ color: "#888" }}>Cargando...</p>}

      {!cargando && tickets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">🎫</p>
          <p className="text-sm" style={{ color: "#888" }}>Aún no hay participantes inscritos</p>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#f59e0b" }}>⏳ PENDIENTES DE PAGO</p>
          <div className="space-y-3">
            {pendientes.map(t => (
              <TicketCard key={t.id} ticket={t} rifa={rifa} perm={perm}
                onConfirmar={perm.confirmarPagos ? () => setConfirmandoEstado({ tid: t.id, accion: "confirmar" }) : undefined}
                onCancelar={perm.cancelarTickets ? () => setConfirmandoEstado({ tid: t.id, accion: "cancelar" }) : undefined}
                onEnviarWA={undefined}
                confirmando={confirmandoEstado?.tid === t.id ? confirmandoEstado.accion : null}
                onCancelConfirmacion={() => setConfirmandoEstado(null)}
                onProceder={accion => cambiarEstado(t.id, accion === "confirmar" ? "confirmado" : "cancelado")}
              />
            ))}
          </div>
        </div>
      )}

      {confirmados.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#15803d" }}>✅ CONFIRMADOS</p>
          <div className="space-y-3">
            {confirmados.map(t => (
              <TicketCard key={t.id} ticket={t} rifa={rifa} perm={perm}
                onConfirmar={undefined}
                onCancelar={perm.cancelarTickets ? () => setConfirmandoEstado({ tid: t.id, accion: "cancelar" }) : undefined}
                onEnviarWA={perm.notificarGanador ? () => abrirWAConfirmacion(t) : undefined}
                confirmando={confirmandoEstado?.tid === t.id ? confirmandoEstado.accion : null}
                onCancelConfirmacion={() => setConfirmandoEstado(null)}
                onProceder={accion => cambiarEstado(t.id, accion === "cancelar" ? "cancelado" : "confirmado")}
              />
            ))}
          </div>
        </div>
      )}

      {cancelados.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#9ca3af" }}>❌ CANCELADOS</p>
          <div className="space-y-3">
            {cancelados.map(t => (
              <TicketCard key={t.id} ticket={t} rifa={rifa} perm={perm}
                onConfirmar={undefined} onCancelar={undefined} onEnviarWA={undefined}
                confirmando={null} onCancelConfirmacion={() => {}} onProceder={() => {}} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, rifa, perm, onConfirmar, onCancelar, onEnviarWA, confirmando, onCancelConfirmacion, onProceder }: {
  ticket: RifaTicket; rifa: RifaDoc; perm: PermRifas;
  onConfirmar?: () => void;
  onCancelar?: () => void;
  onEnviarWA?: () => void;
  confirmando: "confirmar" | "cancelar" | null;
  onCancelConfirmacion: () => void;
  onProceder: (accion: "confirmar" | "cancelar") => void;
}) {
  const esConfirmado = ticket.estado === "confirmado";
  const esCancelado = ticket.estado === "cancelado";

  return (
    <div className="card-elegant p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--c-primary-bg)", color: "var(--c-primary)" }}>
              #{ticket.numero}
            </span>
            <p className="font-semibold text-sm">{ticket.nombre}</p>
          </div>
          <p className="text-xs" style={{ color: "#888" }}>📱 {ticket.telefono} · {ticket.cantidad} ticket{ticket.cantidad > 1 ? "s" : ""}{rifa.tipo === "pago" ? ` · ${formatPrecio(ticket.total)}` : " · Gratis"}</p>
          {ticket.numeros && ticket.numeros.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {ticket.numeros.map(n => (
                <span key={n} className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#ede9fe", color: "#7c3aed" }}>
                  🎫 {n}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={esConfirmado ? { background: "#dcfce7", color: "#15803d" } : esCancelado ? { background: "#f3f4f6", color: "#9ca3af" } : { background: "#fef9c3", color: "#92400e" }}>
          {esConfirmado ? "✅" : esCancelado ? "❌" : "⏳"}
        </span>
      </div>

      {!esCancelado && (
        <div className="flex flex-wrap gap-2 mt-3">
          {onConfirmar && !confirmando && (
            <button onClick={onConfirmar} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
              ✅ Confirmar pago →WA
            </button>
          )}
          {onEnviarWA && (
            <button onClick={onEnviarWA} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
              📲 Enviar WA
            </button>
          )}
          {onCancelar && !confirmando && (
            <button onClick={onCancelar} className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}>
              Cancelar
            </button>
          )}
          {confirmando && (
            <div className="flex gap-2 w-full">
              <p className="text-xs flex-1" style={{ color: confirmando === "cancelar" ? "#ef4444" : "#15803d" }}>
                {confirmando === "confirmar" ? "¿Confirmar el pago?" : "¿Cancelar este ticket?"}
              </p>
              <button onClick={onCancelConfirmacion} className="text-xs px-3 py-1 rounded-lg" style={{ background: "#f3f4f6", color: "#666" }}>No</button>
              <button onClick={() => {
                onProceder(confirmando);
                if (confirmando === "confirmar" && onEnviarWA) setTimeout(onEnviarWA, 200);
              }} className="text-xs px-3 py-1 rounded-lg font-semibold"
                style={{ background: confirmando === "confirmar" ? "#15803d" : "#ef4444", color: "white" }}>
                Sí
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabSorteoRifa({ rifa, token, perm, plantillas, onDone }: { rifa: RifaDoc; token: string; perm: PermRifas; plantillas: { confirmacion: string; ganador: string }; onDone: () => void }) {
  const modoInicial = perm.sorteoAutomatico ? "auto" : "manual";
  const [modo, setModo] = useState<"auto" | "manual">(modoInicial);
  const [numeroManual, setNumeroManual] = useState("");
  const [resultado, setResultado] = useState<{ numero: string; nombre: string; telefono: string } | null>(null);
  const [sorteando, setSorteando] = useState(false);
  const [error, setError] = useState("");
  const hdr = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function sortear() {
    setError("");
    setSorteando(true);
    const body: Record<string, unknown> = {};
    if (modo === "manual") {
      if (!numeroManual.trim()) { setError("Ingresa el número RF del ticket ganador"); setSorteando(false); return; }
      body.numero_ganador = numeroManual.trim().toUpperCase();
    }
    const res = await fetch(`/api/admin/rifas/${rifa.id}/sorteo`, { method: "POST", headers: hdr, body: JSON.stringify(body) });
    const data = await res.json();
    setSorteando(false);
    if (!res.ok) { setError(data.error || "Error al sortear"); return; }
    setResultado(data.ganador);
  }

  function notificarGanador() {
    if (!resultado) return;
    const telefono = resultado.telefono.startsWith("57") ? resultado.telefono : `57${resultado.telefono}`;
    const fecha = rifa.fecha_sorteo.split("-").reverse().join("/");
    const linkReserva = rifa.servicio_id
      ? `https://leila-studio.vercel.app/reservar?servicio=${rifa.servicio_id}&rifa=${rifa.id}&pnombre=${encodeURIComponent(resultado.nombre)}&ptel=${encodeURIComponent(resultado.telefono)}`
      : `https://leila-studio.vercel.app/reservar`;
    const msg = reemplazarVars(plantillas.ganador, {
      nombre: resultado.nombre,
      ticket: String(resultado.numero),
      premio: rifa.premio,
      fecha_sorteo: fecha,
      rifa_nombre: rifa.nombre,
      link_reserva: linkReserva,
    });
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const puedeAuto = perm.sorteoAutomatico;
  const puedeManual = perm.sorteoManual;

  return (
    <div className="max-w-md mx-auto">
      <h2 className="section-title mb-1">🎲 Sorteo — {rifa.nombre}</h2>
      <p className="text-sm mb-4" style={{ color: "#888" }}>🎁 {rifa.premio} · {rifa.tickets_confirmados} tickets confirmados</p>

      {!rifa.servicio_id && (
        <div className="mb-4 p-3 rounded-xl text-sm flex items-start gap-2" style={{ background: "#fff7ed", border: "1.5px solid #fb923c" }}>
          <span className="flex-shrink-0">⚠️</span>
          <p style={{ color: "#c2410c" }}>Esta rifa no tiene un servicio asignado. El link que recibirá la ganadora llevará a la página de reservas pero <strong>no pre-seleccionará el servicio del premio</strong>. Edita la rifa y elige el servicio antes de notificar a la ganadora.</p>
        </div>
      )}

      {rifa.tickets_confirmados === 0 && (
        <div className="text-center py-10 card-elegant p-6">
          <p className="text-2xl mb-2">🎫</p>
          <p className="font-semibold" style={{ color: "var(--c-primary)" }}>No hay tickets confirmados</p>
          <p className="text-sm mt-1" style={{ color: "#888" }}>Confirma los pagos antes de sortear</p>
        </div>
      )}

      {rifa.tickets_confirmados > 0 && !resultado && (
        <div className="card-elegant p-6">
          {(puedeAuto || puedeManual) && <p className="font-semibold mb-4">Tipo de sorteo:</p>}
          <div className="space-y-3 mb-5">
            {puedeAuto && (
              <button onClick={() => setModo("auto")}
                className="w-full text-left p-4 rounded-xl transition-all"
                style={modo === "auto" ? { background: "var(--c-primary-bg)", border: "2px solid var(--c-primary)" } : { background: "white", border: "1.5px solid var(--c-border-soft)" }}>
                <p className="font-semibold text-sm">🎲 Automático (aleatorio)</p>
                <p className="text-xs mt-0.5" style={{ color: "#888" }}>El sistema elige al azar entre todos los tickets confirmados</p>
              </button>
            )}
            {puedeManual && (
              <button onClick={() => setModo("manual")}
                className="w-full text-left p-4 rounded-xl transition-all"
                style={modo === "manual" ? { background: "var(--c-primary-bg)", border: "2px solid var(--c-primary)" } : { background: "white", border: "1.5px solid var(--c-border-soft)" }}>
                <p className="font-semibold text-sm">✏️ Manual (elige el número)</p>
                <p className="text-xs mt-0.5" style={{ color: "#888" }}>Ingresa el número del ticket ganador</p>
              </button>
            )}
          </div>
          {modo === "manual" && puedeManual && (
            <div className="mb-4">
              <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Número RF del ticket ganador</label>
              <input type="text" placeholder="Ej: RF247" value={numeroManual} onChange={e => setNumeroManual(e.target.value.toUpperCase())} />
            </div>
          )}
          {error && <p className="text-xs mb-3" style={{ color: "#e91e8c" }}>{error}</p>}
          {(puedeAuto || puedeManual) && (
            <button onClick={sortear} disabled={sorteando} className="btn-gold w-full">
              {sorteando ? "Sorteando..." : "🎲 Realizar sorteo"}
            </button>
          )}
        </div>
      )}

      {resultado && (
        <div className="card-elegant p-6 text-center">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-bold text-xl mb-1" style={{ color: "var(--c-primary)" }}>¡Tenemos ganador!</p>
          <div className="my-4 p-4 rounded-xl" style={{ background: "linear-gradient(135deg,#fef9c3,#fef3c7)", border: "2px solid #f59e0b" }}>
            <p className="font-bold text-lg" style={{ color: "#92400e" }}>{resultado.nombre}</p>
            <p className="text-sm font-bold mt-1" style={{ color: "#7c3aed" }}>🎫 {resultado.numero}</p>
            <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>{resultado.telefono}</p>
          </div>
          {perm.notificarGanador && (
            <button onClick={notificarGanador} className="btn-gold w-full mb-3">
              📲 Notificar ganador por WhatsApp
            </button>
          )}
          <button onClick={onDone} className="btn-rose w-full">
            Volver a Rifas
          </button>
        </div>
      )}
    </div>
  );
}

function PlantillasRifasConfig({ token, plantillas, onGuardado }: { token: string; plantillas: { confirmacion: string; ganador: string }; onGuardado: (p: { confirmacion: string; ganador: string }) => void }) {
  const [plantConfirmacion, setPlantConfirmacion] = useState(plantillas.confirmacion);
  const [plantGanador, setPlantGanador] = useState(plantillas.ganador);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setPlantConfirmacion(plantillas.confirmacion);
    setPlantGanador(plantillas.ganador);
  }, [plantillas.confirmacion, plantillas.ganador]);

  async function guardar() {
    setGuardando(true);
    const res = await fetch("/api/admin/rifas-config", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ plantilla_confirmacion: plantConfirmacion, plantilla_ganador: plantGanador }),
    });
    setGuardando(false);
    if (res.ok) {
      setMsg("✓ Guardado");
      onGuardado({ confirmacion: plantConfirmacion, ganador: plantGanador });
    } else { setMsg("Error al guardar"); }
    setTimeout(() => setMsg(""), 3000);
  }

  const vars = "Variables: {nombre}, {ticket}, {premio}, {fecha_sorteo}, {rifa_nombre}";
  const varsGanador = "Variables: {nombre}, {ticket}, {premio}, {fecha_sorteo}, {rifa_nombre}, {link_reserva}";

  return (
    <div className="mt-6 card-elegant p-5">
      <p className="font-semibold text-sm mb-1">📋 Plantillas WhatsApp — Rifas</p>
      <p className="text-xs mb-4" style={{ color: "#888" }}>Personaliza los mensajes. Edítalos al gusto — los cambios se aplican inmediatamente al enviar.</p>
      <div className="space-y-5">
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Mensaje de confirmación de ticket</label>
          <p className="text-xs mb-2" style={{ color: "#bbb" }}>{vars}</p>
          <textarea rows={6}
            value={plantConfirmacion} onChange={e => setPlantConfirmacion(e.target.value)}
            className="w-full text-sm p-3 rounded-xl" style={{ border: "1.5px solid var(--c-border-soft)", resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" }} />
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Mensaje al ganador</label>
          <p className="text-xs mb-2" style={{ color: "#bbb" }}>{varsGanador}</p>
          <textarea rows={8}
            value={plantGanador} onChange={e => setPlantGanador(e.target.value)}
            className="w-full text-sm p-3 rounded-xl" style={{ border: "1.5px solid var(--c-border-soft)", resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" }} />
        </div>
      </div>
      {msg && <p className="text-xs mt-3" style={{ color: "#10b981" }}>{msg}</p>}
      <button onClick={guardar} disabled={guardando} className="btn-gold text-sm mt-4" style={{ padding: "0.5rem 1.2rem" }}>
        {guardando ? "Guardando..." : "💾 Guardar plantillas"}
      </button>
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

function ListaReservas({ reservas, titulo, onActualizar, onEliminar, onRefresh, vacio, esRoot, perm, permCompletadas, token, waEnviados, onWaEnviado, modoLista }: {
  reservas: Reserva[]; titulo: string;
  onActualizar: (id: string, estado: string, saldo?: number) => void;
  onEliminar: (id: string) => void;
  onRefresh: () => void;
  vacio: string;
  esRoot?: boolean;
  perm: PermReservas;
  permCompletadas: PermCompletadas;
  token: string;
  waEnviados: Set<string>;
  onWaEnviado: (id: string) => void;
  modoLista?: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const filtradas = reservas
    .filter(r => filtroEstado === "todos" || r.estado === filtroEstado)
    .filter(r => !busqueda || r.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) || r.servicio_nombre.toLowerCase().includes(busqueda.toLowerCase()));

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
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="section-title">{titulo}</h2>
        {perm.descargarPDFMasivo && (
          <button onClick={() => descargarPDFMasivo(filtradas)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "#6366f111", color: "#6366f1", border: "1px solid #6366f155" }}>
            📄 Exportar PDF
          </button>
        )}
      </div>
      {modoLista && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <input type="text" placeholder="Buscar cliente o servicio..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="text-sm flex-1" style={{ minWidth: "140px" }} />
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl"
            style={{ border: "1.5px solid var(--c-border-soft)", background: "var(--c-primary-bg)", color: "var(--c-primary)" }}>
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmada">Confirmada</option>
            <option value="en_proceso">En proceso</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      )}
      <div className="space-y-4">
        {filtradas.map((r) => (
          <TarjetaReserva key={r.id} reserva={r} token={token}
            onActualizar={onActualizar} onEliminar={onEliminar} onRefresh={onRefresh}
            esRoot={esRoot} perm={perm} permCompletadas={permCompletadas}
            waEnviados={waEnviados} onWaEnviado={onWaEnviado} />
        ))}
        {filtradas.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "#bbb" }}>Sin resultados para los filtros actuales</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TarjetaReserva({ reserva: r, token, onActualizar, onEliminar, onRefresh, esRoot, perm, permCompletadas, waEnviados, onWaEnviado }: {
  reserva: Reserva;
  token: string;
  onActualizar: (id: string, estado: string, saldo?: number) => void;
  onEliminar: (id: string) => void;
  onRefresh: () => void;
  esRoot?: boolean;
  perm: PermReservas;
  permCompletadas: PermCompletadas;
  waEnviados: Set<string>;
  onWaEnviado: (id: string) => void;
}) {
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [modalCompletar, setModalCompletar] = useState(false);
  const [modalEliminarPin, setModalEliminarPin] = useState(false);
  const [modalRestaurar, setModalRestaurar] = useState(false);
  const [enviandoWA, setEnviandoWA] = useState(false);

  const colores: Record<string, string> = {
    pendiente: "#f59e0b", confirmada: "#10b981", en_proceso: "#e91e8c", completada: "#6366f1", cancelada: "#ef4444",
  };
  const etiquetas: Record<string, string> = {
    pendiente: "Pendiente", confirmada: "Confirmada", en_proceso: "⚡ En proceso", completada: "✅ Completada", cancelada: "Cancelada",
  };

  async function handleEliminar() {
    setEliminando(true);
    await onEliminar(r.id);
  }

  function reenviarWAGracias() {
    const mensajeGracias =
      `💅 *Leila Studio Nails Beauty*\n\n✨ *¡Gracias por visitarnos, ${r.cliente_nombre}!* ✨\n\n` +
      `Fue un placer atenderte hoy con tu *${r.servicio_nombre}*.\n\n` +
      `Esperamos que hayas quedado encantada con el resultado 🌸\n\n` +
      `📲 Cuando quieras repetir, reserva aquí:\nhttps://leila-studio.vercel.app/reservar\n\n` +
      `*¡Te esperamos pronto!* 💖`;
    const telefono = r.cliente_telefono.replace(/\D/g, "");
    const phone = telefono.startsWith("57") ? telefono : `57${telefono}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensajeGracias)}`, "_blank");
    onWaEnviado(r.id);
  }

  const yaEnvioWA = waEnviados.has(r.id);
  const puedeReenviarWA = permCompletadas.reenviarWhatsApp && (permCompletadas.multipleReenvio || !yaEnvioWA);
  const puedeEliminarSimple = perm.eliminar && (r.estado === "pendiente" || r.estado === "confirmada" || r.estado === "cancelada");
  const puedeEliminarCompletada = (permCompletadas.eliminar || esRoot) && r.estado === "completada";

  return (
    <div className="card-elegant p-4">
      {r.es_premio_rifa && (
        <div className="mb-3 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5" style={{ background: "linear-gradient(135deg,#fef9c3,#fef3c7)", border: "1.5px solid #f59e0b", color: "#92400e" }}>
          🏆 Premio — {r.rifa_nombre || "Rifa"}
        </div>
      )}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold">{r.cliente_nombre}</p>
          <p className="text-sm" style={{ color: "#888" }}>📱 {r.cliente_telefono}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs px-3 py-1 rounded-full font-semibold"
            style={{ background: colores[r.estado] + "22", color: colores[r.estado],
              ...(r.estado === "en_proceso" ? { animation: "pulse 2s infinite" } : {}) }}>
            {etiquetas[r.estado] ?? r.estado}
          </span>
          {perm.descargarPDF && r.estado !== "cancelada" && (
            <button onClick={() => descargarPDFReserva(r)} title="Descargar PDF"
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#6366f111", color: "#6366f1", border: "1px solid #6366f155" }}>
              📄
            </button>
          )}
          {r.estado === "completada" && puedeReenviarWA && (
            <button onClick={reenviarWAGracias} disabled={enviandoWA} title="Reenviar WhatsApp de agradecimiento"
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#25d36611", color: "#25d366", border: "1px solid #25d36655" }}>
              {enviandoWA ? "…" : "✉"}
            </button>
          )}
          {puedeEliminarSimple && !confirmandoEliminar && (
            <button onClick={() => setConfirmandoEliminar(true)} title="Eliminar cita"
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444455" }}>
              🗑
            </button>
          )}
          {puedeEliminarCompletada && (
            <button onClick={() => setModalEliminarPin(true)} title="Eliminar (requiere PIN)"
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444455" }}>
              🗑
            </button>
          )}
        </div>
      </div>

      {confirmandoEliminar && (
        <div className="mb-3 p-3 rounded-xl text-center" style={{ background: "#fff0f0", border: "1px solid #ef4444" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#ef4444" }}>¿Eliminar esta cita? No se puede deshacer.</p>
          <div className="flex gap-2">
            <button onClick={handleEliminar} disabled={eliminando}
              className="flex-1 py-1.5 rounded-full text-xs font-bold" style={{ background: "#ef4444", color: "white" }}>
              {eliminando ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button onClick={() => setConfirmandoEliminar(false)}
              className="flex-1 py-1.5 rounded-full text-xs font-bold" style={{ background: "var(--c-border-soft)", color: "#888" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="text-sm space-y-1 mb-3">
        <p>💅 <span className="font-semibold">{r.servicio_nombre}</span></p>
        <p>📅 {formatFecha(r.fecha)} a las {r.hora}</p>
        {r.trabajador_nombre && <p>👩 <span className="font-semibold" style={{ color: "var(--c-primary)" }}>{r.trabajador_nombre}</span></p>}
        <div className="flex flex-wrap gap-3 mt-2">
          <p>Total: <span className="font-bold" style={{ color: "var(--c-primary)" }}>{formatPrecio(r.precio)}</span></p>
          <p>Anticipo: <span className="font-bold" style={{ color: "#10b981" }}>{formatPrecio(r.anticipo)}</span></p>
          {r.estado === "completada" && r.pago_saldo != null && (
            <p>Saldo cobrado: <span className="font-bold" style={{ color: "#6366f1" }}>{formatPrecio(r.pago_saldo)}</span></p>
          )}
        </div>
      </div>

      {r.estado === "pendiente" && (perm.cambiarEstado || perm.cancelar) && (
        <>
          {confirmandoCancelar ? (
            <div className="p-3 rounded-xl text-center" style={{ background: "#fff0f0", border: "1px solid #ef4444" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "#ef4444" }}>¿Cancelar esta cita?</p>
              <div className="flex gap-2">
                <button onClick={() => { setConfirmandoCancelar(false); onActualizar(r.id, "cancelada"); }}
                  className="flex-1 py-1.5 rounded-full text-xs font-bold" style={{ background: "#ef4444", color: "white" }}>
                  Sí, cancelar
                </button>
                <button onClick={() => setConfirmandoCancelar(false)}
                  className="flex-1 py-1.5 rounded-full text-xs font-bold" style={{ background: "var(--c-border-soft)", color: "#888" }}>
                  No, volver
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {perm.cambiarEstado && (
                <button onClick={() => setModalConfirmar(true)}
                  className="flex-1 py-2 rounded-full text-xs font-bold"
                  style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b981" }}>
                  ✓ Confirmar pago
                </button>
              )}
              {perm.cancelar && (
                <button onClick={() => setConfirmandoCancelar(true)}
                  className="flex-1 py-2 rounded-full text-xs font-bold"
                  style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef4444" }}>
                  ✗ Cancelar
                </button>
              )}
            </div>
          )}
        </>
      )}
      {r.estado === "confirmada" && perm.cambiarEstado && (
        <button onClick={() => onActualizar(r.id, "en_proceso")}
          className="w-full py-2 rounded-full text-xs font-bold"
          style={{ background: "#e91e8c22", color: "#e91e8c", border: "1px solid #e91e8c" }}>
          ⚡ Cliente llegó — iniciar atención
        </button>
      )}
      {r.estado === "en_proceso" && perm.cambiarEstado && (
        <div className="space-y-2">
          <div className="p-3 rounded-xl text-center text-xs font-semibold"
            style={{ background: "#e91e8c11", border: "1px dashed #e91e8c", color: "#e91e8c" }}>
            {r.trabajador_nombre ? `👩 ${r.trabajador_nombre} atendiendo ahora` : "⚡ Atención en curso"}
          </div>
          <button onClick={() => setModalCompletar(true)}
            className="w-full py-2 rounded-full text-xs font-bold"
            style={{ background: "#6366f122", color: "#6366f1", border: "1px solid #6366f1" }}>
            ✓ Marcar como completada
          </button>
        </div>
      )}

      {r.estado === "cancelada" && perm.cambiarEstado && (
        <button onClick={() => setModalRestaurar(true)}
          className="w-full py-2 rounded-full text-xs font-bold mt-1"
          style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b981" }}>
          ↩ Restaurar cita
        </button>
      )}

      {modalConfirmar && (
        <ModalConfirmarCita reserva={r} token={token}
          onClose={() => setModalConfirmar(false)} onConfirmado={onRefresh} />
      )}
      {modalCompletar && (
        <ModalCompletarCita reserva={r} token={token}
          permReenviarWA={permCompletadas.reenviarWhatsApp}
          onClose={() => setModalCompletar(false)}
          onCompletado={() => { onRefresh(); onWaEnviado(r.id); }} />
      )}
      {modalEliminarPin && (
        <ModalEliminarConPin token={token}
          onClose={() => setModalEliminarPin(false)}
          onEliminado={async () => {
            await fetch(`/api/reservas/${r.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            setModalEliminarPin(false);
            onRefresh();
          }} />
      )}
      {modalRestaurar && (
        <ModalRestaurarCita reserva={r} token={token}
          onClose={() => setModalRestaurar(false)} onRestaurado={onRefresh} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*               FUNCIONES PDF                         */
/* ═══════════════════════════════════════════════════ */

function descargarPDFReserva(r: Reserva) {
  const saldo = r.pago_saldo ?? (r.precio - r.anticipo);
  const [y, m, d] = r.fecha.split("-");
  const fechaFmt = `${d}/${m}/${y}`;
  const coloresEstado: Record<string, string> = {
    pendiente: "#f59e0b", confirmada: "#10b981", en_proceso: "#e91e8c", completada: "#6366f1", cancelada: "#ef4444",
  };
  const etiquetasEstado: Record<string, string> = {
    pendiente: "Pendiente", confirmada: "Confirmada", en_proceso: "En proceso", completada: "Completada", cancelada: "Cancelada",
  };
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprobante #${r.id.slice(-6).toUpperCase()}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:420px;margin:40px auto;color:#1a1a1a;padding:0 16px}
  .header{text-align:center;padding-bottom:16px;border-bottom:2px solid #ec4899;margin-bottom:20px}
  .salon{font-size:22px;font-weight:bold;color:#ec4899;margin:4px 0}
  .subtitle{font-size:11px;color:#999;letter-spacing:2px}
  .badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:bold;color:#fff;background:${coloresEstado[r.estado]??'#888'};margin:8px 0}
  .section{margin:14px 0;padding:12px 14px;border:1px solid #eee;border-radius:8px}
  .section-title{font-size:10px;font-weight:bold;color:#aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
  .row{display:flex;justify-content:space-between;margin:5px 0;font-size:13px}
  .label{color:#777}
  .value{font-weight:600}
  .footer{text-align:center;margin-top:20px;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:12px}
  @media print{body{margin:10px}}
</style></head><body>
<div class="header"><div style="font-size:26px">💅</div><div class="salon">Leila Studio</div><div class="subtitle">COMPROBANTE DE CITA</div></div>
<div style="text-align:center"><span class="badge">${etiquetasEstado[r.estado]??r.estado}</span></div>
<div class="section"><div class="section-title">Información</div>
<div class="row"><span class="label">N° de cita</span><span class="value">#${r.id.slice(-6).toUpperCase()}</span></div>
<div class="row"><span class="label">Fecha</span><span class="value">${fechaFmt}</span></div>
<div class="row"><span class="label">Hora</span><span class="value">${r.hora}</span></div></div>
<div class="section"><div class="section-title">Cliente</div>
<div class="row"><span class="label">Nombre</span><span class="value">${r.cliente_nombre}</span></div>
<div class="row"><span class="label">Teléfono</span><span class="value">${r.cliente_telefono}</span></div></div>
<div class="section"><div class="section-title">Servicio</div>
<div class="row"><span class="label">Servicio</span><span class="value">${r.servicio_nombre}</span></div>
${r.trabajador_nombre?`<div class="row"><span class="label">Profesional</span><span class="value">${r.trabajador_nombre}</span></div>`:""}
</div>
<div class="section"><div class="section-title">Pago</div>
<div class="row"><span class="label">Total</span><span class="value">$${r.precio.toLocaleString("es-CO")}</span></div>
<div class="row"><span class="label">Anticipo</span><span class="value">$${r.anticipo.toLocaleString("es-CO")}</span></div>
${r.estado==="completada"?`<div class="row"><span class="label">Saldo cobrado</span><span class="value" style="color:#6366f1">$${saldo.toLocaleString("es-CO")}</span></div>`:`<div class="row"><span class="label">Saldo pendiente</span><span class="value">$${(r.precio-r.anticipo).toLocaleString("es-CO")}</span></div>`}
</div>
<div class="footer">Generado: ${new Date().toLocaleString("es-CO",{timeZone:"America/Bogota"})}<br>leila-studio.vercel.app</div>
</body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 400);
}

function descargarPDFMasivo(reservas: Reserva[]) {
  const coloresEstado: Record<string, string> = {
    pendiente: "#f59e0b", confirmada: "#10b981", en_proceso: "#e91e8c", completada: "#6366f1", cancelada: "#ef4444",
  };
  const filas = reservas.map(r => {
    const [y, m, d] = r.fecha.split("-");
    return `<tr>
      <td>#${r.id.slice(-6).toUpperCase()}</td>
      <td>${r.cliente_nombre}<br><span style="color:#999;font-size:11px">${r.cliente_telefono}</span></td>
      <td>${r.servicio_nombre}${r.trabajador_nombre?`<br><span style="color:#999;font-size:11px">${r.trabajador_nombre}</span>`:""}</td>
      <td>${d}/${m}/${y}<br><span style="color:#999;font-size:11px">${r.hora}</span></td>
      <td style="text-align:right">$${r.precio.toLocaleString("es-CO")}</td>
      <td style="text-align:right">$${r.anticipo.toLocaleString("es-CO")}</td>
      <td><span style="background:${coloresEstado[r.estado]??'#888'}22;color:${coloresEstado[r.estado]??'#888'};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold">${r.estado}</span></td>
    </tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Registro de citas — Leila Studio</title>
<style>
  body{font-family:Arial,sans-serif;padding:20px;color:#1a1a1a}
  h1{color:#ec4899;font-size:20px;margin-bottom:4px}
  .sub{color:#999;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#fdf2f8;color:#ec4899;text-align:left;padding:8px;border-bottom:2px solid #ec4899}
  td{padding:7px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top}
  tr:nth-child(even){background:#fafafa}
  .footer{margin-top:16px;font-size:11px;color:#bbb;text-align:right}
  @media print{body{padding:10px}}
</style></head><body>
<h1>💅 Leila Studio — Registro de Citas</h1>
<div class="sub">Total: ${reservas.length} cita(s) · Generado: ${new Date().toLocaleString("es-CO",{timeZone:"America/Bogota"})}</div>
<table><thead><tr><th>N°</th><th>Cliente</th><th>Servicio</th><th>Fecha</th><th style="text-align:right">Total</th><th style="text-align:right">Anticipo</th><th>Estado</th></tr></thead>
<tbody>${filas}</tbody></table>
<div class="footer">leila-studio.vercel.app</div>
</body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 400);
}

/* ═══════════════════════════════════════════════════ */
/*           MODAL CONFIRMAR CITA                      */
/* ═══════════════════════════════════════════════════ */

function ModalConfirmarCita({ reserva, token, onClose, onConfirmado }: {
  reserva: Reserva; token: string; onClose: () => void; onConfirmado: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const saldo = reserva.precio - reserva.anticipo;
  const [y, m, d] = reserva.fecha.split("-");
  const fechaFmt = `${d}/${m}/${y}`;
  const profesional = reserva.trabajador_nombre ? `• 👩 Profesional: ${reserva.trabajador_nombre}\n` : "";
  const pagoLineas = reserva.anticipo > 0
    ? `• 💰 Total: ${formatPrecio(reserva.precio)}\n• ✅ Anticipo pagado: ${formatPrecio(reserva.anticipo)}\n• 💵 Saldo restante: ${formatPrecio(saldo)}`
    : `• 💰 Total a pagar: ${formatPrecio(reserva.precio)}`;
  const mensajeWA =
    `✨ *¡Tu cita está confirmada!* ✨\n━━━━━━━━━━━━━━━━━━━━━\n💅 *Leila Studio Nails Beauty*\n\n` +
    `Hola *${reserva.cliente_nombre}*, tu reserva ha sido confirmada. ¡Te esperamos! 🎉\n\n` +
    `📋 *Detalle de tu cita:*\n• 💆 Servicio: ${reserva.servicio_nombre}\n${profesional}` +
    `• 📅 Fecha: ${fechaFmt}\n• 🕐 Hora: ${reserva.hora}\n${pagoLineas}\n\n` +
    `📍 Recuerda llegar puntual.\n¡Nos vemos pronto! 💖\n━━━━━━━━━━━━━━━━━━━━━`;

  async function confirmar(enviarWA: boolean) {
    setEnviando(true); setMsg("");
    const res = await fetch(`/api/reservas/${reserva.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "confirmada" }),
    });
    if (!res.ok) { setMsg("Error al confirmar"); setEnviando(false); return; }
    if (enviarWA) {
      const telefono = reserva.cliente_telefono.replace(/\D/g, "");
      const phone = telefono.startsWith("57") ? telefono : `57${telefono}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensajeWA)}`, "_blank");
    }
    onConfirmado(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="card-elegant p-6 w-full max-w-md relative" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} className="absolute top-3 right-4 text-xl font-bold" style={{ color: "#aaa", background: "none", border: "none" }}>✕</button>
        <h3 className="font-script text-xl font-bold mb-1" style={{ color: "#10b981" }}>Confirmar cita</h3>
        <p className="text-xs mb-4" style={{ color: "#888" }}>{reserva.cliente_nombre} · {reserva.servicio_nombre} · {fechaFmt} {reserva.hora}</p>
        <div className="mb-4 p-3 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #10b98133" }}>
          <p className="font-semibold mb-2 text-xs" style={{ color: "#10b981" }}>Mensaje WhatsApp al cliente:</p>
          <pre className="whitespace-pre-wrap font-sans text-xs" style={{ color: "#333" }}>{mensajeWA}</pre>
        </div>
        {msg && <p className="text-xs mb-3 text-center" style={{ color: "#ef4444" }}>{msg}</p>}
        <div className="flex gap-2">
          <button onClick={() => confirmar(false)} disabled={enviando}
            className="flex-1 py-2 rounded-full text-xs font-bold"
            style={{ background: "var(--c-border-soft)", color: "#666" }}>
            Sin enviar WA
          </button>
          <button onClick={() => confirmar(true)} disabled={enviando}
            className="flex-1 py-2 rounded-full text-xs font-bold"
            style={{ background: "#10b981", color: "white" }}>
            {enviando ? "Procesando..." : "✓ Confirmar + Enviar WA"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*           MODAL COMPLETAR CITA                      */
/* ═══════════════════════════════════════════════════ */

function ModalCompletarCita({ reserva, token, permReenviarWA, onClose, onCompletado }: {
  reserva: Reserva; token: string; permReenviarWA: boolean; onClose: () => void; onCompletado: () => void;
}) {
  const [saldo, setSaldo] = useState(reserva.pago_saldo ?? (reserva.precio - reserva.anticipo));
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const mensajeGracias =
    `💅 *Leila Studio Nails Beauty*\n\n✨ *¡Gracias por visitarnos, ${reserva.cliente_nombre}!* ✨\n\n` +
    `Fue un placer atenderte hoy con tu *${reserva.servicio_nombre}*.\n\n` +
    `Esperamos que hayas quedado encantada con el resultado 🌸\n\n` +
    `📲 Cuando quieras repetir, reserva aquí:\nhttps://leila-studio.vercel.app/reservar\n\n` +
    `*¡Te esperamos pronto!* 💖`;

  async function completar(enviarWA: boolean) {
    setEnviando(true); setMsg("");
    const res = await fetch(`/api/reservas/${reserva.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "completada", pago_saldo: saldo }),
    });
    if (!res.ok) { setMsg("Error al completar"); setEnviando(false); return; }
    if (enviarWA) {
      const telefono = reserva.cliente_telefono.replace(/\D/g, "");
      const phone = telefono.startsWith("57") ? telefono : `57${telefono}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensajeGracias)}`, "_blank");
    }
    onCompletado(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="card-elegant p-6 w-full max-w-md relative" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <button onClick={onClose} className="absolute top-3 right-4 text-xl font-bold" style={{ color: "#aaa", background: "none", border: "none" }}>✕</button>
        <h3 className="font-script text-xl font-bold mb-1" style={{ color: "#6366f1" }}>Completar cita</h3>
        <p className="text-xs mb-4" style={{ color: "#888" }}>{reserva.cliente_nombre} · {reserva.servicio_nombre}</p>
        <div className="mb-4">
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Saldo cobrado</label>
          <input type="number" value={saldo} onChange={e => setSaldo(Number(e.target.value))} className="text-sm" />
        </div>
        {permReenviarWA && (
          <div className="mb-4 p-3 rounded-xl" style={{ background: "#eef2ff", border: "1px solid #6366f133" }}>
            <p className="font-semibold mb-2 text-xs" style={{ color: "#6366f1" }}>Mensaje de agradecimiento:</p>
            <pre className="whitespace-pre-wrap font-sans text-xs" style={{ color: "#333" }}>{mensajeGracias}</pre>
          </div>
        )}
        {msg && <p className="text-xs mb-3 text-center" style={{ color: "#ef4444" }}>{msg}</p>}
        <div className="flex gap-2">
          <button onClick={() => completar(false)} disabled={enviando}
            className="flex-1 py-2 rounded-full text-xs font-bold"
            style={{ background: "var(--c-border-soft)", color: "#666" }}>
            {permReenviarWA ? "Sin enviar WA" : "✓ Completar"}
          </button>
          {permReenviarWA && (
            <button onClick={() => completar(true)} disabled={enviando}
              className="flex-1 py-2 rounded-full text-xs font-bold"
              style={{ background: "#6366f1", color: "white" }}>
              {enviando ? "Procesando..." : "✓ Completar + Enviar WA"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*         MODAL ELIMINAR CON PIN                      */
/* ═══════════════════════════════════════════════════ */

function ModalEliminarConPin({ token, onClose, onEliminado }: {
  token: string; onClose: () => void; onEliminado: () => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function verificar() {
    if (!/^\d{6}$/.test(pin)) return setError("PIN de 6 dígitos");
    setCargando(true); setError("");
    const res = await fetch("/api/admin/verificar-pin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error || "PIN incorrecto"); setCargando(false); return; }
    await onEliminado();
    setCargando(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="card-elegant p-6 w-full max-w-xs text-center relative">
        <button onClick={onClose} className="absolute top-3 right-4 text-xl font-bold" style={{ color: "#aaa", background: "none", border: "none" }}>✕</button>
        <div className="text-3xl mb-2">🔢</div>
        <h3 className="font-script text-xl font-bold mb-1" style={{ color: "#ef4444" }}>Eliminar cita</h3>
        <p className="text-xs mb-4" style={{ color: "#888" }}>Ingresa tu PIN de seguridad</p>
        <input type="password" inputMode="numeric" placeholder="PIN de 6 dígitos" maxLength={6}
          value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mb-3 text-center text-xl tracking-widest" />
        {error && <p className="text-xs mb-3" style={{ color: "#ef4444" }}>{error}</p>}
        <button onClick={verificar} disabled={cargando}
          className="w-full py-2 rounded-full text-xs font-bold"
          style={{ background: "#ef4444", color: "white" }}>
          {cargando ? "Verificando..." : "🗑 Eliminar definitivamente"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*           MODAL RESTAURAR / REAGENDAR               */
/* ═══════════════════════════════════════════════════ */

function ModalRestaurarCita({ reserva, token, onClose, onRestaurado }: {
  reserva: Reserva; token: string; onClose: () => void; onRestaurado: () => void;
}) {
  const duracion = reserva.duracion_min ?? 60;
  const hoyISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const fechaOriginalPasada = reserva.fecha < hoyISO;

  const [verificando, setVerificando] = useState(true);
  const [slotOriginalDisponible, setSlotOriginalDisponible] = useState(false);
  const [modo, setModo] = useState<"consultar" | "fijar">("consultar");

  // Modo consultar
  const [sugerencias, setSugerencias] = useState<{ fecha: string; hora: string }[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());
  const [buscando, setBuscando] = useState(false);

  // Modo fijar
  const [nuevaFecha, setNuevaFecha] = useState(fechaOriginalPasada ? hoyISO : reserva.fecha);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [nuevaHora, setNuevaHora] = useState("");
  const [enviarWA, setEnviarWA] = useState(true);

  const [procesando, setProcesando] = useState(false);
  const [msg, setMsg] = useState("");
  const [cargandoHoras, setCargandoHoras] = useState(false);

  function formatSugerencia(fecha: string): string {
    const [y, m, d] = fecha.split("-").map(Number);
    const f = new Date(y, m - 1, d);
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return `${dias[f.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
  }

  async function buscarSugerencias() {
    setBuscando(true);
    const sugs: { fecha: string; hora: string }[] = [];
    for (let i = 0; i <= 14 && sugs.length < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const fechaStr = d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
      if (d.getDay() === 0) continue;
      const res = await fetch(`/api/horas-disponibles?fecha=${fechaStr}&duracion=${duracion}`);
      const data = await res.json();
      const horas: string[] = data.horas ?? [];
      if (horas.length > 0) {
        const horaPreferida = horas.find(h => h === reserva.hora) || horas[0];
        sugs.push({ fecha: fechaStr, hora: horaPreferida });
      }
    }
    setSugerencias(sugs);
    setSeleccionadas(new Set(sugs.map((_, i) => i)));
    setBuscando(false);
  }

  useEffect(() => {
    async function verificar() {
      if (fechaOriginalPasada) {
        setSlotOriginalDisponible(false);
        setVerificando(false);
        buscarSugerencias();
        return;
      }
      const res = await fetch(`/api/horas-disponibles?fecha=${reserva.fecha}&duracion=${duracion}`);
      const data = await res.json();
      const horas: string[] = data.horas ?? [];
      const disponible = horas.includes(reserva.hora);
      setSlotOriginalDisponible(disponible);
      if (!disponible) {
        setHorasDisponibles(horas);
        setNuevaHora(horas[0] ?? "");
        buscarSugerencias();
      }
      setVerificando(false);
    }
    verificar();
  }, []);

  async function cargarHoras(fecha: string) {
    setCargandoHoras(true);
    const res = await fetch(`/api/horas-disponibles?fecha=${fecha}&duracion=${duracion}`);
    const data = await res.json();
    const horas: string[] = data.horas ?? [];
    setHorasDisponibles(horas);
    setNuevaHora(horas[0] ?? "");
    setCargandoHoras(false);
  }

  const esReagenda = !slotOriginalDisponible;
  const saldo = reserva.precio - reserva.anticipo;

  const slotsSeleccionados = sugerencias.filter((_, i) => seleccionadas.has(i));
  const mensajeConsultar =
    `💅 *Leila Studio Nails Beauty*\n\n` +
    `¡Hola *${reserva.cliente_nombre}!* 👋\n\n` +
    `Tu cita de *${reserva.servicio_nombre}* quedó pendiente de reagendar.\n` +
    `¿Cuál de estos horarios te queda mejor?\n\n` +
    slotsSeleccionados.map(s => `📅 ${formatSugerencia(s.fecha)} · ${s.hora}`).join("\n") +
    `\n\nResponde con el que te convenga y lo agendamos 💖\n¡Te esperamos pronto! 🌸`;

  const fechaFinal = nuevaFecha;
  const [yy, mm, dd] = fechaFinal.split("-");
  const fechaFmt = `${dd}/${mm}/${yy}`;

  const mensajeRestaurar =
    `💅 *Leila Studio Nails Beauty*\n\n¡Hola *${reserva.cliente_nombre}!* 🎉\n\n` +
    `Tu cita que había sido cancelada ha sido *reactivada* con éxito.\n\n` +
    `📋 *Detalle de tu cita:*\n• 💆 Servicio: ${reserva.servicio_nombre}\n` +
    `• 📅 Fecha: ${fechaFmt}\n• 🕐 Hora: ${reserva.hora}\n` +
    (reserva.anticipo > 0 ? `• 💵 Saldo a cancelar: ${formatPrecio(saldo)}\n` : `• 💰 Total: ${formatPrecio(reserva.precio)}\n`) +
    `\n📍 Recuerda llegar puntual. ¡Te esperamos! 💖`;

  const mensajeReagendar =
    `💅 *Leila Studio Nails Beauty*\n\n¡Hola *${reserva.cliente_nombre}!* 📅\n\n` +
    `Tu cita ha sido *reagendada* para una nueva fecha.\n\n` +
    `📋 *Nueva fecha:*\n• 💆 Servicio: ${reserva.servicio_nombre}\n` +
    `• 📅 Fecha: ${fechaFmt}\n• 🕐 Hora: ${nuevaHora}\n\n` +
    `¿Te queda bien este nuevo horario? Respóndenos para confirmarlo.\n\n¡Gracias y nos vemos pronto! 💖`;

  async function confirmar() {
    setMsg("");
    const telefono = reserva.cliente_telefono.replace(/\D/g, "");
    const phone = telefono.startsWith("57") ? telefono : `57${telefono}`;

    if (modo === "consultar") {
      if (slotsSeleccionados.length === 0) return setMsg("Selecciona al menos un horario para ofrecer");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensajeConsultar)}`, "_blank");
      onClose();
      return;
    }

    // Modo fijar
    if (!nuevaHora) return setMsg("Selecciona una hora disponible");
    setProcesando(true);
    const patchBody: Record<string, unknown> = { estado: "pendiente" };
    if (esReagenda) { patchBody.fecha = nuevaFecha; patchBody.hora = nuevaHora; }
    const res = await fetch(`/api/reservas/${reserva.id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    if (!res.ok) { setMsg("Error al restaurar la cita"); setProcesando(false); return; }
    if (enviarWA) {
      const waMsg = esReagenda ? mensajeReagendar : mensajeRestaurar;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, "_blank");
    }
    onRestaurado(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="card-elegant p-6 w-full max-w-md relative" style={{ maxHeight: "92vh", overflowY: "auto" }}>
        <button onClick={onClose} className="absolute top-3 right-4 text-xl font-bold" style={{ color: "#aaa", background: "none", border: "none" }}>✕</button>

        {verificando ? (
          <div className="text-center py-10">
            <p className="text-2xl mb-3">🔍</p>
            <p className="text-sm font-semibold" style={{ color: "#888" }}>Verificando disponibilidad...</p>
          </div>
        ) : !esReagenda ? (
          /* ── Slot original disponible: restaurar directo ── */
          <>
            <h3 className="font-script text-xl font-bold mb-1" style={{ color: "#10b981" }}>Restaurar cita</h3>
            <p className="text-xs mb-4" style={{ color: "#888" }}>{reserva.cliente_nombre} · {reserva.servicio_nombre}</p>
            <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: "#f0fdf4", border: "1px solid #10b98133" }}>
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#10b981" }}>Fecha original disponible</p>
                <p className="text-xs" style={{ color: "#666" }}>{formatFecha(reserva.fecha)} · {reserva.hora}</p>
              </div>
            </div>
            <div className="mb-4 p-3 rounded-xl" style={{ background: "#f8faff", border: "1px solid var(--c-border-soft)" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" style={{ color: "#6366f1" }}>Notificar restauración al cliente</p>
                <button onClick={() => setEnviarWA(v => !v)} className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: enviarWA ? "#6366f1" : "var(--c-border-soft)", color: enviarWA ? "white" : "#888" }}>
                  {enviarWA ? "✓ Activado" : "Desactivado"}
                </button>
              </div>
              {enviarWA && <pre className="whitespace-pre-wrap font-sans text-xs" style={{ color: "#555" }}>{mensajeRestaurar}</pre>}
            </div>
            {msg && <p className="text-xs mb-3 text-center" style={{ color: "#ef4444" }}>{msg}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-full text-xs font-bold" style={{ background: "var(--c-border-soft)", color: "#666" }}>Cancelar</button>
              <button onClick={confirmar} disabled={procesando} className="flex-1 py-2 rounded-full text-xs font-bold" style={{ background: "#10b981", color: "white" }}>
                {procesando ? "Procesando..." : enviarWA ? "✓ Restaurar + Notificar" : "✓ Restaurar"}
              </button>
            </div>
          </>
        ) : (
          /* ── Necesita reagendar: tabs Consultar / Fijar ── */
          <>
            <h3 className="font-script text-xl font-bold mb-1" style={{ color: "#f59e0b" }}>Reagendar cita</h3>
            <p className="text-xs mb-3" style={{ color: "#888" }}>{reserva.cliente_nombre} · {reserva.servicio_nombre}</p>

            <div className="mb-4 p-3 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #f59e0b55" }}>
              <p className="text-xs font-semibold" style={{ color: "#92400e" }}>
                {fechaOriginalPasada
                  ? `⚠️ La fecha original (${formatFecha(reserva.fecha)}) ya pasó.`
                  : `⚠️ El horario original (${formatFecha(reserva.fecha)} · ${reserva.hora}) ya no está disponible.`}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--c-border-soft)" }}>
              {(["consultar", "fijar"] as const).map(t => (
                <button key={t} onClick={() => setModo(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: modo === t ? "white" : "transparent", color: modo === t ? "var(--c-primary)" : "#888",
                    boxShadow: modo === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                  {t === "consultar" ? "💬 Consultar al cliente" : "📅 Fijar fecha"}
                </button>
              ))}
            </div>

            {modo === "consultar" ? (
              <>
                <p className="text-xs mb-3" style={{ color: "#666" }}>
                  Le enviamos los horarios disponibles para que elija el que le convenga.
                  La cita permanece cancelada hasta que confirme.
                </p>
                {buscando ? (
                  <div className="text-center py-4">
                    <p className="text-sm" style={{ color: "#888" }}>🔍 Buscando horarios disponibles...</p>
                  </div>
                ) : sugerencias.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: "#ef4444" }}>Sin horarios disponibles en los próximos 14 días.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-semibold" style={{ color: "#888" }}>Horarios a ofrecer:</p>
                    {sugerencias.map((s, i) => (
                      <label key={i} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer"
                        style={{ background: seleccionadas.has(i) ? "#f0fdf4" : "var(--c-border-soft)",
                          border: `1px solid ${seleccionadas.has(i) ? "#10b98144" : "transparent"}` }}>
                        <input type="checkbox" checked={seleccionadas.has(i)}
                          onChange={() => setSeleccionadas(prev => {
                            const next = new Set(prev);
                            next.has(i) ? next.delete(i) : next.add(i);
                            return next;
                          })} />
                        <span className="text-sm font-semibold" style={{ color: seleccionadas.has(i) ? "#10b981" : "#666" }}>
                          📅 {formatSugerencia(s.fecha)} · {s.hora}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {slotsSeleccionados.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #10b98122" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#10b981" }}>Vista previa del mensaje:</p>
                    <pre className="whitespace-pre-wrap font-sans text-xs" style={{ color: "#555" }}>{mensajeConsultar}</pre>
                  </div>
                )}
                {msg && <p className="text-xs mb-3 text-center" style={{ color: "#ef4444" }}>{msg}</p>}
                <div className="flex gap-2">
                  <button onClick={onClose} className="flex-1 py-2 rounded-full text-xs font-bold" style={{ background: "var(--c-border-soft)", color: "#666" }}>Cancelar</button>
                  <button onClick={confirmar} disabled={buscando || slotsSeleccionados.length === 0}
                    className="flex-1 py-2 rounded-full text-xs font-bold"
                    style={{ background: "#25d366", color: "white", opacity: slotsSeleccionados.length === 0 ? 0.5 : 1 }}>
                    📲 Enviar opciones al cliente
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nueva fecha</label>
                    <input type="date" value={nuevaFecha} min={hoyISO}
                      onChange={e => { setNuevaFecha(e.target.value); cargarHoras(e.target.value); }}
                      className="text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>
                      Hora disponible {cargandoHoras ? "— cargando..." : `(${horasDisponibles.length} opciones)`}
                    </label>
                    {horasDisponibles.length > 0 ? (
                      <select value={nuevaHora} onChange={e => setNuevaHora(e.target.value)}
                        className="text-sm w-full px-3 py-2 rounded-xl"
                        style={{ border: "1.5px solid var(--c-border-soft)", background: "var(--c-primary-bg)", color: "var(--c-primary)" }}>
                        {horasDisponibles.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    ) : (
                      <p className="text-xs py-2 text-center" style={{ color: "#ef4444" }}>Sin horarios disponibles para esta fecha. Elige otra.</p>
                    )}
                  </div>
                </div>
                <div className="mb-4 p-3 rounded-xl" style={{ background: "#f8faff", border: "1px solid var(--c-border-soft)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold" style={{ color: "#6366f1" }}>Notificar al cliente</p>
                    <button onClick={() => setEnviarWA(v => !v)} className="text-xs px-3 py-1 rounded-full font-semibold"
                      style={{ background: enviarWA ? "#6366f1" : "var(--c-border-soft)", color: enviarWA ? "white" : "#888" }}>
                      {enviarWA ? "✓ Activado" : "Desactivado"}
                    </button>
                  </div>
                  {enviarWA && nuevaHora && <pre className="whitespace-pre-wrap font-sans text-xs" style={{ color: "#555" }}>{mensajeReagendar}</pre>}
                </div>
                {msg && <p className="text-xs mb-3 text-center" style={{ color: "#ef4444" }}>{msg}</p>}
                <div className="flex gap-2">
                  <button onClick={onClose} className="flex-1 py-2 rounded-full text-xs font-bold" style={{ background: "var(--c-border-soft)", color: "#666" }}>Cancelar</button>
                  <button onClick={confirmar} disabled={procesando || !nuevaHora}
                    className="flex-1 py-2 rounded-full text-xs font-bold"
                    style={{ background: "#f59e0b", color: "white", opacity: !nuevaHora ? 0.5 : 1 }}>
                    {procesando ? "Procesando..." : enviarWA ? "📅 Reagendar + Notificar" : "📅 Reagendar"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*              TAB COMPLETADAS                        */
/* ═══════════════════════════════════════════════════ */

function TabCompletadas({ reservas, token, perm, esRoot, onRefresh, waEnviados, onWaEnviado }: {
  reservas: Reserva[]; token: string; perm: PermCompletadas; esRoot: boolean;
  onRefresh: () => void; waEnviados: Set<string>; onWaEnviado: (id: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const completadas = reservas.filter(r => r.estado === "completada");
  const filtradas = busqueda
    ? completadas.filter(r => r.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) || r.servicio_nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : completadas;

  if (completadas.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-2">✅</p>
        <p className="text-sm" style={{ color: "#888" }}>No hay citas completadas aún</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="section-title">✅ Citas completadas ({completadas.length})</h2>
        {perm.descargarPDFMasivo && (
          <button onClick={() => descargarPDFMasivo(filtradas)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "#6366f111", color: "#6366f1", border: "1px solid #6366f155" }}>
            📄 Exportar PDF
          </button>
        )}
      </div>
      <div className="mb-4">
        <input type="text" placeholder="Buscar cliente o servicio..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} className="text-sm" />
      </div>
      <div className="space-y-3">
        {filtradas.map(r => {
          const saldoCobrado = r.pago_saldo ?? (r.precio - r.anticipo);
          const [, mm, dd] = r.fecha.split("-");
          const fechaFmt = `${dd}/${mm}/${r.fecha.split("-")[0]}`;
          const yaEnvioWA = waEnviados.has(r.id);
          const puedeReenviar = perm.reenviarWhatsApp && (perm.multipleReenvio || !yaEnvioWA);
          return (
            <TarjetaCompletada key={r.id} r={r} token={token} perm={perm} esRoot={esRoot}
              fechaFmt={fechaFmt} saldoCobrado={saldoCobrado} puedeReenviar={puedeReenviar}
              waEnviados={waEnviados} onWaEnviado={onWaEnviado} onRefresh={onRefresh} />
          );
        })}
        {filtradas.length === 0 && <p className="text-sm text-center py-6" style={{ color: "#bbb" }}>Sin resultados</p>}
      </div>
    </div>
  );
}

function TarjetaCompletada({ r, token, perm, esRoot, fechaFmt, saldoCobrado, puedeReenviar, waEnviados, onWaEnviado, onRefresh }: {
  r: Reserva; token: string; perm: PermCompletadas; esRoot: boolean;
  fechaFmt: string; saldoCobrado: number; puedeReenviar: boolean;
  waEnviados: Set<string>; onWaEnviado: (id: string) => void; onRefresh: () => void;
}) {
  const [enviandoWA, setEnviandoWA] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);

  function enviarGracias() {
    const mensajeGracias =
      `💅 *Leila Studio Nails Beauty*\n\n✨ *¡Gracias por visitarnos, ${r.cliente_nombre}!* ✨\n\n` +
      `Fue un placer atenderte hoy con tu *${r.servicio_nombre}*.\n\n` +
      `Esperamos que hayas quedado encantada con el resultado 🌸\n\n` +
      `📲 Cuando quieras repetir, reserva aquí:\nhttps://leila-studio.vercel.app/reservar\n\n` +
      `*¡Te esperamos pronto!* 💖`;
    const telefono = r.cliente_telefono.replace(/\D/g, "");
    const phone = telefono.startsWith("57") ? telefono : `57${telefono}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensajeGracias)}`, "_blank");
    onWaEnviado(r.id);
  }

  return (
    <div className="card-elegant p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-bold">{r.cliente_nombre}</p>
          <p className="text-xs" style={{ color: "#888" }}>📱 {r.cliente_telefono}</p>
        </div>
        <div className="flex gap-1.5">
          {perm.descargarPDF && (
            <button onClick={() => descargarPDFReserva(r)} title="PDF"
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#6366f111", color: "#6366f1", border: "1px solid #6366f155" }}>📄</button>
          )}
          {puedeReenviar && (
            <button onClick={enviarGracias} disabled={enviandoWA} title="Reenviar WA"
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#25d36611", color: "#25d366", border: "1px solid #25d36655" }}>
              {enviandoWA ? "…" : "✉"}
            </button>
          )}
          {(perm.eliminar || esRoot) && (
            <button onClick={() => setModalEliminar(true)} title="Eliminar (PIN)"
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#ef444411", color: "#ef4444", border: "1px solid #ef444455" }}>🗑</button>
          )}
        </div>
      </div>
      <div className="text-sm space-y-1">
        <p>💅 <span className="font-semibold">{r.servicio_nombre}</span></p>
        <p>📅 {fechaFmt} · {r.hora}</p>
        {r.trabajador_nombre && <p>👩 <span className="font-semibold" style={{ color: "var(--c-primary)" }}>{r.trabajador_nombre}</span></p>}
        <div className="flex flex-wrap gap-3 mt-2 pt-2" style={{ borderTop: "1px solid var(--c-border-soft)" }}>
          <span className="text-xs">Total: <b style={{ color: "var(--c-primary)" }}>${r.precio.toLocaleString("es-CO")}</b></span>
          <span className="text-xs">Anticipo: <b style={{ color: "#10b981" }}>${r.anticipo.toLocaleString("es-CO")}</b></span>
          <span className="text-xs">Cobrado: <b style={{ color: "#6366f1" }}>${saldoCobrado.toLocaleString("es-CO")}</b></span>
        </div>
      </div>
      {modalEliminar && (
        <ModalEliminarConPin token={token}
          onClose={() => setModalEliminar(false)}
          onEliminado={async () => {
            await fetch(`/api/reservas/${r.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            setModalEliminar(false);
            onRefresh();
          }} />
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

function TabServicios({ token, perm }: { token: string; perm: Permisos["servicios"] }) {
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

      <div className={`grid grid-cols-1 ${perm.crear || editandoId ? "lg:grid-cols-2" : ""} gap-5 items-start`}>

      {/* Formulario crear / editar */}
      {(perm.crear || editandoId) && <div className="card-elegant p-4" style={editandoId ? { border: "1.5px solid var(--c-primary)" } : {}}>
        <p className="text-sm font-semibold mb-4" style={{ color: "var(--c-primary)" }}>
          {editandoId ? "✏️ Editar servicio" : "+ Nuevo servicio"}
        </p>

        {/* Nombre */}
        <div className="mb-3">
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nombre del servicio</label>
          <input
            type="text"
            placeholder="Ej: Manicura Tradicional"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: toTitleCase(e.target.value) })}
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
                    ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
                    : { background: "var(--c-border-soft)", color: "#888" }
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
              type="text"
              inputMode="numeric"
              placeholder="35000"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: soloNumeros(e.target.value) })}
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
              style={{ background: "var(--c-border-soft)", color: "#888" }}
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
      </div>}

      {/* Lista de servicios agrupados por categoría */}
      <div>
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
                <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "var(--c-primary)" }}>
                  {cat.emoji} {cat.label}
                </p>
                <div className="space-y-2">
                  {lista.map((s) => (
                    <div key={s.id} className="card-elegant p-3"
                      style={editandoId === s.id ? { border: "1.5px solid var(--c-primary)", background: "#fffdf5" } : {}}>
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
                              style={{ background: "var(--c-border-soft)", color: "#888" }}>
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
                            {perm.editar && <button onClick={() => iniciarEdicion(s)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                              style={{ background: "var(--c-primary-bg)", border: "1px solid var(--c-primary-light)", color: "var(--c-primary)" }}>
                              ✏️
                            </button>}
                            {perm.eliminar && <button onClick={() => setConfirmandoBorrar(s.id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                              style={{ background: "#ef444422", border: "1px solid #ef4444", color: "#ef4444" }}>
                              🗑
                            </button>}
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

      </div>{/* fin grid */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

      {/* Formulario */}
      <div className="card-elegant p-4">
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--c-primary)" }}>Selecciona la fecha</p>
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
                  ? { background: "var(--c-primary-bg)", border: `1.5px solid ${tipoColors[t]}` }
                  : { background: "#fafafa", border: "1px solid var(--c-border-soft)" }
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
            onChange={(e) => setMotivo(toTitleCase(e.target.value))}
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

      {/* Lista de bloqueos */}
      <div>
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
                <button onClick={() => desbloquear(b.fecha)}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                  style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b981" }}>
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )}
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
                  <button onClick={() => desbloquear(b.fecha)}
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

      </div>{/* fin grid */}
    </div>
  );
}

function TablaClientes({ reservas, perm }: { reservas: Reserva[]; perm: Permisos["clientes"] }) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {lista.map((c) => (
          <div key={c.telefono} className="card-elegant p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{c.nombre}</p>
                <p className="text-sm" style={{ color: "#888" }}>📱 {c.telefono}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>
                  {c.citas.length} cita{c.citas.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs" style={{ color: "#888" }}>Total: {formatPrecio(c.total)}</p>
              </div>
            </div>
            {perm.historial && (
              <div className="mt-3 space-y-1">
                {c.citas.slice(-3).map((ci) => (
                  <p key={ci.id} className="text-xs" style={{ color: "#aaa" }}>
                    • {formatFecha(ci.fecha)} — {ci.servicio_nombre}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                TAB TRABAJADORES                     */
/* ═══════════════════════════════════════════════════ */

type Trabajador = { id: string; nombre: string; especialidad: string; areas: string[]; activo: boolean; porcentaje?: number };
type BloqueoT = { id: string; fecha: string; tipo: string; motivo: string };
type VistaT = "lista" | "agenda";

function TabTrabajadores({ token, perm }: { token: string; perm: Permisos["trabajadores"] }) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [vistaT, setVistaT] = useState<VistaT>("lista");
  const [trabajadorAgenda, setTrabajadorAgenda] = useState<Trabajador | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoBorrar, setConfirmandoBorrar] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [porcentaje, setPorcentaje] = useState<number>(0);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const res = await fetch("/api/admin/trabajadores", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setTrabajadores(Array.isArray(data) ? data : []);
  }

  function iniciarEdicion(t: Trabajador) {
    setEditandoId(t.id); setNombre(t.nombre); setEspecialidad(t.especialidad); setAreas(t.areas || []); setPorcentaje(t.porcentaje ?? 0); setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelar() { setEditandoId(null); setNombre(""); setEspecialidad(""); setAreas([]); setPorcentaje(0); setMsg(null); }

  function toggleArea(id: string) {
    setAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  }

  async function guardar() {
    if (!nombre.trim()) return setMsg({ ok: false, texto: "El nombre es requerido" });
    setCargando(true); setMsg(null);
    const body = { nombre, especialidad, areas, porcentaje };
    const url = editandoId ? `/api/admin/trabajadores/${editandoId}` : "/api/admin/trabajadores";
    const method = editandoId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    setCargando(false);
    if (res.ok) { setMsg({ ok: true, texto: editandoId ? "Actualizado ✓" : "Trabajador creado ✓" }); cancelar(); cargar(); }
    else { const d = await res.json(); setMsg({ ok: false, texto: d.error || "Error al guardar" }); }
  }

  async function borrar(id: string) {
    await fetch(`/api/admin/trabajadores/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setConfirmandoBorrar(null); if (editandoId === id) cancelar(); cargar();
  }

  async function toggleActivo(t: Trabajador) {
    await fetch(`/api/admin/trabajadores/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nombre: t.nombre, especialidad: t.especialidad, areas: t.areas, porcentaje: t.porcentaje ?? 0, activo: !t.activo }),
    });
    cargar();
  }

  if (vistaT === "agenda" && trabajadorAgenda) {
    return <AgendaTrabajador token={token} trabajador={trabajadorAgenda} onVolver={() => { setVistaT("lista"); setTrabajadorAgenda(null); }} />;
  }

  return (
    <div>
      <h2 className="section-title mb-1">{"👥 Trabajadores"}</h2>
      <p className="text-xs mb-4" style={{ color: "#888" }}>{"Máximo 10. Cada trabajador tiene su propia agenda y áreas de atención."}</p>

      <div className={`grid grid-cols-1 ${perm.crear || editandoId ? "lg:grid-cols-2" : ""} gap-5 items-start`}>

      {(perm.crear || editandoId) && <div className="card-elegant p-4" style={editandoId ? { border: "1.5px solid var(--c-primary)" } : {}}>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--c-primary)" }}>{editandoId ? "✏️ Editar trabajador" : "+ Nuevo trabajador"}</p>
        <div className="mb-3">
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nombre</label>
          <input type="text" placeholder="Ej: María García" value={nombre} onChange={e => setNombre(toTitleCase(e.target.value))} />
        </div>
        <div className="mb-3">
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Especialidad (opcional)</label>
          <input type="text" placeholder="Ej: Manicura Y Pedicura" value={especialidad} onChange={e => setEspecialidad(toTitleCase(e.target.value))} />
        </div>
        <div className="mb-3">
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Porcentaje de comisión (%)</label>
          <div className="flex items-center gap-3">
            <input type="text" inputMode="numeric" placeholder="Ej: 40" value={porcentaje || ""} onChange={e => { const n = Math.min(100, Number(soloNumeros(e.target.value))); setPorcentaje(n); }} style={{ maxWidth: "120px" }} />
            <span className="text-sm font-bold" style={{ color: "var(--c-primary)" }}>{porcentaje > 0 ? `${porcentaje}% de cada servicio` : "Sin comisión"}</span>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>Áreas que atiende</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map(cat => {
              const sel = areas.includes(cat.id);
              return (
                <button key={cat.id} type="button" onClick={() => toggleArea(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
                  style={sel
                    ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white", border: "1.5px solid var(--c-primary)" }
                    : { background: "#fafafa", color: "#888", border: "1.5px solid var(--c-border-soft)" }}>
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  {sel && <span style={{ fontSize: "10px" }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={guardar} disabled={cargando} className="btn-gold flex-1">
            {cargando ? "Guardando..." : editandoId ? "Guardar cambios" : "+ Agregar"}
          </button>
          {editandoId && <button onClick={cancelar} className="py-2 px-4 rounded-full text-sm font-semibold" style={{ background: "var(--c-border-soft)", color: "#888" }}>Cancelar</button>}
        </div>
        {msg && <p className="text-xs mt-3 text-center font-semibold" style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>{msg.texto}</p>}
      </div>}
      {/* Lista de trabajadores */}
      <div>
        {trabajadores.length === 0 ? (
          <div className="text-center py-8"><p className="text-2xl mb-2">{"👥"}</p><p className="text-sm" style={{ color: "#888" }}>No hay trabajadores aún</p></div>
        ) : (
          <div className="space-y-3">
            {trabajadores.map(t => (
              <div key={t.id} className="card-elegant p-4 transition-all"
                style={editandoId === t.id
                  ? { border: "1.5px solid var(--c-primary)" }
                  : !t.activo
                  ? { border: "1.5px solid #d1d5db", background: "#f9fafb", opacity: 0.85 }
                  : {}}>
                {confirmandoBorrar === t.id ? (
                  <div className="text-center">
                    <p className="text-xs font-semibold mb-2" style={{ color: "#ef4444" }}>¿Eliminar a {t.nombre}?</p>
                    <div className="flex gap-2">
                      <button onClick={() => borrar(t.id)} className="flex-1 py-1.5 rounded-full text-xs font-bold" style={{ background: "#ef4444", color: "white" }}>Sí, eliminar</button>
                      <button onClick={() => setConfirmandoBorrar(null)} className="flex-1 py-1.5 rounded-full text-xs font-bold" style={{ background: "var(--c-border-soft)", color: "#888" }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold" style={{ color: t.activo ? undefined : "#9ca3af" }}>{"👩"} {t.nombre}</p>
                        {t.especialidad && <p className="text-xs mt-0.5" style={{ color: "#888" }}>{t.especialidad}</p>}
                        {(t.porcentaje ?? 0) > 0 && <p className="text-xs mt-0.5 font-semibold" style={{ color: "var(--c-primary)" }}>💰 {t.porcentaje}% comisión</p>}
                      </div>
                      <div className="flex gap-1">
                        {perm.editar && <button onClick={() => iniciarEdicion(t)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "var(--c-primary-bg)", border: "1px solid var(--c-primary-light)", color: "var(--c-primary)" }}>{"✏️"}</button>}
                        {perm.eliminar && <button onClick={() => setConfirmandoBorrar(t.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "#ef444422", border: "1px solid #ef4444", color: "#ef4444" }}>{"🗑"}</button>}
                      </div>
                    </div>
                    {t.areas?.length > 0 && (
                      <p className="text-lg mb-2">{t.areas.map(a => CATEGORIAS.find(c => c.id === a)?.emoji).filter(Boolean).join(" ")}</p>
                    )}
                    {/* Estado + toggle */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={t.activo
                          ? { background: "#d1fae5", color: "#059669" }
                          : { background: "#fee2e2", color: "#dc2626" }}>
                        {t.activo ? "● ACTIVO" : "⛔ INACTIVO"}
                      </span>
                      {perm.toggleActivo && (
                        <button onClick={() => toggleActivo(t)}
                          className="text-[11px] font-semibold px-3 py-0.5 rounded-full transition-all"
                          style={t.activo
                            ? { background: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db" }
                            : { background: "#d1fae5", color: "#059669", border: "1px solid #6ee7b7" }}>
                          {t.activo ? "👁️ Deshabilitar" : "👁️ Habilitar"}
                        </button>
                      )}
                    </div>
                    {perm.verAgenda && (
                      <button onClick={() => { setTrabajadorAgenda(t); setVistaT("agenda"); }}
                        className="w-full py-2 rounded-full text-xs font-semibold"
                        style={{ background: "var(--c-primary-bg)", border: "1px solid var(--c-primary-light)", color: "var(--c-primary)" }}>
                        {"📅 Ver agenda"}
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      </div>{/* fin grid */}
    </div>
  );
}

function AgendaTrabajador({ token, trabajador, onVolver }: { token: string; trabajador: Trabajador; onVolver: () => void }) {
  const [bloqueos, setBloqueos] = useState<BloqueoT[]>([]);
  const [fechaSel, setFechaSel] = useState("");
  const [tipo, setTipo] = useState<"todo" | "manana" | "tarde">("todo");
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const res = await fetch(`/api/admin/trabajadores/${trabajador.id}/bloqueos`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setBloqueos(Array.isArray(data) ? data : []);
  }

  async function bloquear() {
    if (!fechaSel) return setMsg({ ok: false, texto: "Selecciona una fecha" });
    setCargando(true); setMsg(null);
    const res = await fetch(`/api/admin/trabajadores/${trabajador.id}/bloqueos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fecha: fechaSel, tipo, motivo }),
    });
    setCargando(false);
    if (res.ok) { setMsg({ ok: true, texto: "Bloqueado ✓" }); setFechaSel(""); setMotivo(""); cargar(); }
    else { const d = await res.json(); setMsg({ ok: false, texto: d.error || "Error" }); }
  }

  async function desbloquear(fecha: string) {
    await fetch(`/api/admin/trabajadores/${trabajador.id}/bloqueos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fecha }),
    });
    cargar();
  }

  const tipoLabels: Record<string, string> = { todo: "🔴 Todo el día", manana: "🌅 Solo mañana (7am-12pm)", tarde: "🌆 Solo tarde (2pm-7pm)" };
  const tipoColors: Record<string, string> = { todo: "#ef4444", manana: "#f59e0b", tarde: "#6366f1" };
  const futuros = bloqueos.filter(b => b.fecha >= today);
  const pasados = bloqueos.filter(b => b.fecha < today);

  return (
    <div>
      <button onClick={onVolver} className="text-sm mb-4 flex items-center gap-1" style={{ color: "var(--c-primary)" }}>{"← Volver"}</button>
      <h2 className="section-title mb-1">{"📅"} Agenda de {trabajador.nombre}</h2>
      <p className="text-xs mb-4" style={{ color: "#888" }}>Bloquea días en los que esta persona no puede atender.</p>
      <div className="card-elegant p-4 mb-5">
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--c-primary)" }}>Bloquear un día</p>
        <input type="date" min={today} value={fechaSel} onChange={e => { setFechaSel(e.target.value); setMsg(null); }} className="mb-4" />
        <p className="text-sm font-semibold mb-2" style={{ color: "#888" }}>Tipo de bloqueo</p>
        <div className="space-y-2 mb-4">
          {(["todo", "manana", "tarde"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className="w-full text-left p-3 rounded-xl font-semibold text-sm transition-all"
              style={tipo === t
                ? { background: tipoColors[t] + "18", border: `1.5px solid ${tipoColors[t]}`, color: tipoColors[t] }
                : { background: "#fafafa", border: "1px solid var(--c-border-soft)", color: "#555" }}>
              {tipoLabels[t]}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Motivo (opcional)</label>
          <input type="text" placeholder="Ej: no asistió, cita médica..." value={motivo} onChange={e => setMotivo(toTitleCase(e.target.value))} />
        </div>
        <button onClick={bloquear} disabled={cargando || !fechaSel} className="btn-gold w-full" style={!fechaSel ? { opacity: 0.5 } : {}}>
          {cargando ? "Bloqueando..." : "⛔ Bloquear"}
        </button>
        {msg && <p className="text-xs mt-3 text-center font-semibold" style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>{msg.texto}</p>}
      </div>
      <p className="text-sm font-semibold mb-2" style={{ color: "#555" }}>Próximos bloqueos ({futuros.length})</p>
      {futuros.length === 0 ? (
        <div className="text-center py-5 rounded-xl mb-4" style={{ background: "#f0fff4", border: "1px dashed #10b981" }}>
          <p className="text-sm" style={{ color: "#10b981" }}>{"✅ Sin bloqueos próximos"}</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {futuros.map(b => (
            <div key={b.fecha} className="card-elegant p-3 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">{formatFecha(b.fecha)}</p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: tipoColors[b.tipo] }}>{tipoLabels[b.tipo]}</p>
                {b.motivo && <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>{b.motivo}</p>}
              </div>
              <button onClick={() => desbloquear(b.fecha)} className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                style={{ background: "#10b98122", color: "#10b981", border: "1px solid #10b981" }}>Quitar</button>
            </div>
          ))}
        </div>
      )}
      {pasados.length > 0 && (
        <>
          <p className="text-xs font-semibold mb-2" style={{ color: "#bbb" }}>Historial</p>
          <div className="space-y-2">
            {pasados.slice(-5).reverse().map(b => (
              <div key={b.fecha} className="card-elegant p-3 flex justify-between items-center" style={{ opacity: 0.5 }}>
                <div>
                  <p className="font-bold text-sm">{formatFecha(b.fecha)}</p>
                  <p className="text-xs mt-0.5" style={{ color: tipoColors[b.tipo] }}>{tipoLabels[b.tipo]}</p>
                  {b.motivo && <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>{b.motivo}</p>}
                </div>
                <button onClick={() => desbloquear(b.fecha)} className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
                  style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef4444" }}>Borrar</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                  TAB GANANCIAS                      */
/* ═══════════════════════════════════════════════════ */

type PeriodoG = "todo" | "hoy" | "semana" | "quincena" | "mes" | "personalizado";

/* ═══════════════════════════════════════════════════ */
/*                   TAB INFORMES                      */
/* ═══════════════════════════════════════════════════ */

type PeriodoI = "todo" | "hoy" | "semana" | "quincena" | "mes" | "personalizado";

function TabInformes({ reservas, token, perm }: { reservas: Reserva[]; token: string; perm: Permisos["informes"] }) {
  const [periodo, setPeriodo] = useState<PeriodoI>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [trabajadores, setTrabajadores] = useState<{ id: string; nombre: string; porcentaje: number }[]>([]);

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  useEffect(() => {
    fetch("/api/admin/trabajadores", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTrabajadores(Array.isArray(d) ? d.map((t: { id: string; nombre: string; porcentaje?: number }) => ({ id: t.id, nombre: t.nombre, porcentaje: t.porcentaje ?? 0 })) : [])).catch(() => {});
  }, [token]);

  function inPeriod(r: Reserva): boolean {
    const f = r.fecha;
    if (periodo === "todo") return true;
    if (periodo === "hoy") return f === hoy;
    if (periodo === "personalizado") return (!desde || f >= desde) && (!hasta || f <= hasta);
    const d = new Date(hoy);
    if (periodo === "semana") { d.setDate(d.getDate() - 6); return f >= d.toLocaleDateString("en-CA"); }
    if (periodo === "quincena") { d.setDate(d.getDate() - 14); return f >= d.toLocaleDateString("en-CA"); }
    if (periodo === "mes") { d.setDate(d.getDate() - 29); return f >= d.toLocaleDateString("en-CA"); }
    return true;
  }

  const enPeriod = reservas.filter(inPeriod);
  const completadas = enPeriod.filter(r => r.estado === "completada");
  const pendientes = enPeriod.filter(r => r.estado === "pendiente");
  const confirmadas = enPeriod.filter(r => r.estado === "confirmada");
  const canceladas = enPeriod.filter(r => r.estado === "cancelada");
  const enProceso = enPeriod.filter(r => r.estado === "en_proceso");
  const totalCitas = enPeriod.length;
  const ingresosTotales = completadas.reduce((s, r) => s + r.precio, 0);
  const anticiposRecibidos = completadas.reduce((s, r) => s + r.anticipo, 0);

  const porTrabajadora = trabajadores.map(t => {
    const citas = completadas.filter(r => r.trabajador_id === t.id);
    const ingresos = citas.reduce((s, r) => s + r.precio, 0);
    const comision = Math.round(ingresos * (t.porcentaje / 100));
    return { ...t, citas: citas.length, ingresos, comision, neto: ingresos - comision };
  }).filter(t => t.citas > 0).sort((a, b) => b.ingresos - a.ingresos);
  const totalComisiones = porTrabajadora.reduce((s, t) => s + t.comision, 0);
  const gananciaNeta = ingresosTotales - totalComisiones;

  const serviciosMap: Record<string, { veces: number; ingresos: number }> = {};
  completadas.forEach(r => {
    if (!serviciosMap[r.servicio_nombre]) serviciosMap[r.servicio_nombre] = { veces: 0, ingresos: 0 };
    serviciosMap[r.servicio_nombre].veces++;
    serviciosMap[r.servicio_nombre].ingresos += r.precio;
  });
  const topServicios = Object.entries(serviciosMap).map(([n, v]) => ({ nombre: n, ...v })).sort((a, b) => b.veces - a.veces).slice(0, 5);

  const clientesMap: Record<string, { nombre: string; telefono: string; citas: number; total: number }> = {};
  completadas.forEach(r => {
    if (!clientesMap[r.cliente_telefono]) clientesMap[r.cliente_telefono] = { nombre: r.cliente_nombre, telefono: r.cliente_telefono, citas: 0, total: 0 };
    clientesMap[r.cliente_telefono].citas++;
    clientesMap[r.cliente_telefono].total += r.precio;
  });
  const topClientes = Object.values(clientesMap).sort((a, b) => b.citas - a.citas).slice(0, 5);

  const diasNombre = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const diasMap: Record<string, { citas: number; ingresos: number }> = {};
  completadas.forEach(r => {
    const dia = diasNombre[new Date(r.fecha + "T12:00:00").getDay()];
    if (!diasMap[dia]) diasMap[dia] = { citas: 0, ingresos: 0 };
    diasMap[dia].citas++;
    diasMap[dia].ingresos += r.precio;
  });
  const topDias = Object.entries(diasMap).map(([d, v]) => ({ dia: d, ...v })).sort((a, b) => b.citas - a.citas);

  const etiqueta = { todo: "Todo el tiempo", hoy: "Hoy", semana: "Últimos 7 días", quincena: "Últimos 15 días", mes: "Últimos 30 días", personalizado: `${desde || "..."} → ${hasta || "..."}` }[periodo];

  function pct(n: number) { return totalCitas > 0 ? Math.round((n / totalCitas) * 100) : 0; }
  function fmt(n: number) { return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n); }

  function generarPDF() {
    const temaId = typeof window !== "undefined" ? (localStorage.getItem("tema_id") || "default") : "default";
    const { getTema: gt } = require("@/lib/temas") as typeof import("@/lib/temas");
    const t = gt(temaId);
    const c = t.vars;
    const fechaGen = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "long", year: "numeric" });

    const estadosRows = [
      { label: "✓ Completadas", n: completadas.length, ing: ingresosTotales, color: "#10b981" },
      { label: "⚡ En proceso", n: enProceso.length, ing: 0, color: c.secondary },
      { label: "✓ Confirmadas", n: confirmadas.length, ing: confirmadas.reduce((s,r)=>s+r.anticipo,0), color: "#6366f1" },
      { label: "⏳ Pendientes", n: pendientes.length, ing: pendientes.reduce((s,r)=>s+r.anticipo,0), color: "#f59e0b" },
      { label: "✗ Canceladas", n: canceladas.length, ing: 0, color: "#ef4444" },
    ].filter(e => e.n > 0);

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe Leila Studio</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#333;background:#fff;font-size:13px;}
  .page{max-width:800px;margin:0 auto;padding:32px;}
  /* HEADER */
  .header{background:linear-gradient(135deg,${c.primary},${c.primaryLight});padding:28px 32px;border-radius:16px;color:white;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;}
  .logo{font-size:38px;margin-bottom:4px;}
  .brand{font-size:26px;font-weight:800;letter-spacing:1px;}
  .sub{font-size:12px;opacity:.85;margin-top:4px;letter-spacing:2px;}
  .header-right{text-align:right;opacity:.9;}
  .header-right .periodo{font-size:15px;font-weight:700;}
  .header-right .fecha{font-size:11px;margin-top:4px;}
  /* SECCIÓN */
  .seccion{margin-bottom:24px;}
  .sec-title{font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${c.primary};margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ${c.primaryBg};}
  /* KPIs */
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px;}
  .kpis2{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
  .kpi{background:${c.primaryBg};border-radius:12px;padding:14px 10px;text-align:center;border:1px solid ${c.borderSoft};}
  .kpi .val{font-size:22px;font-weight:800;color:${c.primary};line-height:1;}
  .kpi .val.green{color:#10b981;} .kpi .val.pink{color:${c.secondary};}
  .kpi .lbl{font-size:10px;color:#888;margin-top:5px;font-weight:600;}
  /* TABLAS */
  table{width:100%;border-collapse:collapse;}
  th{background:${c.primaryBg};color:${c.primary};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:9px 12px;text-align:left;}
  td{padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;}
  tr:last-child td{border-bottom:none;}
  tr:hover td{background:#fafafa;}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;}
  .num{text-align:right;font-weight:700;}
  .pct{text-align:center;color:#888;}
  /* FOOTER */
  .footer{margin-top:32px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;}
  .footer .logo-sm{font-size:18px;}
  .footer p{font-size:10px;color:#bbb;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{padding:16px;}}
</style></head><body><div class="page">

<!-- HEADER -->
<div class="header">
  <div>
    <div class="logo">💅</div>
    <div class="brand">Leila Studio</div>
    <div class="sub">INFORME DE GESTIÓN</div>
  </div>
  <div class="header-right">
    <div class="periodo">${etiqueta}</div>
    <div class="fecha">Generado: ${fechaGen}</div>
    <div class="fecha" style="margin-top:8px;font-size:13px;font-weight:700;">Total citas analizadas: ${totalCitas}</div>
  </div>
</div>

<!-- RESUMEN EJECUTIVO -->
<div class="seccion">
  <div class="sec-title">Resumen Ejecutivo</div>
  <div class="kpis">
    <div class="kpi"><div class="val">${totalCitas}</div><div class="lbl">Total Citas</div></div>
    <div class="kpi"><div class="val">${completadas.length}</div><div class="lbl">Completadas</div></div>
    <div class="kpi"><div class="val">${confirmadas.length + pendientes.length}</div><div class="lbl">Activas</div></div>
    <div class="kpi"><div class="val">${canceladas.length}</div><div class="lbl">Canceladas</div></div>
  </div>
  <div class="kpis2">
    <div class="kpi"><div class="val">${fmt(ingresosTotales)}</div><div class="lbl">Ingresos Totales</div></div>
    <div class="kpi"><div class="val pink">${fmt(totalComisiones)}</div><div class="lbl">Total Comisiones</div></div>
    <div class="kpi"><div class="val green">${fmt(gananciaNeta)}</div><div class="lbl">Ganancia Neta</div></div>
  </div>
</div>

<!-- CITAS POR ESTADO -->
<div class="seccion">
  <div class="sec-title">Citas por Estado</div>
  <table>
    <thead><tr><th>Estado</th><th class="num">Cantidad</th><th class="pct">%</th><th class="num">Ingresos</th></tr></thead>
    <tbody>
      ${estadosRows.map(e => `<tr>
        <td><span class="badge" style="background:${e.color}22;color:${e.color}">${e.label}</span></td>
        <td class="num">${e.n}</td>
        <td class="pct">${pct(e.n)}%</td>
        <td class="num">${e.ing > 0 ? fmt(e.ing) : "—"}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>

<!-- DETALLE POR TRABAJADORA -->
${porTrabajadora.length > 0 ? `<div class="seccion">
  <div class="sec-title">Detalle por Trabajadora</div>
  <table>
    <thead><tr><th>Trabajadora</th><th class="num">Citas</th><th class="num">Ingresos</th><th class="num">Comisión</th><th class="num">Neto</th></tr></thead>
    <tbody>
      ${porTrabajadora.map(t => `<tr>
        <td><strong>👩 ${t.nombre}</strong><br><span style="color:#aaa;font-size:10px">${t.porcentaje}% comisión</span></td>
        <td class="num">${t.citas}</td>
        <td class="num">${fmt(t.ingresos)}</td>
        <td class="num" style="color:${c.secondary}">${fmt(t.comision)}</td>
        <td class="num" style="color:#10b981"><strong>${fmt(t.neto)}</strong></td>
      </tr>`).join("")}
      <tr style="background:${c.primaryBg};font-weight:700">
        <td>TOTAL</td><td class="num">${completadas.length}</td>
        <td class="num">${fmt(ingresosTotales)}</td>
        <td class="num" style="color:${c.secondary}">${fmt(totalComisiones)}</td>
        <td class="num" style="color:#10b981">${fmt(gananciaNeta)}</td>
      </tr>
    </tbody>
  </table>
</div>` : ""}

<!-- SERVICIOS MÁS SOLICITADOS -->
${topServicios.length > 0 ? `<div class="seccion">
  <div class="sec-title">Servicios Más Solicitados</div>
  <table>
    <thead><tr><th>Servicio</th><th class="num">Veces</th><th class="pct">%</th><th class="num">Ingresos</th></tr></thead>
    <tbody>
      ${topServicios.map((s, i) => `<tr>
        <td>${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "•"} ${s.nombre}</td>
        <td class="num">${s.veces}</td>
        <td class="pct">${completadas.length > 0 ? Math.round((s.veces/completadas.length)*100) : 0}%</td>
        <td class="num">${fmt(s.ingresos)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

<!-- CLIENTES FRECUENTES -->
${topClientes.length > 0 ? `<div class="seccion">
  <div class="sec-title">Clientes Frecuentes — Top ${topClientes.length}</div>
  <table>
    <thead><tr><th>#</th><th>Cliente</th><th>Teléfono</th><th class="num">Citas</th><th class="num">Total Gastado</th></tr></thead>
    <tbody>
      ${topClientes.map((cl, i) => `<tr>
        <td style="color:${c.primary};font-weight:800">${i + 1}</td>
        <td><strong>${cl.nombre}</strong></td>
        <td style="color:#888">${cl.telefono}</td>
        <td class="num">${cl.citas}</td>
        <td class="num" style="color:${c.primary};font-weight:700">${fmt(cl.total)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

<!-- DÍAS CON MÁS ACTIVIDAD -->
${topDias.length > 0 ? `<div class="seccion">
  <div class="sec-title">Días con Más Actividad</div>
  <table>
    <thead><tr><th>Día</th><th class="num">Citas</th><th class="pct">%</th><th class="num">Ingresos</th></tr></thead>
    <tbody>
      ${topDias.map(d => `<tr>
        <td><strong>${d.dia}</strong></td>
        <td class="num">${d.citas}</td>
        <td class="pct">${Math.round((d.citas/completadas.length)*100)}%</td>
        <td class="num">${fmt(d.ingresos)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

<!-- FOOTER -->
<div class="footer">
  <div style="display:flex;align-items:center;gap:8px">
    <span class="logo-sm">💅</span>
    <span style="font-weight:700;color:${c.primary}">Leila Studio</span>
  </div>
  <p>Informe confidencial · ${fechaGen}</p>
  <p>leila-studio.vercel.app</p>
</div>

</div><script>window.onload=()=>window.print();</script></body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }

  const periodoLabels: Record<PeriodoI, string> = { todo: "Todo", hoy: "Hoy", semana: "7 días", quincena: "15 días", mes: "30 días", personalizado: "Personalizado" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="section-title">📋 Informes de Gestión</h2>
        {perm.descargarPDF && (
          <button onClick={generarPDF} className="btn-gold text-sm flex items-center gap-2" style={{ padding: "0.5rem 1.2rem" }}>
            📄 Generar PDF
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(Object.keys(periodoLabels) as PeriodoI[]).map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0"
            style={periodo === p ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" } : { background: "var(--c-border-soft)", color: "#888" }}>
            {periodoLabels[p]}
          </button>
        ))}
      </div>
      {periodo === "personalizado" && (
        <div className="flex gap-3 mb-4 items-center flex-wrap">
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} max={hasta || hoy} style={{ width: "auto" }} />
          <span className="text-sm" style={{ color: "#888" }}>hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} min={desde} max={hoy} style={{ width: "auto" }} />
        </div>
      )}

      <p className="text-xs mb-5 font-semibold" style={{ color: "#888" }}>📅 {etiqueta} · {totalCitas} cita(s) analizadas</p>

      {/* KPIs en pantalla */}
      {perm.verKpiCitas && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: "Total citas", v: totalCitas, c: "var(--c-primary)" },
          { l: "Completadas", v: completadas.length, c: "#10b981" },
          { l: "Activas", v: confirmadas.length + pendientes.length, c: "#6366f1" },
          { l: "Canceladas", v: canceladas.length, c: "#ef4444" },
        ].map(k => (
          <div key={k.l} className="card-elegant p-5 text-center">
            <p className="text-2xl font-bold" style={{ color: k.c }}>{k.v}</p>
            <p className="text-xs mt-1" style={{ color: "#888" }}>{k.l}</p>
          </div>
        ))}
      </div>
      )}
      {perm.verFinanzas && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { l: "Ingresos totales", v: fmt(ingresosTotales), c: "var(--c-primary)" },
          { l: "Total comisiones", v: fmt(totalComisiones), c: "var(--c-secondary)" },
          { l: "Ganancia neta", v: fmt(gananciaNeta), c: "#10b981" },
        ].map(k => (
          <div key={k.l} className="card-elegant p-5 text-center">
            <p className="text-lg font-bold" style={{ color: k.c }}>{k.v}</p>
            <p className="text-xs mt-1" style={{ color: "#888" }}>{k.l}</p>
          </div>
        ))}
      </div>
      )}

      {/* Estados */}
      {perm.verEstados && (
      <div className="card-elegant p-5 mb-4">
        <p className="text-sm font-bold mb-3" style={{ color: "var(--c-primary)" }}>Citas por estado</p>
        <div className="space-y-2">
          {[
            { l: "✓ Completadas", n: completadas.length, c: "#10b981" },
            { l: "⚡ En proceso", n: enProceso.length, c: "var(--c-secondary)" },
            { l: "✓ Confirmadas", n: confirmadas.length, c: "#6366f1" },
            { l: "⏳ Pendientes", n: pendientes.length, c: "#f59e0b" },
            { l: "✗ Canceladas", n: canceladas.length, c: "#ef4444" },
          ].filter(e => e.n > 0).map(e => (
            <div key={e.l} className="flex items-center gap-3">
              <span className="text-xs font-semibold w-28" style={{ color: e.c }}>{e.l}</span>
              <div className="flex-1 rounded-full h-2" style={{ background: "var(--c-border-soft)" }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${pct(e.n)}%`, background: e.c }} />
              </div>
              <span className="text-xs font-bold w-8 text-right" style={{ color: e.c }}>{e.n}</span>
              <span className="text-xs w-8" style={{ color: "#bbb" }}>{pct(e.n)}%</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Top servicios */}
      {perm.verTopServicios && topServicios.length > 0 && (
        <div className="card-elegant p-5 mb-4">
          <p className="text-sm font-bold mb-3" style={{ color: "var(--c-primary)" }}>💅 Servicios más solicitados</p>
          <div className="space-y-2">
            {topServicios.map((s, i) => (
              <div key={s.nombre} className="flex items-center justify-between text-sm">
                <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "•"} {s.nombre}</span>
                <span className="font-bold" style={{ color: "var(--c-primary)" }}>{s.veces}x · {fmt(s.ingresos)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top clientes */}
      {perm.verTopClientes && topClientes.length > 0 && (
        <div className="card-elegant p-5 mb-4">
          <p className="text-sm font-bold mb-3" style={{ color: "var(--c-primary)" }}>👤 Clientes frecuentes</p>
          <div className="space-y-2">
            {topClientes.map((cl, i) => (
              <div key={cl.telefono} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold" style={{ color: "var(--c-primary)" }}>{i + 1}. </span>
                  <span>{cl.nombre}</span>
                  <span className="text-xs ml-2" style={{ color: "#aaa" }}>{cl.telefono}</span>
                </div>
                <span className="font-bold">{cl.citas} citas · {fmt(cl.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Días con más actividad */}
      {perm.verTopDias && topDias.length > 0 && (
        <div className="card-elegant p-5 mb-4">
          <p className="text-sm font-bold mb-3" style={{ color: "var(--c-primary)" }}>📅 Días con más actividad</p>
          <div className="space-y-2">
            {topDias.map(d => (
              <div key={d.dia} className="flex items-center justify-between text-sm">
                <span className="font-semibold">{d.dia}</span>
                <span className="font-bold" style={{ color: "var(--c-primary)" }}>{d.citas} cita(s) · {fmt(d.ingresos)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalCitas === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm" style={{ color: "#888" }}>Sin datos en este período</p>
        </div>
      )}
    </div>
  );
}

function TabGanancias({ reservas, token, perm }: { reservas: Reserva[]; token: string; perm: Permisos["ganancias"] }) {
  const [periodo, setPeriodo] = useState<PeriodoG>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  useEffect(() => {
    fetch("/api/trabajadores", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTrabajadores(Array.isArray(d) ? d : [])).catch(() => {});
  }, [token]);

  function fechaInicio(): string {
    if (periodo === "todo") return "0000-00-00";
    if (periodo === "hoy") return hoy;
    if (periodo === "personalizado") return desde || hoy;
    const [y, m, d] = hoy.split("-").map(Number);
    const fecha = new Date(y, m - 1, d);
    if (periodo === "semana") {
      const dow = fecha.getDay();
      fecha.setDate(d - (dow === 0 ? 6 : dow - 1));
    } else if (periodo === "quincena") {
      fecha.setDate(d <= 15 ? 1 : 16);
    } else if (periodo === "mes") {
      fecha.setDate(1);
    }
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

  function fechaFin(): string {
    if (periodo === "personalizado") return hasta || hoy;
    return hoy;
  }

  const inicio = fechaInicio();
  const fin = fechaFin();

  const completadas = reservas.filter(r =>
    r.estado === "completada" &&
    r.fecha >= inicio &&
    r.fecha <= fin
  );

  const ingresosTotales = completadas.reduce((s, r) => s + Number(r.anticipo || 0) + Number(r.pago_saldo || 0), 0);
  const promedioPorCita = completadas.length > 0 ? Math.round(ingresosTotales / completadas.length) : 0;

  const resumenTrabajadores = trabajadores.map(t => {
    const citas = completadas.filter(r => r.trabajador_id === t.id);
    const ingresos = citas.reduce((s, r) => s + Number(r.anticipo || 0) + Number(r.pago_saldo || 0), 0);
    const comision = Math.round(ingresos * ((t.porcentaje ?? 0) / 100));
    return { ...t, citas: citas.length, ingresos, comision, neto: ingresos - comision };
  }).filter(t => t.citas > 0);

  const totalComisiones = resumenTrabajadores.reduce((s, t) => s + t.comision, 0);
  const gananciaNeta = ingresosTotales - totalComisiones;

  const periodoLabels: Record<PeriodoG, string> = {
    todo: "Todo", hoy: "Hoy", semana: "Semana", quincena: "Quincena", mes: "Mes", personalizado: "📅 Personalizado",
  };

  function etiquetaPeriodo(): string {
    if (periodo === "todo") return "Todos los registros";
    if (periodo === "hoy") return `Hoy ${formatFecha(hoy)}`;
    if (periodo === "personalizado") return `${formatFecha(inicio)} — ${formatFecha(fin)}`;
    return `${periodoLabels[periodo]} (${formatFecha(inicio)} — ${formatFecha(fin)})`;
  }

  function descargarPDF() {
    const filasTrabajadores = resumenTrabajadores.length > 0
      ? resumenTrabajadores.map(t => `
          <tr>
            <td>${t.nombre}</td>
            <td style="text-align:center">${t.citas}</td>
            <td style="text-align:right">${formatPrecio(t.ingresos)}</td>
            <td style="text-align:right">${t.porcentaje ?? 0}% — ${formatPrecio(t.comision)}</td>
            <td style="text-align:right;font-weight:bold;color:#1a9a55">${formatPrecio(t.neto)}</td>
          </tr>`).join("")
      : `<tr><td colspan="5" style="text-align:center;color:#aaa">Sin trabajadoras con citas en este período</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Ganancias Leila Studio</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #333; padding: 30px; }
    h1 { font-size: 22px; color: #c9a84c; margin-bottom: 4px; }
    .sub { color: #888; font-size: 12px; margin-bottom: 20px; }
    .kpis { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { border: 1px solid #eee; border-radius: 8px; padding: 12px; text-align: center; }
    .kpi .val { font-size: 18px; font-weight: bold; color: #c9a84c; }
    .kpi .lbl { font-size: 11px; color: #888; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f5f5f5; padding: 8px 12px; text-align: left; font-size: 12px; color: #555; border-bottom: 2px solid #ddd; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; }
    tr:last-child td { border-bottom: none; }
    h2 { font-size: 15px; color: #555; margin-bottom: 8px; margin-top: 24px; }
    .footer { margin-top: 30px; font-size: 11px; color: #aaa; text-align: center; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <h1>💅 Leila Studio — Reporte de Ganancias</h1>
  <p class="sub">Período: ${etiquetaPeriodo()} · Generado: ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "full", timeStyle: "short" })}</p>

  <div class="kpis">
    <div class="kpi"><div class="val">${formatPrecio(ingresosTotales)}</div><div class="lbl">💰 Ingresos totales</div></div>
    <div class="kpi"><div class="val">${completadas.length}</div><div class="lbl">📋 Citas completadas</div></div>
    <div class="kpi"><div class="val">${formatPrecio(promedioPorCita)}</div><div class="lbl">📈 Promedio por cita</div></div>
    <div class="kpi"><div class="val">${formatPrecio(totalComisiones)}</div><div class="lbl">💸 Total comisiones</div></div>
    <div class="kpi"><div class="val" style="color:#1a9a55">${formatPrecio(gananciaNeta)}</div><div class="lbl">🏦 Ganancia neta</div></div>
  </div>

  <h2>Detalle por trabajadora</h2>
  <table>
    <thead>
      <tr>
        <th>Trabajadora</th>
        <th style="text-align:center">Citas</th>
        <th style="text-align:right">Ingresos</th>
        <th style="text-align:right">Comisión</th>
        <th style="text-align:right">Aporte neto</th>
      </tr>
    </thead>
    <tbody>${filasTrabajadores}</tbody>
  </table>

  <div class="footer">Leila Studio · Reporte generado automáticamente</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="section-title">📊 Ganancias</h2>
        {perm.descargarPDF && <button onClick={descargarPDF} className="btn-gold text-sm flex items-center gap-2"
          style={{ padding: "0.5rem 1.2rem" }}>
          📄 Descargar PDF
        </button>}
      </div>

      {/* Filtros de período */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(["todo","hoy","semana","quincena","mes","personalizado"] as PeriodoG[]).map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0"
            style={periodo === p
              ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
              : { background: "var(--c-border-soft)", color: "#888" }}>
            {periodoLabels[p]}
          </button>
        ))}
      </div>

      {/* Selector rango personalizado */}
      {periodo === "personalizado" && (
        <div className="card-elegant p-4 mb-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} max={hasta || hoy} style={{ width: "auto" }} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} min={desde} max={hoy} style={{ width: "auto" }} />
          </div>
          <p className="text-xs" style={{ color: "#aaa" }}>{completadas.length} cita(s) en el rango</p>
        </div>
      )}

      {/* Etiqueta del período */}
      <p className="text-xs mb-5 font-semibold" style={{ color: "#888" }}>
        📅 {etiquetaPeriodo()} · {completadas.length} cita(s) completada(s)
      </p>

      {/* KPIs */}
      {perm.verKpis && (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { icono: "💰", label: "Ingresos totales", valor: formatPrecio(ingresosTotales), color: "var(--c-primary)" },
          { icono: "📋", label: "Citas completadas", valor: String(completadas.length), color: "var(--c-primary)" },
          { icono: "📈", label: "Promedio por cita", valor: formatPrecio(promedioPorCita), color: "var(--c-primary)" },
          { icono: "💸", label: "Total comisiones", valor: formatPrecio(totalComisiones), color: "#e91e8c" },
          { icono: "🏦", label: "Ganancia neta", valor: formatPrecio(gananciaNeta), color: "#10b981" },
        ].map(k => (
          <div key={k.label} className="card-elegant p-5 text-center">
            <p className="text-xl mb-1">{k.icono}</p>
            <p className="text-lg font-bold" style={{ color: k.color }}>{k.valor}</p>
            <p className="text-xs mt-1" style={{ color: "#888" }}>{k.label}</p>
          </div>
        ))}
      </div>
      )}

      {/* Detalle por trabajadora */}
      {perm.verTrabajadoras && (
      <>
      <h3 className="text-sm font-bold mb-3" style={{ color: "#555" }}>👥 Detalle por trabajadora</h3>
      {resumenTrabajadores.length === 0 ? (
        <div className="text-center py-8 rounded-xl" style={{ background: "var(--c-border-soft)" }}>
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm" style={{ color: "#888" }}>Sin citas completadas en este período</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resumenTrabajadores.map(t => (
            <div key={t.id} className="card-elegant p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold">👩 {t.nombre}</p>
                  {t.especialidad && <p className="text-xs mt-0.5" style={{ color: "#888" }}>{t.especialidad}</p>}
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-semibold"
                  style={{ background: "var(--c-primary-bg)", color: "var(--c-primary)" }}>
                  {t.porcentaje ?? 0}% comisión
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-3 text-center" style={{ background: "var(--c-border-soft)" }}>
                  <p className="text-xl font-bold" style={{ color: "var(--c-primary)" }}>{t.citas}</p>
                  <p className="text-xs" style={{ color: "#888" }}>Citas</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "var(--c-border-soft)" }}>
                  <p className="text-sm font-bold" style={{ color: "#333" }}>{formatPrecio(t.ingresos)}</p>
                  <p className="text-xs" style={{ color: "#888" }}>Ingresos</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "#fce4ec" }}>
                  <p className="text-sm font-bold" style={{ color: "#e91e8c" }}>{formatPrecio(t.comision)}</p>
                  <p className="text-xs" style={{ color: "#888" }}>Comisión</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: "#f0fff4", border: "1px solid #10b981" }}>
                  <p className="text-sm font-bold" style={{ color: "#10b981" }}>{formatPrecio(t.neto)}</p>
                  <p className="text-xs" style={{ color: "#888" }}>Aporte neto</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total neto al final */}
      {resumenTrabajadores.length > 0 && (
        <div className="card-elegant p-5 mt-5 flex justify-between items-center"
          style={{ border: "1.5px solid #10b981", background: "linear-gradient(135deg,#f0fff4,#e8fdf2)" }}>
          <div>
            <p className="font-bold" style={{ color: "#10b981" }}>🏦 Ganancia neta del negocio</p>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>{etiquetaPeriodo()}</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#10b981" }}>{formatPrecio(gananciaNeta)}</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                TAB HORARIOS                         */
/* ═══════════════════════════════════════════════════ */

type PerfilHorario = {
  id: string;
  nombre: string;
  emoji: string;
  color: string;
  esDefault?: boolean;
  turnos: { inicio: string; fin: string }[];
};

const EMOJIS_PERFIL = ["📅", "🌙", "☀️", "🌸", "⭐", "🔥", "💅", "🎯", "🌴", "❄️", "🎪", "💼"];
const COLORES_PERFIL = ["#10b981", "#3b82f6", "#8b5cf6", "#e91e8c", "#f59e0b", "#f97316", "#ef4444", "#374151"];
const OPCIONES_HORA = Array.from({ length: (23 - 5) * 2 + 1 }, (_, i) => {
  const min = 5 * 60 + i * 30;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
});

function TabHorarios({ token, esRoot, perm }: { token: string; esRoot?: boolean; perm: Permisos["horarios"] }) {
  const [perfilActivo, setPerfilActivo] = useState("estandar");
  const [perfiles, setPerfiles] = useState<PerfilHorario[]>([]);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formEmoji, setFormEmoji] = useState("📅");
  const [formColor, setFormColor] = useState("#10b981");
  const [formTurnos, setFormTurnos] = useState<{ inicio: string; fin: string }[]>([{ inicio: "07:00", fin: "19:00" }]);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmandoEliminarHorario, setConfirmandoEliminarHorario] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/horarios-config", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setPerfilActivo(d.perfilActivo || "estandar"); setPerfiles(d.perfiles || []); }).catch(() => {});
  }, [token]);

  function recargar() {
    fetch("/api/admin/horarios-config", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setPerfilActivo(d.perfilActivo || "estandar"); setPerfiles(d.perfiles || []); }).catch(() => {});
  }

  async function accion(body: Record<string, unknown>) {
    setGuardando(true);
    const res = await fetch("/api/admin/horarios-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setGuardando(false);
    setMsg({ ok: res.ok, texto: res.ok ? "✓ Guardado correctamente" : (d.error || "Error al guardar") });
    setTimeout(() => setMsg(null), 3000);
    if (res.ok) recargar();
  }

  function abrirForm(perfil?: PerfilHorario) {
    if (perfil) {
      setEditandoId(perfil.id);
      setFormNombre(perfil.nombre);
      setFormEmoji(perfil.emoji);
      setFormColor(perfil.color);
      setFormTurnos(perfil.turnos);
    } else {
      setEditandoId(null);
      setFormNombre("");
      setFormEmoji("📅");
      setFormColor("#10b981");
      setFormTurnos([{ inicio: "07:00", fin: "19:00" }]);
    }
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cerrarForm() { setMostrarForm(false); setEditandoId(null); setMsg(null); }

  async function guardarPerfil() {
    if (!formNombre.trim()) return setMsg({ ok: false, texto: "El nombre es obligatorio" });
    for (const t of formTurnos) {
      if (t.inicio >= t.fin) return setMsg({ ok: false, texto: "El cierre debe ser posterior al inicio en cada turno" });
    }
    await accion(editandoId
      ? { accion: "editar", id: editandoId, nombre: formNombre.trim(), emoji: formEmoji, color: formColor, turnos: formTurnos }
      : { accion: "crear", nombre: formNombre.trim(), emoji: formEmoji, color: formColor, turnos: formTurnos }
    );
    cerrarForm();
  }

  function actualizarTurno(i: number, campo: "inicio" | "fin", valor: string) {
    setFormTurnos(prev => prev.map((t, j) => j === i ? { ...t, [campo]: valor } : t));
  }

  const perfilActivoObj = perfiles.find(p => p.id === perfilActivo);

  /* ── Gestión de horarios ── */
  return (
    <div>
      <h2 className="section-title mb-4">⏰ Gestión de horarios</h2>
      {msg && <p className="text-xs mb-4 text-center font-semibold" style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>{msg.texto}</p>}

      {/* Formulario crear/editar */}
      {mostrarForm && perm.editar && (
        <div className="card-elegant p-5 mb-5" style={{ border: "2px solid var(--c-primary)" }}>
          <p className="text-sm font-bold mb-5" style={{ color: "var(--c-primary)" }}>
            {editandoId ? "✏️ Editar perfil" : "✨ Nuevo perfil"}
          </p>

          {/* Nombre */}
          <div className="mb-4">
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Nombre del perfil</label>
            <input type="text" placeholder="Ej: Temporada alta, Solo tarde…" value={formNombre} onChange={e => setFormNombre(toTitleCase(e.target.value))} />
          </div>

          {/* Emoji + Color en fila */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>Emoji identificador</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS_PERFIL.map(em => (
                  <button key={em} onClick={() => setFormEmoji(em)}
                    className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                    style={{ background: formEmoji === em ? "var(--c-primary-bg)" : "var(--c-border-soft)", border: `2px solid ${formEmoji === em ? "var(--c-primary)" : "transparent"}` }}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>Color del perfil</label>
              <div className="flex flex-wrap gap-3">
                {COLORES_PERFIL.map(c => (
                  <button key={c} onClick={() => setFormColor(c)}
                    className="w-9 h-9 rounded-full transition-all"
                    style={{ background: c, border: `3px solid ${formColor === c ? "#333" : "transparent"}`, outline: formColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
                ))}
              </div>
              <div className="mt-3 p-3 rounded-xl flex items-center gap-2" style={{ background: formColor + "15", border: `1px solid ${formColor}` }}>
                <span className="text-xl">{formEmoji}</span>
                <span className="font-bold text-sm" style={{ color: formColor }}>{formNombre || "Vista previa"}</span>
              </div>
            </div>
          </div>

          {/* Turnos */}
          <div className="mb-5">
            <label className="text-xs font-semibold block mb-3" style={{ color: "#888" }}>Turnos de atención</label>
            <div className="space-y-3">
              {formTurnos.map((t, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ background: "var(--c-border-soft)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold" style={{ color: "#555" }}>
                      {i === 0 ? "🌅 Primer turno" : "🌇 Segundo turno"}
                    </p>
                    {i > 0 && (
                      <button onClick={() => setFormTurnos(prev => prev.filter((_, j) => j !== i))}
                        className="text-xs px-2 py-1 rounded-full" style={{ background: "#fee2e2", color: "#ef4444" }}>
                        ✕ Quitar
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <label className="text-xs block mb-1" style={{ color: "#aaa" }}>Apertura</label>
                      <select value={t.inicio} onChange={e => actualizarTurno(i, "inicio", e.target.value)}
                        style={{ width: "auto", padding: "0.3rem 0.5rem" }}>
                        {OPCIONES_HORA.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <span className="text-lg" style={{ color: "#ccc" }}>→</span>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: "#aaa" }}>Cierre</label>
                      <select value={t.fin} onChange={e => actualizarTurno(i, "fin", e.target.value)}
                        style={{ width: "auto", padding: "0.3rem 0.5rem" }}>
                        {OPCIONES_HORA.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <p className="text-xs" style={{ color: "#aaa" }}>
                      Slots: {t.inicio} · {t.inicio.split(":")[1] === "00"
                        ? `${String(parseInt(t.inicio) + 0).padStart(2,"0")}:30` : `${t.inicio.split(":")[0]}:${t.inicio.split(":")[1] === "30" ? "00" : "30"}`} · … · hasta {t.fin}
                    </p>
                  </div>
                </div>
              ))}
              {formTurnos.length < 2 && (
                <button onClick={() => setFormTurnos(prev => [...prev, { inicio: "14:00", fin: "19:00" }])}
                  className="w-full py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--c-border-soft)", color: "var(--c-primary)", border: "1.5px dashed var(--c-primary)" }}>
                  + Agregar segundo turno (pausa al mediodía)
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={cerrarForm} className="flex-1 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: "var(--c-border-soft)", color: "#888" }}>
              Cancelar
            </button>
            <button onClick={guardarPerfil} disabled={guardando} className="btn-gold flex-1">
              {guardando ? "Guardando..." : "Guardar perfil"}
            </button>
          </div>
        </div>
      )}

      {/* Perfil activo */}
      {perfilActivoObj && (
        <div className="mb-4">
          <p className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: "#aaa" }}>Perfil activo</p>
          <div className="card-elegant p-4" style={{ borderLeft: `4px solid ${perfilActivoObj.color}` }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{perfilActivoObj.emoji}</span>
                <div>
                  <p className="font-bold">{perfilActivoObj.nombre}</p>
                  <p className="text-xs" style={{ color: "#888" }}>
                    {perfilActivoObj.turnos.map(t => `${t.inicio}–${t.fin}`).join("  ·  ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: perfilActivoObj.color + "22", color: perfilActivoObj.color }}>✅ Activo</span>
                {perm.editar && (
                  <button onClick={() => abrirForm(perfilActivoObj)}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{ background: "var(--c-border-soft)", color: "#666" }}>
                    Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Otros perfiles */}
      {perfiles.filter(p => p.id !== perfilActivo).length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: "#aaa" }}>Otros perfiles</p>
          <div className="space-y-3">
            {perfiles.filter(p => p.id !== perfilActivo).map(p => (
              <div key={p.id} className="card-elegant p-4" style={{ borderLeft: `4px solid ${p.color}` }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.emoji}</span>
                    <div>
                      <p className="font-semibold text-sm">{p.nombre}</p>
                      <p className="text-xs" style={{ color: "#888" }}>
                        {p.turnos.map(t => `${t.inicio}–${t.fin}`).join("  ·  ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {perm.editar && (
                      <button onClick={() => accion({ accion: "activar", id: p.id })} disabled={guardando}
                        className="text-xs px-3 py-1.5 rounded-full font-semibold"
                        style={{ background: p.color + "22", color: p.color }}>
                        Activar
                      </button>
                    )}
                    {perm.editar && (
                      <button onClick={() => abrirForm(p)}
                        className="text-xs px-3 py-1.5 rounded-full font-semibold"
                        style={{ background: "var(--c-border-soft)", color: "#666" }}>
                        Editar
                      </button>
                    )}
                    {perm.editar && !p.esDefault && (
                      confirmandoEliminarHorario === p.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => { setConfirmandoEliminarHorario(null); accion({ accion: "eliminar", id: p.id }); }} disabled={guardando}
                            className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: "#ef4444", color: "white" }}>
                            Sí
                          </button>
                          <button onClick={() => setConfirmandoEliminarHorario(null)}
                            className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: "var(--c-border-soft)", color: "#888" }}>
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmandoEliminarHorario(p.id)} disabled={guardando}
                          className="text-xs px-2.5 py-1.5 rounded-full"
                          style={{ background: "#fee2e2", color: "#ef4444" }}>
                          🗑
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón nuevo */}
      {!mostrarForm && perm.editar && (
        <button onClick={() => abrirForm()} className="btn-gold w-full">
          + Nuevo perfil de horario
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                TAB GRÁFICAS                         */
/* ═══════════════════════════════════════════════════ */

/* ── Helpers de geometría ── */
function arcDonut(cx: number, cy: number, r: number, ir: number, startDeg: number, sweepDeg: number): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const s = rad(startDeg), e = rad(startDeg + sweepDeg);
  const lg = sweepDeg > 180 ? 1 : 0;
  const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
  const x3 = cx + ir * Math.cos(e), y3 = cy + ir * Math.sin(e);
  const x4 = cx + ir * Math.cos(s), y4 = cy + ir * Math.sin(s);
  return `M${x1} ${y1} A${r} ${r} 0 ${lg} 1 ${x2} ${y2} L${x3} ${y3} A${ir} ${ir} 0 ${lg} 0 ${x4} ${y4}Z`;
}

const PALETA_VIVA = ["#FF3CAC", "#F7B731", "#4CAF50", "#2196F3", "#FF5722", "#9C27B0", "#00BCD4", "#FF9800"];

function DonutChart({ partes, total }: { partes: { label: string; valor: number; color: string }[]; total: number }) {
  const cx = 58, cy = 58, r = 42, ir = 27;
  let angle = -90;
  const slices = partes.map(p => {
    const sweep = total > 0 ? (p.valor / total) * 360 : 0;
    const s = { ...p, start: angle, sweep };
    angle += sweep;
    return s;
  });
  return (
    <svg viewBox="0 0 230 120" className="w-full" style={{ maxHeight: 120 }}>
      <circle cx={cx} cy={cy} r={(r + ir) / 2} fill="none" stroke="#f0f0f0" strokeWidth={r - ir} />
      {slices.map((s, i) => s.sweep > 0 && (
        <path key={i} d={arcDonut(cx, cy, r, ir, s.start, s.sweep)} fill={s.color} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="7" fill="#aaa">Total</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="9" fill="#333" fontWeight="700">{formatPrecio(total)}</text>
      {partes.map((p, i) => {
        const pct = total > 0 ? Math.round((p.valor / total) * 100) : 0;
        return (
          <g key={i} transform={`translate(128,${14 + i * 40})`}>
            <rect width="9" height="9" rx="2" fill={p.color} />
            <text x="13" y="8" fontSize="7.5" fill="#888">{p.label}</text>
            <text x="13" y="20" fontSize="9.5" fill="#333" fontWeight="700">{formatPrecio(p.valor)}</text>
            <text x="13" y="30" fontSize="7" fill={p.color} fontWeight="700">{pct}%</text>
          </g>
        );
      })}
    </svg>
  );
}

function BarVertical({ datos }: { datos: { label: string; valor: number }[] }) {
  const H = 72, W = 400;
  const max = Math.max(...datos.map(d => d.valor), 1);
  const n = datos.length;
  const gap = Math.max(2, Math.floor(W / n * 0.15));
  const bw = Math.floor((W - gap * (n + 1)) / n);
  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full">
      <defs>
        {PALETA_VIVA.map((c, i) => (
          <linearGradient key={i} id={`bvg${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="1" />
            <stop offset="100%" stopColor={c} stopOpacity="0.55" />
          </linearGradient>
        ))}
      </defs>
      <line x1="0" y1={H} x2={W} y2={H} stroke="#eee" strokeWidth="1" />
      {datos.map((d, i) => {
        const bh = Math.max(2, Math.round((d.valor / max) * H));
        const x = gap + i * (bw + gap);
        const y = H - bh;
        const ci = i % PALETA_VIVA.length;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="4" fill={`url(#bvg${ci})`} />
            {d.valor > 0 && bh > 16 && (
              <text x={x + bw / 2} y={y + 10} textAnchor="middle" fontSize="7" fill="white" fontWeight="700">
                {d.valor >= 1000 ? `${Math.round(d.valor / 1000)}k` : d.valor}
              </text>
            )}
            <text x={x + bw / 2} y={H + 13} textAnchor="middle" fontSize="7.5" fill="#aaa">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function BarHorizontal({ datos, offsetPaleta = 0 }: { datos: { label: string; valor: number; sub?: string }[]; offsetPaleta?: number }) {
  const max = Math.max(...datos.map(d => d.valor), 1);
  const rowH = 17, gap = 5;
  const totalH = datos.length * (rowH + gap);
  const BARW = 210;
  return (
    <svg viewBox={`0 0 400 ${totalH}`} className="w-full">
      {datos.map((d, i) => {
        const bw = Math.max(4, Math.round((d.valor / max) * BARW));
        const y = i * (rowH + gap);
        const label = d.label.length > 19 ? d.label.slice(0, 17) + "…" : d.label;
        const color = PALETA_VIVA[(i + offsetPaleta) % PALETA_VIVA.length];
        return (
          <g key={i}>
            <text x="0" y={y + rowH - 6} fontSize="8.5" fill="#666" fontWeight="500">{label}</text>
            <rect x="115" y={y + 3} width={bw} height={rowH - 6} rx="5" fill={color} />
            <text x={115 + bw + 6} y={y + rowH - 6} fontSize="8.5" fill="#444" fontWeight="600">
              {d.sub ?? formatPrecio(d.valor)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ datos }: { datos: { label: string; valor: number }[] }) {
  const W = 420, H = 62, padL = 48, padR = 12, padT = 8, padB = 20;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(...datos.map(d => d.valor), 1);
  const pts = datos.map((d, i) => ({
    x: padL + (i / Math.max(datos.length - 1, 1)) * innerW,
    y: padT + innerH - (d.valor / max) * innerH,
    ...d,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${padT + innerH} L${pts[0].x},${padT + innerH}Z`;
  const ticks = [0, 0.5, 1];
  const lineColor = "#FF3CAC";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="lca" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lcaLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF3CAC" />
          <stop offset="50%" stopColor="#F7B731" />
          <stop offset="100%" stopColor="#2196F3" />
        </linearGradient>
      </defs>
      {ticks.map(f => {
        const y = padT + innerH * f;
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f0f0f0" strokeWidth="1" />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="7" fill="#ccc">
              {formatPrecio(max * (1 - f))}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#lca)" />
      <path d={linePath} fill="none" stroke="url(#lcaLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const dotColor = PALETA_VIVA[i % PALETA_VIVA.length];
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={dotColor} stroke="white" strokeWidth="1.5" />
            <text x={p.x} y={H - 3} textAnchor="middle" fontSize="7.5" fill="#bbb">{p.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TabGraficas({ reservas, token, perm }: { reservas: Reserva[]; token: string; perm: Permisos["graficas"] }) {
  const [periodo, setPeriodo] = useState<PeriodoG>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  useEffect(() => {
    fetch("/api/trabajadores", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTrabajadores(Array.isArray(d) ? d : [])).catch(() => {});
  }, [token]);

  function fechaInicio(): string {
    if (periodo === "todo") return "0000-00-00";
    if (periodo === "hoy") return hoy;
    if (periodo === "personalizado") return desde || hoy;
    const [y, m, d] = hoy.split("-").map(Number);
    const f = new Date(y, m - 1, d);
    if (periodo === "semana") { const dow = f.getDay(); f.setDate(d - (dow === 0 ? 6 : dow - 1)); }
    else if (periodo === "quincena") { f.setDate(d <= 15 ? 1 : 16); }
    else if (periodo === "mes") { f.setDate(1); }
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  }

  const inicio = fechaInicio();
  const fin = periodo === "personalizado" ? (hasta || hoy) : hoy;
  const completadas = reservas.filter(r => r.estado === "completada" && r.fecha >= inicio && r.fecha <= fin);
  const ingresosTotales = completadas.reduce((s, r) => s + Number(r.anticipo || 0) + Number(r.pago_saldo || 0), 0);

  const resumenTrab = trabajadores.map(t => {
    const citas = completadas.filter(r => r.trabajador_id === t.id);
    const ingresos = citas.reduce((s, r) => s + Number(r.anticipo || 0) + Number(r.pago_saldo || 0), 0);
    const comision = Math.round(ingresos * ((t.porcentaje ?? 0) / 100));
    return { ...t, citas: citas.length, ingresos, comision };
  }).filter(t => t.citas > 0).sort((a, b) => b.ingresos - a.ingresos);

  const totalComisiones = resumenTrab.reduce((s, t) => s + t.comision, 0);
  const gananciaNeta = ingresosTotales - totalComisiones;

  /* Ingresos por día (últimos 14 del período) */
  const diasData: { label: string; valor: number }[] = [];
  if (inicio !== "0000-00-00") {
    const dStart = new Date(inicio), dEnd = new Date(fin);
    const diffDays = Math.ceil((dEnd.getTime() - dStart.getTime()) / 86400000) + 1;
    const maxDias = Math.min(diffDays, 14);
    const offset = Math.max(0, diffDays - maxDias);
    for (let i = offset; i < diffDays; i++) {
      const d = new Date(dStart); d.setDate(dStart.getDate() + i);
      const ds = d.toLocaleDateString("en-CA");
      const lbl = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const total = completadas.filter(r => r.fecha === ds).reduce((s, r) => s + Number(r.anticipo || 0) + Number(r.pago_saldo || 0), 0);
      diasData.push({ label: lbl, valor: total });
    }
  }

  /* Top servicios */
  const svcMap: Record<string, number> = {};
  completadas.forEach(r => { svcMap[r.servicio_nombre] = (svcMap[r.servicio_nombre] || 0) + 1; });
  const topSvc = Object.entries(svcMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([nombre, cnt]) => ({ label: nombre, valor: cnt, sub: `${cnt} cita${cnt !== 1 ? "s" : ""}` }));

  /* Tendencia 8 semanas (independiente del filtro) */
  const tendencia: { label: string; valor: number }[] = [];
  const ahora = new Date();
  for (let w = 7; w >= 0; w--) {
    const lun = new Date(ahora);
    const dow = ahora.getDay();
    lun.setDate(ahora.getDate() - (dow === 0 ? 6 : dow - 1) - w * 7);
    const dom = new Date(lun); dom.setDate(lun.getDate() + 6);
    const lStr = lun.toLocaleDateString("en-CA"), dStr = dom.toLocaleDateString("en-CA");
    const lbl = `${String(lun.getDate()).padStart(2, "0")}/${String(lun.getMonth() + 1).padStart(2, "0")}`;
    const total = reservas.filter(r => r.estado === "completada" && r.fecha >= lStr && r.fecha <= dStr)
      .reduce((s, r) => s + Number(r.anticipo || 0) + Number(r.pago_saldo || 0), 0);
    tendencia.push({ label: lbl, valor: total });
  }

  const periodoLabels: Record<PeriodoG, string> = { todo: "Todo", hoy: "Hoy", semana: "Semana", quincena: "Quincena", mes: "Mes", personalizado: "📅 Personalizado" };

  return (
    <div>
      <h2 className="section-title mb-4">📈 Gráficas financieras</h2>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(["todo", "hoy", "semana", "quincena", "mes", "personalizado"] as PeriodoG[]).map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0"
            style={periodo === p
              ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
              : { background: "var(--c-border-soft)", color: "#888" }}>
            {periodoLabels[p]}
          </button>
        ))}
      </div>
      {periodo === "personalizado" && (
        <div className="card-elegant p-4 mb-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} max={hasta || hoy} style={{ width: "auto" }} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} min={desde} max={hoy} style={{ width: "auto" }} />
          </div>
          <p className="text-xs" style={{ color: "#aaa" }}>{completadas.length} cita(s) en el rango</p>
        </div>
      )}

      {/* Grilla 2×2 — altura fija por card */}
      <div className="grid grid-cols-2 gap-3 mb-3">

        {/* 1 — Ingresos por día */}
        {perm.verIngresos && (
        <div className="card-elegant p-4 flex flex-col" style={{ height: 190 }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: "#555" }}>💰 Ingresos por día</p>
          <p className="text-xs mb-2" style={{ color: "#bbb", fontSize: 10 }}>Máx. 14 días del período</p>
          <div className="flex-1 flex items-end overflow-hidden">
            {completadas.length === 0
              ? <p className="text-xs w-full text-center" style={{ color: "#bbb" }}>Sin datos</p>
              : diasData.length > 0
                ? <BarVertical datos={diasData} />
                : <p className="text-xs w-full text-center" style={{ color: "#bbb" }}>Elegí rango personalizado</p>
            }
          </div>
        </div>
        )}

        {/* 2 — Composición */}
        {perm.verComposicion && (
        <div className="card-elegant p-4 flex flex-col" style={{ height: 190 }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: "#555" }}>🥧 Composición</p>
          <p className="text-xs mb-2" style={{ color: "#bbb", fontSize: 10 }}>Ganancia neta vs comisiones</p>
          <div className="flex-1 flex items-center overflow-hidden">
            {completadas.length === 0
              ? <p className="text-xs w-full text-center" style={{ color: "#bbb" }}>Sin datos</p>
              : <DonutChart total={ingresosTotales} partes={[
                  { label: "Ganancia neta", valor: gananciaNeta, color: "#10b981" },
                  { label: "Comisiones", valor: totalComisiones, color: "#FF3CAC" },
                ]} />
            }
          </div>
        </div>
        )}

        {/* 3 — Trabajadoras */}
        {perm.verTrabajadoras && (
        <div className="card-elegant p-4 flex flex-col" style={{ height: 190 }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: "#555" }}>👩 Por trabajadora</p>
          <p className="text-xs mb-2" style={{ color: "#bbb", fontSize: 10 }}>Ingresos de mayor a menor</p>
          <div className="flex-1 flex items-center overflow-hidden">
            {resumenTrab.length === 0
              ? <p className="text-xs w-full text-center" style={{ color: "#bbb" }}>Sin datos</p>
              : <BarHorizontal datos={resumenTrab.slice(0, 5).map(t => ({ label: t.nombre, valor: t.ingresos }))} offsetPaleta={0} />
            }
          </div>
        </div>
        )}

        {/* 4 — Servicios */}
        {perm.verTopServicios && (
        <div className="card-elegant p-4 flex flex-col" style={{ height: 190 }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: "#555" }}>💅 Top servicios</p>
          <p className="text-xs mb-2" style={{ color: "#bbb", fontSize: 10 }}>Por número de citas</p>
          <div className="flex-1 flex items-center overflow-hidden">
            {topSvc.length === 0
              ? <p className="text-xs w-full text-center" style={{ color: "#bbb" }}>Sin datos</p>
              : <BarHorizontal datos={topSvc.slice(0, 5)} offsetPaleta={3} />
            }
          </div>
        </div>
        )}

      </div>

      {/* Tendencia 8 semanas — franja compacta */}
      {perm.verTendencia && (
      <div className="card-elegant p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold" style={{ color: "#555" }}>📉 Tendencia — últimas 8 semanas</p>
          <p className="text-xs" style={{ color: "#bbb" }}>Independiente del filtro</p>
        </div>
        <LineChart datos={tendencia} />
      </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                TAB ACCESOS (ROOT)                   */
/* ═══════════════════════════════════════════════════ */

function TabFondos({ token }: { token: string }) {
  type Seccion = "inicio" | "reservar" | "admin" | "login" | "confirmacion";
  const SECCIONES: { id: Seccion; label: string; emoji: string }[] = [
    { id: "inicio", label: "Inicio", emoji: "🏠" },
    { id: "reservar", label: "Reservar", emoji: "📅" },
    { id: "admin", label: "Admin", emoji: "⚙️" },
    { id: "login", label: "Login", emoji: "🔑" },
    { id: "confirmacion", label: "Confirmación", emoji: "✅" },
  ];
  const FONDOS = [
    { id: "gradiente", label: "Gradiente", preview: null },
    { id: "fondo01", label: "Tropical", preview: "/fondos/fondo01.png" },
    { id: "fondo02", label: "Dorado", preview: "/fondos/fondo02.png" },
    { id: "fondo03", label: "Vallenato", preview: "/fondos/fondo03.png" },
    { id: "fondo04", label: "Nuevo", preview: "/fondos/fondo04.png" },
    { id: "fondoMadre01", label: "Mamá Especial", preview: "/fondos/fondoMadre01.png" },
    { id: "fondoMadre02", label: "Día Mamá", preview: "/fondos/fondoMadre02.png" },
    { id: "fondoMadre03", label: "Flores Mamá", preview: "/fondos/fondoMadre03.png" },
  ];

  const empty: Record<Seccion, string> = { inicio: "gradiente", reservar: "gradiente", admin: "gradiente", login: "gradiente", confirmacion: "gradiente" };
  const [seccion, setSeccion] = useState<Seccion>("inicio");
  const [guardado, setGuardado] = useState<Record<Seccion, string>>(empty);
  const [pendiente, setPendiente] = useState<Record<Seccion, string>>(empty);
  const [aplicando, setAplicando] = useState<Seccion | null>(null);
  const [msgSec, setMsgSec] = useState<Seccion | null>(null);

  useEffect(() => {
    fetch("/api/admin/fondo-config", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const loaded: Record<Seccion, string> = {
          inicio: d.inicio || "gradiente",
          reservar: d.reservar || "gradiente",
          admin: d.admin || "gradiente",
          login: d.login || "gradiente",
          confirmacion: d.confirmacion || "gradiente",
        };
        setGuardado(loaded);
        setPendiente(loaded);
      })
      .catch(() => {});
  }, [token]);

  async function aplicar(sec: Seccion) {
    setAplicando(sec);
    const res = await fetch("/api/admin/fondo-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [sec]: pendiente[sec] }),
    });
    setAplicando(null);
    if (res.ok) {
      setGuardado(g => ({ ...g, [sec]: pendiente[sec] }));
      setMsgSec(sec);
      setTimeout(() => setMsgSec(null), 2000);
    }
  }

  const haycambio = pendiente[seccion] !== guardado[seccion];

  return (
    <div>
      <h2 className="section-title mb-4">🖼️ Fondos de la App</h2>

      {/* Tabs de sección — scroll horizontal en móvil */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {SECCIONES.map(s => {
          const tieneActivo = guardado[s.id] !== "gradiente";
          return (
            <button key={s.id} onClick={() => setSeccion(s.id)}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              style={seccion === s.id
                ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white", boxShadow: "0 2px 8px var(--c-card-shadow)" }
                : { background: "var(--c-primary-bg)", color: "#999", border: "1.5px solid var(--c-border-soft)" }}>
              {s.emoji} {s.label}
              {tieneActivo && (
                <span className="w-2 h-2 rounded-full ml-0.5" style={{ background: seccion === s.id ? "white" : "var(--c-primary)" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Grid cuadrado dinámico */}
      <div className="grid gap-3 mb-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
        {FONDOS.map(f => {
          const sel = pendiente[seccion] === f.id;
          return (
            <button key={f.id} onClick={() => setPendiente(p => ({ ...p, [seccion]: f.id }))}
              className="rounded-2xl overflow-hidden transition-all text-left"
              style={{
                border: sel ? "3px solid var(--c-primary)" : "2px solid var(--c-border-soft)",
                boxShadow: sel ? "0 4px 16px var(--c-card-shadow)" : "none",
                transform: sel ? "scale(1.03)" : "scale(1)",
              }}>
              <div className="relative w-full" style={{ aspectRatio: "1/1" }}>
                {f.preview ? (
                  <img src={f.preview} alt={f.label}
                    className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,var(--c-primary-bg),var(--c-bg-to))" }}>
                    <span className="text-3xl">🎨</span>
                  </div>
                )}
                {sel && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "var(--c-primary)", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }}>✓</div>
                )}
              </div>
              <div className="px-2 py-1.5" style={{ background: sel ? "var(--c-primary-bg)" : "white" }}>
                <p className="text-[11px] font-bold truncate" style={{ color: sel ? "var(--c-primary)" : "#666" }}>{f.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Aplicar por sección */}
      {haycambio && (
        <button onClick={() => aplicar(seccion)} disabled={aplicando === seccion}
          className="btn-gold w-full mb-2">
          {aplicando === seccion ? "Aplicando..." : `Aplicar en ${SECCIONES.find(s => s.id === seccion)?.emoji} ${SECCIONES.find(s => s.id === seccion)?.label}`}
        </button>
      )}
      {msgSec === seccion && (
        <p className="text-sm text-center font-semibold" style={{ color: "#10b981" }}>✓ Aplicado</p>
      )}
      {!haycambio && guardado[seccion] !== "gradiente" && (
        <p className="text-xs text-center" style={{ color: "#aaa" }}>Fondo activo: {FONDOS.find(f => f.id === guardado[seccion])?.label}</p>
      )}
    </div>
  );
}

function TabAccesos({ token }: { token: string }) {
  const [claveRoot, setClaveRoot] = useState("");
  const [claveAdmin, setClaveAdmin] = useState("");
  const [pinAdmin, setPinAdmin] = useState("");
  const [pinRoot, setPinRoot] = useState("");
  const [msg, setMsg] = useState<Record<string, { ok: boolean; texto: string }>>({});
  const [cargando, setCargando] = useState<Record<string, boolean>>({});

  async function accion(tipo: string, body: Record<string, string>) {
    setCargando(p => ({ ...p, [tipo]: true }));
    const res = await fetch("/api/admin/accesos", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ accion: tipo, ...body }),
    });
    const d = await res.json();
    setCargando(p => ({ ...p, [tipo]: false }));
    setMsg(p => ({ ...p, [tipo]: { ok: res.ok, texto: res.ok ? "Actualizado ✓" : (d.error || "Error") } }));
  }

  return (
    <div>
      <h2 className="section-title mb-1">🔑 Accesos</h2>
      <p className="text-xs mb-5" style={{ color: "#888" }}>Solo visible para el root. Gestiona las claves del sistema.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

        {/* ── Columna ROOT ── */}
        <div className="space-y-4">
          {/* Clave root */}
          <div className="card-elegant p-5">
            <p className="text-sm font-bold mb-1" style={{ color: "#6366f1" }}>👑 Clave root</p>
            <p className="text-xs mb-3" style={{ color: "#888" }}>Contraseña para entrar como SuperAdmin.</p>
            <input type="password" placeholder="Nueva clave root" value={claveRoot}
              onChange={e => setClaveRoot(e.target.value)} className="mb-3" />
            <button onClick={() => accion("cambiar_root", { nueva_clave: claveRoot })}
              disabled={!!cargando["cambiar_root"]} className="btn-gold w-full"
              style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}>
              {cargando["cambiar_root"] ? "Guardando..." : "Cambiar clave root"}
            </button>
            {msg["cambiar_root"]?.texto && (
              <p className="text-xs mt-2 text-center font-semibold"
                style={{ color: msg["cambiar_root"].ok ? "#10b981" : "#e91e8c" }}>
                {msg["cambiar_root"].texto}
              </p>
            )}
          </div>

          {/* PIN root */}
          <div className="card-elegant p-5">
            <p className="text-sm font-bold mb-1" style={{ color: "#6366f1" }}>🔢 PIN de recuperación root</p>
            <p className="text-xs mb-3" style={{ color: "#888" }}>Doble clic en 👑 + Escape × 3 en el login para usar este PIN.</p>
            <input type="password" inputMode="numeric" placeholder="Nuevo PIN (6 dígitos)" maxLength={6}
              value={pinRoot} onChange={e => setPinRoot(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mb-3 text-center text-2xl tracking-widest" />
            <button onClick={() => accion("resetear_pin_root", { nuevo_pin: pinRoot })}
              disabled={!!cargando["resetear_pin_root"]} className="btn-gold w-full"
              style={{ background: "linear-gradient(135deg,#6366f1,#818cf8)" }}>
              {cargando["resetear_pin_root"] ? "Guardando..." : "Cambiar PIN root"}
            </button>
            {msg["resetear_pin_root"]?.texto && (
              <p className="text-xs mt-2 text-center font-semibold"
                style={{ color: msg["resetear_pin_root"].ok ? "#10b981" : "#e91e8c" }}>
                {msg["resetear_pin_root"].texto}
              </p>
            )}
          </div>
        </div>{/* fin columna root */}

        {/* ── Columna ADMIN ── */}
        <div className="space-y-4">
          {/* Clave admin */}
          <div className="card-elegant p-5">
            <p className="text-sm font-bold mb-1" style={{ color: "var(--c-primary)" }}>🔒 Clave del admin (Leila)</p>
            <p className="text-xs mb-3" style={{ color: "#888" }}>Contraseña para el ingreso normal al panel.</p>
            <input type="password" placeholder="Nueva clave para el admin" value={claveAdmin}
              onChange={e => setClaveAdmin(e.target.value)} className="mb-3" />
            <button onClick={() => accion("resetear_admin", { nueva_clave: claveAdmin })}
              disabled={!!cargando["resetear_admin"]} className="btn-gold w-full">
              {cargando["resetear_admin"] ? "Guardando..." : "Restablecer clave admin"}
            </button>
            {msg["resetear_admin"]?.texto && (
              <p className="text-xs mt-2 text-center font-semibold"
                style={{ color: msg["resetear_admin"].ok ? "#10b981" : "#e91e8c" }}>
                {msg["resetear_admin"].texto}
              </p>
            )}
          </div>

          {/* PIN admin */}
          <div className="card-elegant p-5">
            <p className="text-sm font-bold mb-1" style={{ color: "var(--c-primary)" }}>🔢 PIN de recuperación del admin</p>
            <p className="text-xs mb-3" style={{ color: "#888" }}>Escape × 3 en el login normal para usar este PIN.</p>
            <input type="password" inputMode="numeric" placeholder="Nuevo PIN (6 dígitos)" maxLength={6}
              value={pinAdmin} onChange={e => setPinAdmin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mb-3 text-center text-2xl tracking-widest" />
            <button onClick={() => accion("resetear_pin", { nuevo_pin: pinAdmin })}
              disabled={!!cargando["resetear_pin"]} className="btn-gold w-full">
              {cargando["resetear_pin"] ? "Guardando..." : "Cambiar PIN admin"}
            </button>
            {msg["resetear_pin"]?.texto && (
              <p className="text-xs mt-2 text-center font-semibold"
                style={{ color: msg["resetear_pin"].ok ? "#10b981" : "#e91e8c" }}>
                {msg["resetear_pin"].texto}
              </p>
            )}
          </div>
        </div>{/* fin columna admin */}

      </div>

      {/* ── Diagnóstico WhatsApp ── */}
      <DiagnosticoWhatsApp token={token} />
    </div>
  );
}

function DiagnosticoWhatsApp({ token }: { token: string }) {
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);

  async function ejecutar() {
    setCargando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/admin/test-whatsapp", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setResultado(d);
    } catch (e) {
      setResultado({ error: String(e) });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="card-elegant p-5 mt-6">
      <p className="text-sm font-bold mb-1" style={{ color: "#f59e0b" }}>🔧 Diagnóstico WhatsApp</p>
      <p className="text-xs mb-4" style={{ color: "#888" }}>
        Envía un mensaje de prueba al número ADMIN_WHATSAPP y muestra la respuesta exacta de Twilio.
      </p>
      <button onClick={ejecutar} disabled={cargando} className="btn-gold w-full mb-4"
        style={{ background: "linear-gradient(135deg,#f59e0b,#fbbf24)" }}>
        {cargando ? "Enviando..." : "Enviar mensaje de prueba"}
      </button>
      {resultado && (
        <div className="rounded-xl p-4 text-xs font-mono whitespace-pre-wrap break-all"
          style={{ background: resultado.ok ? "#f0fdf4" : "#fff1f2", color: resultado.ok ? "#166534" : "#991b1b", border: `1px solid ${resultado.ok ? "#bbf7d0" : "#fecaca"}` }}>
          {JSON.stringify(resultado, null, 2)}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                TAB COMISIONES                       */
/* ═══════════════════════════════════════════════════ */

type PeriodoC = "hoy" | "semana" | "quincena" | "mes";

function TabComisiones({ reservas, token, perm }: { reservas: Reserva[]; token: string; perm: Permisos["comisiones"] }) {
  const [periodo, setPeriodo] = useState<PeriodoC>("semana");
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  useEffect(() => {
    fetch("/api/trabajadores", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTrabajadores(Array.isArray(d) ? d : [])).catch(() => {});
  }, [token]);

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  function fechaInicio(): string {
    if (periodo === "hoy") return hoy;
    const [y, m, dia] = hoy.split("-").map(Number);
    const d = new Date(y, m - 1, dia); // local, evita ambigüedad UTC
    if (periodo === "semana") {
      const dow = d.getDay(); // 0=dom,1=lun
      d.setDate(dia - (dow === 0 ? 6 : dow - 1));
    } else if (periodo === "quincena") {
      d.setDate(dia <= 15 ? 1 : 16);
    } else if (periodo === "mes") {
      d.setDate(1);
    }
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  const inicio = fechaInicio();
  const reservasPeriodo = reservas.filter(r =>
    r.estado === "completada" && r.fecha >= inicio && r.fecha <= hoy
  );

  const periodoLabels: Record<PeriodoC, string> = { hoy: "Hoy", semana: "Esta semana", quincena: "Esta quincena", mes: "Este mes" };

  const resumen = trabajadores.map(t => {
    const citas = reservasPeriodo.filter(r => r.trabajador_id === t.id);
    const ingresoBase = citas.reduce((s, r) => s + Number(r.anticipo || 0) + Number(r.pago_saldo || 0), 0);
    const comision = Math.round(ingresoBase * ((t.porcentaje ?? 0) / 100));
    return { ...t, citas: citas.length, ingresoBase, comision };
  });

  const totalPeriodo = reservasPeriodo.reduce((s, r) => s + Number(r.anticipo || 0) + Number(r.pago_saldo || 0), 0);
  const totalComisiones = resumen.reduce((s, t) => s + t.comision, 0);

  return (
    <div>
      <h2 className="section-title mb-1">{"💰 Comisiones"}</h2>
      <p className="text-xs mb-4" style={{ color: "#888" }}>Basado en reservas completadas.</p>

      {/* Selector de período */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {(["hoy", "semana", "quincena", "mes"] as PeriodoC[]).map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0"
            style={periodo === p
              ? { background: "linear-gradient(135deg,var(--c-primary),var(--c-primary-light))", color: "white" }
              : { background: "var(--c-border-soft)", color: "#888" }}>
            {periodoLabels[p]}
          </button>
        ))}
      </div>

      {/* Resumen general */}
      {perm.verResumen && (
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="card-elegant p-5 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--c-primary)" }}>{reservasPeriodo.length}</p>
          <p className="text-xs mt-1" style={{ color: "#888" }}>Servicios completados</p>
        </div>
        <div className="card-elegant p-5 text-center">
          <p className="text-2xl font-bold" style={{ color: "#10b981" }}>{perm.verMontos ? formatPrecio(totalPeriodo) : "••••"}</p>
          <p className="text-xs mt-1" style={{ color: "#888" }}>Ingresos del período</p>
        </div>
      </div>
      )}

      {/* Por trabajador */}
      {perm.verDetalleTrabajadoras && (
        trabajadores.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">{"👥"}</p>
            <p className="text-sm" style={{ color: "#888" }}>No hay trabajadores registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumen.map(t => (
              <div key={t.id} className="card-elegant p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold">{"👩"} {t.nombre}</p>
                    {t.especialidad && <p className="text-xs mt-0.5" style={{ color: "#888" }}>{t.especialidad}</p>}
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: "var(--c-primary)22", color: "var(--c-primary)" }}>
                    {t.porcentaje ?? 0}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl p-3" style={{ background: "var(--c-border-soft)" }}>
                    <p className="text-lg font-bold" style={{ color: "var(--c-primary)" }}>{t.citas}</p>
                    <p className="text-xs" style={{ color: "#888" }}>Citas</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "var(--c-border-soft)" }}>
                    <p className="text-sm font-bold" style={{ color: "#333" }}>{perm.verMontos ? formatPrecio(t.ingresoBase) : "••••"}</p>
                    <p className="text-xs" style={{ color: "#888" }}>Generado</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: t.comision > 0 ? "#f0fff4" : "var(--c-border-soft)", border: t.comision > 0 ? "1px solid #10b981" : "none" }}>
                    <p className="text-sm font-bold" style={{ color: t.comision > 0 ? "#10b981" : "#bbb" }}>{perm.verMontos ? formatPrecio(t.comision) : "••••"}</p>
                    <p className="text-xs" style={{ color: "#888" }}>Comisión</p>
                  </div>
                </div>
                {t.citas === 0 && (
                  <p className="text-xs text-center mt-2" style={{ color: "#ccc" }}>Sin citas completadas en este período</p>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {perm.verDetalleTrabajadoras && totalComisiones > 0 && (
        <div className="card-elegant p-5 mt-4" style={{ border: "1.5px solid var(--c-primary)", background: "linear-gradient(135deg,var(--c-bg-to),var(--c-primary-bg))" }}>
          <div className="flex justify-between items-center">
            <p className="font-bold" style={{ color: "var(--c-primary)" }}>Total a pagar en comisiones</p>
            <p className="text-xl font-bold" style={{ color: "var(--c-primary)" }}>{perm.verMontos ? formatPrecio(totalComisiones) : "••••"}</p>
          </div>
          <p className="text-xs mt-1" style={{ color: "#888" }}>{periodoLabels[periodo]} · {resumen.filter(t => t.citas > 0).length} trabajadora(s)</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                  TAB CUMPLEAÑOS                     */
/* ═══════════════════════════════════════════════════ */

type ClienteCumple = { id: string; nombre: string; whatsapp: string; fecha_nacimiento: string };

function diasParaCumple(fecha_nacimiento: string): number {
  const hoyDate = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }));
  const [, mes, dia] = fecha_nacimiento.split("-").map(Number);
  const anio = hoyDate.getFullYear();
  let proxCumple = new Date(anio, mes - 1, dia);
  if (proxCumple < hoyDate) proxCumple = new Date(anio + 1, mes - 1, dia);
  const diff = Math.round((proxCumple.getTime() - hoyDate.getTime()) / 86400000);
  return diff;
}

function formatFechaNacimiento(fecha: string): string {
  const [, m, d] = fecha.split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(d)} ${meses[Number(m) - 1]}`;
}

function mensajeCumpleanos(nombre: string, descuento = 25): string {
  return (
    `💅 *Leila Studio Nails Beauty*\n\n` +
    `🎂 *¡Feliz cumpleaños, ${nombre}!*\n\n` +
    `Hoy es tu día especial y queremos celebrarlo contigo. Gracias por confiar en nosotras para realzar tu belleza ✨\n\n` +
    `🎁 *Tu regalo de cumpleaños:*\n` +
    `${descuento}% de descuento en tu próxima cita, válido durante todo tu mes de cumpleaños 🌸\n\n` +
    `📲 Reserva cuando quieras:\n` +
    `https://leila-studio.vercel.app/reservar\n\n` +
    `*¡Te esperamos con mucho cariño!* 💖`
  );
}

function waLink(whatsapp: string, mensaje?: string): string {
  const tel = whatsapp.replace(/\D/g, "");
  const phone = tel.startsWith("57") ? tel : `57${tel}`;
  const base = `https://wa.me/${phone}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

function abrirWhatsApp(whatsapp: string, mensaje: string) {
  const tel = whatsapp.replace(/\D/g, "");
  const phone = tel.startsWith("57") ? tel : `57${tel}`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

function TabCumpleanos({ token, perm, onCumpleanosHoyChange }: { token: string; perm: Permisos["cumpleanos"]; onCumpleanosHoyChange: (c: { id: string; nombre: string; whatsapp: string }[]) => void }) {
  const [clientes, setClientes] = useState<ClienteCumple[]>([]);
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [descuentoCumple, setDescuentoCumple] = useState(25);
  const [descuentoInput, setDescuentoInput] = useState("25");
  const [msgDescuento, setMsgDescuento] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmandoEliminarCumple, setConfirmandoEliminarCumple] = useState<string | null>(null);

  const auth = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch("/api/admin/extras-config", { headers: auth })
      .then(r => r.json())
      .then(d => {
        const v = Number(d.descuentoCumpleanos ?? 25);
        setDescuentoCumple(v);
        setDescuentoInput(String(v));
      })
      .catch(() => {});
  }, [token]);

  async function guardarDescuento() {
    const val = Math.min(100, Math.max(0, Number(descuentoInput) || 0));
    const res = await fetch("/api/admin/extras-config", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify({ descuentoCumpleanos: val }),
    });
    if (res.ok) setDescuentoCumple(val);
    setMsgDescuento(res.ok ? { ok: true, texto: "✓ Guardado" } : { ok: false, texto: "Error" });
    setTimeout(() => setMsgDescuento(null), 2000);
  }

  function copiarMensaje(id: string, nombre: string) {
    navigator.clipboard.writeText(mensajeCumpleanos(nombre, descuentoCumple)).then(() => {
      setCopiado(id);
      setTimeout(() => setCopiado(null), 2500);
    });
  }

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const res = await fetch("/api/admin/cumpleanos", { headers: auth });
    const data = await res.json();
    if (Array.isArray(data)) {
      const sorted = [...data].sort((a, b) => diasParaCumple(a.fecha_nacimiento) - diasParaCumple(b.fecha_nacimiento));
      setClientes(sorted);
      const hoyMD = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(5);
      onCumpleanosHoyChange(sorted.filter(c => c.fecha_nacimiento.slice(5) === hoyMD));
    }
  }

  async function agregar() {
    setError("");
    if (!nombre.trim() || !whatsapp.trim() || !fechaNacimiento) return setError("Completa todos los campos");
    setGuardando(true);
    const res = await fetch("/api/admin/cumpleanos", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), whatsapp: whatsapp.trim(), fecha_nacimiento: fechaNacimiento }),
    });
    setGuardando(false);
    if (res.ok) {
      setNombre(""); setWhatsapp(""); setFechaNacimiento("");
      cargar();
    } else {
      const d = await res.json();
      setError(d.error || "Error al guardar");
    }
  }

  async function eliminar(id: string) {
    await fetch(`/api/admin/cumpleanos/${id}`, { method: "DELETE", headers: auth });
    cargar();
  }

  const hoyMD = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(5);
  const cumpleHoy = clientes.filter(c => c.fecha_nacimiento.slice(5) === hoyMD);
  const proximos = clientes.filter(c => c.fecha_nacimiento.slice(5) !== hoyMD);

  return (
    <div>
      <h2 className="section-title mb-1">🎂 Cumpleaños</h2>
      <p className="text-xs mb-5" style={{ color: "#888" }}>Registra clientes y envíales un saludo con {descuentoCumple}% de descuento directo por WhatsApp.</p>

      {/* Descuento cumpleaños */}
      <div className="card-elegant p-4 mb-5">
        <label className="text-xs font-semibold block mb-2" style={{ color: "#888" }}>🎁 Descuento cumpleaños (%)</label>
        <div className="flex gap-2 items-center">
          <input
            type="number" min="0" max="100" step="1"
            value={descuentoInput}
            onChange={e => setDescuentoInput(e.target.value)}
            style={{ maxWidth: "120px" }}
          />
          <button onClick={guardarDescuento} className="btn-gold text-sm" style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem" }}>
            Guardar
          </button>
          {msgDescuento && <span className="text-xs font-semibold" style={{ color: msgDescuento.ok ? "#10b981" : "#e91e8c" }}>{msgDescuento.texto}</span>}
        </div>
        <p className="text-xs mt-1" style={{ color: "#aaa" }}>Aparece en el mensaje de WhatsApp de cumpleaños</p>
      </div>

      {/* Formulario */}
      {perm.crear && (
        <div className="card-elegant p-5 mb-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--c-primary)" }}>Registrar cliente</p>
          <div className="space-y-3">
            <input type="text" placeholder="Nombre completo"
              value={nombre} onChange={e => setNombre(toTitleCase(e.target.value))} />
            <input type="tel" placeholder="WhatsApp (ej: 3001234567)"
              value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ""))} />
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "#888" }}>Fecha de nacimiento</label>
              <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs mt-2" style={{ color: "#e91e8c" }}>{error}</p>}
          <button onClick={agregar} disabled={guardando} className="btn-gold w-full mt-4">
            {guardando ? "Guardando..." : "+ Agregar cliente"}
          </button>
        </div>
      )}

      {/* Hoy */}
      {cumpleHoy.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-black uppercase tracking-widest" style={{ color: "#ec4899" }}>🎉 Hoy</span>
            <div className="flex-1 h-px" style={{ background: "#f9a8d4" }} />
          </div>
          <div className="space-y-3">
            {cumpleHoy.map(c => (
              <div key={c.id} className="card-elegant p-4"
                style={{ border: "1.5px solid #f9a8d4", background: "linear-gradient(135deg,#fff0f6,#fdf2f8)" }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-bold truncate" style={{ color: "#be185d" }}>👤 {c.nombre}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>📱 {c.whatsapp} · 🎂 {formatFechaNacimiento(c.fecha_nacimiento)}</p>
                  </div>
                  {perm.eliminar && (
                    confirmandoEliminarCumple === c.id ? (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setConfirmandoEliminarCumple(null); eliminar(c.id); }}
                          className="px-2 py-1 rounded-xl text-xs font-bold" style={{ background: "#ef4444", color: "white" }}>
                          Sí
                        </button>
                        <button onClick={() => setConfirmandoEliminarCumple(null)}
                          className="px-2 py-1 rounded-xl text-xs font-bold" style={{ background: "var(--c-border-soft)", color: "#888" }}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmandoEliminarCumple(c.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
                        style={{ background: "#fce4ec", color: "#e91e8c" }}>
                        ✕
                      </button>
                    )
                  )}
                </div>
                <div className="flex gap-2">
                  {perm.enviar && (
                    <button onClick={() => abrirWhatsApp(c.whatsapp, mensajeCumpleanos(c.nombre, descuentoCumple))}
                      className="btn-gold flex-1 flex items-center justify-center gap-2 text-sm"
                      style={{ background: "linear-gradient(135deg,#25d366,#128c7e)" }}>
                      <span>📲</span> Enviar
                    </button>
                  )}
                  {perm.enviar && (
                    <button onClick={() => copiarMensaje(c.id, c.nombre)}
                      className="px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0"
                      style={{ background: copiado === c.id ? "#f0fff4" : "var(--c-border-soft)", color: copiado === c.id ? "#10b981" : "#666", border: copiado === c.id ? "1px solid #10b981" : "none" }}>
                      {copiado === c.id ? "✓ Copiado" : "📋 Copiar"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximos */}
      {proximos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-black uppercase tracking-widest" style={{ color: "#888" }}>Próximos</span>
            <div className="flex-1 h-px" style={{ background: "var(--c-border-soft)" }} />
          </div>
          <div className="space-y-3">
            {proximos.map(c => {
              const dias = diasParaCumple(c.fecha_nacimiento);
              return (
                <div key={c.id} className="card-elegant p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-bold truncate">👤 {c.nombre}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#888" }}>
                        📱 {c.whatsapp} · 📅 {formatFechaNacimiento(c.fecha_nacimiento)}
                        <span className="ml-2 font-semibold" style={{ color: "var(--c-primary)" }}>
                          {dias === 1 ? "· mañana 🎉" : `· en ${dias} días`}
                        </span>
                      </p>
                    </div>
                    {perm.eliminar && (
                      confirmandoEliminarCumple === c.id ? (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { setConfirmandoEliminarCumple(null); eliminar(c.id); }}
                            className="px-2 py-1 rounded-xl text-xs font-bold" style={{ background: "#ef4444", color: "white" }}>
                            Sí
                          </button>
                          <button onClick={() => setConfirmandoEliminarCumple(null)}
                            className="px-2 py-1 rounded-xl text-xs font-bold" style={{ background: "var(--c-border-soft)", color: "#888" }}>
                            No
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmandoEliminarCumple(c.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
                          style={{ background: "#fce4ec", color: "#e91e8c" }}>
                          ✕
                        </button>
                      )
                    )}
                  </div>
                  <div className="flex gap-2">
                    {perm.enviar && (
                      <button onClick={() => abrirWhatsApp(c.whatsapp, mensajeCumpleanos(c.nombre, descuentoCumple))}
                        className="btn-gold flex-1 flex items-center justify-center gap-2 text-sm">
                        <span>📲</span> Enviar
                      </button>
                    )}
                    {perm.enviar && (
                      <button onClick={() => copiarMensaje(c.id, c.nombre)}
                        className="px-4 py-2 rounded-xl text-sm font-bold flex-shrink-0"
                        style={{ background: copiado === c.id ? "#f0fff4" : "var(--c-border-soft)", color: copiado === c.id ? "#10b981" : "#666", border: copiado === c.id ? "1px solid #10b981" : "none" }}>
                        {copiado === c.id ? "✓ Copiado" : "📋 Copiar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {clientes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🎂</p>
          <p className="text-sm" style={{ color: "#888" }}>No hay clientes registrados aún</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                 TAB PROMOCIONES                     */
/* ═══════════════════════════════════════════════════ */

type PromoRec = { id: string; dia: string; porcentaje: number };
type PromoPunt = { id: string; fecha: string; porcentaje: number };

const DIAS_LABEL: Record<string, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
};

function mensajePromocion(label: string, porcentaje: number, esFecha: boolean): string {
  const diaTexto = esFecha
    ? new Date(label + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })
    : DIAS_LABEL[label] ?? label;
  const diaUpper = diaTexto.charAt(0).toUpperCase() + diaTexto.slice(1);
  return (
    `💅 *Leila Studio Nails Beauty*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🎉 *¡PROMOCIÓN ESPECIAL — ${diaUpper.toUpperCase()}!* 🎉\n\n` +
    `✨ ${esFecha ? "Este día" : `Cada ${diaTexto}`}, todos nuestros servicios tienen\n` +
    `un increíble *${porcentaje}% de descuento* pensado\n` +
    `especialmente para ti. 💖\n\n` +
    `💅 Manicura · Pedicura · Nail Art y más...\n\n` +
    `📲 *Reserva ahora y aprovecha esta oferta:*\n` +
    `https://leila-studio.vercel.app/reservar\n\n` +
    `⏰ _Válido únicamente ${esFecha ? `el ${diaTexto}` : `los ${diaTexto}s`}._\n` +
    `¡No dejes pasar tu cita! 🌸\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Leila Studio — Donde cada detalle transforma tu imagen_ ✨`
  );
}

function TabPromociones({ token, perm }: { token: string; perm: Permisos["promociones"] }) {
  const [recurrentes, setRecurrentes] = useState<PromoRec[]>([]);
  const [puntuales, setPuntuales] = useState<PromoPunt[]>([]);
  const [diaSel, setDiaSel] = useState("lunes");
  const [pctRec, setPctRec] = useState("");
  const [fechaSel, setFechaSel] = useState("");
  const [pctPunt, setPctPunt] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmandoEliminarRec, setConfirmandoEliminarRec] = useState<string | null>(null);
  const [confirmandoEliminarPunt, setConfirmandoEliminarPunt] = useState<string | null>(null);
  const auth = { Authorization: `Bearer ${token}` };

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const res = await fetch("/api/admin/promociones", { headers: auth });
    const d = await res.json();
    setRecurrentes(Array.isArray(d.recurrentes) ? d.recurrentes : []);
    setPuntuales(Array.isArray(d.puntuales) ? d.puntuales : []);
  }

  async function accion(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/promociones", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { cargar(); setMsg({ ok: true, texto: "✓ Guardado" }); setTimeout(() => setMsg(null), 2500); }
    else { const d = await res.json(); setMsg({ ok: false, texto: d.error || "Error" }); }
  }

  async function agregarRec() {
    const p = Number(pctRec);
    if (!p || p < 1 || p > 99) return setMsg({ ok: false, texto: "Porcentaje entre 1 y 99" });
    await accion({ accion: "agregar", tipo: "recurrente", dia: diaSel, porcentaje: p });
    setPctRec("");
  }

  async function agregarPunt() {
    const p = Number(pctPunt);
    if (!fechaSel) return setMsg({ ok: false, texto: "Selecciona una fecha" });
    if (!p || p < 1 || p > 99) return setMsg({ ok: false, texto: "Porcentaje entre 1 y 99" });
    await accion({ accion: "agregar", tipo: "puntual", fecha: fechaSel, porcentaje: p });
    setPctPunt(""); setFechaSel("");
  }

  // Mensaje para el estado de WA: usa la primera promo activa o la primera que haya
  const promoPreview = puntuales[0]
    ? mensajePromocion(puntuales[0].fecha, puntuales[0].porcentaje, true)
    : recurrentes[0]
    ? mensajePromocion(recurrentes[0].dia, recurrentes[0].porcentaje, false)
    : mensajePromocion("lunes", 20, false);

  function copiarMensaje() {
    navigator.clipboard.writeText(promoPreview).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  return (
    <div>
      <h2 className="section-title mb-1">🎉 Promociones</h2>
      <p className="text-xs mb-5" style={{ color: "#888" }}>
        Los descuentos se aplican automáticamente a todos los servicios en la página de reserva el día indicado.
        Las puntuales tienen prioridad sobre las recurrentes.
      </p>
      {msg && <p className="text-xs mb-4 text-center font-semibold" style={{ color: msg.ok ? "#10b981" : "#e91e8c" }}>{msg.texto}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

        {/* ── Recurrentes ── */}
        <div className="card-elegant p-5" style={{ boxShadow: "0 4px 16px var(--c-card-shadow-base), 0 8px 32px var(--c-card-shadow)" }}>
          <p className="text-sm font-bold mb-4" style={{ color: "var(--c-primary)" }}>📅 Por día de la semana</p>
          {perm.crearRecurrente && (
            <div className="flex gap-2 mb-4">
              <select value={diaSel} onChange={e => setDiaSel(e.target.value)} style={{ flex: 2 }}>
                {Object.entries(DIAS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input type="number" min={1} max={99} placeholder="%" value={pctRec}
                onChange={e => setPctRec(e.target.value)} style={{ flex: 1, textAlign: "center" }} />
              <button onClick={agregarRec} className="btn-gold text-xs px-3" style={{ padding: "0.5rem 0.75rem", flexShrink: 0 }}>
                + Agregar
              </button>
            </div>
          )}
          {recurrentes.length === 0
            ? <p className="text-xs text-center py-4" style={{ color: "#bbb" }}>Sin promociones recurrentes</p>
            : <div className="space-y-2">
                {recurrentes.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background: "var(--c-border-soft)" }}>
                    <span className="text-sm font-semibold">{DIAS_LABEL[r.dia]} — <span style={{ color: "#10b981" }}>{r.porcentaje}% off</span></span>
                    {perm.eliminar && (
                      confirmandoEliminarRec === r.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => { setConfirmandoEliminarRec(null); accion({ accion: "eliminar", tipo: "recurrente", id: r.id }); }}
                            className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: "#ef4444", color: "white" }}>Sí</button>
                          <button onClick={() => setConfirmandoEliminarRec(null)}
                            className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: "var(--c-border-soft)", color: "#888" }}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmandoEliminarRec(r.id)}
                          className="text-xs px-2 py-1 rounded-lg" style={{ background: "#fee2e2", color: "#ef4444" }}>✕</button>
                      )
                    )}
                  </div>
                ))}
              </div>
          }
        </div>

        {/* ── Puntuales ── */}
        <div className="card-elegant p-5" style={{ boxShadow: "0 4px 16px var(--c-card-shadow-base), 0 8px 32px var(--c-card-shadow)" }}>
          <p className="text-sm font-bold mb-4" style={{ color: "var(--c-primary)" }}>📆 Fecha específica</p>
          {perm.crearPuntual && (
            <div className="flex gap-2 mb-4">
              <input type="date" min={hoy} value={fechaSel} onChange={e => setFechaSel(e.target.value)} style={{ flex: 2 }} />
              <input type="number" min={1} max={99} placeholder="%" value={pctPunt}
                onChange={e => setPctPunt(e.target.value)} style={{ flex: 1, textAlign: "center" }} />
              <button onClick={agregarPunt} className="btn-gold text-xs" style={{ padding: "0.5rem 0.75rem", flexShrink: 0 }}>
                + Agregar
              </button>
            </div>
          )}
          {puntuales.length === 0
            ? <p className="text-xs text-center py-4" style={{ color: "#bbb" }}>Sin promociones puntuales</p>
            : <div className="space-y-2">
                {puntuales.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(p => {
                  const [y, m, d] = p.fecha.split("-");
                  const pasada = p.fecha < hoy;
                  return (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ background: pasada ? "#f9fafb" : "var(--c-border-soft)", opacity: pasada ? 0.6 : 1 }}>
                      <span className="text-sm font-semibold">
                        {d}/{m}/{y} — <span style={{ color: pasada ? "#bbb" : "#10b981" }}>{p.porcentaje}% off</span>
                        {pasada && <span className="text-xs ml-1" style={{ color: "#bbb" }}>(expirada)</span>}
                      </span>
                      {perm.eliminar && (
                        confirmandoEliminarPunt === p.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => { setConfirmandoEliminarPunt(null); accion({ accion: "eliminar", tipo: "puntual", id: p.id }); }}
                              className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: "#ef4444", color: "white" }}>Sí</button>
                            <button onClick={() => setConfirmandoEliminarPunt(null)}
                              className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: "var(--c-border-soft)", color: "#888" }}>No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmandoEliminarPunt(p.id)}
                            className="text-xs px-2 py-1 rounded-lg" style={{ background: "#fee2e2", color: "#ef4444" }}>✕</button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>

      {/* ── Mensaje WhatsApp ── */}
      {perm.copiarMensaje && (
        <div className="card-elegant p-5" style={{ boxShadow: "0 4px 16px var(--c-card-shadow-base), 0 8px 32px var(--c-card-shadow)" }}>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--c-primary)" }}>📲 Mensaje para estado de WhatsApp</p>
          <p className="text-xs mb-4" style={{ color: "#888" }}>
            {puntuales[0] ? `Usando promoción del ${puntuales[0].fecha}` : recurrentes[0] ? `Usando promoción de ${DIAS_LABEL[recurrentes[0].dia]}` : "Ejemplo con Lunes 20%"}
          </p>
          <div className="rounded-2xl p-4 mb-4 whitespace-pre-wrap text-xs leading-relaxed"
            style={{ background: "linear-gradient(135deg,#f0fdf4,#f0f9ff)", border: "1.5px solid #d1fae5", color: "#1a1a1a", fontFamily: "monospace" }}>
            {promoPreview}
          </div>
          <button onClick={copiarMensaje}
            className="btn-gold w-full flex items-center justify-center gap-2"
            style={copiado ? { background: "linear-gradient(135deg,#10b981,#059669)" } : {}}>
            {copiado ? "✓ ¡Copiado! Pégalo en tu estado de WhatsApp" : "📋 Copiar mensaje de estado"}
          </button>
        </div>
      )}
    </div>
  );
}
