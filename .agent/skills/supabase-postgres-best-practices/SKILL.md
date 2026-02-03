---
name: supabase-postgres-best-practices
description: Comprehensive performance optimization guide for Postgres, maintained by Supabase. Use this skill when writing SQL queries, designing schemas, implementing indexes, or reviewing database performance in Supabase projects.
---

# Supabase Postgres Best Practices

## Core Principles

Prioritize optimizations based on impact:

1. **Query Optimization**: Ensuring effective index usage.
2. **Connection Management**: Using connection pooling properly.
3. **Security**: Proper RLS policies.
4. **Schema Design**: Correct data types and constraints.

## Rules & Guidelines

### 1. Query Optimization (High Priority)

- **Missing Indexes**: Always index foreign keys and columns used in `WHERE`, `ORDER BY`, and `JOIN`.
- **Partial Indexes**: Use partial indexes for queries that frequently filter by a specific condition (e.g., `WHERE status = 'active'`).
- **No `SELECT *`**: Explicitly select only needed columns to reduce network load.

### 2. Connection Management

- Use Transaction Mode (port 6543) for serverless functions.
- Use Session Mode (port 5432) for long-lived connections.

### 3. Security (RLS)

- Always enable RLS on public tables (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`).
- Use helper functions `auth.uid()` and `auth.role()` in policies.
- Avoid join-heavy policies; denormalize data via triggers if performance suffers.

### 4. Schema Design

- Use `text` over `varchar(n)` unless strict length is required.
- Use `timestamptz` (timestamp with time zone) instead of `timestamp`.
- Use `uuid` for primary keys in distributed systems.

## Workflow Integration

When asked to design a table or write a query:

1. Propose the SQL schema/query.
2. Check against these best practices (indexes, types, RLS).
3. Explain why specific optimization choices were made (e.g., "Added index on `hotel_id` because it's a frequent filter").
