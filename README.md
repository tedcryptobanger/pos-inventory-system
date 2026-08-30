# NovaPOS — Complete Business Management Suite

NovaPOS is a modular single-page business management/POS application foundation designed for small and growing businesses.

## Current modules
- Dashboard
- Point of Sale
- Products
- Inventory
- Sales History + printable receipts
- Customers
- Suppliers
- Purchases / stock receiving
- Expenses
- Reports & Analytics
- Settings
- Activity Log / transaction trace

## Core business flow
Products → Inventory → POS → Sales → Customer statistics → Dashboard/Reports
Suppliers → Purchases → Inventory
Expenses → Reports
Settings → Receipts / business identity
All operational and financial events → Activity Log / transaction trace

## Data
The current browser build uses versioned localStorage keys so modules share one consistent data layer. This is intentionally a frontend/local-data build. For production deployment, the data layer should be connected to a secure backend/database with authentication, permissions, backups and server-side validation.

## Run
Open `index.html` using VS Code Live Server (or another local HTTP server). ES modules require HTTP serving rather than opening the HTML file directly from `file://`.

## Development rule
Each module is isolated in `assets/js/modules/`, while `assets/js/data/store.js` owns business data operations and `assets/js/app.js` owns navigation/orchestration.

## Automatic UI updates
Data mutations emit a shared `novapos:data-changed` event. The active page refreshes automatically after a successful save/delete/update, so users do not need to manually refresh the browser. Modal saves return to the page where the action started.

## Stability fixes in this release
- Removed the undeclared `purchaseBound` state that could throw `purchaseBound is not defined` after successful saves.
- Purchase modal binding is performed directly when the modal opens.
- Customer update handling correctly preserves the email value.
- Added a unified Activity Log for traceable sales, purchases, stock movements and expenses.
-