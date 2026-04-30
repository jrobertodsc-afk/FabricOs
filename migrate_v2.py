import sqlite3

conn = sqlite3.connect('fabric-os.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE production_orders ADD COLUMN collection VARCHAR(100)")
except:
    pass

try:
    cursor.execute("ALTER TABLE production_orders ADD COLUMN size_grade JSON")
except:
    pass

try:
    cursor.execute("ALTER TABLE production_orders ADD COLUMN observations TEXT")
except:
    pass

conn.commit()
conn.close()
print("Database updated with new columns.")
