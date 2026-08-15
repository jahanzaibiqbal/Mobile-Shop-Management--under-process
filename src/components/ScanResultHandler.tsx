import React, { useState } from 'react';
import { Product, UserRole } from '../types';
import { ShoppingBag, Users, Tag, Sparkles, Plus, Minus, ArrowLeft, Printer, Check } from 'lucide-react';

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
  const [activeDiscount, setActiveDiscount] = useState(0); // Pre-select to zero discount
  const [customDiscountInput, setCustomDiscountInput] = useState('');
  const [showCustomDiscount, setShowCustomDiscount] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [savedPictureStatus, setSavedPictureStatus] = useState(false);

  const discount1 = product.discounts && product.discounts.length > 0 ? product.discounts[0] : 5;
  const finalDiscount = product.discounts && product.discounts.length > 1 ? product.discounts[1] : 10;

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

  const currentDateStr = new Date().toLocaleString();

  // Helper function to render text with line wrap on HTML5 Canvas
  const wrapCanvasText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    return currentY + lineHeight;
  };

  // Generate crisp bill picture and save to mobile / device
  const saveBillImageToDevice = async (): Promise<boolean> => {
    try {
      const canvas = document.createElement('canvas');
      const scale = 2; // 2x retina HD resolution for mobile
      const w = 440;
      const h = 640;
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      ctx.scale(scale, scale);

      // Clean white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // Outer border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      // Top Header Banner
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(10, 10, w - 20, 72);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('TELEPORTAL STATION', w / 2, 38);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px sans-serif';
      ctx.fillText('Mobile Accessories & Smart Telecom Solutions', w / 2, 55);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('•• OFFICIAL SALES RECEIPT ••', w / 2, 70);

      // Meta details
      let y = 104;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.font = '11px monospace';
      const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
      ctx.fillText(`Receipt #: ${invoiceNum}`, 24, y);
      ctx.fillText(`Date: ${currentDateStr}`, 24, y + 18);
      
      ctx.textAlign = 'right';
      ctx.fillText(`Cashier: ${currentUser}`, w - 24, y);
      ctx.fillText(`Tier: ${(buyerType || 'Customer').toUpperCase()}`, w - 24, y + 18);

      // Dotted divider
      y += 34;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(w - 24, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Product title & specs
      y += 22;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px sans-serif';
      y = wrapCanvasText(ctx, product.name, 24, y, w - 48, 18);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Brand: ${product.brand}   |   Model: ${product.modelName}`, 24, y);
      y += 18;

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#4f46e5';
      ctx.fillText(`Barcode Serial: #${product.barcode}`, 24, y);
      y += 22;

      // Table Header
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(24, y - 14, w - 48, 24);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(24, y - 14, w - 48, 24);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('RATE', 32, y + 2);
      ctx.textAlign = 'center';
      ctx.fillText('QTY', w / 2 + 10, y + 2);
      ctx.textAlign = 'right';
      ctx.fillText('SUBTOTAL', w - 32, y + 2);

      // Item line
      y += 26;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`PKR ${baseUnitPrice.toLocaleString()}`, 32, y);
      ctx.textAlign = 'center';
      ctx.fillText(`${purchaseQuantity}`, w / 2 + 10, y);
      ctx.textAlign = 'right';
      ctx.fillText(`PKR ${(baseUnitPrice * purchaseQuantity).toLocaleString()}`, w - 32, y);

      if (activeDiscount > 0) {
        y += 22;
        ctx.fillStyle = '#dc2626';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Discount (-PKR ${activeDiscount.toLocaleString()} x ${purchaseQuantity})`, 32, y);
        ctx.textAlign = 'right';
        ctx.fillText(`-PKR ${(activeDiscount * purchaseQuantity).toLocaleString()}`, w - 32, y);
      }

      // Dotted divider
      y += 20;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(w - 24, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Total box
      y += 24;
      ctx.fillStyle = '#eef2ff'; // indigo-50
      ctx.fillRect(24, y - 16, w - 48, 52);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(24, y - 16, w - 48, 52);

      ctx.fillStyle = '#1e1b4b';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('TOTAL AMOUNT PAID:', 36, y + 14);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`PKR ${totalAmount.toLocaleString()}`, w - 36, y + 17);

      // Footer
      y += 68;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Thank you for your business!', w / 2, y);

      y += 18;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('Goods once sold can only be replaced with this receipt.', w / 2, y);

      const cleanName = (product.name || 'item').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
      const fileName = `Bill_${cleanName}_${Date.now()}.jpg`;

      return new Promise<boolean>((resolve) => {
        // Direct normal quality JPG export without any permission popups or print dialogs
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(false);
            return;
          }

          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          }, 300);

          resolve(true);
        }, 'image/jpeg', 0.85);
      });
    } catch (err) {
      console.error('Error generating bill JPG image:', err);
      return false;
    }
  };

  // Handler for Print button: Saves bill receipt directly as a normal quality JPG image and returns to main menu
  const handlePrintReceipt = async () => {
    setIsPrinting(true);
    setSavedPictureStatus(false);

    try {
      const success = await saveBillImageToDevice();
      setIsPrinting(false);
      if (success) {
        setSavedPictureStatus(true);
        // Return to main menu after saving bill
        setTimeout(() => {
          onClose();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 400);
      }
    } catch {
      setIsPrinting(false);
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
      
      {/* Printable Receipt Layout for @media print */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-mono text-sm">
        <div className="max-w-xs mx-auto text-center border-b pb-4 mb-4 border-black">
          <h2 className="text-lg font-black uppercase">TELEPORTAL STATION</h2>
          <p className="text-xs">Mobile Shop & Inventory Management</p>
          <p className="text-xs mt-1">Date: {currentDateStr}</p>
          <p className="text-xs">Cashier: {currentUser}</p>
        </div>

        <div className="space-y-2 border-b pb-4 mb-4 border-black text-left">
          <p className="font-bold">{product.name}</p>
          <p className="text-xs">Brand: {product.brand} | Model: {product.modelName}</p>
          <p className="text-xs">Barcode: {product.barcode}</p>
          {product.barcodes && product.barcodes.length > 1 && (
            <p className="text-xs">All Codes: {product.barcodes.join(', ')}</p>
          )}
          <div className="flex justify-between text-xs pt-1">
            <span>Rate: PKR {baseUnitPrice.toLocaleString()}</span>
            <span>Qty: {purchaseQuantity}</span>
          </div>
          {activeDiscount > 0 && (
            <div className="flex justify-between text-xs text-black">
              <span>Discount:</span>
              <span>-PKR {activeDiscount.toLocaleString()} / unit</span>
            </div>
          )}
        </div>

        <div className="flex justify-between text-base font-black border-b pb-3 mb-4 border-black">
          <span>TOTAL PAID:</span>
          <span>PKR {totalAmount.toLocaleString()}</span>
        </div>

        <div className="text-center text-xs mt-6">
          <p>Thank you for your business!</p>
          <p className="text-[10px] mt-1">Goods once sold cannot be returned without receipt.</p>
        </div>
      </div>

      {/* Main Dialog Modal */}
      <div className="bg-white rounded-sm shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100 print:hidden">
        
        {/* Modal Header with Back Button on the LEFT side and extra left padding/margins */}
        <div className="bg-slate-900 py-4.5 sm:py-5 pl-6 sm:pl-8 pr-5 sm:pr-6 text-white">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Prominent Back Button (Red with increased text size & spacing) */}
            <button
              type="button"
              id="modal-checkout-back-btn"
              onClick={() => {
                if (buyerType !== null) {
                  setBuyerType(null);
                  setActiveDiscount(0);
                } else {
                  onClose();
                }
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4.5 py-2.5 rounded-sm transition-all cursor-pointer border border-red-500 font-display font-black text-sm sm:text-base uppercase tracking-wider shadow-xs shrink-0"
              title="Back"
            >
              <ArrowLeft size={20} strokeWidth={2.8} className="text-white shrink-0" />
              <span>Back</span>
            </button>

            {/* Center / Middle: Product Thumbnail & Name with left margin */}
            <div className="flex gap-3.5 items-center text-left flex-1 min-w-0 ml-1 pr-2">
              {product.imageUrl ? (
                <div className="w-11 h-11 rounded-sm border border-slate-700 overflow-hidden bg-slate-800 shrink-0">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="p-2.5 bg-indigo-650 text-white rounded-sm border border-indigo-500/20 shrink-0">
                  <ShoppingBag size={20} />
                </div>
              )}
              
              <div className="overflow-hidden min-w-0">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white font-display uppercase line-clamp-2">
                  {product.name}
                </h3>
              </div>
            </div>

            {/* Right: Add Item (Admin only) */}
            {currentUser === 'Admin' && onOpenAddItemModal && (
              <button
                type="button"
                id="modal-admin-add-item-btn"
                onClick={() => {
                  onClose();
                  onOpenAddItemModal(product.barcode, product);
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider px-3.5 py-2.5 rounded-sm shadow-xs transition-all cursor-pointer font-display shrink-0 ml-1"
                title="Add Item / Clone in inventory"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Add Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body with Increased Right-Side Spacing */}
        <div className="p-5 sm:p-6 pr-6 sm:pr-8 text-left">
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
                  onClick={() => {
                    setBuyerType('customer');
                    setActiveDiscount(0); // pre-select zero discount
                  }}
                  className="flex flex-col items-center justify-center p-5 border border-slate-200 hover:border-indigo-600 bg-slate-50/50 hover:bg-white rounded-sm transition-all cursor-pointer group shadow-xs text-left"
                >
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-sm group-hover:scale-105 duration-200 border border-indigo-100 shadow-xs">
                    <Sparkles size={22} />
                  </div>
                  <span className="font-black text-slate-900 mt-3 text-xs font-display uppercase tracking-wider text-center">Customer Retail</span>
                  <span className="text-xs text-slate-700 font-bold mt-1 font-mono text-center">PKR {product.customerPrice.toLocaleString()}</span>
                  <div className="flex flex-col gap-1 mt-2 w-full">
                    <span className="text-[9px] bg-slate-100 text-black border border-slate-300 font-bold px-1.5 py-0.5 rounded-sm font-mono text-center">
                      Discount 1: -PKR {discount1}
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.5 rounded-sm font-mono text-center">
                      Final Disc: -PKR {finalDiscount}
                    </span>
                  </div>
                </button>

                {/* Shopkeeper wholesale Button */}
                <button
                  type="button"
                  onClick={() => {
                    setBuyerType('shopkeeper');
                    setActiveDiscount(0);
                  }}
                  className="flex flex-col items-center justify-center p-5 border border-slate-200 hover:border-indigo-600 bg-slate-50/50 hover:bg-white rounded-sm transition-all cursor-pointer group shadow-xs text-left"
                >
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-sm group-hover:scale-105 duration-200 border border-amber-100 shadow-xs">
                    <Users size={22} />
                  </div>
                  <span className="font-black text-slate-900 mt-3 text-xs font-display uppercase tracking-wider text-center">Shopkeeper Wholesale</span>
                  <span className="text-xs text-slate-700 font-bold mt-1 font-mono text-center">PKR {product.wholesalePrice.toLocaleString()}</span>
                  <span className="text-[9px] bg-slate-200 text-slate-800 border border-slate-300 font-bold px-1.5 py-0.5 mt-2 rounded-sm font-mono uppercase tracking-widest text-center">
                    Wholesale Net
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Configure Transaction and checkout details */
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-150">
              
              {/* Price Calculation details */}

              {/* Price Calculation details */}
              <div className="bg-slate-50 border border-slate-200 rounded-sm p-4 font-sans">
                <div className="flex justify-between text-xs text-slate-500 font-mono mb-2">
                  <span>Regular List Price:</span>
                  <span className="line-through">PKR {baseUnitPrice.toLocaleString()}</span>
                </div>

                {buyerType === 'customer' && (
                  <div className="flex justify-between text-xs text-slate-900 font-bold mb-2 items-center">
                    <span className="flex items-center gap-1">
                      <Tag size={12} /> Active Discount:
                    </span>
                    <span className="bg-slate-200 text-black border border-slate-300 px-2 py-0.5 rounded-sm text-[11px] font-bold font-mono">
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

              {/* Customer Discount Selection (Discount 1, Final Discount, Zero Discount) */}
              {buyerType === 'customer' && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-black text-slate-600 uppercase tracking-widest font-display">
                    Discount Options (PKR):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {/* Zero Discount Button (Pre-selected) */}
                    <button
                      type="button"
                      onClick={() => handleApplyDiscount(0)}
                      className={`text-[11px] px-3 py-1.5 rounded-sm font-bold border font-mono cursor-pointer transition-colors ${
                        activeDiscount === 0
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      PKR 0 Off (No Discount)
                    </button>

                    {/* Discount 1 Button (Text color strictly black) */}
                    <button
                      type="button"
                      onClick={() => handleApplyDiscount(discount1)}
                      className={`text-[11px] px-3 py-1.5 rounded-sm font-black border font-mono cursor-pointer transition-colors ${
                        activeDiscount === discount1
                          ? 'bg-amber-300 text-black border-amber-400 shadow-xs ring-1 ring-black'
                          : 'bg-white text-black border-slate-300 hover:bg-slate-50'
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
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Final Discount (-PKR {finalDiscount})
                    </button>

                    {/* Custom PKR Button */}
                    <button
                      type="button"
                      onClick={() => setShowCustomDiscount(!showCustomDiscount)}
                      className="text-[10px] px-3 py-1.5 rounded-sm font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200 cursor-pointer font-display uppercase tracking-wider"
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
                        className="flex-1 text-xs border border-slate-300 rounded-sm px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
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

              {/* Quantity to buy & Large Final Amount */}
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

                {/* Final Amount with Increased Font Size */}
                <div className="text-right">
                  <span className="block text-[10px] font-black text-slate-600 tracking-widest uppercase mb-0.5 font-display">
                    Final Amount
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono block tracking-tight">
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

              {/* Action buttons: Confirm Sale + Print / Save Picture (Green) on the RIGHT side with generous spacing */}
              <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-slate-150 pr-1">
                {/* Confirm Sale */}
                <button
                  type="button"
                  id="checkout-confirm-btn"
                  onClick={submitSale}
                  disabled={maxAvailable <= 0}
                  className="flex-1 bg-indigo-650 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-sm transition-all shadow-xs disabled:opacity-40 disabled:hover:bg-indigo-650 disabled:cursor-not-allowed cursor-pointer text-center font-display"
                >
                  Confirm & Checkout
                </button>

                {/* Print & Save Bill JPG Option - Vibrant Green Color with enhanced right spacing */}
                <button
                  type="button"
                  id="checkout-print-bill-btn"
                  onClick={handlePrintReceipt}
                  disabled={isPrinting}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-sm transition-all shadow-xs cursor-pointer font-display shrink-0 border border-emerald-500 hover:border-emerald-600"
                  title="Save Bill Receipt as JPG Image"
                >
                  {savedPictureStatus ? (
                    <Check size={16} className="text-emerald-100" />
                  ) : (
                    <Printer size={16} />
                  )}
                  <span>{isPrinting ? 'Saving...' : savedPictureStatus ? 'Bill Saved!' : 'Print'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


