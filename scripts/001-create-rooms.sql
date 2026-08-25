-- جدول الغرف: يخزّن حالة كل غرفة كاملة في عمود jsonb واحد.
create table if not exists rooms (
  id          serial primary key,
  code        text not null unique,
  state       jsonb not null,
  version     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- البحث عن الغرفة يتم دائماً بالكود.
create index if not exists rooms_code_idx on rooms (code);
