export type Servicio = {
  id: string;
  nombre: string;
  precio: number;
  duracionMin: number;
  categoria: string;
};

// Datos de seed — se usan solo para poblar Firestore la primera vez
export const SERVICIOS_SEED: Servicio[] = [
  { id: "man-trad", nombre: "Manicura tradicional", precio: 12000, duracionMin: 60, categoria: "individual" },
  { id: "ped-trad", nombre: "Pedicura tradicional", precio: 12000, duracionMin: 60, categoria: "individual" },
  { id: "man-semi", nombre: "Manicura semi permanente", precio: 35000, duracionMin: 90, categoria: "semi" },
  { id: "ped-semi", nombre: "Pedicura semi permanente", precio: 30000, duracionMin: 150, categoria: "semi" },
  { id: "man-gel", nombre: "Manicura semi con gel", precio: 60000, duracionMin: 150, categoria: "gel" },
  { id: "man-ext", nombre: "Manicura Semi con Extensión", precio: 80000, duracionMin: 150, categoria: "extension" },
  { id: "man-press", nombre: "Manicura Press on", precio: 70000, duracionMin: 150, categoria: "press" },
  { id: "combo-trad", nombre: "Manicura y pedicura tradicional", precio: 24000, duracionMin: 120, categoria: "combo" },
  { id: "combo-semi-trad", nombre: "Manicura semi sencilla y pedicura tradicional", precio: 50000, duracionMin: 150, categoria: "combo" },
  { id: "combo-gel-trad", nombre: "Manicura semi con gel y pedicura tradicional", precio: 62000, duracionMin: 210, categoria: "combo" },
  { id: "combo-press-trad", nombre: "Manicura Press on y pedicura tradicional", precio: 82000, duracionMin: 210, categoria: "combo" },
  { id: "combo-gel-semi", nombre: "Manicura Semi con Gel y Pedicura Semi", precio: 80000, duracionMin: 180, categoria: "combo" },
  { id: "combo-semi-semi", nombre: "Manicura Semi y Pedicura Semi", precio: 65000, duracionMin: 150, categoria: "combo" },
];

export const CATEGORIAS = [
  { id: "individual", label: "Servicios Individuales", emoji: "💅" },
  { id: "semi", label: "Semi Permanente", emoji: "✨" },
  { id: "gel", label: "Gel", emoji: "🌟" },
  { id: "extension", label: "Extensiones", emoji: "💎" },
  { id: "press", label: "Press On", emoji: "👑" },
  { id: "combo", label: "Combos", emoji: "🌸" },
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
