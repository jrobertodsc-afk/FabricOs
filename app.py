from flask import Flask, render_template, request, jsonify
import json
import os
import shutil
from datetime import datetime
import uuid
import webbrowser
from threading import Timer

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
UPLOAD_FOLDER = os.path.join('static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

DATA_FILE = os.path.join('data', 'withdrawals.json')

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def create_backup():
    if os.path.exists(DATA_FILE):
        backup_dir = 'backups'
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        shutil.copy2(DATA_FILE, f'{backup_dir}/withdrawals_backup_{timestamp}.json')

# Create backup on startup
create_backup()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/withdrawals', methods=['GET'])
def get_withdrawals():
    return jsonify(load_data())

@app.route('/api/withdrawals', methods=['POST'])
def add_withdrawal():
    data = load_data()
    
    # Handle multipart form data
    new_entry = {
        'id': str(uuid.uuid4()),
        'item_name': request.form.get('item_name'),
        'person_name': request.form.get('person_name'),
        'phone_number': request.form.get('phone_number', ''),
        'reason': request.form.get('reason'),
        'type': request.form.get('type', 'interno'), # interno ou faccionista
        'quantity': request.form.get('quantity', '1'),
        'family': request.form.get('family', ''),
        'destination': request.form.get('destination', ''),
        'expected_return': request.form.get('expected_return', ''),
        'notes': request.form.get('notes', ''),
        'sizes': {
            'PP': request.form.get('size_pp', '0'),
            'P': request.form.get('size_p', '0'),
            'M': request.form.get('size_m', '0'),
            'G': request.form.get('size_g', '0'),
            'GG': request.form.get('size_gg', '0'),
            'U': request.form.get('size_u', '0')
        },
        'status': 'pendente',
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

    # Handle Photo Upload
    if 'photo' in request.files:
        file = request.files['photo']
        if file.filename != '':
            filename = f"{new_entry['id']}_{file.filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            new_entry['photo_url'] = f"/static/uploads/{filename}"

    data.append(new_entry)
    save_data(data)
    return jsonify(new_entry), 201

@app.route('/api/withdrawals/<id>/return', methods=['PUT'])
def return_item(id):
    data = load_data()
    return_data = request.json
    return_qty = int(return_data.get('return_qty', 0))
    
    new_data = []
    item_found = False
    
    for item in data:
        if item['id'] == id and item['status'] == 'pendente':
            item_found = True
            total_qty = int(item.get('quantity', 0))
            
            if return_qty >= total_qty:
                # Devolução Total: Tudo volta OK ou com a nota geral
                item['status'] = 'devolvido'
                item['return_detail'] = return_data.get('return_status', 'ok')
                item['return_notes'] = return_data.get('return_notes', '')
                item['returned_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                new_data.append(item)
            else:
                # 1. A parte que voltou para a empresa (entra no histórico como OK)
                returned_part = item.copy()
                returned_part['id'] = str(uuid.uuid4())
                returned_part['quantity'] = str(return_qty)
                returned_part['status'] = 'devolvido'
                returned_part['return_detail'] = 'parcial_ok'
                returned_part['return_notes'] = 'Parte entregue OK'
                returned_part['returned_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                # 2. O saldo que ficou pendente (recebe a nota do motivo, ex: Ajuste)
                item['quantity'] = str(total_qty - return_qty)
                item['notes'] = return_data.get('return_notes', f"Saldo de entrega parcial ({return_qty} devolvidas)")
                
                new_data.append(item)
                new_data.append(returned_part)
        else:
            new_data.append(item)
            
    if item_found:
        save_data(new_data)
        return jsonify({'success': True})
    
    return jsonify({'error': 'Item não encontrado ou já devolvido'}), 404

@app.route('/api/withdrawals/<id>', methods=['DELETE'])
def delete_withdrawal(id):
    data = load_data()
    # Find item to get photo_url if exists
    item_to_delete = next((item for item in data if item['id'] == id), None)
    
    if item_to_delete:
        # Delete photo file if exists
        if 'photo_url' in item_to_delete:
            photo_path = item_to_delete['photo_url'].lstrip('/')
            if os.path.exists(photo_path):
                os.remove(photo_path)
        
        new_data = [item for item in data if item['id'] != id]
        save_data(new_data)
        return jsonify({'success': True})
    
    return jsonify({'error': 'Item não encontrado'}), 404

@app.route('/api/withdrawals/<id>', methods=['PUT'])
def update_withdrawal(id):
    data = load_data()
    for item in data:
        if item['id'] == id:
            item['item_name'] = request.form.get('item_name', item['item_name'])
            item['person_name'] = request.form.get('person_name', item['person_name'])
            item['phone_number'] = request.form.get('phone_number', item.get('phone_number', ''))
            item['reason'] = request.form.get('reason', item['reason'])
            item['destination'] = request.form.get('destination', item.get('destination', ''))
            item['expected_return'] = request.form.get('expected_return', item.get('expected_return', ''))
            item['notes'] = request.form.get('notes', item.get('notes', ''))
            
            # Update sizes if provided
            if 'size_p' in request.form:
                item['sizes'] = {
                    'PP': request.form.get('size_pp', '0'),
                    'P': request.form.get('size_p', '0'),
                    'M': request.form.get('size_m', '0'),
                    'G': request.form.get('size_g', '0'),
                    'GG': request.form.get('size_gg', '0'),
                    'U': request.form.get('size_u', '0')
                }
                # Update quantity based on sizes
                total = 0
                for q in item['sizes'].values():
                    total += int(q or 0)
                item['quantity'] = str(total)
            
            save_data(data)
            return jsonify(item)
    return jsonify({'error': 'Item não encontrado'}), 404

def open_browser():
    webbrowser.open_new('http://127.0.0.1:5001/')

if __name__ == '__main__':
    # Criar pasta de dados se não existir
    if not os.path.exists('data'):
        os.makedirs('data')
    
    # Abrir navegador após 1 segundo
    Timer(1, open_browser).start()
    
    app.run(port=5001, debug=True)
