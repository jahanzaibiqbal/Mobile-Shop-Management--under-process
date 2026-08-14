import React, { useState, useEffect } from 'react';
import { Product, UserRole } from '../types';
import { ShoppingBag, Users, Tag, Sparkles, Plus, Minus, ArrowLeft } from 'lucide-react';

interface ScanResultHandlerProps {
  product: Product;
  currentUser: UserRole;
  onClose: () => void;
  onOpenAddItemModal?: (barcode: string, product?: Product) => void;
  onCompleteSale: (
    buyerType: 'customer' | 'shopkeeper',
    purchaseQuantity: number,
    appliedDiscount: number,
    finalPrice: number,
    customerPhone: string
  ) => void;
}

export const ScanResultHandler: React.FC<ScanResultHandlerProps> = ({
  product,
  currentUser,
  onClose,
  onOpenAddItemModal,
  onCompleteSale,
}) => {
  const [buyerType, setBuyerType] = useState<'customer' | 'shopkeeper' | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [activeDiscount, setActiveDiscount] = useState(0); 
  const [customDiscountInput, setCustomDiscountInput] = useState('');
  const [showCustomDiscount, setShowCustomDiscount] = useState(false);

  const discount1 = product.discounts && product.discounts.length > 0 ? product.discounts[0] : 5;
  const finalDiscount = product.discounts && product.discounts.length > 1 ? product.discounts[1] : 10;

  useEffect(() => {
    if (buyerType === 'customer') {
      setActiveDiscount(discount1);
    } else {
      setActiveDiscount(0); 
    }
  }, [buyerType, discount1]);

  const maxAvailable = product.quantity;

  const handleQtyChange = (val: number) => {
    const updated = purchaseQuantity + val;
    if (updated >= 1 && updated <= maxAvailable) {
      setPurchaseQuantity(updated);
    }
  };

  const baseUnitPrice = buyerType === 'customer' ? product.customerPrice : product.wholesalePrice;
  const singleItemFinalPrice = buyerType === 'customer' 
    ? Math.max(0, Math.round((baseUnitPrice - activeDiscount) * 100) / 100)
    : baseUnitPrice;
  const totalAmount = singleItemFinalPrice * purchaseQuantity;

  const handleApplyDiscount = (amt: number) => {
    setActiveDiscount(Math.max(0, amt));
    setShowCustomDiscount(false);
  };

  const handleCustomDiscountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(customDiscountInput);
    if (!isNaN(amt) && amt >= 0) {
      setActiveDiscount(amt);
      setShowCustomDiscount(false);
      setCustomDiscountInput('');
    }
  };

  const submitSale = () => {
    if (purchaseQuantity > maxAvailable) return;
    onCompleteSale(
      buyerType || 'customer',
      purchaseQuantity,
      activeDiscount,
      totalAmount,
      ''
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-opacity font-sans">
      <div className="bg-white rounded-sm shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        
        {/* Modal Header */}
        <div className="bg-slate-900 p-5 text-white relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {currentUser === 'Admin' && onOpenAddItemModal && (
              <button
                type="button"
                id="modal-admin-add-item-btn"
                onClick={() => {
                  onClose();
                  onOpenAddItemModal(product.barcode, product);
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-sm shadow-xs transition-all cursor-pointer font-display"
                title="Add Item / Clone in inventory"
              >
                <Plus size={13} />
                <span>Add Item</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-sm transition-all cursor-pointer border border-slate-700"
              title="Close"
            >
              <ArrowLeft size={14} />
            </button>
          </div>
          
          <div className="flex gap-3.5 items-center text-left">
            {/* Product Image or Icon */}
            {product.imageUrl ? (
              <div className="w-14 h-14 rounded-sm border border-slate-700 overflow-hidden bg-slate-800 shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="p-2.5 bg-indigo-650 text-white rounded-sm border border-indigo-500/20 shrink-0">
                <ShoppingBag size={24} />
              </div>
            )}
            
            <div className="overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-900/60 border border-indigo-700/50 px-2 py-0.5 rounded-sm font-display">
                  {product.brand}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Barcode: {product.barcode}
                </span>
              </div>
              <h3 className="text-sm font-black tracking-tight text-white mt-1 font-display uppercase truncate">
                {product.name}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Model: {product.modelName} (In Stock: <strong className="font-mono text-indigo-400">{product.quantity}</strong>)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-left">
          {/* STEP 1: Select Buyer Type if not chosen yet */}
          {buyerType === null ? (
            <div className="py-2 text-center">
              <h4 className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-5 font-display">
                Select Pricing Scheme
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Customer Button */}
                <button
                  type="button"
                  onClick={() => setBuyerType('customer')}
                  className="flex flex-col items-center justify-center p-5 border border-slate-200 hover:border-indigo-600 bg-slate-50/50 hover:bg-white rounded-sm transition-all cursor-pointer group shadow-xs"
                >
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-sm group-hover:scale-105 duration-200 border border-indigo-100 shadow-xs">
                    <Sparkles size={22} />
                  </div>
                  <span className="font-black text-slate-900 mt-3 text-xs font-display uppercase tracking-wider">Customer Retail</span>
                  <span className="text-xs text-slate-500 mt-1 font-mono">PKR {product.customerPrice.toLocaleString()}</span>
                  <div className="flex flex-col gap-0.5 mt-2">
                    <span className="text-[9px] bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold px-1.5 py-0.2 rounded-sm font-mono">
                      Discount 1: -PKR {discount1}
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.2 rounded-sm font-mono">
                      Final Disc: -PKR {finalDiscount}
                    </span>
                  </div>
                </button>

                {/* Shopkeeper wholesale Button */}
                <button
                  type="button"
                  onClick={() => setBuyerType('shopkeeper')}
                  className="flex flex-col items-center justify-center p-5 border border-slate-200 hover:border-indigo-600 bg-slate-50/50 hover:bg-white rounded-sm transition-all cursor-pointer group shadow-xs"
                >
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-sm group-hover:scale-105 duration-200 border border-amber-100 shadow-xs">
                    <Users size={22} />
                  </div>
                  <span className="font-black text-slate-900 mt-3 text-xs font-display uppercase tracking-wider">Shopkeeper Wholesale</span>
                  <span className="text-xs text-slate-500 mt-1 font-mono">PKR {product.wholesalePrice.toLocaleString()} wholesale</span>
                  <span className="text-[9px] bg-slate-200 text-slate-700 border border-slate-300 font-bold px-1.5 py-0.5 mt-2 rounded-sm font-mono uppercase tracking-widest">
                    No Retail Markup
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Configure Transaction and checkout details */
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-150">
              
              {/* Back to switcher */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-sm">
                <span className="text-[11px] text-slate-600 font-sans">
                  Active Tier: <strong className="text-indigo-600 capitalize font-bold font-display uppercase tracking-wider">{buyerType}</strong>
                </span>
                <button
                  onClick={() => setBuyerType(null)}
                  className="text-[10px] text-indigo-600 font-black uppercase tracking-wider hover:underline cursor-pointer font-display"
                >
                  Change Scheme
                </button>
              </div>

              {/* Price Calculation details */}
              <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 font-sans">
                <div className="flex justify-between text-xs text-slate-500 font-mono mb-2">
                  <span>Regular List Price:</span>
                  <span className="line-through">PKR {baseUnitPrice.toLocaleString()}</span>
                </div>

                {buyerType === 'customer' && (
                  <div className="flex justify-between text-xs text-emerald-800 font-bold mb-2 items-center">
                    <span className="flex items-center gap-1">
                      <Tag size={12} /> Active Discount Applied:
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-2 py-0.5 rounded-sm text-[11px] font-bold font-mono">
                      -PKR {activeDiscount}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-200 my-2 pt-2 flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest font-display">
                    Calculated Unit Rate:
                  </span>
                  <span className="text-lg font-black text-slate-900 font-mono">
                    PKR {singleItemFinalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Customer Discount Selection (Discount 1 and Final Discount Only) */}
              {buyerType === 'customer' && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-black text-slate-600 uppercase tracking-widest font-display">
                    Discount Options (PKR):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {/* Discount 1 Button */}
                    <button
                      type="button"
                      onClick={() => handleApplyDiscount(discount1)}
                      className={`text-[11px] px-3 py-1.5 rounded-sm font-bold border font-mono cursor-pointer transition-colors ${
                        activeDiscount === discount1
                          ? 'bg-indigo-650 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Discount 1 (-PKR {discount1})
                    </button>

                    {/* Final Discount Button */}
                    <button
                      type="button"
                      onClick={() => handleApplyDiscount(finalDiscount)}
                      className={`text-[11px] px-3 py-1.5 rounded-sm font-bold border font-mono cursor-pointer transition-colors ${
                        activeDiscount === finalDiscount
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Final Discount (-PKR {finalDiscount})
                    </button>

                    {/* No Discount Button */}
                    <button
                      type="button"
                      onClick={() => handleApplyDiscount(0)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-sm font-bold border font-mono cursor-pointer transition-colors ${
                        activeDiscount === 0
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      PKR 0 Off
                    </button>

                    {/* Custom PKR Button */}
                    <button
                      type="button"
                      onClick={() => setShowCustomDiscount(!showCustomDiscount)}
                      className="text-[10px] px-3 py-1.5 rounded-sm font-black text-indigo-650 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200 cursor-pointer font-display uppercase tracking-wider"
                    >
                      Custom PKR
                    </button>
                  </div>

                  {showCustomDiscount && (
                    <form onSubmit={handleCustomDiscountSubmit} className="flex gap-2 mt-2 animate-in slide-in-from-top-1 duration-150">
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter discount amount in PKR (e.g. 50)"
                        value={customDiscountInput}
                        onChange={(e) => setCustomDiscountInput(e.target.value)}
                        className="flex-1 text-xs border border-slate-250 rounded-sm px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                      />
                      <button
                        type="submit"
                        className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider px-4 rounded-sm cursor-pointer font-display"
                      >
                        Apply PKR
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Quantity to buy & Total */}
              <div className="grid grid-cols-2 gap-4 items-center pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 tracking-widest uppercase mb-1 font-display">
                    Quantity to bill
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 w-fit p-1 rounded-sm border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(-1)}
                      disabled={purchaseQuantity <= 1}
                      className="text-slate-600 hover:bg-white p-1 rounded-sm disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-mono font-bold text-slate-800 w-8 text-center text-xs">
                      {purchaseQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQtyChange(1)}
                      disabled={purchaseQuantity >= maxAvailable}
                      className="text-slate-600 hover:bg-white p-1 rounded-sm disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 block font-sans italic">
                    {maxAvailable} currently in stock
                  </span>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-black text-slate-600 tracking-widest uppercase mb-1 font-display">
                    Total billing sum
                  </span>
                  <span className="text-xl font-black text-indigo-700 font-mono block">
                    PKR {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Out of Stock validation message */}
              {maxAvailable <= 0 && (
                <div className="bg-red-50 text-red-800 text-[10px] p-3 rounded-sm font-bold border border-red-200 font-display uppercase tracking-widest text-center">
                  Error: Out of Stock! Cannot complete sale.
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[11px] uppercase tracking-wider py-2.5 rounded-sm transition-colors cursor-pointer text-center font-display border border-slate-200"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={submitSale}
                  disabled={maxAvailable <= 0}
                  className="flex-1 bg-indigo-650 hover:bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider py-2.5 rounded-sm transition-all shadow-xs disabled:opacity-40 disabled:hover:bg-indigo-650 disabled:cursor-not-allowed cursor-pointer text-center font-display"
                >
                  Confirm & Checkout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
