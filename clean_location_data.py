import asyncio

import psycopg2

from app.core.config import settings


async def clean_location_data():
    """Convert empty or placeholder location values to actual NULL entries."""
    
    # Connect to PostgreSQL directly
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    
    try:
        # Update location field to NULL where it's empty, 'null', 'NULL', 'None', etc.
        update_query = """
            UPDATE idfs 
            SET location = NULL 
            WHERE location IS NOT NULL 
            AND (
                location = '' 
                OR location = 'null' 
                OR location = 'NULL' 
                OR location = 'None' 
                OR location = 'none'
                OR TRIM(location) = ''
                OR TRIM(LOWER(location)) IN ('null', 'none', 'undefined')
            )
        """
        
        cur.execute(update_query)
        rows_affected = cur.rowcount
        
        # Commit the changes
        conn.commit()
        
        print(f"✅ Cleaned {rows_affected} location fields, set to NULL")
        
        # Show some examples of remaining location data
        cur.execute("SELECT code, location FROM idfs WHERE location IS NOT NULL LIMIT 5")
        remaining = cur.fetchall()
        
        if remaining:
            print("\nRemaining non-NULL location data examples:")
            for code, location in remaining:
                print(f"  {code}: {location[:100]}..." if len(str(location)) > 100 else f"  {code}: {location}")
        else:
            print("\nAll location fields are now NULL")
            
    except Exception as e:
        print(f"❌ Error cleaning location data: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    asyncio.run(clean_location_data())

