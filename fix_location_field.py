
#!/usr/bin/env python3
"""
Script to fix location field data type issues
"""

import asyncio
import json
from app.db.database import database

async def fix_location_data():
    try:
        await database.connect()
        
        # Get all records with location data
        rows = await database.fetch_all(
            "SELECT id, cluster, project, code, location FROM idfs WHERE location IS NOT NULL"
        )
        
        print(f"Found {len(rows)} records with location data")
        
        for row in rows:
            current_location = row["location"]
            
            # If location is valid string path, skip
            if isinstance(current_location, str) and current_location.strip() and not current_location.startswith('{'):
                print(f"✓ Location OK for {row['cluster']}/{row['project']}/{row['code']}: {current_location}")
                continue
            
            # If location is malformed JSON or empty, clear it
            print(f"⚠ Cleaning malformed location for {row['cluster']}/{row['project']}/{row['code']}: {current_location}")
            
            await database.execute(
                "UPDATE idfs SET location = NULL WHERE id = :id",
                {"id": row["id"]}
            )
            
        print("✅ Location field cleanup completed!")
        
    except Exception as e:
        print(f"❌ Error during location cleanup: {e}")
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(fix_location_data())
