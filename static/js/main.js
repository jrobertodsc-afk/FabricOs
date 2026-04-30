document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const modal = document.getElementById('modal-withdrawal');
    const btnNewWithdrawal = document.getElementById('btn-new-withdrawal');
    const btnCloseModal = document.querySelectorAll('.btn-close');
    const formWithdrawal = document.getElementById('form-withdrawal');
    const activeList = document.getElementById('active-list');
    const historyList = document.getElementById('history-list-body');
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const emptyState = document.getElementById('empty-state');
    
    const statOut = document.getElementById('stat-out');
    const statPending = document.getElementById('stat-pending');
    const statReturned = document.getElementById('stat-returned');
    const activeCountBadge = document.getElementById('active-count');

    // Return Modal Elements
    const modalReturn = document.getElementById('modal-return');
    const formReturn = document.getElementById('form-return');
    const returnIdInput = document.getElementById('return_id');
    const returnQtyInput = document.getElementById('return_qty_input');
    const maxQtyLabel = document.getElementById('max_qty_label');
    const btnCloseReturn = document.querySelectorAll('.btn-close-return');

    // Report Elements
    const count7 = document.getElementById('count-7');
    const count15 = document.getElementById('count-15');
    const count30 = document.getElementById('count-30');
    const pendingReportBody = document.getElementById('pending-report-body');
    const reportTitle = document.getElementById('report-title');

    // Filter Elements
    const filterType = document.getElementById('filter-type');
    const filterStatus = document.getElementById('filter-status');
    const filterPeriod = document.getElementById('filter-period');

    let allWithdrawals = [];

    // Fetch and Render Data
    async function fetchData() {
        try {
            const response = await fetch('/api/withdrawals');
            allWithdrawals = await response.json();
            renderAll();
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function renderAll() {
        renderDashboard();
        renderHistory();
        renderReports();
        updateStats();
    }

    function updateStats() {
        const activeItems = allWithdrawals.filter(w => w.status === 'pendente');
        const returnedToday = allWithdrawals.filter(w => {
            if (w.status !== 'devolvido') return false;
            const today = new Date().toISOString().split('T')[0];
            return w.returned_at.startsWith(today);
        });

        statOut.textContent = activeItems.length;
        statPending.textContent = activeItems.length; // Same as out for now
        statReturned.textContent = returnedToday.length;
        activeCountBadge.textContent = `${activeItems.length} itens`;
    }

    function renderDashboard() {
        const activeItems = allWithdrawals.filter(w => w.status === 'pendente');
        
        if (activeItems.length === 0) {
            activeList.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        activeList.innerHTML = activeItems.map(item => {
            const daysOut = calculateDays(item.created_at);
            let alertHtml = '';
            if (daysOut >= 30) alertHtml = '<span class="status-pill alert-30">30+ DIAS</span>';
            else if (daysOut >= 15) alertHtml = '<span class="status-pill alert-15">15+ DIAS</span>';
            else if (daysOut >= 7) alertHtml = '<span class="status-pill alert-7">7+ DIAS</span>';

            const photoHtml = item.photo_url 
                ? `<img src="${item.photo_url}" class="item-thumb" onclick="window.open('${item.photo_url}')">`
                : `<div class="item-thumb" style="display:flex;align-items:center;justify-content:center;"><i class="ph ph-image"></i></div>`;

            const sizesText = item.sizes ? Object.entries(item.sizes)
                .filter(([s, q]) => q > 0)
                .map(([s, q]) => `${s}: ${q}`)
                .join(', ') : '';

            let waText = '';
            if (item.type === 'faccionista' || item.reason === 'Faccionista') {
                waText = `Olá ${item.person_name}, notamos que a produção da família "${item.item_name}" (${sizesText || item.quantity + ' peças'}) retirada em ${formatDate(item.created_at)} ainda não retornou. Alguma previsão?`;
            } else {
                waText = `Olá ${item.person_name}, notamos que a peça "${item.item_name}" retirada em ${formatDate(item.created_at)} (${sizesText}) ainda não foi devolvida. Poderia verificar?`;
            }
            
            const waMsg = encodeURIComponent(waText);
            
            // Limpar o número (remover espaços, traços, etc)
            const cleanPhone = item.phone_number ? item.phone_number.replace(/\D/g, '') : '';
            const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${waMsg}` : `https://wa.me/?text=${waMsg}`;

            const sizesHtml = item.sizes ? Object.entries(item.sizes)
                .filter(([s, q]) => q > 0)
                .map(([s, q]) => `<span style="font-size:10px; background:rgba(255,255,255,0.05); padding:2px 4px; border-radius:4px; margin-right:4px">${s}:${q}</span>`)
                .join('') : '';

            return `
                <tr>
                    <td>${photoHtml}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px">
                            <span class="status-pill" style="font-size: 10px; padding: 2px 6px; background: ${item.type === 'faccionista' ? 'rgba(0,188,212,0.1)' : 'rgba(0,85,164,0.1)'}; color: ${item.type === 'faccionista' ? '#00bcd4' : 'var(--primary-color)'}">
                                ${item.reason.toUpperCase()}
                            </span>
                            <strong>${item.item_name}</strong>
                            ${item.notes && item.notes.includes('Part de') ? '<span class="status-pill" style="font-size:9px; background:rgba(255,179,0,0.1); color:#ffb300; margin-left:5px">SALDO</span>' : ''}
                        </div>
                        <div style="font-size: 11px; color: var(--text-dim); margin: 4px 0">
                            ${sizesHtml}
                        </div>
                        <div style="font-size: 11px; color: var(--warning); font-style: italic; margin-top: 4px">
                            ${item.notes || ''}
                        </div>
                        <div style="font-size: 11px; color: var(--text-dim)">
                            ${item.destination || ''}
                        </div>
                        ${alertHtml ? '<div style="margin-top: 4px">' + alertHtml + '</div>' : ''}
                    </td>
                    <td><strong style="color: var(--primary-color)">${item.quantity || 0}</strong></td>
                    <td>${item.person_name}</td>
                    <td>${item.expected_return ? formatDateShort(item.expected_return) : '-'}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-action" onclick="openEditModal('${item.id}')" title="Editar">
                                <i class="ph-bold ph-pencil"></i>
                            </button>
                            <button class="btn-action" onclick="openReturnModal('${item.id}')" title="Confirmar Devolução">
                                <i class="ph-bold ph-check"></i>
                            </button>
                            <button class="btn-action" onclick="deleteWithdrawal('${item.id}')" style="color: var(--danger); border-color: rgba(255,77,77,0.2)" title="Excluir">
                                <i class="ph-bold ph-trash"></i>
                            </button>
                            <a href="${waUrl}" target="_blank" class="btn-whatsapp" title="Cobrar via WhatsApp">
                                <i class="ph-fill ph-whatsapp-logo"></i>
                            </a>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderHistory() {
        const sortedItems = [...allWithdrawals].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        historyList.innerHTML = sortedItems.map(item => {
            const returnInfo = item.return_detail ? `
                <div style="font-size:10px; color:${item.return_detail === 'ok' ? 'var(--success)' : 'var(--danger)'}">
                    ${item.return_detail.toUpperCase()} ${item.return_notes ? ': ' + item.return_notes : ''}
                </div>
            ` : '';

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px">
                            <strong>${item.item_name}</strong>
                            ${item.notes && item.notes.includes('Part de') ? '<span class="status-pill" style="font-size:9px; background:rgba(255,179,0,0.1); color:#ffb300">SALDO</span>' : ''}
                        </div>
                        <div style="font-size:10px; color:var(--text-dim)">${item.reason}</div>
                        <div style="font-size:10px; color:var(--warning); margin-top:2px">${item.notes || ''}</div>
                    </td>
                    <td><strong>${item.quantity || 0}</strong></td>
                    <td>${item.person_name}</td>
                    <td>${formatDate(item.created_at)}</td>
                    <td>${item.returned_at ? formatDate(item.returned_at) : '-'}</td>
                    <td>
                        <span class="status-pill ${item.status}">${item.status.toUpperCase()}</span>
                        ${returnInfo}
                    </td>
                    <td>
                        <button class="btn-action" onclick="deleteWithdrawal('${item.id}')" style="color: var(--danger); border-color: rgba(255,77,77,0.2)" title="Excluir">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderReports() {
        const type = filterType.value;
        const status = filterStatus.value;
        const period = filterPeriod.value;

        // Base filter for stats (always pending items)
        const activeItems = allWithdrawals.filter(w => w.status === 'pendente');
        count7.textContent = activeItems.filter(w => calculateDays(w.created_at) >= 7).length;
        count15.textContent = activeItems.filter(w => calculateDays(w.created_at) >= 15).length;
        count30.textContent = activeItems.filter(w => calculateDays(w.created_at) >= 30).length;

        // Dynamic Filtering for the table
        let filtered = [...allWithdrawals];

        if (type !== 'all') filtered = filtered.filter(w => w.type === type);
        if (status !== 'all') filtered = filtered.filter(w => w.status === status);
        
        if (period !== 'all') {
            const now = new Date();
            filtered = filtered.filter(w => {
                const date = new Date(w.created_at);
                if (period === 'week') {
                    const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                    return date >= weekAgo;
                } else if (period === 'month') {
                    const monthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                    return date >= monthAgo;
                }
                return true;
            });
        }

        reportTitle.textContent = `Relatório: ${status === 'pendente' ? 'Pendências' : status === 'devolvido' ? 'Devoluções' : 'Geral'} (${type === 'all' ? 'Todos' : type})`;

        pendingReportBody.innerHTML = filtered
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(item => `
                <tr>
                    <td><span class="status-pill" style="font-size:10px; background:${item.type === 'faccionista' ? 'rgba(0,188,212,0.1)' : 'rgba(191,255,0,0.1)'}; color:${item.type === 'faccionista' ? '#00bcd4' : 'var(--primary-color)'}">${item.type.toUpperCase()}</span></td>
                    <td><strong>${item.item_name}</strong></td>
                    <td>${item.person_name}</td>
                    <td>${item.quantity || 1}</td>
                    <td>${formatDate(item.created_at)}</td>
                    <td>${item.returned_at ? formatDate(item.returned_at) : '-'}</td>
                    <td><span class="status-pill ${item.status}">${item.status.toUpperCase()}</span></td>
                </tr>
            `).join('');
    }

    // Modal Logic
    btnNewWithdrawal.addEventListener('click', () => modal.classList.add('active'));
    btnCloseModal.forEach(btn => btn.addEventListener('click', () => modal.classList.remove('active')));

    // Form Logic
    formWithdrawal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(formWithdrawal);
        const url = editMode ? `/api/withdrawals/${editingId}` : '/api/withdrawals';
        const method = editMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData
            });

            if (response.ok) {
                modalWithdrawal.classList.remove('active');
                formWithdrawal.reset();
                editMode = false;
                editingId = null;
                document.querySelector('#modal-withdrawal h2').textContent = 'Registrar Retirada';
                fetchData();
            }
        } catch (error) {
            console.error('Error saving withdrawal:', error);
        }
    });

    // Reset edit mode when clicking new button
    btnNewWithdrawal.addEventListener('click', () => {
        editMode = false;
        editingId = null;
        formWithdrawal.reset();
        document.querySelector('#modal-withdrawal h2').textContent = 'Registrar Retirada';
        modalWithdrawal.classList.add('active');
    });

    // Return Modal Logic
    window.openReturnModal = (id) => {
        const item = allWithdrawals.find(w => w.id === id);
        if (!item) return;

        returnIdInput.value = id;
        returnQtyInput.value = item.quantity;
        returnQtyInput.max = item.quantity;
        maxQtyLabel.textContent = `Total pendente: ${item.quantity} peças`;
        modalReturn.classList.add('active');
    };

    btnCloseReturn.forEach(btn => btn.addEventListener('click', () => modalReturn.classList.remove('active')));

    formReturn.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = returnIdInput.value;
        const formData = new FormData(formReturn);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`/api/withdrawals/${id}/return`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                modalReturn.classList.remove('active');
                formReturn.reset();
                fetchData();
            }
        } catch (error) {
            console.error('Error returning item:', error);
        }
    });

    window.deleteWithdrawal = async (id) => {
        if (!confirm('TEM CERTEZA? Esta ação excluirá permanentemente o registro de retirada.')) return;

        try {
            const response = await fetch(`/api/withdrawals/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Error deleting withdrawal:', error);
        }
    };

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.getAttribute('data-view');
            
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            views.forEach(v => v.classList.add('hidden'));
            document.getElementById(`${viewId}-view`).classList.remove('hidden');
        });
    });

    // Search Logic
    const searchInput = document.querySelector('.search-bar input');
    searchInput.id = 'dashboard-search'; // Ensure ID matches
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#dashboard-list-body tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });

    // Export Logic
    window.exportToCSV = () => {
        const rows = document.querySelectorAll('#pending-report-table tr');
        let csv = [];
        rows.forEach(row => {
            let cols = row.querySelectorAll('td, th');
            let rowData = [];
            cols.forEach(col => rowData.push('"' + col.innerText.replace(/"/g, '""') + '"'));
            csv.push(rowData.join(','));
        });
        
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_producao_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Edit Logic
    let editMode = false;
    let editingId = null;

    window.openEditModal = (id) => {
        const item = allWithdrawals.find(w => w.id === id);
        if (!item) return;

        editMode = true;
        editingId = id;
        
        // Fill form
        const form = document.getElementById('form-withdrawal');
        form.item_name.value = item.item_name;
        form.person_name.value = item.person_name;
        form.phone_number.value = item.phone_number || '';
        form.reason.value = item.reason;
        form.destination.value = item.destination || '';
        form.expected_return.value = item.expected_return || '';
        form.notes.value = item.notes || '';
        
        if (item.sizes) {
            form.size_pp.value = item.sizes.PP || 0;
            form.size_p.value = item.sizes.P || 0;
            form.size_m.value = item.sizes.M || 0;
            form.size_g.value = item.sizes.G || 0;
            form.size_gg.value = item.sizes.GG || 0;
            form.size_u.value = item.sizes.U || 0;
            updateAutoSum();
        }

        document.querySelector('#modal-withdrawal h2').textContent = 'Editar Retirada';
        modalWithdrawal.classList.add('active');
    };

    // Update form submission to handle Edit
    formWithdrawal.removeEventListener('submit', handleFormSubmit); // I need to refactor this

    // Auto-sum Grade
    const gradeInputs = document.querySelectorAll('.grade-item input');
    const totalQuantityInput = document.getElementById('total-quantity');

    function updateAutoSum() {
        let total = 0;
        gradeInputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });
        totalQuantityInput.value = total;
    }

    gradeInputs.forEach(input => {
        input.addEventListener('input', updateAutoSum);
    });

    // Filter Events
    [filterType, filterStatus, filterPeriod].forEach(el => {
        el.addEventListener('change', renderReports);
    });

    // Helpers
    function calculateDays(dateStr) {
        const start = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    function formatDateShort(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        // Date from input type="date" is in YYYY-MM-DD format (local)
        // Add timezone offset to fix one-day-off issue
        const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        return localDate.toLocaleDateString('pt-BR');
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Initial Load
    fetchData();
});
