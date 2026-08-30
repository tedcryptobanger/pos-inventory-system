import {renderDashboard} from './modules/dashboard.js';
import {renderProducts,bindProductEvents,createProductFromForm,productModal,deleteProduct,getProduct} from './modules/products.js';
import {renderInventory,bindInventoryEvents,inventoryModal,createInventoryMovementFromForm} from './modules/inventory.js';
import {renderPOS,bindPOSEvents,clearCart} from './modules/pos.js';
import {renderSales,bindSalesEvents,receiptHtml} from './modules/sales.js';
import {renderCustomers,customerModal,saveCustomerFromForm,getCustomer,searchCustomerRows,removeCustomer} from './modules/customers.js';
import {renderSuppliers,supplierModal,saveSupplierFromForm,getSupplier,removeSupplier} from './modules/suppliers.js';
import {renderPurchases,purchaseModal,bindPurchaseModal,savePurchaseFromForm} from './modules/purchases.js';
import {renderExpenses,expenseModal,saveExpenseFromForm,removeExpense} from './modules/expenses.js';
import {renderReports} from './modules/reports.js';
import {renderSettings,saveSettingsFromForm} from './modules/settings.js';
import {renderActivity,bindActivityEvents} from './modules/activity.js';

const views={
 dashboard:{title:'Dashboard',subtitle:'Overview of your business',render:renderDashboard},
 pos:{title:'Point of Sale',subtitle:'Create sales and update stock',render:renderPOS},
 products:{title:'Products',subtitle:'Catalogue, pricing and stock thresholds',render:renderProducts},
 inventory:{title:'Inventory',subtitle:'Stock movement and controls',render:renderInventory},
 sales:{title:'Sales History',subtitle:'Completed transactions and receipts',render:renderSales},
 customers:{title:'Customers',subtitle:'Customer records and purchase activity',render:renderCustomers},
 suppliers:{title:'Suppliers',subtitle:'Supplier records and purchasing',render:renderSuppliers},
 purchases:{title:'Purchases',subtitle:'Receive stock and record supplier purchases',render:renderPurchases},
 expenses:{title:'Expenses',subtitle:'Track operating costs',render:renderExpenses},
 reports:{title:'Reports & Analytics',subtitle:'Management performance overview',render:renderReports},
 activity:{title:'Activity Log',subtitle:'Trace sales, purchases, stock and expenses in one timeline',render:renderActivity},
 settings:{title:'Settings',subtitle:'Business identity and receipt defaults',render:renderSettings}
};

const root=document.getElementById('view-root');
const title=document.getElementById('page-title');
const subtitle=document.getElementById('page-subtitle');
const modalRoot=document.getElementById('modal-root');
let currentView='dashboard';
let modalReturnView='dashboard';

function toast(message,type='success'){
  const n=document.createElement('div');
  n.className=`toast toast-${type}`;
  n.textContent=message;
  document.getElementById('toast-root').appendChild(n);
  setTimeout(()=>n.remove(),3000);
}

function bindCurrentView(){
  if(currentView==='products')bindProductEvents();
  if(currentView==='inventory')bindInventoryEvents();
  if(currentView==='pos')bindPOSEvents(toast,navigate);
  if(currentView==='sales')bindSalesEvents();
  if(currentView==='customers')bindCustomerEvents();
  if(currentView==='activity')bindActivityEvents();
}

function navigate(view,{focus=true}={}){
  if(!views[view])view='dashboard';
  currentView=view;
  const c=views[view];
  title.textContent=c.title;
  subtitle.textContent=c.subtitle;
  root.innerHTML=c.render();
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  bindCurrentView();
  document.getElementById('sidebar').classList.remove('open');
  if(focus)root.focus();
}

function refreshCurrentView(){
  if(modalRoot.childElementCount)return;
  navigate(currentView,{focus:false});
}

function closeModal(){modalRoot.innerHTML='';}

function openModal(html){
  modalReturnView=currentView;
  modalRoot.innerHTML=html;
  const form=modalRoot.querySelector('form');
  if(form?.id==='purchase-form')bindPurchaseModal();
  modalRoot.querySelector('input,select,textarea')?.focus();
}

function bindCustomerEvents(){
  const input=document.getElementById('customer-search');
  if(input)input.addEventListener('input',()=>{
    const q=input.value.toLowerCase().trim();
    document.getElementById('customer-body').innerHTML=renderCustomerRows(searchCustomerRows(q));
  });
}

function renderCustomerRows(cs){
  return cs.length?cs.map(c=>`<tr><td><strong>${escapeHtml(c.name)}</strong><div class="muted">${escapeHtml(c.notes)}</div></td><td>${escapeHtml(c.phone)||'—'}</td><td>${escapeHtml(c.email)||'—'}</td><td>${c.orders}</td><td>${new Intl.NumberFormat('en-KE',{style:'currency',currency:'KES',maximumFractionDigits:0}).format(c.spent)}</td><td><div class="row-actions"><button class="text-btn" data-edit-customer="${escapeHtml(c.id)}">Edit</button><button class="danger-btn" data-delete-customer="${escapeHtml(c.id)}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">No customers found.</div></td></tr>';
}

function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

document.getElementById('main-nav').addEventListener('click',e=>{
  const b=e.target.closest('[data-view]');
  if(b)navigate(b.dataset.view);
});
document.getElementById('menu-btn').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('notification-btn').addEventListener('click',()=>toast('Notifications are generated from recorded business activity.'));

document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='new-sale')navigate('pos');
  else if(action==='view-sales')navigate('sales');
  else if(action==='inventory')navigate('inventory');
  else if(action==='reports')navigate('reports');
  else if(action==='activity')navigate('activity');
  else if(action==='add-product')openModal(productModal());
  else if(action==='stock-movement')openModal(inventoryModal());
  else if(action==='add-customer')openModal(customerModal());
  else if(action==='add-supplier')openModal(supplierModal());
  else if(action==='new-purchase')openModal(purchaseModal());
  else if(action==='add-expense')openModal(expenseModal());
  else if(action==='clear-cart')clearCart();
  else if(action==='refresh-reports')refreshCurrentView();

  const ce=e.target.closest('[data-edit-customer]');
  if(ce)openModal(customerModal(getCustomer(ce.dataset.editCustomer)));
  const cd=e.target.closest('[data-delete-customer]');
  if(cd&&confirm('Delete this customer?')){removeCustomer(cd.dataset.deleteCustomer);toast('Customer deleted.');}
  const se=e.target.closest('[data-edit-supplier]');
  if(se)openModal(supplierModal(getSupplier(se.dataset.editSupplier)));
  const sd=e.target.closest('[data-delete-supplier]');
  if(sd&&confirm('Delete this supplier?')){removeSupplier(sd.dataset.deleteSupplier);toast('Supplier deleted.');}
  const rr=e.target.closest('[data-receipt]');
  if(rr)openModal(receiptHtml(rr.dataset.receipt));
  const ed=e.target.closest('[data-delete-expense]');
  if(ed&&confirm('Delete this expense?')){removeExpense(ed.dataset.deleteExpense);toast('Expense deleted.');}
  const pe=e.target.closest('[data-edit-product]');
  if(pe)openModal(productModal(getProduct(pe.dataset.editProduct)));
  const pd=e.target.closest('[data-delete-product]');
  if(pd&&confirm('Delete this product from the catalogue?')){deleteProduct(pd.dataset.deleteProduct);toast('Product deleted.');}
  if(e.target.matches('[data-print-receipt]')){window.print();return;}
  if(e.target.matches('[data-modal-close]')||(!e.target.closest('.modal')&&e.target.closest('.modal-backdrop')))closeModal();
});

document.addEventListener('submit',e=>{
  if(e.target.id==='customer-form'){
    e.preventDefault();
    try{saveCustomerFromForm(e.target);closeModal();navigate(modalReturnView);toast('Customer saved successfully.');}
    catch(err){toast(err.message,'error');}
    return;
  }
  if(e.target.id==='supplier-form'){
    e.preventDefault();
    try{saveSupplierFromForm(e.target);closeModal();navigate(modalReturnView);toast('Supplier saved successfully.');}
    catch(err){toast(err.message,'error');}
    return;
  }
  if(e.target.id==='purchase-form'){
    e.preventDefault();
    try{savePurchaseFromForm(e.target);closeModal();navigate(modalReturnView);toast('Purchase received and stock updated.');}
    catch(err){toast(err.message,'error');}
    return;
  }
  if(e.target.id==='expense-form'){
    e.preventDefault();
    try{saveExpenseFromForm(e.target);closeModal();navigate(modalReturnView);toast('Expense saved successfully.');}
    catch(err){toast(err.message,'error');}
    return;
  }
  if(e.target.id==='settings-form'){
    e.preventDefault();
    try{saveSettingsFromForm(e.target);navigate(modalReturnView);toast('Settings saved successfully.');}
    catch(err){toast(err.message,'error');}
    return;
  }
  if(e.target.id==='product-form'){
    e.preventDefault();
    try{createProductFromForm(e.target);closeModal();navigate(modalReturnView);toast('Product saved successfully.');}
    catch(err){toast(err.message,'error');}
    return;
  }
  if(e.target.id==='inventory-form'){
    e.preventDefault();
    try{createInventoryMovementFromForm(e.target);closeModal();navigate(modalReturnView);toast('Inventory updated successfully.');}
    catch(err){toast(err.message,'error');}
    return;
  }
});

window.addEventListener('novapos:data-changed',()=>refreshCurrentView());
navigate('dashboard');