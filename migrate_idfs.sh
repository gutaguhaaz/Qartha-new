
#!/bin/bash
set -euo pipefail

# Replace these with your actual connection strings from the Database panel
# Example format: postgresql://username:password@host:port/database
DEV_URL="<paste Development connection string here>"
PROD_URL="<paste Production connection string here>"

echo "Starting idfs migration from Development to Production..."

# 1) Read-only dump from DEV (data only, INSERTs)
echo "Step 1: Dumping data from Development database..."
pg_dump --no-owner --no-privileges --data-only --table=public.idfs --inserts "$DEV_URL" > /tmp/idfs_data.sql

# Verify dump is not empty
if ! grep -q "INSERT INTO public.idfs" /tmp/idfs_data.sql; then
    echo "ERROR: Empty dump or no INSERT statements found; aborting."
    exit 1
fi

echo "✓ Development data dumped successfully"

# 2) Load via staging and swap atomically in PROD
echo "Step 2: Preparing staging data..."
# Rewrite INSERT target to staging table
sed 's/INSERT INTO public\.idfs/INSERT INTO idfs_stage/g' /tmp/idfs_data.sql > /tmp/idfs_stage.sql

echo "Step 3: Loading data into Production via staging table..."
psql "$PROD_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

-- Create staging table with same structure as idfs
CREATE TEMP TABLE idfs_stage (LIKE public.idfs INCLUDING ALL);

-- Load the data into staging
\i /tmp/idfs_stage.sql

-- Sanity check: staging must not be empty
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM idfs_stage) = 0 THEN
    RAISE EXCEPTION 'Staging table is empty; aborting migration';
  END IF;
END $$;

-- Atomic swap: clear production table and insert from staging
TRUNCATE TABLE public.idfs RESTART IDENTITY;
INSERT INTO public.idfs SELECT * FROM idfs_stage;

COMMIT;
SQL

echo "✓ Data loaded successfully into Production"

# 3) Verify counts match (DEV vs PROD)
echo "Step 4: Verifying migration..."
echo "Development count:"
DEV_COUNT=$(psql "$DEV_URL" -t -c "SELECT COUNT(*) FROM public.idfs;" | xargs)

echo "Production count:"
PROD_COUNT=$(psql "$PROD_URL" -t -c "SELECT COUNT(*) FROM public.idfs;" | xargs)

echo "DEV: $DEV_COUNT rows"
echo "PROD: $PROD_COUNT rows"

if [ "$DEV_COUNT" = "$PROD_COUNT" ]; then
    echo "✅ Migration completed successfully! Row counts match."
else
    echo "❌ WARNING: Row counts do not match!"
    echo "Please investigate the discrepancy."
    exit 1
fi

# Clean up temporary files
rm -f /tmp/idfs_data.sql /tmp/idfs_stage.sql
echo "✓ Temporary files cleaned up"
echo "Migration complete!"
