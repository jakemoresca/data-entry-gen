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

-- Create employees table and seed data
DROP TABLE IF EXISTS public.employees;

CREATE TABLE public.employees (
    id uuid NOT NULL,
    first_name text,
    last_name text,
    employee_number text,
    alias text,
    departmentid uuid,
    PRIMARY KEY (id)
);

INSERT INTO public.employees (id, first_name, last_name, employee_number, alias, departmentid) VALUES
('33333333-3333-3333-3333-333333333333', 'Super', 'User', '1234', 'su1234', '11111111-1111-1111-1111-111111111111'),
('44444444-4444-4444-4444-444444444444', 'Bunny', 'Hop', '5678', 'bh5678', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;
