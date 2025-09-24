
import asyncio
import getpass
import sys
from app.db.database import database, init_database, close_database
from app.core.security import hash_password

async def add_user():
    """Add a new user to the database"""
    print("=== Agregar Nuevo Usuario ===")
    
    # Obtener datos del usuario antes de conectar a la base de datos
    email = input("Email: ").strip()
    if not email:
        print("❌ Error: El email es obligatorio")
        return
        
    password = getpass.getpass("Password: ").strip()
    if not password:
        print("❌ Error: La contraseña es obligatoria")
        return
        
    full_name = input("Nombre completo (opcional): ").strip() or None
    
    print("\nRoles disponibles:")
    print("1. admin - Acceso completo al sistema")
    print("2. visitor - Solo lectura")
    
    role_choice = input("Selecciona el rol (1 o 2): ").strip()
    role = "admin" if role_choice == "1" else "visitor"
    
    # Ahora conectar a la base de datos
    try:
        print("\n🔄 Conectando a la base de datos...")
        await init_database()
        print("✅ Conectado a la base de datos")
        
        # Verificar si el usuario ya existe con reintentos
        max_retries = 3
        for attempt in range(max_retries):
            try:
                existing_user = await database.fetch_one(
                    "SELECT id FROM users WHERE email = :email",
                    {"email": email}
                )
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"⚠️ Error en intento {attempt + 1}, reintentando...")
                    await asyncio.sleep(2)
                    # Reinicializar conexión
                    await close_database()
                    await asyncio.sleep(1)
                    await init_database()
                else:
                    raise e
        
        if existing_user:
            print(f"❌ Error: Ya existe un usuario con el email {email}")
            return
        
        # Hash de la contraseña
        password_hash = hash_password(password)
        
        # Insertar el nuevo usuario con reintentos
        for attempt in range(max_retries):
            try:
                user_id = await database.fetch_val(
                    """
                    INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
                    VALUES (:email, :password_hash, :full_name, :role, true, NOW(), NOW())
                    RETURNING id
                    """,
                    {
                        "email": email,
                        "password_hash": password_hash,
                        "full_name": full_name,
                        "role": role
                    }
                )
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"⚠️ Error en intento {attempt + 1}, reintentando...")
                    await asyncio.sleep(2)
                    # Reinicializar conexión
                    await close_database()
                    await asyncio.sleep(1)
                    await init_database()
                else:
                    raise e
        
        print(f"\n✅ Usuario creado exitosamente!")
        print(f"ID: {user_id}")
        print(f"Email: {email}")
        print(f"Nombre: {full_name or 'N/A'}")
        print(f"Rol: {role}")
        
    except Exception as e:
        print(f"\n❌ Error al crear el usuario: {e}")
        print(f"Tipo de error: {type(e).__name__}")
        return False
    finally:
        try:
            await close_database()
            print("\n🔌 Conexión a la base de datos cerrada")
        except:
            pass
    
    return True

if __name__ == "__main__":
    try:
        result = asyncio.run(add_user())
        if result:
            sys.exit(0)
        else:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Operación cancelada por el usuario")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        sys.exit(1)
