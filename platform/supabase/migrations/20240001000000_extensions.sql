-- =============================================================
-- Migration: 20240001000000_extensions.sql
-- Purpose  : Enable PostgreSQL extensions required by the
--            Insurance/Healthcare Platform schema.
-- =============================================================

-- uuid_generate_v4() used as default PK generator throughout the schema.
create extension if not exists "uuid-ossp";

-- pgcrypto provides gen_random_bytes() and crypt() used for
-- any server-side hashing utilities and random token generation.
create extension if not exists "pgcrypto";
