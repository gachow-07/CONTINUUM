-- Component markers: a manually placed position (model space, millimetres) that ties a component to a spot on the 3D assembly.
-- Null means "no marker placed". Markers are positions the team chose; nothing is detected automatically.
alter table public.subsystems add column if not exists marker_position jsonb
  check (marker_position is null or (jsonb_typeof(marker_position) = 'array' and jsonb_array_length(marker_position) = 3));
