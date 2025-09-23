# import_idfs.py
import csv
import io
import json
import os
import sys
from datetime import datetime

import psycopg2

CSV_PATH = os.getenv("CSV_PATH", "idfs.csv")  # CSV fuente
TABLE = os.getenv("TABLE", "public.idfs")  # tabla destino
MODE = os.getenv("MODE", "replace")  # replace|append
TARGET = os.getenv("TARGET_DB", "dev")  # dev|prod

# Columnas destino (sin 'id')
COLUMNS = [
    "cluster", "project", "code", "title", "description", "site", "room",
    "gallery", "documents", "diagram", "table_data", "created_at", "location"
]


def env_url():
    if TARGET == "prod":
        url = os.getenv("DATABASE_URL_PROD") or os.getenv("DATABASE_URL")
    else:
        url = os.getenv("DATABASE_URL_DEV") or os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            f"Falta URL de DB para TARGET_DB={TARGET}. "
            f"Define DATABASE_URL_{TARGET.upper()} o DATABASE_URL")
    return url


def read_csv_text(path):
    try:
        with open(path, "r", encoding="utf-8-sig", newline="") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(path, "r", encoding="latin-1", newline="") as f:
            return f.read()


def main():
    db_url = env_url()
    print(
        f"➡️  Importando a {TARGET.upper()} → {TABLE} (MODE={MODE}) desde {CSV_PATH}"
    )

    # 1) Leer CSV original (aunque traiga 'id')
    raw = read_csv_text(CSV_PATH)
    src = io.StringIO(raw)
    reader = csv.DictReader(src)

    # Validación mínima de columnas fuente
    missing = [
        c for c in ["cluster", "project", "code", "title", "site", "room"]
        if c not in reader.fieldnames
    ]
    if missing:
        raise RuntimeError(f"Faltan columnas mínimas en CSV: {missing}")

    # 2) Normalizar CSV a sólo columnas destino
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=COLUMNS, lineterminator="\n")
    writer.writeheader()

    for row in reader:
        clean = {col: (row.get(col) or "") for col in COLUMNS}

        # Campos potencialmente JSON (si vienen como texto plano, los envolvemos)
        for jcol in ("gallery", "documents", "diagram", "table_data"):
            val = row.get(jcol)
            if val:
                try:
                    json.loads(val)  # ya es JSON válido
                    clean[jcol] = val
                except Exception:
                    # conviértelo a lista con un string
                    clean[jcol] = json.dumps([val])
            else:
                clean[jcol] = "[]"

        # created_at (si viene vacío, lo dejamos NULL usando cadena vacía; COPY interpreta como NULL si no hay DEFAULT)
        if not row.get("created_at"):
            clean["created_at"] = ""

        # location: si está vacío, usa fallback; y siempre JSON válido
        loc_val = (
            row.get("location")
            or row.get("site")
            or row.get("project")
            or "N/A"
        )
        try:
            # si ya es JSON, respétalo
            json.loads(loc_val)
            clean["location"] = loc_val
        except Exception:
            clean["location"] = json.dumps(loc_val)

        writer.writerow(clean)

    clean_csv = buf.getvalue()

    # 3) Conexión y transacción
    conn = psycopg2.connect(db_url)
    try:
        with conn:
            with conn.cursor() as cur:
                # backup previo (solo destino) por si hay que revertir manual
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_file = f"backup_{TABLE.replace('.', '_')}_{ts}.csv"
                print(f"🛟 Backup tabla destino → {backup_file}")
                with open(backup_file, "w", encoding="utf-8", newline="") as f:
                    cur.copy_expert(
                        (
                            f"COPY (SELECT * FROM {TABLE} ORDER BY id) "
                            "TO STDOUT WITH CSV HEADER"
                        ),
                        f,
                    )

                if MODE == "replace":
                    print("🧹 TRUNCATE + RESTART IDENTITY")
                    cur.execute(f"TRUNCATE TABLE {TABLE} RESTART IDENTITY;")

                # COPY
                cols_sql = ", ".join(COLUMNS)
                copy_sql = f"COPY {TABLE} ({cols_sql}) FROM STDIN WITH CSV HEADER"
                print("⬆️  COPY datos normalizados…")
                cur.copy_expert(copy_sql, io.StringIO(clean_csv))

                # Ajustar secuencia del id (si existe)
                print("🔧 Ajustando secuencia…")
                cur.execute(
                    "SELECT pg_get_serial_sequence(%s, %s)",
                    (TABLE, "id"),
                )
                seq = cur.fetchone()[0]
                if seq:
                    cur.execute(f"SELECT COALESCE(MAX(id),0) FROM {TABLE}")
                    max_id = cur.fetchone()[0]
                    cur.execute("SELECT setval(%s, %s)", (seq, max_id))
                print("✅ Importación terminada en transacción")
    except Exception as e:
        conn.rollback()
        print("❌ Error, ROLLBACK aplicado:", e)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
