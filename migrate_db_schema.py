
import asyncio
from app.db import close_database, init_database
from app.db.database import database


async def migrate_database_schema():
    """Migrate database schema to new structure"""
    await init_database()
    
    # First, add new columns
    await database.execute("""
        ALTER TABLE idfs 
        ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[],
        ADD COLUMN IF NOT EXISTS documents_new TEXT[] DEFAULT ARRAY[]::TEXT[],
        ADD COLUMN IF NOT EXISTS diagrams_new TEXT[] DEFAULT ARRAY[]::TEXT[],
        ADD COLUMN IF NOT EXISTS location_new TEXT,
        ADD COLUMN IF NOT EXISTS dfo_new TEXT[] DEFAULT ARRAY[]::TEXT[],
        ADD COLUMN IF NOT EXISTS logo_new TEXT
    """)
    
    print("Added new columns")
    
    # Migrate existing data from JSON columns to new array columns
    rows = await database.fetch_all("SELECT * FROM idfs")
    
    for row in rows:
        # Skip if already migrated (check if images column has data)
        if row.get("images"):
            continue
            
        print(f"Migrating data for {row['code']}")
        
        # Set default empty arrays/null values for all new columns
        await database.execute("""
            UPDATE idfs 
            SET images = ARRAY[]::TEXT[],
                documents_new = ARRAY[]::TEXT[],
                diagrams_new = ARRAY[]::TEXT[],
                location_new = NULL,
                dfo_new = ARRAY[]::TEXT[],
                logo_new = NULL
            WHERE id = :id
        """, {"id": row["id"]})
    
    print("Migrated existing data")
    
    # Drop old columns and rename new ones
    await database.execute("""
        ALTER TABLE idfs 
        DROP COLUMN IF EXISTS gallery,
        DROP COLUMN IF EXISTS documents,
        DROP COLUMN IF EXISTS diagrams,
        DROP COLUMN IF EXISTS location,
        DROP COLUMN IF EXISTS dfo,
        DROP COLUMN IF EXISTS media
    """)
    
    await database.execute("""
        ALTER TABLE idfs 
        RENAME COLUMN documents_new TO documents
    """)
    
    await database.execute("""
        ALTER TABLE idfs 
        RENAME COLUMN diagrams_new TO diagrams
    """)
    
    await database.execute("""
        ALTER TABLE idfs 
        RENAME COLUMN location_new TO location
    """)
    
    await database.execute("""
        ALTER TABLE idfs 
        RENAME COLUMN dfo_new TO dfo
    """)
    
    await database.execute("""
        ALTER TABLE idfs 
        RENAME COLUMN logo_new TO logo
    """)
    
    print("Schema migration completed!")
    await close_database()


if __name__ == "__main__":
    asyncio.run(migrate_database_schema())
