-- Tabla de clientes
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text unique not null,
  creado_en timestamptz default now()
);

-- Tabla de reservas
create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  cliente_nombre text not null,
  cliente_telefono text not null,
  servicio_id text not null,
  servicio_nombre text not null,
  precio integer not null,
  duracion_min integer not null,
  fecha date not null,
  hora text not null,
  anticipo integer not null,
  pago_saldo integer,
  estado text not null default 'pendiente' check (estado in ('pendiente','confirmada','completada','cancelada')),
  expira_en timestamptz,
  confirmada_en timestamptz,
  completada_en timestamptz,
  cancelada_en timestamptz,
  creado_en timestamptz default now()
);

-- Índices para consultas frecuentes
create index if not exists idx_reservas_fecha on reservas(fecha);
create index if not exists idx_reservas_estado on reservas(estado);
create index if not exists idx_reservas_expira on reservas(expira_en) where estado = 'pendiente';
