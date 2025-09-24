
#!/usr/bin/env python3
import asyncio
import os
from databases import Database

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db.thin.dev/main")

async def drop_obsolete_columns():
    database = Database(DATABASE_URL)
    await database.connect()
    
    try:
        print("Dropping obsolete columns from idfs table...")
        
        # Check which columns exist first
        existing_columns = await database.fetch_all("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'idfs' 
            AND column_name IN ('gallery', 'diagram', 'table_data', 'media')
        """)
        
        columns_to_drop = [row['column_name'] for row in existing_columns]
        
        if not columns_to_drop:
            print("No obsolete columns found to drop.")
            return
        
        print(f"Found columns to drop: {', '.join(columns_to_drop)}")
        
        # Drop columns one by one to handle any dependencies
        for column in columns_to_drop:
            try:
                print(f"Dropping column: {column}")
                await database.execute(f"""
                    ALTER TABLE idfs 
                    DROP COLUMN IF EXISTS {column}
                """)
                print(f"Successfully dropped column: {column}")
            except Exception as e:
                print(f"Error dropping column {column}: {e}")
                continue
        
        print("Obsolete columns cleanup completed!")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(drop_obsolete_columns())
