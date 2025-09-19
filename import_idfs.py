import os, io, csv, json  # <--- agrega json
import psycopg2

CSV_PATH = "idfs.csv"  # tu archivo
TABLE = "public.idfs"

# ⚠️ SIN "id"
COLUMNS = [
    "cluster", "project", "code", "title", "description", "site", "room",
    "gallery", "documents", "diagram", "table_data", "created_at", "location"
]

DATABASE_URL = os.getenv("DATABASE_URL")
assert DATABASE_URL, "Falta DATABASE_URL en variables de entorno"

MODE = "replace"  # 'replace' borra y recarga, 'append' solo agrega


def read_csv_text(path):
    try:
        with open(path, "r", encoding="utf-8-sig", newline="") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(path, "r", encoding="latin-1", newline="") as f:
            return f.read()


# 1) Leemos CSV original (aunque traiga id)
raw = read_csv_text(CSV_PATH)

src = io.StringIO(raw)
reader = csv.DictReader(src)
buf = io.StringIO()

# 2) Reescribimos solo con columnas necesarias (ignorando 'id')
writer = csv.DictWriter(buf, fieldnames=COLUMNS, lineterminator="\n")
writer.writeheader()

for row in reader:
    clean = {col: (row.get(col) or "") for col in COLUMNS}

    # Si location viene vacío, toma site o project o un fallback
    loc_val = row.get("location") or row.get("site") or row.get(
        "project") or "N/A"
    # Convierte a JSON válido (si es string normal -> "Sabinas")
    clean["location"] = json.dumps(loc_val)

    writer.writerow(clean)

clean_csv = buf.getvalue()

# 3) Importamos a Postgres
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

if MODE == "replace":
    cur.execute(f"TRUNCATE TABLE {TABLE} RESTART IDENTITY;")

cols_sql = ", ".join(COLUMNS)
copy_sql = f"COPY {TABLE} ({cols_sql}) FROM STDIN WITH CSV HEADER"
cur.copy_expert(copy_sql, io.StringIO(clean_csv))

cur.close()
conn.close()
print("✅ Importación terminada (id ignorado)")
