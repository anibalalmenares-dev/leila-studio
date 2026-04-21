export type Servicio = {
  id: string;
  nombre: string;
  precio: number;
  duracionMin: number;
  categoria: string;
};

export const SERVICIOS: Servicio[] = [
  { id: "man-trad", nombre: "Manicura tradicional", precio: 12000, duracionMin: 60, categoria: "individual" },
  { id: "ped-trad", nombre: "Pedicura tradicional", precio: 12000, duracionMin: 60, categoria: "individual" },
  { id: "man-semi", nombre: "Manicura semi permanente", precio: 35000, duracionMin: 90, categoria: "semi" },
  { id: "ped-semi", nombre: "Pedicura semi permanente", precio: 30000, duracionMin: 150, categoria: "semi" },
  { id: "man-gel", nombre: "Manicura semi con gel", precio: 55000, duracionMin: 150, categoria: "gel" },
  { id: "man-press", nombre: "Manicura Press on", precio: 70000, duracionMin: 150, categoria: "press" },
  { id: "combo-trad", nombre: "Manicura y pedicura tradicional", precio: 24000, duracionMin: 120, categoria: "combo" },
  { id: "combo-semi-trad", nombre: "Manicura semi sencilla y pedicura tradicional", precio: 50000, duracionMin: 150, categoria: "combo" },
  { id: "combo-gel-trad", nombre: "Manicura semi con gel y pedicura tradicional", precio: 62000, duracionMin: 210, categoria: "combo" },
  { id: "combo-press-trad", nombre: "Manicura Press on y pedicura tradicional", precio: 82000, duracionMin: 210, categoria: "combo" },
];

export const CATEGORIAS = [
  { id: "individual", label: "Servicios Individuales", emoji: "💅" },
  { id: "semi", label: "Semi Permanente", emoji: "✨" },
  { id: "gel", label: "Gel", emoji: "🌟" },
  { id: "press", label: "Press On", emoji: "👑" },
  { id: "combo", label: "Combos", emoji: "🌸" },
];

export const HORARIO_INICIO = 7;
export const HORARIO_FIN = 18;

export function formatPrecio(precio: number): string {
  return `$${precio.toLocaleString("es-CO")}`;
}

export function formatDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (m === 0) return `${h}:00 h`;
  return `${h}:${m.toString().padStart(2, "0")} h`;
}

export function calcularAnticipo(precio: number): number {
  return Math.ceil(precio * 0.3);
}
