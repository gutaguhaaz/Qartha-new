
#!/bin/bash

echo "🔄 Running logo and DFO migration..."
python migrate_logo_and_dfo.py

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed!"
    exit 1
fi
