import sqlite3
import os

def migrate():
    db_paths = ["backend/fabricos.db", "fabricos.db", "backend/app/database.db", "fabric-os.db"]
    for path in db_paths:
        if os.path.exists(path):
            print(f"--> Migrando banco de dados: {path}")
            conn = sqlite3.connect(path)
            cursor = conn.cursor()
            
            # 1. Atualizações na tabela 'partners'
            print("   - Atualizando tabela 'partners'...")
            try:
                cursor.execute("ALTER TABLE partners ADD COLUMN status VARCHAR(50) DEFAULT 'ATIVO'")
                conn.commit()
                print("     [OK] Coluna 'status' adicionada à tabela 'partners'.")
            except sqlite3.OperationalError as e:
                print(f"     [INFO] Coluna 'status' já existe ou falha: {e}")
                
            try:
                cursor.execute("ALTER TABLE partners ADD COLUMN pending_losses_count INTEGER DEFAULT 0")
                conn.commit()
                print("     [OK] Coluna 'pending_losses_count' adicionada à tabela 'partners'.")
            except sqlite3.OperationalError as e:
                print(f"     [INFO] Coluna 'pending_losses_count' já existe ou falha: {e}")

            # 2. Atualizações na tabela 'withdrawals'
            print("   - Atualizando tabela 'withdrawals'...")
            try:
                cursor.execute("ALTER TABLE withdrawals ADD COLUMN employee_id VARCHAR(36)")
                conn.commit()
                print("     [OK] Coluna 'employee_id' adicionada à tabela 'withdrawals'.")
            except sqlite3.OperationalError as e:
                print(f"     [INFO] Coluna 'employee_id' já existe ou falha: {e}")
                
            try:
                cursor.execute("ALTER TABLE withdrawals ADD COLUMN custody_confirmed BOOLEAN DEFAULT 0")
                conn.commit()
                print("     [OK] Coluna 'custody_confirmed' adicionada à tabela 'withdrawals'.")
            except sqlite3.OperationalError as e:
                print(f"     [INFO] Coluna 'custody_confirmed' já existe ou falha: {e}")

            try:
                cursor.execute("ALTER TABLE withdrawals ADD COLUMN custody_confirmed_by VARCHAR(255)")
                conn.commit()
                print("     [OK] Coluna 'custody_confirmed_by' adicionada à tabela 'withdrawals'.")
            except sqlite3.OperationalError as e:
                print(f"     [INFO] Coluna 'custody_confirmed_by' já existe ou falha: {e}")

            try:
                cursor.execute("ALTER TABLE withdrawals ADD COLUMN replacement_cost_agreed REAL DEFAULT 0.0")
                conn.commit()
                print("     [OK] Coluna 'replacement_cost_agreed' adicionada à tabela 'withdrawals'.")
            except sqlite3.OperationalError as e:
                print(f"     [INFO] Coluna 'replacement_cost_agreed' já existe ou falha: {e}")

            # 3. Criação de novas tabelas
            print("   - Criando novas tabelas de Rastreabilidade e Mobile...")
            
            # employees
            try:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS employees (
                    id VARCHAR(36) PRIMARY KEY,
                    tenant_id VARCHAR(36) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    phone_number VARCHAR(20),
                    department VARCHAR(100) NOT NULL,
                    status VARCHAR(50) DEFAULT 'ATIVO',
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
                )
                """)
                conn.commit()
                print("     [OK] Tabela 'employees' criada ou verificada.")
            except Exception as e:
                print(f"     [ERROR] Erro ao criar tabela 'employees': {e}")

            # pieces
            try:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS pieces (
                    id VARCHAR(36) PRIMARY KEY,
                    tenant_id VARCHAR(36) NOT NULL,
                    product_id VARCHAR(36) NOT NULL,
                    production_order_id VARCHAR(36),
                    rfid_epc VARCHAR(100) UNIQUE,
                    size VARCHAR(10) NOT NULL,
                    status VARCHAR(50) DEFAULT 'estoque',
                    current_withdrawal_id VARCHAR(36),
                    raw_material_batch VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                    FOREIGN KEY (product_id) REFERENCES products(id),
                    FOREIGN KEY (production_order_id) REFERENCES production_orders(id),
                    FOREIGN KEY (current_withdrawal_id) REFERENCES withdrawals(id)
                )
                """)
                conn.commit()
                print("     [OK] Tabela 'pieces' criada ou verificada.")
            except Exception as e:
                print(f"     [ERROR] Erro ao criar tabela 'pieces': {e}")

            # distributions
            try:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS distributions (
                    id VARCHAR(36) PRIMARY KEY,
                    tenant_id VARCHAR(36) NOT NULL,
                    product_id VARCHAR(36) NOT NULL,
                    store_name VARCHAR(255) NOT NULL,
                    size_grade TEXT NOT NULL, -- Guardado como JSON string
                    total_quantity INTEGER NOT NULL,
                    status VARCHAR(50) DEFAULT 'pendente',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
                """)
                conn.commit()
                print("     [OK] Tabela 'distributions' criada ou verificada.")
            except Exception as e:
                print(f"     [ERROR] Erro ao criar tabela 'distributions': {e}")

            # notifications
            try:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id VARCHAR(36) PRIMARY KEY,
                    tenant_id VARCHAR(36) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    department VARCHAR(100) NOT NULL,
                    read BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
                )
                """)
                conn.commit()
                print("     [OK] Tabela 'notifications' criada ou verificada.")
            except Exception as e:
                print(f"     [ERROR] Erro ao criar tabela 'notifications': {e}")

            conn.close()
            print(f"--> Sincronização e migração de {path} concluída com absoluto sucesso!\n")
        else:
            print(f"Banco de dados não encontrado em: {path}")

if __name__ == "__main__":
    migrate()
