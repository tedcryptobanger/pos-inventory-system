import {getProducts, getInventoryMovements, recordInventoryMovement} from '../data/store.js';

function escapeHtml(value){
  return String(value).replace(/[&<>'"]/g,c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    "'":'&#39;',
    '"':'&quot;'
  }[c]));
}

function money(n){
  return new Intl.NumberFormat('en-KE',{
    style:'currency',
    currency:'KES',
    maximumFractionDigits:0
  }).format(n);
}

function typeLabel(type){
  return type === 'in' ? 'Stock In' : type === 'out' ? 'Stock Out' : 'Adjustment';
}

function typeBadge(type){
  const cls = type === 'in' ? 'badge-success' : type === 'out' ? 'badge-warning' : 'badge-danger';
  return `<span class="badge ${cls}">${typeLabel(type)}</span>`;
}

function formatDate(value){
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-KE',{
    dateStyle:'medium',
    timeStyle:'short'
  }).format(date);
}

function stockStatus(product){
  if(product.stock <= 0) return '<span class="badge badge-danger">Out of stock</span>';
  if(product.stock <= product.reorder) return '<span class="badge badge-warning">Low stock</span>';
  return '<span class="badge badge-success">In stock</span>';
}

export function renderInventory(){
  const products = getProducts();
  const movements = getInventoryMovements();

  const totalUnits = products.reduce((sum,p)=>sum + (Number(p.stock)||0),0);
  const stockValue = products.reduce((sum,p)=>sum + ((Number(p.stock)||0)*(Number(p.price)||0)),0);
  const lowStock = products.filter(p=>Number(p.stock) <= Number(p.reorder)).length;
  const outOfStock = products.filter(p=>Number(p.stock) <= 0).length;

  return `
    <div class="page-head">
      <div>
        <h2>Inventory</h2>
        <p>Monitor stock levels, movements and replenishment needs.</p>
      </div>
      <button class="btn btn-primary" data-action="stock-movement">+ Stock Movement</button>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-top"><span>Total Units</span><span class="stat-icon">📦</span></div>
        <div class="stat-value">${totalUnits.toLocaleString('en-KE')}</div>
        <div class="stat-note">Current units in stock</div>
      </div>
      <div class="stat">
        <div class="stat-top"><span>Stock Value</span><span class="stat-icon">💰</span></div>
        <div class="stat-value">${money(stockValue)}</div>
        <div class="stat-note">Based on selling price</div>
      </div>
      <div class="stat">
        <div class="stat-top"><span>Low Stock</span><span class="stat-icon">⚠️</span></div>
        <div class="stat-value">${lowStock}</div>
        <div class="stat-note warning">Needs attention</div>
      </div>
      <div class="stat">
        <div class="stat-top"><span>Out of Stock</span><span class="stat-icon">⛔</span></div>
        <div class="stat-value">${outOfStock}</div>
        <div class="stat-note ${outOfStock ? 'danger' : 'positive'}">${outOfStock ? 'Replenishment required' : 'Nothing is out of stock'}</div>
      </div>
    </div>

    <div class="grid-2 inventory-grid">
      <section class="card">
        <div class="card-head">
          <h3>Current Stock</h3>
          <div class="toolbar">
            <input id="inventory-search" class="field search" placeholder="Search product or SKU" autocomplete="off">
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Reorder</th>
                <th>Status</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody id="inventory-table-body">${stockRows(products)}</tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h3>Recent Movements</h3>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Movement</th>
                <th>Qty</th>
                <th>New Stock</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="movement-table-body">${movementRows(movements.slice(0,8))}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function stockRows(products){
  if(!products.length){
    return '<tr><td colspan="6"><div class="empty">No products found.</div></td></tr>';
  }

  return products.map(p=>`
    <tr>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.sku)}</td>
      <td><strong>${Number(p.stock)||0}</strong></td>
      <td>${Number(p.reorder)||0}</td>
      <td>${stockStatus(p)}</td>
      <td>${money((Number(p.stock)||0)*(Number(p.price)||0))}</td>
    </tr>
  `).join('');
}

function movementRows(movements){
  if(!movements.length){
    return '<tr><td colspan="5"><div class="empty">No stock movements recorded yet.</div></td></tr>';
  }

  return movements.map(m=>`
    <tr>
      <td><strong>${escapeHtml(m.productName)}</strong></td>
      <td>${typeBadge(m.type)}</td>
      <td>${m.type === 'adjustment' ? '→ ' : (m.type === 'in' ? '+' : '-')}${m.quantity}</td>
      <td>${m.newStock}</td>
      <td>${formatDate(m.createdAt)}</td>
    </tr>
  `).join('');
}

export function bindInventoryEvents(){
  const search = document.getElementById('inventory-search');

  if(search){
    search.addEventListener('input',()=>{
      const q = search.value.toLowerCase().trim();
      const products = getProducts().filter(p=>
        [p.name,p.sku,p.category].some(v=>String(v).toLowerCase().includes(q))
      );
      const body = document.getElementById('inventory-table-body');
      if(body) body.innerHTML = stockRows(products);
    });
  }
}

export function inventoryModal(){
  const products = getProducts();

  return `
    <div class="modal-backdrop" data-modal-close>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title">
        <div class="modal-head">
          <h3 id="inventory-modal-title">Stock Movement</h3>
          <button class="icon-btn" data-modal-close aria-label="Close">✕</button>
        </div>

        <form id="inventory-form" class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label for="inventory-product">Product</label>
              <select class="field" id="inventory-product" name="productId" required>
                <option value="">Select product</option>
                ${products.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — ${escapeHtml(p.sku)} (Stock: ${Number(p.stock)||0})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="inventory-type">Movement type</label>
              <select class="field" id="inventory-type" name="type" required>
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>

            <div class="form-group">
              <label for="inventory-quantity">Quantity / New stock</label>
              <input class="field" id="inventory-quantity" name="quantity" type="number" min="0" step="1" required>
            </div>

            <div class="form-group full">
              <label for="inventory-reason">Reason</label>
              <input class="field" id="inventory-reason" name="reason" maxlength="120" placeholder="e.g. Supplier delivery, damaged item, stock count">
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn" data-modal-close>Cancel</button>
            <button class="btn btn-primary" type="submit">Save Movement</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function createInventoryMovementFromForm(form){
  const data = new FormData(form);
  const quantity = Number(data.get('quantity'));

  if(!data.get('productId')){
    throw new Error('Please select a product.');
  }

  if(!Number.isInteger(quantity) || quantity < 0){
    throw new Error('Quantity must be a whole number of 0 or more.');
  }

  return recordInventoryMovement({
    productId:String(data.get('productId')),
    type:String(data.get('type')),
    quantity,
    reason:String(data.get('reason') || '')
  });
}