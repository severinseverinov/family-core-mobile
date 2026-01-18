-- Inventory approval fields
alter table public.inventory
  add column if not exists is_approved boolean default true,
  add column if not exists requested_by uuid null;
