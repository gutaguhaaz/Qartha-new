
import asyncio
import json
import shutil
from pathlib import Path

from app.db import close_database, init_database
from app.db.database import database


async def migrate_file_structure():
    """Migrate existing files to new CODE-based structure and update database"""
    await init_database()
    
    # Get all IDFs
    query = "SELECT * FROM idfs"
    rows = await database.fetch_all(query)
    
    static_root = Path("static")
    
    for row in rows:
        cluster = row["cluster"]
        project = row["project"]
        code = row["code"]
        
        print(f"Migrating {cluster}/{project}/{code}")
        
        # Determine folder mappings
        if project == "Sabinas Project":
            old_folder = "sabinas"
        elif project == "Trinity":
            old_folder = "trinity"
        else:
            old_folder = project.lower().replace(" ", "-")
        
        old_path = static_root / cluster / old_folder
        new_path = static_root / cluster / old_folder / code
        
        # Create new directory structure
        (new_path / "images").mkdir(parents=True, exist_ok=True)
        (new_path / "documents").mkdir(parents=True, exist_ok=True)
        (new_path / "diagrams").mkdir(parents=True, exist_ok=True)
        (new_path / "location").mkdir(parents=True, exist_ok=True)
        (new_path / "dfo").mkdir(parents=True, exist_ok=True)
        (new_path / "logo").mkdir(parents=True, exist_ok=True)
        
        # Migrate and collect new paths
        new_images = []
        new_documents = []
        new_diagrams = []
        new_dfo = []
        new_location = None
        new_logo = None
        
        # Migrate images
        if (old_path / "images").exists():
            for img_file in (old_path / "images").glob(f"{code}*"):
                dest = new_path / "images" / img_file.name
                if not dest.exists():
                    shutil.copy2(img_file, dest)
                new_images.append(f"{cluster}/{old_folder}/{code}/images/{img_file.name}")
        
        # Migrate documents
        if (old_path / "documents").exists():
            for doc_file in (old_path / "documents").glob(f"{code}*"):
                dest = new_path / "documents" / doc_file.name
                if not dest.exists():
                    shutil.copy2(doc_file, dest)
                new_documents.append(f"{cluster}/{old_folder}/{code}/documents/{doc_file.name}")
        
        # Migrate diagrams
        if (old_path / "diagrams").exists():
            for diag_file in (old_path / "diagrams").glob(f"{code}*"):
                dest = new_path / "diagrams" / diag_file.name
                if not dest.exists():
                    shutil.copy2(diag_file, dest)
                new_diagrams.append(f"{cluster}/{old_folder}/{code}/diagrams/{diag_file.name}")
        
        # Also check for general diagram files
        if (old_path / "diagrams").exists():
            for diag_file in (old_path / "diagrams").glob("diagram*"):
                dest = new_path / "diagrams" / diag_file.name
                if not dest.exists():
                    shutil.copy2(diag_file, dest)
                new_diagrams.append(f"{cluster}/{old_folder}/{code}/diagrams/{diag_file.name}")
        
        # Migrate DFO
        if (old_path / "dfo").exists():
            for dfo_file in (old_path / "dfo").glob(f"{code}*"):
                dest = new_path / "dfo" / dfo_file.name
                if not dest.exists():
                    shutil.copy2(dfo_file, dest)
                new_dfo.append(f"{cluster}/{old_folder}/{code}/dfo/{dfo_file.name}")
        
        # Migrate location
        if (old_path / "location").exists():
            for loc_file in (old_path / "location").glob(f"{code}*"):
                dest = new_path / "location" / "location" + loc_file.suffix
                if not dest.exists():
                    shutil.copy2(loc_file, dest)
                new_location = f"{cluster}/{old_folder}/{code}/location/location{loc_file.suffix}"
                break  # Only one location file
        
        # Migrate logo
        if (old_path / "logos").exists():
            for logo_file in (old_path / "logos").glob(f"{code}*"):
                dest = new_path / "logo" / "logo" + logo_file.suffix
                if not dest.exists():
                    shutil.copy2(logo_file, dest)
                new_logo = f"{cluster}/{old_folder}/{code}/logo/logo{logo_file.suffix}"
                break  # Only one logo file
        
        # Update database with new paths
        update_query = """
            UPDATE idfs 
            SET images = :images, 
                documents = :documents, 
                diagrams = :diagrams, 
                location = :location, 
                dfo = :dfo, 
                logo = :logo
            WHERE cluster = :cluster AND project = :project AND code = :code
        """
        
        await database.execute(
            update_query,
            {
                "images": new_images,
                "documents": new_documents,
                "diagrams": new_diagrams,
                "location": new_location,
                "dfo": new_dfo,
                "logo": new_logo,
                "cluster": cluster,
                "project": project,
                "code": code,
            },
        )
        
        print(f"  Updated database for {code}")
    
    print("Migration completed!")
    await close_database()


if __name__ == "__main__":
    asyncio.run(migrate_file_structure())
