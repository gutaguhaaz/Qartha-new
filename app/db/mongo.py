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
        query = """
            INSERT INTO idfs (cluster, project, code, title, description, site, room, gallery, documents, diagram, table_data)
            VALUES (:cluster, :project, :code, :title, :description, :site, :room, :gallery, :documents, :diagram, :table_data)
        """

        # TRK Trinity project - 5 IDFs
        await database.execute(query, {
            "cluster": "trk", "project": "trinity", "code": "IDF-1004", "title": "IDF 1004", 
            "description": "IDF principal para el área de oficinas administrativas y centro de datos primario.",
            "site": "TrinityRail HQ", "room": "Rack A", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(trk_trinity_table)
        })

        await database.execute(query, {
            "cluster": "trk", "project": "trinity", "code": "IDF-1005", "title": "IDF 1005", 
            "description": "IDF secundario para el área de producción y manufactura.",
            "site": "TrinityRail HQ", "room": "Rack B", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(trk_trinity_table)
        })

        await database.execute(query, {
            "cluster": "trk", "project": "trinity", "code": "IDF-1006", "title": "IDF 1006", 
            "description": "IDF para el área de desarrollo y testing.",
            "site": "TrinityRail HQ", "room": "Rack C", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(trk_trinity_table)
        })

        await database.execute(query, {
            "cluster": "trk", "project": "trinity", "code": "IDF-1007", "title": "IDF 1007", 
            "description": "IDF para sala de servidores principal.",
            "site": "TrinityRail HQ", "room": "Server Room A", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(trk_trinity_table)
        })

        await database.execute(query, {
            "cluster": "trk", "project": "trinity", "code": "IDF-1008", "title": "IDF 1008", 
            "description": "IDF de respaldo para contingencias.",
            "site": "TrinityRail HQ", "room": "Backup Room", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(trk_trinity_table)
        })

        # LAB Demo project - 2 IDFs
        await database.execute(query, {
            "cluster": "lab", "project": "demo", "code": "IDF-0001", "title": "IDF Demo 001",
            "description": "Demostración de IDF en ambiente de laboratorio.",
            "site": "Lab Facility", "room": "Room B-1", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(lab_demo_table)
        })

        await database.execute(query, {
            "cluster": "lab", "project": "demo", "code": "IDF-0002", "title": "IDF Demo 002",
            "description": "Segundo IDF de demostración para pruebas avanzadas.",
            "site": "Lab Facility", "room": "Room B-2", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(lab_demo_table)
        })

        # TRK Alpha project - 3 IDFs
        await database.execute(query, {
            "cluster": "trk", "project": "alpha", "code": "IDF-2001", "title": "IDF Alpha 001",
            "description": "IDF principal del proyecto Alpha.",
            "site": "Alpha Site", "room": "Room Alpha-1", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(trk_trinity_table)
        })

        await database.execute(query, {
            "cluster": "trk", "project": "alpha", "code": "IDF-2002", "title": "IDF Alpha 002",
            "description": "IDF secundario del proyecto Alpha.",
            "site": "Alpha Site", "room": "Room Alpha-2", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(trk_trinity_table)
        })

        await database.execute(query, {
            "cluster": "trk", "project": "alpha", "code": "IDF-2003", "title": "IDF Alpha 003",
            "description": "IDF de desarrollo del proyecto Alpha.",
            "site": "Alpha Site", "room": "Room Alpha-3", "gallery": json.dumps([]), 
            "documents": json.dumps([]), "diagram": None, "table_data": json.dumps(trk_trinity_table)
        })

        # Sample data for TRK cluster
        sample_idfs = [
            {
                "cluster": "trk",
                "project": "trinity",
                "code": "IDF-1001",
                "title": "Main Server Room IDF",
                "description": "Central distribution frame for the main server room containing network switches and patch panels.",
                "site": "Building A",
                "room": "Server Room 101",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Switch-01", "port": "1/0/1", "status": "ok"},
                        {"device": "Switch-01", "port": "1/0/2", "status": "reservado"},
                        {"device": "Patch Panel", "port": "PP-01", "status": "libre"}
                    ]
                },
                "health": {
                    "level": "green",
                    "counts": {"ok": 10, "revision": 2, "falla": 1, "libre": 5, "reservado": 1}
                }
            },
            {
                "cluster": "trk",
                "project": "trinity", 
                "code": "IDF-1002",
                "title": "Floor 2 Distribution Point",
                "description": "Secondary IDF for second floor network distribution.",
                "site": "Building A",
                "room": "Telecom Room 201",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Switch-02", "port": "1/0/1", "status": "ok"},
                        {"device": "Switch-02", "port": "1/0/2", "status": "ok"}
                    ]
                },
                "health": {
                    "level": "yellow",
                    "counts": {"ok": 8, "revision": 3, "falla": 0, "libre": 3, "reservado": 2}
                }
            },
            {
                "cluster": "trk",
                "project": "trinity",
                "code": "IDF-1003",
                "title": "Building B Main IDF",
                "description": "Primary distribution frame for Building B operations.",
                "site": "Building B",
                "room": "Network Center B1",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Core Switch", "port": "1/0/1", "status": "ok"},
                        {"device": "Core Switch", "port": "1/0/2", "status": "ok"},
                        {"device": "Access Switch", "port": "2/0/1", "status": "libre"}
                    ]
                },
                "health": {
                    "level": "green",
                    "counts": {"ok": 15, "revision": 1, "falla": 0, "libre": 8, "reservado": 3}
                }
            },
            {
                "cluster": "trk",
                "project": "trinity",
                "code": "IDF-1004",
                "title": "Emergency Network Hub",
                "description": "Backup distribution frame for emergency network operations.",
                "site": "Building A",
                "room": "Emergency Room 301",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Emergency Switch", "port": "1/0/1", "status": "ok"},
                        {"device": "Backup Router", "port": "eth0", "status": "reservado"}
                    ]
                },
                "health": {
                    "level": "red",
                    "counts": {"ok": 5, "revision": 2, "falla": 3, "libre": 1, "reservado": 2}
                }
            },
            {
                "cluster": "trk",
                "project": "trinity",
                "code": "IDF-1005",
                "title": "Data Center Edge IDF",
                "description": "Edge distribution frame connecting to main data center.",
                "site": "Building C",
                "room": "Edge Computing 101",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Edge Router", "port": "ge-0/0/1", "status": "ok"},
                        {"device": "Distribution Switch", "port": "1/1/1", "status": "ok"},
                        {"device": "Distribution Switch", "port": "1/1/2", "status": "libre"}
                    ]
                },
                "health": {
                    "level": "green",
                    "counts": {"ok": 12, "revision": 0, "falla": 0, "libre": 6, "reservado": 1}
                }
            },
            # LAB cluster IDFs
            {
                "cluster": "lab",
                "project": "research",
                "code": "IDF-L001",
                "title": "Lab Network Hub",
                "description": "Main distribution point for laboratory network infrastructure.",
                "site": "Research Lab",
                "room": "Network Room L1",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Lab Switch", "port": "1/0/1", "status": "ok"},
                        {"device": "Test Equipment", "port": "eth1", "status": "revision"}
                    ]
                },
                "health": {
                    "level": "yellow",
                    "counts": {"ok": 6, "revision": 4, "falla": 1, "libre": 2, "reservado": 1}
                }
            },
            {
                "cluster": "lab",
                "project": "research",
                "code": "IDF-L002",
                "title": "Experimental Network Point",
                "description": "Test bed for experimental network configurations.",
                "site": "Research Lab",
                "room": "Experiment Room L2",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Test Switch", "port": "1/0/1", "status": "revision"},
                        {"device": "Protocol Analyzer", "port": "mon1", "status": "ok"}
                    ]
                },
                "health": {
                    "level": "yellow",
                    "counts": {"ok": 4, "revision": 5, "falla": 0, "libre": 3, "reservado": 2}
                }
            },
            # ALPHA cluster IDFs
            {
                "cluster": "alpha",
                "project": "prototype",
                "code": "IDF-A001",
                "title": "Alpha Development Hub",
                "description": "Primary network distribution for alpha development environment.",
                "site": "Dev Center",
                "room": "Alpha Room A1",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Dev Switch", "port": "1/0/1", "status": "ok"},
                        {"device": "Staging Server", "port": "eth0", "status": "ok"}
                    ]
                },
                "health": {
                    "level": "green",
                    "counts": {"ok": 8, "revision": 1, "falla": 0, "libre": 4, "reservado": 2}
                }
            },
            {
                "cluster": "alpha",
                "project": "prototype",
                "code": "IDF-A002",
                "title": "Beta Testing Network",
                "description": "Network infrastructure for beta testing phase.",
                "site": "Dev Center",
                "room": "Beta Room A2",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Beta Switch", "port": "1/0/1", "status": "ok"},
                        {"device": "Test Server", "port": "eth0", "status": "libre"}
                    ]
                },
                "health": {
                    "level": "green",
                    "counts": {"ok": 7, "revision": 0, "falla": 0, "libre": 5, "reservado": 1}
                }
            },
            {
                "cluster": "alpha",
                "project": "prototype",
                "code": "IDF-A003",
                "title": "Integration Test Hub",
                "description": "Network hub for integration testing workflows.",
                "site": "Dev Center",
                "room": "Integration Room A3",
                "gallery": [],
                "documents": [],
                "table": {
                    "columns": [
                        {"key": "device", "label": "Device", "type": "text"},
                        {"key": "port", "label": "Port", "type": "text"},
                        {"key": "status", "label": "Status", "type": "select", "options": ["ok", "revision", "falla", "libre", "reservado"]}
                    ],
                    "rows": [
                        {"device": "Integration Switch", "port": "1/0/1", "status": "revision"},
                        {"device": "CI/CD Server", "port": "eth0", "status": "ok"}
                    ]
                },
                "health": {
                    "level": "yellow",
                    "counts": {"ok": 5, "revision": 3, "falla": 1, "libre": 2, "reservado": 1}
                }
            }
        ]

        # Insert sample data into the database
        for idf in sample_idfs:
            await database.execute(query, {
                "cluster": idf["cluster"],
                "project": idf["project"],
                "code": idf["code"],
                "title": idf["title"],
                "description": idf["description"],
                "site": idf["site"],
                "room": idf["room"],
                "gallery": json.dumps(idf["gallery"]),
                "documents": json.dumps(idf["documents"]),
                "diagram": None, # Assuming diagram is not provided in this sample data
                "table_data": json.dumps(idf["table"])
            })


async def close_database():
    """Close database connection"""
    await database.disconnect()