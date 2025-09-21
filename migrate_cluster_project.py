
import asyncio

from app.db import close_database, init_database
from app.db.database import database

async def migrate_cluster_project():
    """Migrate cluster and project names to correct structure"""
    await init_database()
    
    # Update cluster from 'trk' to 'Trinity' and project from 'Trinity' to 'Sabinas Project'
    update_query = """
        UPDATE idfs 
        SET cluster = 'Trinity', project = 'Sabinas Project'
        WHERE cluster = 'trk' AND project = 'Trinity'
    """
    
    result = await database.execute(update_query)
    print(f"Updated {result} records with new cluster/project names")
    
    print("Cluster/Project migration completed!")

    await close_database()

if __name__ == "__main__":
    asyncio.run(migrate_cluster_project())
