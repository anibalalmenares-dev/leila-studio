export type Servicio = {
  id: string;
  nombre: string;
  precio: number;
  duracionMin: number;
  categoria: string;
};

// Datos de seed — se usan solo para poblar Firestore la primera vez
export const SERVICIOS_SEED: Servicio[] = [
  { id: "man-trad", nombre: "Manicura tradicional", precio: 12000, duracionMin: 60, categoria: "manicura" },
  { id: "ped-trad", nombre: "Pedicura tradicional", precio: 12000, duracionMin: 60, categoria: "pedicura" },
  { id: "man-semi", nombre: "Manicura semi permanente", precio: 35000, duracionMin: 90, categoria: "manicura" },
  { id: "ped-semi", nombre: "Pedicura semi permanente", precio: 30000, duracionMin: 150, categoria: "pedicura" },
  { id: "man-gel", nombre: "Manicura semi con gel", precio: 60000, duracionMin: 150, categoria: "manicura" },
  { id: "man-ext", nombre: "Manicura Semi con Extensión", precio: 80000, duracionMin: 150, categoria: "manicura" },
  { id: "man-press", nombre: "Manicura Press on", precio: 70000, duracionMin: 150, categoria: "manicura" },
  { id: "combo-trad", nombre: "Manicura y pedicura tradicional", precio: 24000, duracionMin: 120, categoria: "combos" },
  { id: "combo-semi-trad", nombre: "Manicura semi sencilla y pedicura tradicional", precio: 50000, duracionMin: 150, categoria: "combos" },
  { id: "combo-gel-trad", nombre: "Manicura semi con gel y pedicura tradicional", precio: 62000, duracionMin: 210, categoria: "combos" },
  { id: "combo-press-trad", nombre: "Manicura Press on y pedicura tradicional", precio: 82000, duracionMin: 210, categoria: "combos" },
  { id: "combo-gel-semi", nombre: "Manicura Semi con Gel y Pedicura Semi", precio: 80000, duracionMin: 180, categoria: "combos" },
  { id: "combo-semi-semi", nombre: "Manicura Semi y Pedicura Semi", precio: 65000, duracionMin: 150, categoria: "combos" },
];

export const CATEGORIAS = [
  { id: "manicura",          label: "Manicura",               emoji: "💅" },
  { id: "pedicura",          label: "Pedicura",               emoji: "🦶" },
  { id: "nail-art",          label: "Nail Art & Uñas Avanzado", emoji: "💎" },
  { id: "cortes",            label: "Cortes de cabello",      emoji: "✂️" },
  { id: "peinados",          label: "Peinados & Secado",      emoji: "💨" },
  { id: "color",             label: "Color & Mechas",         emoji: "🎨" },
  { id: "tratamientos",      label: "Tratamientos Capilares", emoji: "🌿" },
  { id: "maquillaje",        label: "Maquillaje",             emoji: "💄" },
  { id: "maquillaje-eventos",label: "Maquillaje Especializado", emoji: "👰" },
  { id: "depilacion",        label: "Depilación",             emoji: "🌸" },
  { id: "depilacion-laser",  label: "Depilación Láser",       emoji: "⚡" },
  { id: "facial",            label: "Cuidado Facial",         emoji: "🧖" },
  { id: "masajes",           label: "Masajes & Spa",          emoji: "🪨" },
  { id: "cejas-pestanas",    label: "Cejas & Pestañas",       emoji: "👁️" },
  { id: "estetica-corporal", label: "Estética Corporal",      emoji: "🔬" },
  { id: "barberia",          label: "Barbería",               emoji: "🪒" },
  { id: "combos",            label: "Combos & Paquetes",      emoji: "🎀" },
];

export function formatPrecio(precio: number): string {
  return `$${precio.toLocaleString("es-CO")}`;
}

export function formatDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (m === 0) return `${h}:00 h`;
  return `${h}:${m.toString().padStart(2, "0")} h`;
}

export const ANTICIPO_FIJO = 10000;

export function calcularAnticipo(_precio: number): number {
  return ANTICIPO_FIJO;
}
