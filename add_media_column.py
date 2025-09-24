
import asyncio
from app.db.database import database, init_database, close_database

async def add_media_column():
    """Add media and table_data columns back to idfs table"""
    await init_database()
    
    try:
        # Add the media column back
        await database.execute("""
            ALTER TABLE idfs 
            ADD COLUMN IF NOT EXISTS media JSONB DEFAULT NULL
        """)
        
        print("✅ Added media column back to idfs table")
        
        # Add the table_data column back
        await database.execute("""
            ALTER TABLE idfs 
            ADD COLUMN IF NOT EXISTS table_data JSONB DEFAULT NULL
        """)
        
        print("✅ Added table_data column back to idfs table")
        
        # Initialize media column with empty JSON objects
        await database.execute("""
            UPDATE idfs 
            SET media = '{}'::jsonb 
            WHERE media IS NULL
        """)
        
        print("✅ Initialized media column with empty JSON objects")
        
    except Exception as e:
        print(f"❌ Error adding columns: {e}")
    finally:
        await close_database()

if __name__ == "__main__":
    asyncio.run(add_media_column())
