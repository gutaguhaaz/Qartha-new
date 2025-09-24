
#!/usr/bin/env python3
"""Fix malformed DFO URLs in the database"""

import asyncio
import json
import re
from databases import Database
from app.core.config import settings

async def fix_malformed_dfo_urls():
    """Fix DFO URLs that contain malformed data structures"""
    database = Database(settings.DATABASE_URL)
    await database.connect()
    
    try:
        # Get all IDFs with DFO data
        rows = await database.fetch_all(
            "SELECT id, cluster, project, code, dfo FROM idfs WHERE dfo IS NOT NULL AND dfo != '[]'"
        )
        
        print(f"Found {len(rows)} IDFs with DFO data to check...")
        
        for row in rows:
            dfo_data = row["dfo"]
            if not dfo_data:
                continue
                
            try:
                if isinstance(dfo_data, str):
                    dfo_list = json.loads(dfo_data)
                else:
                    dfo_list = dfo_data
                    
                if not isinstance(dfo_list, list):
                    continue
                    
                fixed_dfo = []
                needs_fixing = False
                
                for item in dfo_list:
                    if isinstance(item, dict) and "url" in item:
                        url = item["url"]
                        
                        # Check for malformed URLs containing nested data or full domain
                        if ("replit.dev" in url and "/static/{'url':" in url) or url.startswith("/static/{"):
                            needs_fixing = True
                            
                            # Extract clean path from malformed URL
                            # Look for pattern like: /static/Trinity/sabinas/IDF-1004/dfo/filename.ext
                            match = re.search(r"/static/([^/]+)/([^/]+)/([^/]+)/dfo/([^'\"}\s,]+)", url)
                            if match:
                                cluster, project, code, filename = match.groups()
                                clean_url = f"/static/{cluster}/{project}/{code}/dfo/{filename}"
                                
                                fixed_item = {
                                    "url": clean_url,
                                    "name": item.get("name", "DFO"),
                                    "kind": item.get("kind", "diagram")
                                }
                                fixed_dfo.append(fixed_item)
                                print(f"Fixed URL: {url[:100]}... -> {clean_url}")
                            else:
                                # If we can't extract a clean path, try to build it from row data
                                # Map project names to folder names
                                folder_mapping = {
                                    "Sabinas Project": "sabinas",
                                    "Trinity": "trinity",
                                    "Monclova Project": "monclova"
                                }
                                folder_project = folder_mapping.get(row["project"], row["project"].lower().replace(" ", "-"))
                                
                                # Try to extract filename from the malformed URL
                                filename_match = re.search(r"([^/]+\.(png|jpg|jpeg|pdf))['\"}\s]", url)
                                if filename_match:
                                    filename = filename_match.group(1)
                                    clean_url = f"/static/{row['cluster']}/{folder_project}/{row['code']}/dfo/{filename}"
                                    
                                    fixed_item = {
                                        "url": clean_url,
                                        "name": item.get("name", "DFO"),
                                        "kind": item.get("kind", "diagram")
                                    }
                                    fixed_dfo.append(fixed_item)
                                    print(f"Rebuilt URL for {row['code']}: {clean_url}")
                                else:
                                    # Keep original if we can't fix it
                                    fixed_dfo.append(item)
                                    print(f"Could not fix URL for {row['code']}: {url[:50]}...")
                        else:
                            # URL is already clean
                            fixed_dfo.append(item)
                    else:
                        # Handle other formats
                        fixed_dfo.append(item)
                
                if needs_fixing:
                    # Update the database with fixed data
                    await database.execute(
                        "UPDATE idfs SET dfo = :dfo WHERE id = :id",
                        {"dfo": json.dumps(fixed_dfo), "id": row["id"]}
                    )
                    print(f"✓ Fixed DFO data for {row['cluster']}/{row['project']}/{row['code']}")
                else:
                    print(f"✓ DFO data already clean for {row['cluster']}/{row['project']}/{row['code']}")
                    
            except json.JSONDecodeError:
                print(f"⚠ Skipping malformed JSON for {row['cluster']}/{row['project']}/{row['code']}")
            except Exception as e:
                print(f"❌ Error processing {row['cluster']}/{row['project']}/{row['code']}: {e}")
        
        print("✅ DFO URL cleanup completed!")
        
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(fix_malformed_dfo_urls())
