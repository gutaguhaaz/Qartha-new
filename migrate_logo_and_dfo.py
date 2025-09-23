
import asyncio
import json
from app.db import init_database, close_database
from app.db.database import database


async def migrate_logo_and_dfo():
    """Add missing columns and convert DFO from string to array"""
    await init_database()
    
    try:
        # 1. Add all missing columns if they don't exist
        columns_to_add = [
            ("images", "TEXT DEFAULT NULL"),
            ("documents", "TEXT DEFAULT NULL"),
            ("diagrams", "TEXT DEFAULT NULL"),
            ("dfo", "TEXT DEFAULT NULL"),
            ("location", "TEXT DEFAULT NULL"),
            ("logo", "TEXT DEFAULT NULL")
        ]
        
        for column_name, column_def in columns_to_add:
            try:
                await database.execute(f"ALTER TABLE idfs ADD COLUMN {column_name} {column_def}")
                print(f"✓ Added {column_name} column")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"✓ {column_name} column already exists")
                else:
                    print(f"Error adding {column_name} column: {e}")
        
        # 2. Get all IDFs to process
        rows = await database.fetch_all("SELECT id, images, documents, diagrams, dfo, location, logo FROM idfs")
        
        for row in rows:
            updates = {}
            
            # Process each field
            for field in ["images", "documents", "diagrams", "dfo"]:
                current_value = row[field]
                
                if current_value is None:
                    continue
                    
                # If it's already a JSON array, skip
                if current_value.startswith('[') and current_value.endswith(']'):
                    try:
                        json.loads(current_value)
                        continue  # Already an array
                    except:
                        pass
                
                # Convert string to array
                if current_value:
                    new_value = json.dumps([current_value])
                    updates[field] = new_value
                    print(f"✓ Converting {field} for IDF {row['id']}: {current_value} -> {new_value}")
            
            # Apply updates if any
            if updates:
                set_clauses = []
                params = {"id": row["id"]}
                
                for field, value in updates.items():
                    set_clauses.append(f"{field} = :{field}")
                    params[field] = value
                
                update_query = f"UPDATE idfs SET {', '.join(set_clauses)} WHERE id = :id"
                await database.execute(update_query, params)
                print(f"✓ Updated {len(updates)} fields for IDF {row['id']}")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
    finally:
        await close_database()


if __name__ == "__main__":
    asyncio.run(migrate_logo_and_dfo())
