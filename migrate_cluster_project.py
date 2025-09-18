
import asyncio
from app.db.mongo import database, connect_database

async def migrate_cluster_project():
    """Migrate cluster and project names to correct structure"""
    await connect_database()
    
    # Update cluster from 'trk' to 'Trinity' and project from 'Trinity' to 'Sabinas Project'
    update_query = """
        UPDATE idfs 
        SET cluster = 'Trinity', project = 'Sabinas Project'
        WHERE cluster = 'trk' AND project = 'Trinity'
    """
    
    result = await database.execute(update_query)
    print(f"Updated {result} records with new cluster/project names")
    
    print("Cluster/Project migration completed!")

if __name__ == "__main__":
    asyncio.run(migrate_cluster_project())
