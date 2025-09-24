#!/bin/bash
# Script de restauración generado automáticamente
# Fecha: Wed Sep 24 10:08:03 PM UTC 2025
# Base origen: Development

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Uso: $0 <DATABASE_URL_DESTINO>"
    echo ""
    echo "Ejemplo:"
    echo "  $0 postgresql://usuario:password@host:5432/database"
    echo ""
    echo "Este script restaurará:"
    echo "  • Esquema: backups/qartha_schema_20250924_220800.sql"
    echo "  • Datos: backups/qartha_data_20250924_220800.sql"
    echo "  • O completo: backups/qartha_full_20250924_220800.sql"
    exit 1
fi

TARGET_URL="$1"
echo "🔄 Restaurando respaldo en: ${TARGET_URL:0:30}..."

# Opción 1: Restaurar solo esquema
echo "1) Solo esquema:"
echo "   psql \"$TARGET_URL\" < \"backups/qartha_schema_20250924_220800.sql\""

# Opción 2: Restaurar solo datos
echo "2) Solo datos:"
echo "   psql \"$TARGET_URL\" < \"backups/qartha_data_20250924_220800.sql\""

# Opción 3: Restaurar completo (PELIGROSO - sobreescribe todo)
echo "3) Completo (¡CUIDADO!):"
echo "   psql \"$TARGET_URL\" < \"backups/qartha_full_20250924_220800.sql\""

echo ""
echo "⚠️  SELECCIONA LA OPCIÓN QUE NECESITES Y EJECÚTALA MANUALMENTE"
