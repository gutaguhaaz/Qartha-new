
import json
import asyncio

from app.db import close_database, init_database
from app.db.database import database

async def migrate_asset_urls():
    """Migrate asset URLs from old structure to new structure"""
    await init_database()
    
    # Update all IDFs with asset URLs
    query = "SELECT id, gallery, documents, diagrams FROM idfs WHERE cluster = 'trk' AND project = 'Trinity'"
    rows = await database.fetch_all(query)
    
    for row in rows:
        row_id = row["id"]
        updated = False
        
        # Update gallery URLs
        if row["gallery"]:
            gallery = json.loads(row["gallery"]) if isinstance(row["gallery"], str) else row["gallery"]
            for item in gallery:
                if item.get("url") and "/static/trk/trinity/" in item["url"]:
                    item["url"] = item["url"].replace("/static/trk/trinity/", "/static/Trinity/sabinas/")
                    updated = True
        
        # Update documents URLs  
        if row["documents"]:
            documents = json.loads(row["documents"]) if isinstance(row["documents"], str) else row["documents"]
            for item in documents:
                if item.get("url") and "/static/trk/trinity/" in item["url"]:
                    item["url"] = item["url"].replace("/static/trk/trinity/", "/static/Trinity/sabinas/")
                    updated = True
                    
        # Update diagrams URLs
        if row["diagrams"]:
            diagrams = json.loads(row["diagrams"]) if isinstance(row["diagrams"], str) else row["diagrams"]
            for item in diagrams:
                if item.get("url") and "/static/trk/trinity/" in item["url"]:
                    item["url"] = item["url"].replace("/static/trk/trinity/", "/static/Trinity/sabinas/")
                    updated = True
        
        if updated:
            update_query = """
                UPDATE idfs 
                SET gallery = :gallery, documents = :documents, diagrams = :diagrams 
                WHERE id = :id
            """
            await database.execute(update_query, {
                "id": row_id,
                "gallery": json.dumps(gallery) if row["gallery"] else row["gallery"],
                "documents": json.dumps(documents) if row["documents"] else row["documents"],
                "diagrams": json.dumps(diagrams) if row["diagrams"] else row["diagrams"]
            })
            print(f"Updated IDF {row_id}")

    print("Migration completed!")

    await close_database()

if __name__ == "__main__":
    asyncio.run(migrate_asset_urls())
