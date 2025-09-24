
import asyncio
import json
from app.db.database import database, init_database, close_database

async def fix_json_fields_in_database():
    """Fix JSON fields that are stored as strings in the database"""
    await init_database()
    
    try:
        # Get all IDFs
        idfs = await database.fetch_all("SELECT * FROM idfs ORDER BY id")
        
        print(f"Found {len(idfs)} IDFs to check and fix...")
        
        for idf in idfs:
            idf_id = idf["id"]
            code = idf["code"]
            
            print(f"Processing IDF {code} (ID: {idf_id})")
            
            updates = {}
            
            # Helper function to fix JSON fields
            def fix_json_field(field_name, field_value):
                if field_value is None:
                    return []
                    
                # If it's already a list, return as is
                if isinstance(field_value, list):
                    return field_value
                    
                # If it's a string, try to parse as JSON
                if isinstance(field_value, str):
                    # Empty string should be empty array
                    if not field_value.strip():
                        return []
                    
                    # Try to parse JSON
                    try:
                        parsed = json.loads(field_value)
                        # If parsed result is a list, return it
                        if isinstance(parsed, list):
                            return parsed
                        # If it's a single string, wrap in array
                        elif isinstance(parsed, str):
                            return [parsed] if parsed else []
                        else:
                            return []
                    except (json.JSONDecodeError, TypeError):
                        # If not valid JSON, treat as single string
                        return [field_value] if field_value else []
                
                return []
            
            # Fix array fields
            array_fields = ['images', 'documents', 'diagrams', 'dfo']
            for field in array_fields:
                current_value = idf.get(field)
                fixed_value = fix_json_field(field, current_value)
                
                # Only update if the value changed
                if current_value != fixed_value:
                    updates[field] = fixed_value
                    print(f"  Fixing {field}: {current_value} -> {fixed_value}")
            
            # Fix single value fields (location, logo)
            single_fields = ['location', 'logo']
            for field in single_fields:
                current_value = idf.get(field)
                
                if current_value is None:
                    continue
                    
                # If it's a string that looks like JSON array, extract first element
                if isinstance(current_value, str) and current_value.strip():
                    try:
                        parsed = json.loads(current_value)
                        if isinstance(parsed, list) and parsed:
                            # Take first element from array
                            fixed_value = parsed[0]
                            updates[field] = fixed_value
                            print(f"  Fixing {field}: {current_value} -> {fixed_value}")
                        elif isinstance(parsed, list) and not parsed:
                            # Empty array should be null
                            updates[field] = None
                            print(f"  Fixing {field}: {current_value} -> NULL")
                    except (json.JSONDecodeError, TypeError):
                        # Leave as is if not JSON
                        pass
            
            # Apply updates if any
            if updates:
                set_clauses = []
                params = {"id": idf_id}
                
                for field, value in updates.items():
                    set_clauses.append(f"{field} = :{field}")
                    params[field] = value
                
                update_query = f"UPDATE idfs SET {', '.join(set_clauses)} WHERE id = :id"
                
                await database.execute(update_query, params)
                print(f"  ✅ Updated {len(updates)} fields for {code}")
            else:
                print(f"  ✅ No fixes needed for {code}")
        
        print("✅ Database JSON fields fixed successfully!")
        
    except Exception as e:
        print(f"❌ Error fixing database: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await close_database()

if __name__ == "__main__":
    asyncio.run(fix_json_fields_in_database())
