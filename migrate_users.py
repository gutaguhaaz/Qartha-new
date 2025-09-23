
#!/usr/bin/env python3
import os
import psycopg2
from datetime import datetime
import sys
import asyncio

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
    
    # Configuración de conexión mejorada para SSL
    connection_config = {
        'connect_timeout': 30,
        'sslmode': 'require',
        'keepalives_idle': 600,
        'keepalives_interval': 30,
        'keepalives_count': 3
    }
    
    dev_conn = psycopg2.connect(dev_url, **connection_config)
    prod_conn = psycopg2.connect(prod_url, **connection_config)
    
    # Configurar autocommit para evitar bloqueos
    dev_conn.autocommit = True
    prod_conn.autocommit = False
    
    try:
        dev_cur = dev_conn.cursor()
        prod_cur = prod_conn.cursor()
        
        # 1. Verificar si la tabla users existe en desarrollo
        dev_cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users'
        """)
            if dev_cur.fetchone()[0] == 0:
                print("❌ La tabla 'users' no existe en desarrollo")
                return False
            
            # 2. Obtener datos de desarrollo
            dev_cur.execute("SELECT COUNT(*) FROM users")
            dev_count = dev_cur.fetchone()[0]
            print(f"📊 Usuarios en desarrollo: {dev_count}")
            
            if dev_count == 0:
                print("⚠️  No hay usuarios en desarrollo para migrar")
                return False
            
            # 3. Verificar producción y crear backup usando Python en lugar de pg_dump
            prod_cur.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            """)
            if prod_cur.fetchone()[0] > 0:
                prod_cur.execute("SELECT COUNT(*) FROM users")
                prod_count = prod_cur.fetchone()[0]
                print(f"📊 Usuarios en producción (antes): {prod_count}")
                
                if prod_count > 0:
                    # Backup usando Python en lugar de pg_dump para evitar problemas de versión
                    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                    backup_file = f"backup_users_{ts}.csv"
                    print(f"💾 Creando backup en CSV: {backup_file}")
                    
                    prod_cur.execute("""
                        SELECT id, email, password_hash, role, full_name, is_active, 
                               created_at, updated_at, last_login_at
                        FROM users ORDER BY id
                    """)
                    backup_data = prod_cur.fetchall()
                    
                    with open(backup_file, 'w', encoding='utf-8') as f:
                        f.write("id,email,password_hash,role,full_name,is_active,created_at,updated_at,last_login_at\n")
                        for row in backup_data:
                            # Escapar comillas en CSV
                            escaped_row = []
                            for field in row:
                                if field is None:
                                    escaped_row.append('')
                                else:
                                    field_str = str(field).replace('"', '""')
                                    escaped_row.append(f'"{field_str}"')
                            f.write(','.join(escaped_row) + '\n')
                    
                    print(f"✅ Backup creado: {backup_file}")
            
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
            
            # 5. Terminar conexiones activas (sin bloquear)
            print("🔌 Cerrando conexiones activas a la tabla users...")
            try:
                prod_cur.execute("""
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = current_database() 
                    AND pid <> pg_backend_pid()
                    AND query ILIKE '%users%'
                """)
            except Exception as e:
                print(f"⚠️  No se pudieron cerrar todas las conexiones: {e}")
            
            # 6. Limpiar tabla de producción con timeout
            print("🧹 Limpiando tabla users en producción...")
            prod_cur.execute("SET statement_timeout = '30s'")
            try:
                prod_cur.execute("TRUNCATE TABLE users RESTART IDENTITY")
                print("✅ Tabla limpiada exitosamente")
            except psycopg2.Error as e:
                print(f"⚠️  Error en TRUNCATE, intentando DELETE: {e}")
                prod_cur.execute("DELETE FROM users")
                prod_cur.execute("ALTER SEQUENCE users_id_seq RESTART WITH 1")
            
            # 7. Obtener datos de desarrollo con reconexión si es necesario
            print("📤 Obteniendo usuarios de desarrollo...")
            try:
                dev_cur.execute("""
                    SELECT email, password_hash, role, full_name, is_active, 
                           created_at, updated_at, last_login_at
                    FROM users ORDER BY id
                """)
                users_data = dev_cur.fetchall()
            except psycopg2.OperationalError as e:
                if "SSL connection has been closed" in str(e):
                    print("🔄 Reconectando a la base de desarrollo...")
                    dev_conn.close()
                    dev_conn = psycopg2.connect(dev_url, **connection_config)
                    dev_conn.autocommit = True
                    dev_cur = dev_conn.cursor()
                    dev_cur.execute("""
                        SELECT email, password_hash, role, full_name, is_active, 
                               created_at, updated_at, last_login_at
                        FROM users ORDER BY id
                    """)
                    users_data = dev_cur.fetchall()
                else:
                    raise
            
            # 8. Insertar en producción uno por uno para mejor control
            print("📥 Insertando usuarios en producción...")
            insert_query = """
                INSERT INTO users (email, password_hash, role, full_name, is_active, 
                                 created_at, updated_at, last_login_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            inserted_count = 0
            for i, user_row in enumerate(users_data, 1):
                try:
                    prod_cur.execute(insert_query, user_row)
                    inserted_count += 1
                    print(f"   Usuario {i}/{len(users_data)}: {user_row[0]}")
                except Exception as e:
                    print(f"   ⚠️  Error insertando usuario {user_row[0]}: {e}")
            
            # 9. Ajustar secuencia
            print("🔧 Ajustando secuencia de IDs...")
            prod_cur.execute("SELECT setval('users_id_seq', COALESCE(MAX(id), 1)) FROM users")
            
            # 10. Verificar migración
            prod_cur.execute("SELECT COUNT(*) FROM users")
            final_count = prod_cur.fetchone()[0]
            
            print(f"✅ Migración completada:")
            print(f"   • Usuarios en desarrollo: {dev_count}")
            print(f"   • Usuarios insertados: {inserted_count}")
            print(f"   • Usuarios finales en producción: {final_count}")
            
            if inserted_count != final_count:
                print("⚠️  Los conteos no coinciden, verificar manualmente")
                return False
            
            # Commit
            prod_conn.commit()
            print("💾 Cambios confirmados en producción")
            return True
            
    except Exception as e:
        prod_conn.rollback()
        print(f"❌ Error durante la migración: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        try:
            if 'dev_cur' in locals():
                dev_cur.close()
            if 'prod_cur' in locals():
                prod_cur.close()
        except:
            pass
        try:
            dev_conn.close()
        except:
            pass
        try:
            prod_conn.close()
        except:
            pass

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
