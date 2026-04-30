import sqlite3
import uuid

conn = sqlite3.connect('fabric-os.db')
cursor = conn.cursor()

# Create new tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS products (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36),
    reference VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    description TEXT,
    base_price INTEGER,
    created_at DATETIME
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS materials (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36),
    name VARCHAR(255),
    unit VARCHAR(20),
    stock_quantity INTEGER,
    created_at DATETIME
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS product_materials (
    id CHAR(36) PRIMARY KEY,
    product_id CHAR(36),
    material_id CHAR(36),
    quantity INTEGER
)
""")

# Add product_id to production_orders
try:
    cursor.execute("ALTER TABLE production_orders ADD COLUMN product_id CHAR(36)")
except:
    pass

conn.commit()
conn.close()
print("Database migrated to Phase 6.")
