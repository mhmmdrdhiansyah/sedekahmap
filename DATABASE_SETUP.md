# Database Setup Guide

## Environment

- **Platform**: Windows + Laragon
- **PostgreSQL**: Running via Laragon
- **PostGIS**: 3.6 (USE_GEOS=1 USE_PROJ=1 USE_STATS=1)
- **Database Name**: `sedekahmap`

## Connection String

```
postgresql://postgres:@localhost:5432/sedekahmap
```

## Verification Commands

```sql
-- Check PostgreSQL version
SELECT version();

-- Check PostGIS version
SELECT PostGIS_Version();

-- Check PostGIS full installation
SELECT postgis_full_version();
```

## Setup Steps (for reference)

1. Start PostgreSQL in Laragon
2. Create database: `CREATE DATABASE sedekahmap;`
3. Connect to database: `psql -U postgres -d sedekahmap`
4. Enable PostGIS: `CREATE EXTENSION IF NOT EXISTS postgis;`
5. Verify: `SELECT PostGIS_Version();`

## Files

- `.env.local` - Local database connection (not in git)
- `.env.example` - Template for other developers
