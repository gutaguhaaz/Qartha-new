
import asyncio
import getpass
from app.db.database import database, init_database
from app.core.security import hash_password

async def add_user():
    """Add a new user to the database"""
    await init_database()
    
    print("=== Agregar Nuevo Usuario ===")
    email = input("Email: ").strip()
    password = getpass.getpass("Password: ").strip()
    full_name = input("Nombre completo (opcional): ").strip() or None
    
    print("\nRoles disponibles:")
    print("1. admin - Acceso completo al sistema")
    print("2. visitor - Solo lectura")
    
    role_choice = input("Selecciona el rol (1 o 2): ").strip()
    role = "admin" if role_choice == "1" else "visitor"
    
    # Verificar si el usuario ya existe
    existing_user = await database.fetch_one(
        "SELECT id FROM users WHERE email = :email",
        {"email": email}
    )
    
    if existing_user:
        print(f"❌ Error: Ya existe un usuario con el email {email}")
        return
    
    # Hash de la contraseña
    password_hash = hash_password(password)
    
    # Insertar el nuevo usuario
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
        
        print(f"✅ Usuario creado exitosamente!")
        print(f"ID: {user_id}")
        print(f"Email: {email}")
        print(f"Nombre: {full_name or 'N/A'}")
        print(f"Rol: {role}")
        
    except Exception as e:
        print(f"❌ Error al crear el usuario: {e}")

if __name__ == "__main__":
    asyncio.run(add_user())
