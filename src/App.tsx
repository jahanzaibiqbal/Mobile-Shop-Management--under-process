import React, { useState, useEffect } from 'react';
import { Product, SaleLog, NotificationLog, UserRole } from './types';
import { INITIAL_PRODUCTS, INITIAL_SALES } from './initialData';
import { RoleSwitcher } from './components/RoleSwitcher';
import { BarcodeScanner } from './components/BarcodeScanner';
import { ScanResultHandler } from './components/ScanResultHandler';
import { InventoryManager } from './components/InventoryManager';
import { GoogleSheetsSync } from './components/GoogleSheetsSync';
import { SalesHistory } from './components/SalesHistory';
import { NotificationCenter } from './components/NotificationCenter';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  // --- Persistent States from LocalStorage ---
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('mobshop_products');
    if (!saved) return INITIAL_PRODUCTS;
    try {
      const parsed: Product[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map((p) => p.id));
      const missingWholesale = INITIAL_PRODUCTS.filter((p) => !existingIds.has(p.id));
      return missingWholesale.length > 0 ? [...parsed, ...missingWholesale] : parsed;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [sales, setSales] = useState<SaleLog[]>(() => {
    const saved = localStorage.getItem('mobshop_sales');
    if (!saved) return INITIAL_SALES;
    try {
      const parsed: SaleLog[] = JSON.parse(saved);
      return parsed.length > 0 ? parsed : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    const saved = localStorage.getItem('mobshop_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('mobshop_role');
    if (saved === 'Admin' || saved === 'Shoaib' || saved === 'Zohaib') {
      return saved as UserRole;
    }
    return 'Admin';
  });

  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [addModalPrefill, setAddModalPrefill] = useState<{ barcode?: string; name?: string; brand?: string; templateProduct?: Product } | null>(null);

  // Synchronize storage safely
  useEffect(() => {
    try {
      localStorage.setItem('mobshop_products', JSON.stringify(products));
    } catch (err) {
      console.warn('Failed to persist products to localStorage:', err);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('mobshop_sales', JSON.stringify(sales));
    } catch (err) {
      console.warn('Failed to persist sales to localStorage:', err);
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem('mobshop_notifications', JSON.stringify(notifications));
    } catch (err) {
      console.warn('Failed to persist notifications to localStorage:', err);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('mobshop_role', currentRole);
    } catch (err) {
      console.warn('Failed to persist role to localStorage:', err);
    }
  }, [currentRole]);

  // Show Toast Feedback Helper
  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --- Handlers ---
  const handleOpenAddItemModal = (barcode?: string, templateProd?: Product) => {
    setScannedProduct(null);
    setAddModalPrefill({
      barcode: barcode || '',
      templateProduct: templateProd
    });
    const invElem = document.getElementById('inventory-manager');
    if (invElem) {
      invElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    triggerToast(`Add Item dialog opened ${barcode ? `for barcode: ${barcode}` : ''}`, 'info');
  };

  const handleScanSuccess = (barcode: string) => {
    const clean = barcode.trim().toLowerCase();
    const found = products.find(
      p => p.barcode.toLowerCase() === clean || 
           (p.barcodes || []).some(c => c.toLowerCase() === clean) ||
           p.id.toLowerCase() === clean
    );
    if (found) {
      setScannedProduct(found);
    } else {
      triggerToast(`Barcode "${barcode}" not in catalogue. You can click "Add Item" to add it.`, 'info');
    }
  };

  const handleScanItemDirectly = (barcode: string) => {
    handleScanSuccess(barcode);
  };

  const handleCompleteSale = (
    buyerType: 'customer' | 'shopkeeper',
    purchaseQuantity: number,
    appliedDiscount: number,
    finalPrice: number,
    customerPhone: string
  ) => {
    if (!scannedProduct) return;

    if (scannedProduct.quantity < purchaseQuantity) {
      triggerToast(`Insufficient quantity. Only ${scannedProduct.quantity} units left.`, 'error');
      return;
    }

    const updatedProducts = products.map((p) => {
      if (p.id === scannedProduct.id) {
        return { ...p, quantity: p.quantity - purchaseQuantity };
      }
      return p;
    });
    setProducts(updatedProducts);

    const newLog: SaleLog = {
      id: `sale-${Date.now()}`,
      productId: scannedProduct.id,
      productName: scannedProduct.name,
      barcode: scannedProduct.barcode,
      buyerType,
      unitPrice: buyerType === 'customer' ? scannedProduct.customerPrice : scannedProduct.wholesalePrice,
      costPrice: scannedProduct.costPrice,
      discountApplied: buyerType === 'customer' ? appliedDiscount : 0,
      finalPrice,
      quantity: purchaseQuantity,
      date: new Date().toISOString(),
      soldBy: currentRole,
      customerPhone,
    };
    setSales([...sales, newLog]);

    const systemMessage: NotificationLog = {
      id: `notif-sys-${Date.now()}`,
      type: 'System',
      recipient: 'Terminal System',
      message: `Sale recorded: ${purchaseQuantity}x ${scannedProduct.name} (PKR ${finalPrice.toLocaleString()}) by [${currentRole}]. Stock level updated.`,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    const newNotifications: NotificationLog[] = [systemMessage];

    // AUTOMATED LOW STOCK ALERT LOGIC
    const newQty = scannedProduct.quantity - purchaseQuantity;
    if (newQty <= scannedProduct.minQuantity) {
      const lowStockAlert: NotificationLog = {
        id: `notif-alert-${Date.now()}`,
        type: 'Alert',
        recipient: 'Admin',
        message: `LOW STOCK ALERT: "${scannedProduct.name}" (Code: ${scannedProduct.barcode}) stock fell below threshold. Current count: ${newQty} units. Configure stock or order replacements!`,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'pending',
      };
      newNotifications.unshift(lowStockAlert);
    }

    setNotifications(prev => [...newNotifications, ...prev]);
    triggerToast(`Inventory sold! Sale recorded successfully.`, 'success');
    setScannedProduct(null);
  };

  const handleCancelSale = (saleId: string) => {
    const saleToCancel = sales.find(s => s.id === saleId);
    if (!saleToCancel) return;

    const updatedProducts = products.map((p) => {
      if (p.id === saleToCancel.productId) {
        return { ...p, quantity: p.quantity + saleToCancel.quantity };
      }
      return p;
    });
    setProducts(updatedProducts);

    const updatedSales = sales.filter(s => s.id !== saleId);
    setSales(updatedSales);

    const rollbackNotif: NotificationLog = {
      id: `notif-roll-${Date.now()}`,
      type: 'System',
      recipient: 'Terminal System',
      message: `ALERT: Sale for ${saleToCancel.productName} was CANCELLED. Stock quantity restored in database by ${currentRole}.`,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    setNotifications(prev => [rollbackNotif, ...prev]);

    triggerToast(`Sale reversed: ${saleToCancel.productName}. Stock returned to inventory.`, 'info');
  };

  const handleAddProduct = (newProd: Product) => {
    setProducts([...products, newProd]);
    triggerToast(`Added ${newProd.name} directly into stock catalogue.`, 'success');
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    const originalProd = products.find(p => p.id === updatedProd.id);
    setProducts(products.map(p => p.id === updatedProd.id ? updatedProd : p));
    triggerToast(`Price/Quantity updated: ${updatedProd.name}.`, 'success');

    if (originalProd) {
      const wasAbove = originalProd.quantity > originalProd.minQuantity;
      const isBelowNow = updatedProd.quantity <= updatedProd.minQuantity;

      // Generate alert if we just transitioned below or if value changed while remaining below
      if (isBelowNow && (wasAbove || updatedProd.quantity !== originalProd.quantity)) {
        const lowStockAlert: NotificationLog = {
          id: `notif-alert-${Date.now()}`,
          type: 'Alert',
          recipient: 'Admin',
          message: `LOW STOCK ALERT: "${updatedProd.name}" (Code: ${updatedProd.barcode}) was updated. Current stock: ${updatedProd.quantity} units (Threshold: ${updatedProd.minQuantity} units).`,
          date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'pending',
        };
        setNotifications(prev => [lowStockAlert, ...prev]);
      }
    }
  };

  const handleDeleteProduct = (id: string) => {
    const p = products.find(prod => prod.id === id);
    setProducts(products.filter(prod => prod.id !== id));
    triggerToast(`Permanently removed ${p ? p.name : 'item'} from directory.`, 'info');
  };

  const handleResetDatabase = () => {
    if (confirm('Verify: Reset database to initial mock inventory items & logs?')) {
      localStorage.clear();
      setProducts(INITIAL_PRODUCTS);
      setSales(INITIAL_SALES);
      setNotifications([]);
      setScannedProduct(null);
      setCurrentRole('Admin');
      triggerToast('Database reset to standard factory items & sales logs.', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans pb-16 antialiased selection:bg-indigo-200 selection:text-black">
      
      {/* Toast alert overlay */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] animate-in slide-in-from-top duration-200 max-w-sm">
          <div className={`p-4 rounded-sm shadow-md flex items-start gap-3 border ${
            toastMessage.type === 'success' 
              ? 'bg-slate-950 text-white border-emerald-550' 
              : toastMessage.type === 'error'
                ? 'bg-slate-955 text-white border-red-550'
                : 'bg-slate-950 text-white border-indigo-550'
          }`}>
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-indigo-400" />
            <div>
              <p className="text-xs font-bold font-display uppercase tracking-wider">{toastMessage.text}</p>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-wide">Mobile core terminal notification</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Header navigation bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 font-sans">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 text-white font-black text-xs flex items-center justify-center rounded-sm font-mono tracking-widest border border-slate-800">
              MS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-black tracking-widest text-slate-950 uppercase font-display">
                  TELEPORTAL <span className="text-indigo-650 font-black">STATION</span>
                </h1>
                <span className="text-[8px] bg-slate-900 text-slate-300 font-bold uppercase tracking-widest font-mono px-1.5 py-0.5 rounded-sm border border-slate-700">
                  SYSTEM
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tight mt-0.5">
                Real-time inventory stream • Automated notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-[8px] uppercase font-black text-slate-400 tracking-widest block font-display">
                Current Operator
              </span>
              <span className="text-xs font-black text-slate-800 uppercase block font-mono">
                {currentRole}
              </span>
            </div>

            <button
              onClick={handleResetDatabase}
              className="text-[9px] font-black uppercase tracking-wider text-slate-550 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-sm px-3 py-2 transition-colors cursor-pointer font-display"
              title="Reset stock list back to start"
            >
              Reset Terminal
            </button>
          </div>

        </div>
      </header>

      {/* Main body viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8 mt-6">
        
        {/* SECTION 1: Active Store Clerk Switcher */}
        <section className="transition-all duration-300">
          <RoleSwitcher currentRole={currentRole} onRoleChange={(r) => setCurrentRole(r)} />
        </section>

        {/* SECTION 2: Center Point & Scan Container */}
        <section className="flex justify-center">
          <BarcodeScanner 
            products={products} 
            currentUser={currentRole}
            onScanSuccess={handleScanSuccess} 
            onOpenAddItemModal={handleOpenAddItemModal}
          />
        </section>

        {/* SECTION 3: Main dashboard modules (Custom order for Zohaib vs Admin/Shoaib) */}
        {currentRole === 'Zohaib' ? (
          /* ZOHAIB OPERATOR LAYOUT */
          <div className="space-y-8">
            {/* Products List directly below scanner with clickable pictures */}
            <section id="inventory-manager">
              <InventoryManager
                products={products}
                currentUser={currentRole}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onScanItem={handleScanItemDirectly}
                addModalPrefill={addModalPrefill}
                onClearAddModalPrefill={() => setAddModalPrefill(null)}
              />
            </section>

            {/* Notification Center */}
            <section id="notifications">
              <NotificationCenter logs={notifications} onClear={() => setNotifications([])} />
            </section>

            {/* Google Sheets Live Inventory Sync moved to LAST */}
            <section id="google-sheets-sync">
              <GoogleSheetsSync
                products={products}
                onImportProducts={(imported) => {
                  setProducts(imported);
                  triggerToast(`Updated catalogue with ${imported.length} items from Google Sheet.`, 'success');
                }}
                triggerToast={triggerToast}
              />
            </section>
          </div>
        ) : (
          /* ADMIN & SHOAIB MANAGER LAYOUT */
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inventory Manager directory - takes 2 cols on wide display */}
              <div className="lg:col-span-2 space-y-6">
                <section id="google-sheets-sync">
                  <GoogleSheetsSync
                    products={products}
                    onImportProducts={(imported) => {
                      setProducts(imported);
                      triggerToast(`Updated catalogue with ${imported.length} items from Google Sheet.`, 'success');
                    }}
                    triggerToast={triggerToast}
                  />
                </section>
                <section id="inventory-manager">
                  <InventoryManager
                    products={products}
                    currentUser={currentRole}
                    onAddProduct={handleAddProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onScanItem={handleScanItemDirectly}
                    addModalPrefill={addModalPrefill}
                    onClearAddModalPrefill={() => setAddModalPrefill(null)}
                  />
                </section>
              </div>

              {/* Sidebar reporting modules - takes 1 col */}
              <div>
                <section id="notifications">
                  <NotificationCenter logs={notifications} onClear={() => setNotifications([])} />
                </section>
              </div>
            </div>

            {/* Sales Logs & Financial reports */}
            <section id="sales-history" className="pt-2">
              <SalesHistory logs={sales} currentUser={currentRole} onCancelSale={handleCancelSale} />
            </section>
          </div>
        )}

      </main>

      {/* Live scanning dialog overlays */}
      {scannedProduct && (
        <ScanResultHandler
          product={scannedProduct}
          currentUser={currentRole}
          onClose={() => setScannedProduct(null)}
          onOpenAddItemModal={handleOpenAddItemModal}
          onCompleteSale={handleCompleteSale}
        />
      )}

      {/* Footer credits bar */}
      <footer className="mt-20 border-t border-slate-200 py-6 text-center text-slate-450 text-[10px] uppercase font-mono tracking-widest max-w-7xl mx-auto px-6">
        <p>CONSOLE SYSTEM • Mobile shop operational suite © 2026</p>
        <p className="text-slate-400 mt-1">
          Barcodes simulated for hardware tests. Designed with Geometric Balance guidelines.
        </p>
      </footer>

    </div>
  );
}
