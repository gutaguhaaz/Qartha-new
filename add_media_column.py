
#!/usr/bin/env python3
import asyncio
import os
from databases import Database

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db.thin.dev/main")

async def add_media_column():
    database = Database(DATABASE_URL)
    await database.connect()
    
    try:
        # Check if column exists
        result = await database.fetch_one("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'idfs' AND column_name = 'media'
        """)
        
        if not result:
            print("Adding media column to idfs table...")
            await database.execute("""
                ALTER TABLE idfs 
                ADD COLUMN media JSONB DEFAULT NULL
            """)
            print("Media column added successfully!")
        else:
            print("Media column already exists. Checking type...")
            # Check if it's the correct type
            type_result = await database.fetch_one("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'idfs' AND column_name = 'media'
            """)
            if type_result and type_result['data_type'] != 'jsonb':
                print("Converting media column to JSONB...")
                await database.execute("""
                    ALTER TABLE idfs 
                    ALTER COLUMN media TYPE JSONB USING media::jsonb
                """)
                print("Media column converted to JSONB successfully!")
            else:
                print("Media column is already JSONB.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(add_media_column())
