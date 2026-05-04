export type Turno = { inicio: string; fin: string };
export type HorarioConfig = { turnos: Turno[] };

export const HORARIO_DEFAULT: HorarioConfig = {
  turnos: [
    { inicio: "07:00", fin: "12:00" },
    { inicio: "14:00", fin: "19:00" },
  ],
};

export function slotAMinutos(slot: string): number {
  const [h, m] = slot.split(":").map(Number);
  return h * 60 + m;
}

export function minutosASlot(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function generarSlots(config: HorarioConfig = HORARIO_DEFAULT): string[] {
  const slots: string[] = [];
  for (const turno of config.turnos) {
    const ini = slotAMinutos(turno.inicio);
    const fin = slotAMinutos(turno.fin);
    for (let m = ini; m < fin; m += 30) {
      slots.push(minutosASlot(m));
    }
  }
  return slots;
}

export function slotCabeEnHorario(slot: string, duracionMin: number, config: HorarioConfig = HORARIO_DEFAULT): boolean {
  const inicio = slotAMinutos(slot);
  const fin = inicio + duracionMin;
  for (const turno of config.turnos) {
    const tIni = slotAMinutos(turno.inicio);
    const tFin = slotAMinutos(turno.fin);
    if (inicio >= tIni && fin <= tFin) return true;
  }
  return false;
}

export function slotsOcupados(reservas: { hora: string; duracion_min: number }[]): Set<string> {
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
  duracionMin: number,
  config: HorarioConfig = HORARIO_DEFAULT
): string[] {
  const todos = generarSlots(config);
  const ocupados = slotsOcupados(reservas);
  return todos.filter(slot => {
    if (!slotCabeEnHorario(slot, duracionMin, config)) return false;
    const inicio = slotAMinutos(slot);
    for (let m = inicio; m < inicio + duracionMin; m += 30) {
      if (ocupados.has(minutosASlot(m))) return false;
    }
    return true;
  });
}

export function ultimoInicioConfig(config: HorarioConfig = HORARIO_DEFAULT): number {
  const last = config.turnos[config.turnos.length - 1];
  return slotAMinutos(last.fin) - 30;
}

export function tardeSplitConfig(config: HorarioConfig = HORARIO_DEFAULT): number {
  if (config.turnos.length > 1) return slotAMinutos(config.turnos[1].inicio);
  return 14 * 60;
}
