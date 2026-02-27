-- Seed file for departments table used by Aspire Postgres initial state
-- This file creates a departments table and inserts two sample rows.
-- `id` is explicit (no default generation).

DROP TABLE IF EXISTS public.departments;

CREATE TABLE public.departments (
    id uuid NOT NULL,
    name text,
    description text,
    PRIMARY KEY (id)
);

INSERT INTO public.departments (id, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Backend', 'Test backend department description'),
('22222222-2222-2222-2222-222222222222', 'Frontend', 'Test frontend department description')
ON CONFLICT (id) DO NOTHING;
