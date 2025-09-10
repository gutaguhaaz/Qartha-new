import json
from databases import Database
from app.core.config import settings

# PostgreSQL database
database = Database(settings.DATABASE_URL)


async def init_database():
    """Initialize database connection and create tables"""
    await database.connect()
    
    # Create IDFs table
    await database.execute("""
        CREATE TABLE IF NOT EXISTS idfs (
            id SERIAL PRIMARY KEY,
            cluster VARCHAR(50) NOT NULL,
            project VARCHAR(50) NOT NULL,
            code VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            site VARCHAR(255),
            room VARCHAR(255),
            gallery JSONB DEFAULT '[]',
            documents JSONB DEFAULT '[]',
            diagram JSONB,
            table_data JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(cluster, project, code)
        )
    """)
    
    # Create devices table
    await database.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id SERIAL PRIMARY KEY,
            cluster VARCHAR(50) NOT NULL,
            project VARCHAR(50) NOT NULL,
            idf_code VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            model VARCHAR(255),
            serial VARCHAR(255),
            rack VARCHAR(255),
            site VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create indexes
    await database.execute("CREATE INDEX IF NOT EXISTS idx_devices_cluster_project_idf ON devices(cluster, project, idf_code)")


async def ensure_indexes():
    """Create database tables and indexes if they don't exist"""
    await init_database()


async def seed_data():
    """Create seed data if tables are empty"""
    # Check if we have any IDFs
    count = await database.fetch_val("SELECT COUNT(*) FROM idfs")
    
    if count == 0:
        # Seed data for trk/trinity cluster
        trk_trinity_table = {
            "columns": [
                {"key": "tray", "label": "Charola", "type": "text"},
                {"key": "panel", "label": "Patch Panel", "type": "text"},
                {"key": "port", "label": "Puerto", "type": "number"},
                {"key": "fiber_id", "label": "Fibra", "type": "text"},
                {"key": "to_room", "label": "Destino (Cuarto)", "type": "text"},
                {"key": "to_panel", "label": "Destino (Panel)", "type": "text"},
                {"key": "to_port", "label": "Puerto Destino", "type": "number"},
                {"key": "status", "label": "Estado", "type": "status", "options": ["OK", "Revisión", "Falla", "Libre", "Reservado"]}
            ],
            "rows": [
                {"tray": "T-01", "panel": "PP-A1", "port": 1, "fiber_id": "F001", "to_room": "Sala de servidores", "to_panel": "PP-B2", "to_port": 12, "status": "OK"},
                {"tray": "T-01", "panel": "PP-A1", "port": 2, "fiber_id": "F002", "to_room": "Oficina 201", "to_panel": "PP-C1", "to_port": 5, "status": "Revisión"},
                {"tray": "T-01", "panel": "PP-A1", "port": 3, "fiber_id": "F003", "to_room": "Sala de reuniones", "to_panel": "PP-D1", "to_port": 8, "status": "Falla"},
                {"tray": "T-02", "panel": "PP-A2", "port": 1, "fiber_id": "F004", "to_room": "-", "to_panel": "-", "to_port": 0, "status": "Reservado"},
                {"tray": "T-02", "panel": "PP-A2", "port": 2, "fiber_id": "F005", "to_room": "Oficina 205", "to_panel": "PP-E1", "to_port": 3, "status": "OK"},
                {"tray": "T-02", "panel": "PP-A2", "port": 3, "fiber_id": "F006", "to_room": "Oficina 206", "to_panel": "PP-E2", "to_port": 1, "status": "OK"},
            ]
        }
        
        lab_demo_table = {
            "columns": [
                {"key": "tray", "label": "Charola", "type": "text"},
                {"key": "panel", "label": "Patch Panel", "type": "text"},
                {"key": "port", "label": "Puerto", "type": "number"},
                {"key": "status", "label": "Estado", "type": "status", "options": ["OK", "Revisión", "Falla", "Libre", "Reservado"]}
            ],
            "rows": [
                {"tray": "T-01", "panel": "PP-A1", "port": 1, "status": "OK"},
                {"tray": "T-01", "panel": "PP-A1", "port": 2, "status": "OK"},
                {"tray": "T-01", "panel": "PP-A1", "port": 3, "status": "Libre"},
                {"tray": "T-01", "panel": "PP-A1", "port": 4, "status": "Libre"},
            ]
        }
        
        # Insert seed data
        await database.execute("""
            INSERT INTO idfs (cluster, project, code, title, description, site, room, gallery, documents, diagram, table_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        """, "trk", "trinity", "IDF-1004", "IDF 1004", 
            "IDF principal para el área de oficinas administrativas y centro de datos primario.",
            "TrinityRail HQ", "Rack A", json.dumps([]), json.dumps([]), None, json.dumps(trk_trinity_table))
        
        await database.execute("""
            INSERT INTO idfs (cluster, project, code, title, description, site, room, gallery, documents, diagram, table_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        """, "lab", "demo", "IDF-0001", "IDF Demo 001",
            "Demostración de IDF en ambiente de laboratorio.",
            "Lab Facility", "Room B-1", json.dumps([]), json.dumps([]), None, json.dumps(lab_demo_table))


async def close_database():
    """Close database connection"""
    await database.disconnect()
