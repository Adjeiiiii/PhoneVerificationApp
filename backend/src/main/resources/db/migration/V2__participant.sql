create extension if not exists pgcrypto;

create table if not exists participant (
                                           id uuid primary key default gen_random_uuid(),
    phone text not null unique,
    phone_verified boolean not null default false,
    consent_at timestamptz,
    status text not null default 'subscribed',  -- subscribed | opted_out
    created_at timestamptz not null default now()
    );

create index if not exists idx_participant_phone on participant(phone);
