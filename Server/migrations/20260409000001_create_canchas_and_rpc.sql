create extension if not exists pgcrypto with schema extensions;

create table if not exists public.canchas (
  id uuid primary key default extensions.gen_random_uuid(),
  nombre text not null,
  direccion text,
  tipo_cancha int not null check (tipo_cancha in (5, 7, 9, 11)),
  ubicacion extensions.geography(point, 4326) not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists canchas_ubicacion_gix on public.canchas using gist (ubicacion);
create index if not exists canchas_tipo_cancha_idx on public.canchas (tipo_cancha);

create or replace function public.get_canchas_cercanas(
  lat float,
  lng float,
  radius_m int,
  tipos int[] default null
)
returns table (
  id uuid,
  nombre text,
  direccion text,
  tipo_cancha int,
  lat double precision,
  lng double precision,
  distancia_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with origin as (
    select extensions.st_setsrid(
      extensions.st_makepoint(lng, lat),
      4326
    )::extensions.geography as geom
  )
  select
    c.id,
    c.nombre,
    c.direccion,
    c.tipo_cancha,
    extensions.st_y(c.ubicacion::extensions.geometry) as lat,
    extensions.st_x(c.ubicacion::extensions.geometry) as lng,
    extensions.st_distance(c.ubicacion, origin.geom) as distancia_m
  from public.canchas c
  cross join origin
  where extensions.st_dwithin(c.ubicacion, origin.geom, radius_m)
    and (
      tipos is null
      or cardinality(tipos) = 0
      or c.tipo_cancha = any(tipos)
    )
  order by distancia_m asc;
$$;

grant execute on function public.get_canchas_cercanas(float, float, int, int[]) to anon, authenticated, service_role;
