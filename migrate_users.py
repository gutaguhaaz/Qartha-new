
#!/usr/bin/env python3
import os
import psycopg2
from datetime import datetime
import sys

def get_db_urls():
    """Obtener las URLs de las bases de datos desde variables de entorno"""
    dev_url = os.getenv("DATABASE_URL_DEV") or os.getenv("DATABASE_URL")
    prod_url = os.getenv("DATABASE_URL_PROD") or os.getenv("DATABASE_URL")
    
    if not dev_url:
        raise RuntimeError("Falta DATABASE_URL_DEV o DATABASE_URL")
    if not prod_url:
        raise RuntimeError("Falta DATABASE_URL_PROD")
    
    return dev_url, prod_url

def migrate_users():
    """Migrar tabla users de desarrollo a producción"""
    dev_url, prod_url = get_db_urls()
    
    print("🚀 Iniciando migración de tabla users de DEV → PROD")
    print(f"   DEV:  {dev_url[:30]}...")
    print(f"   PROD: {prod_url[:30]}...")
    print()
    
    # Conexión a desarrollo
    dev_conn = psycopg2.connect(dev_url)
    prod_conn = psycopg2.connect(prod_url)
    
    try:
        with dev_conn.cursor() as dev_cur, prod_conn.cursor() as prod_cur:
            # 1. Verificar si la tabla users existe en desarrollo
            dev_cur.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            """)
            if dev_cur.fetchone()[0] == 0:
                print("❌ La tabla 'users' no existe en desarrollo")
                return
            
            # 2. Obtener datos de desarrollo
            dev_cur.execute("SELECT COUNT(*) FROM users")
            dev_count = dev_cur.fetchone()[0]
            print(f"📊 Usuarios en desarrollo: {dev_count}")
            
            if dev_count == 0:
                print("⚠️  No hay usuarios en desarrollo para migrar")
                return
            
            # 3. Crear backup de producción si existe la tabla
            prod_cur.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            """)
            if prod_cur.fetchone()[0] > 0:
                prod_cur.execute("SELECT COUNT(*) FROM users")
                prod_count = prod_cur.fetchone()[0]
                print(f"📊 Usuarios en producción (antes): {prod_count}")
                
                # Backup
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_file = f"backup_users_{ts}.sql"
                print(f"💾 Creando backup: {backup_file}")
                
                os.system(f'pg_dump --table=public.users --data-only --inserts "{prod_url}" > {backup_file}')
            
            # 4. Crear la tabla users en producción si no existe
            print("🔧 Asegurando que existe la tabla users en producción...")
            prod_cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL CHECK (role IN ('admin', 'visitor')),
                    full_name TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    last_login_at TIMESTAMPTZ
                );
            """)
            
            # 5. Limpiar tabla de producción
            print("🧹 Limpiando tabla users en producción...")
            prod_cur.execute("TRUNCATE TABLE users RESTART IDENTITY")
            
            # 6. Obtener datos de desarrollo
            print("📤 Obteniendo usuarios de desarrollo...")
            dev_cur.execute("""
                SELECT email, password_hash, role, full_name, is_active, 
                       created_at, updated_at, last_login_at
                FROM users ORDER BY id
            """)
            users_data = dev_cur.fetchall()
            
            # 7. Insertar en producción
            print("📥 Insertando usuarios en producción...")
            insert_query = """
                INSERT INTO users (email, password_hash, role, full_name, is_active, 
                                 created_at, updated_at, last_login_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            for user_row in users_data:
                prod_cur.execute(insert_query, user_row)
            
            # 8. Ajustar secuencia
            print("🔧 Ajustando secuencia de IDs...")
            prod_cur.execute("SELECT setval('users_id_seq', COALESCE(MAX(id), 1)) FROM users")
            
            # 9. Verificar migración
            prod_cur.execute("SELECT COUNT(*) FROM users")
            final_count = prod_cur.fetchone()[0]
            
            print(f"✅ Migración completada:")
            print(f"   • Usuarios migrados: {final_count}")
            print(f"   • Dev: {dev_count} → Prod: {final_count}")
            
            if dev_count != final_count:
                print("⚠️  Los conteos no coinciden, verificar manualmente")
                return False
            
            # Commit
            prod_conn.commit()
            print("💾 Cambios confirmados en producción")
            return True
            
    except Exception as e:
        prod_conn.rollback()
        print(f"❌ Error durante la migración: {e}")
        return False
    finally:
        dev_conn.close()
        prod_conn.close()

if __name__ == "__main__":
    try:
        success = migrate_users()
        if success:
            print("\n🎉 ¡Migración de usuarios completada exitosamente!")
        else:
            print("\n💥 La migración falló")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Error: {e}")
        sys.exit(1)
