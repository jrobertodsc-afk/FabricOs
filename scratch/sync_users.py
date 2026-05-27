import sqlite3

def sync():
    conn_src = sqlite3.connect('fabricos.db')
    conn_dst = sqlite3.connect('FabricOS-Enterprise/fabricos.db')
    
    cur_src = conn_src.cursor()
    cur_dst = conn_dst.cursor()
    
    cur_src.execute('SELECT * FROM users WHERE email="sergiobahia@fabricos.com"')
    user = cur_src.fetchone()
    
    if user:
        cur_dst.execute('SELECT id FROM tenants')
        tenant_id = cur_dst.fetchone()[0]
        
        cur_dst.execute('''
            INSERT OR REPLACE INTO users (id, tenant_id, email, hashed_password, full_name, role) 
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user[0], tenant_id, user[2], user[3], user[4], user[5]))
        
        conn_dst.commit()
        print("Usuário sergiobahia@fabricos.com copiado para o banco do cliente!")
    else:
        print("Usuário não encontrado no banco de origem.")

if __name__ == '__main__':
    sync()
