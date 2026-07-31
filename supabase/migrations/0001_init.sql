-- AfterTaste initial schema.
-- Model: each user belongs to one household. Recipes, groceries, meal plan,
-- ratings, and favorites are shared across the household. Recently-viewed is
-- per-user. RLS scopes every row to the caller's household.
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Household',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  accent text default 'orange',
  theme text default 'system',
  units text default 'imperial',
  household_id uuid references households(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending', -- pending | accepted | revoked
  created_at timestamptz not null default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  category text default 'Dinner',
  image text,
  source_url text,
  rating numeric default 0,           -- community/source rating
  rating_count int default 0,
  cook_time text,
  cook_time_minutes int default 0,
  prep_time_minutes int default 0,
  total_time_minutes int default 0,
  servings int default 4,
  calories int default 0,
  difficulty text default 'Medium',
  cost int default 0,
  cooking_class_type text default 'Cozy Comfort Food',
  cuisine text default '',
  source text default 'Original',
  description text default '',
  ingredients jsonb not null default '[]',
  instructions jsonb not null default '[]',
  chef jsonb,
  -- shared personal ratings (household-wide)
  ease int default 0,
  taste int default 0,
  cleanup int default 0,
  make_again boolean,
  remade int default 0,
  tags text[] default '{}',
  is_favorite boolean default false,  -- shared favorite
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recipes_household_idx on recipes(household_id);

create table if not exists grocery_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  quantity text default '',
  category text default 'Pantry Essentials',
  checked boolean default false,
  recipe_id uuid references recipes(id) on delete set null,
  recipe_title text,
  position int default 0,
  created_at timestamptz not null default now()
);
create index if not exists grocery_household_idx on grocery_items(household_id);

create table if not exists meal_plan (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  meal text not null,                 -- Breakfast | Lunch | Dinner | Snack
  recipe_id uuid references recipes(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (household_id, date, meal)
);
create index if not exists meal_plan_household_idx on meal_plan(household_id);

create table if not exists recently_viewed (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- ---------------------------------------------------------------------------
-- Helper: caller's household id (security definer avoids RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function current_household_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table households enable row level security;
alter table profiles enable row level security;
alter table household_invites enable row level security;
alter table recipes enable row level security;
alter table grocery_items enable row level security;
alter table meal_plan enable row level security;
alter table recently_viewed enable row level security;

create policy "household members read" on households
  for select using (id = current_household_id());
create policy "household owner update" on households
  for update using (owner_id = auth.uid());

create policy "profiles read same household" on profiles
  for select using (household_id = current_household_id() or id = auth.uid());
create policy "profiles insert self" on profiles
  for insert with check (id = auth.uid());
create policy "profiles update self" on profiles
  for update using (id = auth.uid());

create policy "invites read" on household_invites
  for select using (household_id = current_household_id());
create policy "invites manage" on household_invites
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy "recipes rw" on recipes
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy "grocery rw" on grocery_items
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy "meal_plan rw" on meal_plan
  for all using (household_id = current_household_id())
  with check (household_id = current_household_id());

create policy "recently_viewed rw" on recently_viewed
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Triggers: auto-create a household + profile on signup; touch updated_at
-- ---------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  new_household uuid;
begin
  insert into households (name, owner_id)
    values ('My Household', new.id)
    returning id into new_household;
  insert into profiles (id, email, display_name, household_id)
    values (new.id, new.email, split_part(new.email, '@', 1), new_household);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_updated_at on recipes;
create trigger recipes_updated_at
  before update on recipes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Realtime (live household sync in a later phase)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table recipes, grocery_items, meal_plan;
