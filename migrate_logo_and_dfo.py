
import asyncio
import json
from app.db import init_database, close_database
from app.db.database import database


async def migrate_logo_and_dfo():
    """Add logo column and convert DFO from string to array"""
    await init_database()
    
    try:
        # 1. Add logo column if it doesn't exist
        try:
            await database.execute("ALTER TABLE idfs ADD COLUMN logo TEXT DEFAULT NULL")
            print("✓ Added logo column")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("✓ Logo column already exists")
            else:
                print(f"Error adding logo column: {e}")
        
        # 2. Convert DFO from string to JSON array
        rows = await database.fetch_all("SELECT id, dfo FROM idfs WHERE dfo IS NOT NULL")
        
        for row in rows:
            current_dfo = row["dfo"]
            
            # If it's already a JSON array, skip
            if current_dfo.startswith('[') and current_dfo.endswith(']'):
                try:
                    json.loads(current_dfo)
                    continue  # Already an array
                except:
                    pass
            
            # Convert string to array
            if current_dfo:
                new_dfo = json.dumps([current_dfo])
                await database.execute(
                    "UPDATE idfs SET dfo = :dfo WHERE id = :id",
                    {"dfo": new_dfo, "id": row["id"]}
                )
                print(f"✓ Converted DFO for IDF {row['id']}: {current_dfo} -> {new_dfo}")
        
        # 3. Ensure JSON arrays for other fields
        for field in ["images", "documents", "diagrams"]:
            rows = await database.fetch_all(f"SELECT id, {field} FROM idfs WHERE {field} IS NOT NULL")
            
            for row in rows:
                current_value = row[field]
                
                # If it's already a JSON array, skip
                if current_value.startswith('[') and current_value.endswith(']'):
                    try:
                        json.loads(current_value)
                        continue  # Already an array
                    except:
                        pass
                
                # Convert to array
                if current_value:
                    new_value = json.dumps([current_value])
                    await database.execute(
                        f"UPDATE idfs SET {field} = :{field} WHERE id = :id",
                        {field: new_value, "id": row["id"]}
                    )
                    print(f"✓ Converted {field} for IDF {row['id']}")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
    finally:
        await close_database()


if __name__ == "__main__":
    asyncio.run(migrate_logo_and_dfo())
