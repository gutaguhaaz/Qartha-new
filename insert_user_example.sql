
-- Ejemplo para insertar un usuario directamente en la base de datos
-- Reemplaza los valores según necesites

INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
    'nuevo_usuario@example.com',
    '$2b$12$qGjwaqYvWi6rqvLfYiAJEeHsQ8/5VZ3EiC56xmSYCpvJp./vU9nBC', -- Este es el hash de "123456789"
    'Nombre del Usuario',
    'visitor', -- o 'admin'
    true,
    NOW(),
    NOW()
);
