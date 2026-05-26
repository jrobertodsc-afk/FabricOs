import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000/api"
session = requests.Session()

def print_result(step, res):
    if res.status_code >= 400:
        print(f"[X] {step} FAILED: {res.status_code}")
        print(res.text)
        exit(1)
    else:
        print(f"[OK] {step} OK")
        return res.json()

# 1. Login
res = session.post(f"{BASE_URL}/auth/login", data={"username": "roberto@fabricos.com", "password": "admin123"})
data = print_result("Login", res)
session.headers.update({"Authorization": f"Bearer {data['access_token']}"})

# 2. Insumos (Materials)
res = session.post(f"{BASE_URL}/materials/", json={
    "name": "Tecido Algodão Premium",
    "unit": "metros",
    "stock_quantity": 500.5
})
material = print_result("Create Material", res)

import time

# 3. Produtos (Products)
ref_id = int(time.time())
res = session.post(f"{BASE_URL}/products/", json={
    "reference": f"CAM-{ref_id}",
    "name": "Camisa Polo Básica",
    "base_price": 45.90,
    "materials": [
        {"material_id": material["id"], "quantity": 1.5}
    ]
})
product = print_result("Create Product", res)

# 4. Parceiros (Partners)
res = session.post(f"{BASE_URL}/partners/", json={
    "name": "Faccionista Teste Automático",
    "contact_name": "João da Costura",
    "phone_number": "11999999999",
    "specialty": "Costura",
    "type": "faccionista"
})
partner = print_result("Create Partner", res)

# 5. Ordens de Produção (Production Orders)
res = session.post(f"{BASE_URL}/production/orders", json={
    "item_name": "Lote Camisas Polo",
    "total_quantity": 100,
    "price_per_piece": 5.50,
    "partner_id": partner["id"],
    "product_id": product["id"],
    "current_stage": "Costura",
    "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
    "size_grade": {"P": 20, "M": 50, "G": 30}
})
op = print_result("Create Production Order", res)

# 6. Retiradas (Withdrawals)
res = session.post(f"{BASE_URL}/withdrawals/", json={
    "item_name": "Máquina de Costura Extra",
    "person_name": "João da Costura",
    "reason": "Empréstimo para alta demanda",
    "type": "faccionista",
    "partner_id": partner["id"],
    "destination": "Oficina João",
    "expected_return": (datetime.now() + timedelta(days=14)).isoformat(),
    "items": [
        {"size": "U", "quantity": 1}
    ]
})
withdrawal = print_result("Create Withdrawal", res)

# 7. List endpoints (Dashboard simulation)
res = session.get(f"{BASE_URL}/withdrawals/?skip=0&limit=200")
print_result("List Withdrawals", res)

res = session.get(f"{BASE_URL}/production/orders?skip=0&limit=200")
print_result("List Production Orders", res)

res = session.get(f"{BASE_URL}/partners/?skip=0&limit=200")
print_result("List Partners", res)

res = session.get(f"{BASE_URL}/financials/settlements")
print_result("List Financials (Settlements)", res)

print("\n[SUCCESS] TODOS OS TESTES PASSARAM NO BACKEND!")
