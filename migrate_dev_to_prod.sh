
#!/bin/bash
set -euo pipefail

echo "🚀 Iniciando migración COMPLETA de Development Database → Production Database"
echo "⚠️  ADVERTENCIA: Este proceso REEMPLAZARÁ COMPLETAMENTE la base de Production"
echo ""

# 1) Verificar y configurar variables de entorno
echo "📋 Paso 1: Configurando variables de entorno..."

# Buscar en .env si las variables no están configuradas
if [ -f ".env" ]; then
    echo "Leyendo configuración desde .env..."
    export $(grep -E '^DATABASE_URL_DEV=' .env | xargs) 2>/dev/null || true
    export $(grep -E '^DATABASE_URL_PROD=' .env | xargs) 2>/dev/null || true
fi

# Verificar que las variables existen
if [ -z "${DATABASE_URL_DEV:-}" ]; then
    echo "❌ ERROR: DATABASE_URL_DEV no está configurada"
    echo "Por favor, configura DATABASE_URL_DEV en tu .env o como variable de entorno"
    exit 1
fi

if [ -z "${DATABASE_URL_PROD:-}" ]; then
    echo "❌ ERROR: DATABASE_URL_PROD no está configurada"
    echo "Por favor, configura DATABASE_URL_PROD en tu .env o como variable de entorno"
    exit 1
fi

echo "✅ Variables configuradas correctamente"
echo "   DEV:  ${DATABASE_URL_DEV:0:30}..."
echo "   PROD: ${DATABASE_URL_PROD:0:30}..."
echo ""

# 2) Crear respaldo COMPLETO de Producción
echo "💾 Paso 2: Creando respaldo completo de Production Database..."
BACKUP_FILE="prod_backup_$(date +%Y%m%d_%H%M).dump"

pg_dump -Fc -d "$DATABASE_URL_PROD" -f "$BACKUP_FILE"
echo "✅ Respaldo creado: $BACKUP_FILE"
echo ""

# 3) Generar dump COMPLETO de Development
echo "📦 Paso 3: Generando dump completo de Development Database..."
DEV_DUMP_FILE="dev_full_$(date +%Y%m%d_%H%M).dump"

pg_dump -Fc --no-owner --no-acl -d "$DATABASE_URL_DEV" -f "$DEV_DUMP_FILE"
echo "✅ Dump de Development creado: $DEV_DUMP_FILE"
echo ""

# 4) Cerrar conexiones activas en Producción
echo "🔌 Paso 4: Cerrando conexiones activas en Production Database..."
psql "$DATABASE_URL_PROD" -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid();
" || echo "⚠️  Algunas conexiones pueden no haberse cerrado (normal en Neon)"
echo "✅ Conexiones cerradas"
echo ""

# 5) Restaurar dump de Development SOBRE Producción
echo "🔄 Paso 5: Restaurando Development Database en Production..."
echo "   ⚠️  ELIMINANDO datos existentes en Production y restaurando desde Development..."

pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL_PROD" "$DEV_DUMP_FILE"
echo "✅ Restauración completada"
echo ""

# 6) Verificaciones en Producción
echo "🔍 Paso 6: Verificando migración en Production Database..."

echo "📊 Tablas en Production:"
psql "$DATABASE_URL_PROD" -c "\dt"
echo ""

echo "📈 Conteo de registros IDFs:"
IDF_COUNT=$(psql "$DATABASE_URL_PROD" -t -c "SELECT COUNT(*) FROM idfs;" | xargs)
echo "   IDFs en Production: $IDF_COUNT"
echo ""

echo "📈 Conteo de registros por cluster/proyecto:"
psql "$DATABASE_URL_PROD" -c "
SELECT cluster, project, COUNT(*) as count 
FROM idfs 
GROUP BY cluster, project 
ORDER BY cluster, project;
"
echo ""

# Verificar versión Alembic si existe
echo "🏷️  Versión de esquema:"
ALEMBIC_VERSION=$(psql "$DATABASE_URL_PROD" -t -c "SELECT version_num FROM alembic_version;" 2>/dev/null | xargs || echo "No hay tabla alembic_version")
echo "   Alembic version: $ALEMBIC_VERSION"
echo ""

# 7) Limpieza y resumen
echo "🧹 Limpiando archivos temporales..."
rm -f "$DEV_DUMP_FILE"
echo "✅ Archivo temporal eliminado: $DEV_DUMP_FILE"
echo ""

echo "✅ MIGRACIÓN COMPLETADA EXITOSAMENTE"
echo "📄 Resumen:"
echo "   • Production Database ha sido REEMPLAZADA completamente con datos de Development"
echo "   • Respaldo de Production guardado en: $BACKUP_FILE"
echo "   • Total de IDFs migrados: $IDF_COUNT"
echo "   • Para rollback: pg_restore -d \"\$DATABASE_URL_PROD\" \"$BACKUP_FILE\""
echo ""
echo "🚀 Tu deploy en Replit ahora tendrá todos los datos de Development Database"
