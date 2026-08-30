import {getProducts,completeSale} from '../data/store.js';

let cart=[];

function escapeHtml(value){
  return String(value).replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
}

function money(n){
  return new Intl.NumberFormat('en-KE',{
    style:'currency',currency:'KES',maximumFractionDigits:0
  }).format(n);
}

function productStatus(p){
  if(Number(p.stock)<=0) return '<span class="badge badge-danger">Out of stock</span>';
  if(Number(p.stock)<=Number(p.reorder)) return '<span class="badge badge-warning">Low stock</span>';
  return '<span class="badge badge-success">In stock</span>';
}

function cartSubtotal(){
  return cart.reduce((sum,item)=>sum+item.price*item.quantity,0);
}

export function renderPOS(){
  const products=getProducts();
  return `
    <div class="page-head">
      <div>
        <h2>Point of Sale</h2>
        <p>Create sales, collect payments and automatically update stock.</p>
      </div>
      <button class="btn" data-action="clear-cart">Clear Cart</button>
    </div>

    <div class="pos-layout">
      <section class="card">
        <div class="card-head">
          <h3>Products</h3>
          <input id="pos-search" class="field search" placeholder="Search product or SKU" autocomplete="off">
        </div>
        <div id="pos-products" class="pos-products">${productCards(products)}</div>
      </section>

      <aside class="card pos-cart">
        <div class="card-head">
          <h3>Current Sale</h3>
          <span id="cart-count" class="badge badge-success">${cart.reduce((s,i)=>s+i.quantity,0)} items</span>
        </div>

        <div id="pos-cart-items" class="cart-items">${cartRows()}</div>

        <div class="pos-summary">
          <div class="summary-row"><span>Subtotal</span><strong id="pos-subtotal">${money(cartSubtotal())}</strong></div>
          <div class="form-grid compact">
            <div class="form-group">
              <label for="pos-discount">Discount (KSh)</label>
              <input id="pos-discount" class="field" type="number" min="0" step="1" value="0">
            </div>
            <div class="form-group">
              <label for="pos-tax">Tax (%)</label>
              <input id="pos-tax" class="field" type="number" min="0" max="100" step="0.01" value="0">
            </div>
          </div>
          <div class="summary-row"><span>Tax</span><strong id="pos-tax-amount">${money(0)}</strong></div>
          <div class="summary-row total"><span>Total</span><strong id="pos-total">${money(cartSubtotal())}</strong></div>

          <div class="form-group">
            <label for="pos-customer">Customer</label>
            <input id="pos-customer" class="field" maxlength="80" placeholder="Walk-in Customer">
          </div>

          <div class="form-group">
            <label for="pos-payment">Payment method</label>
            <select id="pos-payment" class="field">
              <option>Cash</option>
              <option>M-Pesa</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>Other</option>
            </select>
          </div>

          <button id="complete-sale" class="btn btn-primary btn-wide" data-action="complete-sale">Complete Sale</button>
        </div>
      </aside>
    </div>
  `;
}

function productCards(products){
  if(!products.length) return '<div class="empty">No products match your search.</div>';

  return products.map(p=>`
    <article class="pos-product">
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="product-meta">${escapeHtml(p.sku)} · ${escapeHtml(p.category)}</div>
      </div>
      <div class="pos-product-bottom">
        <div>
          <strong>${money(p.price)}</strong>
          <div>${productStatus(p)} <small>${Number(p.stock)||0} available</small></div>
        </div>
        <button class="btn btn-primary" data-add-to-cart="${escapeHtml(p.id)}" ${Number(p.stock)<=0?'disabled':''}>Add</button>
      </div>
    </article>
  `).join('');
}

function cartRows(){
  if(!cart.length) return '<div class="empty">Cart is empty.<br>Add products to start a sale.</div>';

  return cart.map(item=>`
    <div class="cart-row">
      <div class="cart-main">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${money(item.price)} × ${item.quantity}</span>
      </div>
      <div class="cart-controls">
        <button class="qty-btn" data-cart-decrease="${escapeHtml(item.productId)}" aria-label="Decrease quantity">−</button>
        <span>${item.quantity}</span>
        <button class="qty-btn" data-cart-increase="${escapeHtml(item.productId)}" aria-label="Increase quantity">+</button>
        <button class="remove-btn" data-cart-remove="${escapeHtml(item.productId)}" aria-label="Remove item">×</button>
      </div>
    </div>
  `).join('');
}

function refreshCart(){
  const root=document.getElementById('pos-cart-items');
  if(root) root.innerHTML=cartRows();

  const count=document.getElementById('cart-count');
  if(count) count.textContent=`${cart.reduce((s,i)=>s+i.quantity,0)} items`;

  updateTotals();
}

function updateTotals(){
  const subtotal=cartSubtotal();
  const discount=Math.max(0,Number(document.getElementById('pos-discount')?.value)||0);
  const taxRate=Math.max(0,Number(document.getElementById('pos-tax')?.value)||0);
  const cappedDiscount=Math.min(discount,subtotal);
  const tax=Math.max(0,(subtotal-cappedDiscount)*(taxRate/100));
  const total=subtotal-cappedDiscount+tax;

  const subtotalNode=document.getElementById('pos-subtotal');
  const taxNode=document.getElementById('pos-tax-amount');
  const totalNode=document.getElementById('pos-total');

  if(subtotalNode) subtotalNode.textContent=money(subtotal);
  if(taxNode) taxNode.textContent=money(tax);
  if(totalNode) totalNode.textContent=money(total);
}

function addToCart(productId){
  const product=getProducts().find(p=>p.id===productId);
  if(!product) return;

  const existing=cart.find(i=>i.productId===productId);
  const nextQty=(existing?.quantity||0)+1;

  if(nextQty>Number(product.stock||0)){
    throw new Error(`${product.name}: only ${Number(product.stock||0)} unit(s) available.`);
  }

  if(existing) existing.quantity=nextQty;
  else cart.push({
    productId:product.id,
    name:product.name,
    sku:product.sku,
    price:Number(product.price)||0,
    quantity:1
  });

  refreshCart();
}

function changeQuantity(productId,delta){
  const product=getProducts().find(p=>p.id===productId);
  const item=cart.find(i=>i.productId===productId);
  if(!product||!item) return;

  const next=item.quantity+delta;
  if(next<=0){
    cart=cart.filter(i=>i.productId!==productId);
  }else if(next>Number(product.stock||0)){
    throw new Error(`${product.name}: only ${Number(product.stock||0)} unit(s) available.`);
  }else{
    item.quantity=next;
  }
  refreshCart();
}

export function clearCart(){
  cart=[];
  refreshCart();
}

export function bindPOSEvents(showToast,navigate){
  const search=document.getElementById('pos-search');
  if(search){
    search.addEventListener('input',()=>{
      const q=search.value.toLowerCase().trim();
      const list=getProducts().filter(p=>
        [p.name,p.sku,p.category].some(v=>String(v).toLowerCase().includes(q))
      );
      document.getElementById('pos-products').innerHTML=productCards(list);
    });
  }

  document.getElementById('pos-discount')?.addEventListener('input',updateTotals);
  document.getElementById('pos-tax')?.addEventListener('input',updateTotals);

  document.getElementById('pos-products')?.addEventListener('click',e=>{
    const btn=e.target.closest('[data-add-to-cart]');
    if(!btn) return;
    try{ addToCart(btn.dataset.addToCart); }
    catch(err){ showToast(err.message); }
  });

  document.getElementById('pos-cart-items')?.addEventListener('click',e=>{
    try{
      const inc=e.target.closest('[data-cart-increase]');
      const dec=e.target.closest('[data-cart-decrease]');
      const rem=e.target.closest('[data-cart-remove]');
      if(inc) changeQuantity(inc.dataset.cartIncrease,1);
      else if(dec) changeQuantity(dec.dataset.cartDecrease,-1);
      else if(rem){
        cart=cart.filter(i=>i.productId!==rem.dataset.cartRemove);
        refreshCart();
      }
    }catch(err){ showToast(err.message); }
  });

  document.getElementById('complete-sale')?.addEventListener('click',()=>{
    if(!cart.length){ showToast('Add at least one product to the cart.'); return; }

    try{
      const sale=completeSale({
        cart,
        customer:document.getElementById('pos-customer')?.value,
        paymentMethod:document.getElementById('pos-payment')?.value,
        discount:Number(document.getElementById('pos-discount')?.value)||0,
        taxRate:Number(document.getElementById('pos-tax')?.value)||0
      });

      cart=[];
      navigate('sales');
      showToast(`Sale ${sale.invoiceNo} completed successfully.`);
    }catch(err){
      showToast(err.message);
    }
  });
}