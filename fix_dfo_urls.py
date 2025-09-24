
#!/usr/bin/env python3

import asyncio
import json
import re
from app.db.database import init_database, database

async def fix_dfo_urls():
    """Fix malformed DFO URLs in the database"""
    await init_database()
    
    try:
        # Get all IDFs with DFO data
        rows = await database.fetch_all("SELECT id, cluster, project, code, dfo FROM idfs WHERE dfo IS NOT NULL AND dfo != '[]'")
        
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
                        
                        # Check if URL contains malformed data like Python dict strings
                        if "{'url':" in url or url.startswith("https://") and "/static/{'url'" in url:
                            needs_fixing = True
                            # Extract the actual path from malformed URL
                            match = re.search(r"'/static/([^']+)'", url)
                            if match:
                                clean_path = match.group(1)
                                fixed_item = {
                                    "url": f"/static/{clean_path}",
                                    "name": item.get("name", "DFO"),
                                    "kind": item.get("kind", "diagram")
                                }
                                fixed_dfo.append(fixed_item)
                                print(f"Fixed URL: {url} -> /static/{clean_path}")
                            else:
                                # Keep original if we can't extract a clean path
                                fixed_dfo.append(item)
                        else:
                            # URL is already clean
                            fixed_dfo.append(item)
                    else:
                        # Handle string format
                        if isinstance(item, str):
                            if "{'url':" in item:
                                needs_fixing = True
                                match = re.search(r"'/static/([^']+)'", item)
                                if match:
                                    clean_path = match.group(1)
                                    fixed_item = {
                                        "url": f"/static/{clean_path}",
                                        "name": "DFO",
                                        "kind": "diagram"
                                    }
                                    fixed_dfo.append(fixed_item)
                                    print(f"Fixed string: {item} -> /static/{clean_path}")
                            else:
                                # Assume it's a clean URL string
                                fixed_item = {
                                    "url": item if item.startswith("/static/") else f"/static/{item}",
                                    "name": "DFO",
                                    "kind": "diagram"
                                }
                                fixed_dfo.append(fixed_item)
                        else:
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
        
    except Exception as e:
        print(f"❌ Error during DFO cleanup: {e}")
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(fix_dfo_urls())
