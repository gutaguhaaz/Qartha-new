
#!/bin/bash
set -euo pipefail

echo "🛟 SCRIPT DE RESPALDO - Base de Datos Qartha"
echo "============================================="
echo ""

# 1) Verificar variables de entorno
echo "📋 Verificando configuración..."

# Leer desde .env si está disponible
if [ -f ".env" ]; then
    echo "Leyendo configuración desde .env..."
    export $(grep -E '^DATABASE_URL=' .env | head -1 | xargs) 2>/dev/null || true
    export $(grep -E '^DATABASE_URL_DEV=' .env | head -1 | xargs) 2>/dev/null || true
fi

# Determinar qué base respaldar
if [ -n "${DATABASE_URL_DEV:-}" ]; then
    BACKUP_URL="$DATABASE_URL_DEV"
    DB_LABEL="Development"
    echo "🎯 Respaldando base de DEVELOPMENT"
elif [ -n "${DATABASE_URL:-}" ]; then
    BACKUP_URL="$DATABASE_URL"
    DB_LABEL="Current"
    echo "🎯 Respaldando base ACTUAL"
else
    echo "❌ ERROR: No se encontró DATABASE_URL ni DATABASE_URL_DEV"
    echo "Por favor, configura una de estas variables en tu .env"
    exit 1
fi

echo "   Base a respaldar: ${BACKUP_URL:0:30}..."
echo ""

# 2) Crear directorio de respaldos
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"
echo "📁 Directorio de respaldos: $BACKUP_DIR"

# 3) Generar nombres de archivos con timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_SCHEMA="${BACKUP_DIR}/qartha_schema_${TIMESTAMP}.sql"
BACKUP_DATA="${BACKUP_DIR}/qartha_data_${TIMESTAMP}.sql"
BACKUP_FULL="${BACKUP_DIR}/qartha_full_${TIMESTAMP}.sql"

echo ""
echo "🔄 Iniciando respaldo completo de la base '$DB_LABEL'..."

# 4) Respaldo del esquema (estructura) usando psql
echo "📐 Respaldando esquema (estructura de tablas)..."

# Crear respaldo del esquema usando solo psql
{
    echo "-- Respaldo de esquema generado el $(date)"
    echo "-- Base: $DB_LABEL ($BACKUP_URL)"
    echo ""
    
    # Obtener CREATE TABLE statements
    psql "$BACKUP_URL" -t -c "
        SELECT 
            'CREATE TABLE ' || schemaname || '.' || tablename || ' (' ||
            string_agg(
                column_name || ' ' || 
                CASE 
                    WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
                    WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
                    WHEN data_type = 'numeric' THEN 'NUMERIC(' || coalesce(numeric_precision::text, '') || 
                        CASE WHEN numeric_scale IS NOT NULL THEN ',' || numeric_scale ELSE '' END || ')'
                    WHEN data_type = 'integer' THEN 'INTEGER'
                    WHEN data_type = 'bigint' THEN 'BIGINT'
                    WHEN data_type = 'smallint' THEN 'SMALLINT'
                    WHEN data_type = 'boolean' THEN 'BOOLEAN'
                    WHEN data_type = 'text' THEN 'TEXT'
                    WHEN data_type = 'json' THEN 'JSON'
                    WHEN data_type = 'jsonb' THEN 'JSONB'
                    WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
                    WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
                    WHEN data_type = 'date' THEN 'DATE'
                    WHEN data_type = 'uuid' THEN 'UUID'
                    ELSE UPPER(data_type)
                END ||
                CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
                , ', '
            ) || ');'
        FROM information_schema.tables t
        JOIN information_schema.columns c ON c.table_name = t.tablename AND c.table_schema = t.schemaname
        WHERE t.schemaname = 'public' AND t.table_type = 'BASE TABLE'
        GROUP BY t.schemaname, t.tablename
        ORDER BY t.tablename;
    " 2>/dev/null || echo "-- Error obteniendo estructura de tablas"
    
    echo ""
    echo "-- Indices y constraints (si existen)"
    psql "$BACKUP_URL" -t -c "
        SELECT indexdef || ';'
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
    " 2>/dev/null || echo "-- No se pudieron obtener índices"
    
} > "$BACKUP_SCHEMA"
echo "✅ Esquema guardado: $BACKUP_SCHEMA"

# 5) Respaldo de datos usando COPY
echo "📦 Respaldando datos..."
psql "$BACKUP_URL" -c "
DO \$\$
DECLARE
    table_record RECORD;
    sql_text TEXT;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        sql_text := 'COPY ' || table_record.tablename || ' TO STDOUT WITH CSV HEADER;';
        RAISE NOTICE 'Exporting table: %', table_record.tablename;
    END LOOP;
END\$\$;
" 2>/dev/null

# Crear respaldo de datos tabla por tabla
{
    echo "-- Respaldo de datos generado el $(date)"
    echo "-- Base: $DB_LABEL ($BACKUP_URL)"
    echo ""
    
    for table in $(psql "$BACKUP_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"); do
        if [ -n "$table" ]; then
            echo "-- Tabla: $table"
            echo "TRUNCATE TABLE $table RESTART IDENTITY CASCADE;"
            psql "$BACKUP_URL" -c "\COPY $table TO STDOUT WITH CSV HEADER" 2>/dev/null | \
            awk -v table="$table" '
            NR==1 { 
                header=$0; 
                gsub(/,/, ", ", header);
                print "INSERT INTO " table " (" header ") VALUES"
                next 
            }
            { 
                gsub(/"/, "'\''", $0);
                if (NR > 2) print ","
                printf "('\''%s'\'')", $0 
            }
            END { if (NR > 1) print ";" }'
            echo ""
        fi
    done
} > "$BACKUP_DATA"
echo "✅ Datos guardados: $BACKUP_DATA"

# 6) Respaldo completo combinado
echo "🗃️  Creando respaldo completo..."
{
    echo "-- Respaldo completo generado el $(date)"
    echo "-- Base: $DB_LABEL ($BACKUP_URL)"
    echo ""
    echo "-- ESQUEMA:"
    cat "$BACKUP_SCHEMA" 2>/dev/null || echo "-- Error leyendo esquema"
    echo ""
    echo "-- DATOS:"
    cat "$BACKUP_DATA" 2>/dev/null || echo "-- Error leyendo datos"
} > "$BACKUP_FULL"
echo "✅ Respaldo completo: $BACKUP_FULL"

# 7) Verificar integridad de los respaldos
echo ""
echo "🔍 Verificando integridad de respaldos..."

for file in "$BACKUP_SCHEMA" "$BACKUP_DATA" "$BACKUP_FULL"; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        lines=$(wc -l < "$file" 2>/dev/null || echo "0")
        echo "✅ $file ($size, $lines líneas)"
    else
        echo "❌ ERROR: $file está vacío o no existe"
        exit 1
    fi
done

# 8) Obtener estadísticas de la base
echo ""
echo "📊 Estadísticas de la base respaldada:"
echo "----------------------------------------"

# Contar tablas
TABLE_COUNT=$(psql "$BACKUP_URL" -t -c "
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
" | xargs)
echo "📋 Tablas: $TABLE_COUNT"

# Contar IDFs si existe la tabla
IDF_COUNT=$(psql "$BACKUP_URL" -t -c "
    SELECT COUNT(*) FROM idfs
" 2>/dev/null | xargs || echo "0")
echo "📄 IDFs: $IDF_COUNT"

# Contar usuarios si existe la tabla
USER_COUNT=$(psql "$BACKUP_URL" -t -c "
    SELECT COUNT(*) FROM users
" 2>/dev/null | xargs || echo "0")
echo "👥 Usuarios: $USER_COUNT"

# Listar todas las tablas
echo ""
echo "📝 Tablas en la base:"
psql "$BACKUP_URL" -c "\dt" 2>/dev/null || echo "No se pudieron listar las tablas"

# 9) Crear script de restauración
RESTORE_SCRIPT="${BACKUP_DIR}/restore_${TIMESTAMP}.sh"
cat > "$RESTORE_SCRIPT" << EOF
#!/bin/bash
# Script de restauración generado automáticamente
# Fecha: $(date)
# Base origen: $DB_LABEL

set -euo pipefail

if [ -z "\${1:-}" ]; then
    echo "Uso: \$0 <DATABASE_URL_DESTINO>"
    echo ""
    echo "Ejemplo:"
    echo "  \$0 postgresql://usuario:password@host:5432/database"
    echo ""
    echo "Este script restaurará:"
    echo "  • Esquema: $BACKUP_SCHEMA"
    echo "  • Datos: $BACKUP_DATA"
    echo "  • O completo: $BACKUP_FULL"
    exit 1
fi

TARGET_URL="\$1"
echo "🔄 Restaurando respaldo en: \${TARGET_URL:0:30}..."

# Opción 1: Restaurar solo esquema
echo "1) Solo esquema:"
echo "   psql \"\$TARGET_URL\" < \"$BACKUP_SCHEMA\""

# Opción 2: Restaurar solo datos
echo "2) Solo datos:"
echo "   psql \"\$TARGET_URL\" < \"$BACKUP_DATA\""

# Opción 3: Restaurar completo (PELIGROSO - sobreescribe todo)
echo "3) Completo (¡CUIDADO!):"
echo "   psql \"\$TARGET_URL\" < \"$BACKUP_FULL\""

echo ""
echo "⚠️  SELECCIONA LA OPCIÓN QUE NECESITES Y EJECÚTALA MANUALMENTE"
EOF

chmod +x "$RESTORE_SCRIPT"
echo ""
echo "🛠️  Script de restauración creado: $RESTORE_SCRIPT"

# 10) Resumen final
echo ""
echo "✅ RESPALDO COMPLETADO EXITOSAMENTE"
echo "===================================="
echo ""
echo "📦 Archivos creados:"
echo "   • Esquema:  $BACKUP_SCHEMA"
echo "   • Datos:    $BACKUP_DATA"  
echo "   • Completo: $BACKUP_FULL"
echo "   • Restaurar: $RESTORE_SCRIPT"
echo ""
echo "📊 Datos respaldados:"
echo "   • Tablas: $TABLE_COUNT"
echo "   • IDFs: $IDF_COUNT"
echo "   • Usuarios: $USER_COUNT"
echo ""
echo "🚀 Para migrar a la VM:"
echo "   1. Copia estos archivos a tu VM"
echo "   2. Usa el script de restauración"
echo "   3. O ejecuta directamente:"
echo "      psql \"<URL_VM>\" < \"$BACKUP_FULL\""
echo ""
echo "🛟 Los respaldos están en la carpeta: $BACKUP_DIR"
