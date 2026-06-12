create extension if not exists vector;

create table if not exists artifacts (
  id text primary key,
  kind text not null check (kind in (
    'source','chunk','token_stream','ast','motif_vector','process_ir',
    'obligation_ledger','verdict','pattern','anti_pattern','graft_plan',
    'recommendation','feedback_event','transfer_evaluation','extraction_failure',
    'benchmark_run'
  )),
  body jsonb not null,
  rulebase_hash text not null,
  extractor_version text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  created_by text not null
);

create table if not exists artifact_parents (
  child text not null references artifacts(id),
  parent text not null references artifacts(id),
  primary key (child, parent)
);

create table if not exists motif_vectors (
  artifact_id text primary key references artifacts(id),
  flat vector(32),
  facets jsonb
);

create table if not exists rulebase_versions (
  hash text primary key,
  released_at timestamptz,
  rules jsonb not null,
  diff_from_previous jsonb
);

create table if not exists artifact_tag_events (
  id bigserial primary key,
  artifact_id text not null references artifacts(id),
  tag text not null,
  op text not null check (op in ('tag', 'untag')),
  actor text not null,
  at timestamptz not null default now()
);

create or replace function forbid_artifact_update()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id
    or new.kind <> old.kind
    or new.body <> old.body
    or new.rulebase_hash <> old.rulebase_hash
    or new.extractor_version is distinct from old.extractor_version
    or new.created_at <> old.created_at
    or new.created_by <> old.created_by then
    raise exception 'artifacts are immutable except tags';
  end if;
  return new;
end;
$$;

drop trigger if exists artifacts_forbid_update on artifacts;
create trigger artifacts_forbid_update
before update on artifacts
for each row execute function forbid_artifact_update();

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'usc_reader') then
    create role usc_reader;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'usc_writer') then
    create role usc_writer;
  end if;
end
$$;

grant select on artifacts, artifact_parents, motif_vectors, rulebase_versions, artifact_tag_events to usc_reader;
grant select, insert on artifacts, artifact_parents, motif_vectors, rulebase_versions, artifact_tag_events to usc_writer;
grant update (tags) on artifacts to usc_writer;
grant usage, select on sequence artifact_tag_events_id_seq to usc_writer;
