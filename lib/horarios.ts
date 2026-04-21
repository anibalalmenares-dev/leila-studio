import { HORARIO_INICIO, HORARIO_FIN } from "./servicios";

export function generarSlots(): string[] {
  const slots: string[] = [];
  for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < HORARIO_FIN - 1 || h < HORARIO_FIN) {
      slots.push(`${h.toString().padStart(2, "0")}:30`);
    }
  }
  return slots;
}

export function slotAMinutos(slot: string): number {
  const [h, m] = slot.split(":").map(Number);
  return h * 60 + m;
}

export function minutosASlot(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function slotCabeEnHorario(slot: string, duracionMin: number): boolean {
  const inicio = slotAMinutos(slot);
  const fin = inicio + duracionMin;
  return fin <= HORARIO_FIN * 60;
}

export function slotsOcupados(
  reservas: { hora: string; duracion_min: number }[]
): Set<string> {
  const ocupados = new Set<string>();
  for (const r of reservas) {
    const inicio = slotAMinutos(r.hora);
    const fin = inicio + r.duracion_min;
    for (let m = inicio; m < fin; m += 30) {
      ocupados.add(minutosASlot(m));
    }
  }
  return ocupados;
}

export function getSlotsDisponibles(
  reservas: { hora: string; duracion_min: number }[],
  duracionMin: number
): string[] {
  const todos = generarSlots();
  const ocupados = slotsOcupados(reservas);

  return todos.filter((slot) => {
    if (!slotCabeEnHorario(slot, duracionMin)) return false;
    const inicio = slotAMinutos(slot);
    for (let m = inicio; m < inicio + duracionMin; m += 30) {
      if (ocupados.has(minutosASlot(m))) return false;
    }
    return true;
  });
}
