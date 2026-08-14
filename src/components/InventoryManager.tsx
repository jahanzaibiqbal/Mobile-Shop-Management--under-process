import React, { useState, useRef, useEffect } from 'react';
import { Product, UserRole } from '../types';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  Check, 
  X, 
  Search, 
  Image as ImageIcon, 
  Upload, 
  Barcode, 
  RefreshCw, 
  Sparkles,
  Eye,
  Percent,
  Layers,
  DollarSign,
  Tag,
  QrCode
} from 'lucide-react';
import { QrCodeScannerModal } from './QrCodeScannerModal';

interface InventoryManagerProps {
  products: Product[];
  currentUser: UserRole;
  onAddProduct: (newProd: Product) => void;
  onUpdateProduct: (updatedProd: Product) => void;
  onDeleteProduct: (id: string) => void;
  onScanItem: (barcode: string) => void; 
  addModalPrefill?: { barcode?: string; name?: string; brand?: string; templateProduct?: Product } | null;
  onClearAddModalPrefill?: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  currentUser,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onScanItem,
  addModalPrefill,
  onClearAddModalPrefill
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showEditQrScanner, setShowEditQrScanner] = useState(false);
  const [showAddQrScanner, setShowAddQrScanner] = useState(false);

  // Add Item Form State
  const [newBarcode, setNewBarcode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('Apple');
  const [newModelName, setNewModelName] = useState('');
  const [newCostPrice, setNewCostPrice] = useState<number | ''>('');
  const [newCustomerPrice, setNewCustomerPrice] = useState<number | ''>('');
  const [newWholesalePrice, setNewWholesalePrice] = useState<number | ''>('');
  const [newQuantity, setNewQuantity] = useState<number | ''>(10);
  const [newMinQuantity, setNewMinQuantity] = useState<number | ''>(2);
  const [newDiscount1, setNewDiscount1] = useState<number | ''>(5);
  const [newFinalDiscount, setNewFinalDiscount] = useState<number | ''>(10);
  const [newImageUrl, setNewImageUrl] = useState<string>('');

  // Edit Item Form State
  const [editBarcode, setEditBarcode] = useState('');
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('Apple');
  const [editModelName, setEditModelName] = useState('');
  const [editCostPrice, setEditCostPrice] = useState<number | ''>(0);
  const [editCustomerPrice, setEditCustomerPrice] = useState<number | ''>(0);
  const [editWholesalePrice, setEditWholesalePrice] = useState<number | ''>(0);
  const [editQuantity, setEditQuantity] = useState<number | ''>(0);
  const [editMinQuantity, setEditMinQuantity] = useState<number | ''>(0);
  const [editDiscount1, setEditDiscount1] = useState<number | ''>(5);
  const [editFinalDiscount, setEditFinalDiscount] = useState<number | ''>(10);
  const [editImageUrl, setEditImageUrl] = useState<string>('');

  const addFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (addModalPrefill) {
      if (addModalPrefill.templateProduct) {
        const tp = addModalPrefill.templateProduct;
        setNewBarcode(addModalPrefill.barcode || tp.barcode);
        setNewName(tp.name);
        setNewBrand(tp.brand);
        setNewModelName(tp.modelName);
        setNewCostPrice(tp.costPrice);
        setNewCustomerPrice(tp.customerPrice);
        setNewWholesalePrice(tp.wholesalePrice);
        setNewQuantity(tp.quantity || 10);
        setNewMinQuantity(tp.minQuantity || 2);
        setNewDiscount1(tp.discounts?.[0] ?? 5);
        setNewFinalDiscount(tp.discounts?.[1] ?? 10);
        setNewImageUrl(tp.imageUrl || '');
      } else {
        setNewBarcode(addModalPrefill.barcode || generateUniqueBarcode());
        setNewName(addModalPrefill.name || '');
        setNewBrand(addModalPrefill.brand || 'Apple');
        setNewModelName('');
        setNewCostPrice('');
        setNewCustomerPrice('');
        setNewWholesalePrice('');
        setNewQuantity(10);
        setNewMinQuantity(2);
        setNewDiscount1(5);
        setNewFinalDiscount(10);
        setNewImageUrl('');
      }
      setShowAddModal(true);
      if (onClearAddModalPrefill) {
        onClearAddModalPrefill();
      }
    }
  }, [addModalPrefill]);

  // Role permissions
  const canModify = currentUser === 'Admin' || currentUser === 'Shoaib';
  const canDelete = currentUser === 'Admin';
  const canUploadImage = currentUser !== 'Zohaib';
  const canViewCostPrice = currentUser !== 'Zohaib';

  const filterProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode.includes(searchTerm) ||
    product.modelName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateUniqueBarcode = () => {
    // Generate a unique 4-6 digit numeric barcode
    let code = '';
    let exists = true;
    while (exists) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      code = String(randNum);
      exists = products.some(p => p.barcode === code);
    }
    return code;
  };

  const handleImageFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Image size exceeds 3MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const openAddModal = () => {
    setNewBarcode(generateUniqueBarcode());
    setNewName('');
    setNewBrand('Apple');
    setNewModelName('');
    setNewCostPrice('');
    setNewCustomerPrice('');
    setNewWholesalePrice('');
    setNewQuantity(10);
    setNewMinQuantity(2);
    setNewDiscount1(5);
    setNewFinalDiscount(10);
    setNewImageUrl('');
    setShowAddModal(true);
  };

  const triggerAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarcode.trim() || !newName.trim()) {
      alert('Please fill out Item Title and Barcode!');
      return;
    }

    if (products.some(p => p.barcode === newBarcode.trim())) {
      alert('This barcode already exists! Each item must have a unique barcode.');
      return;
    }

    const disc1 = typeof newDiscount1 === 'number' ? Math.max(0, newDiscount1) : 5;
    const finalDisc = typeof newFinalDiscount === 'number' ? Math.max(0, newFinalDiscount) : 10;

    const product: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      barcode: newBarcode.trim(),
      name: newName.trim(),
      brand: newBrand,
      modelName: newModelName.trim() || 'Standard',
      costPrice: canViewCostPrice ? (Number(newCostPrice) || 0) : 0,
      customerPrice: Number(newCustomerPrice) || 0,
      wholesalePrice: Number(newWholesalePrice) || 0,
      quantity: Math.max(0, Number(newQuantity) || 0),
      minQuantity: Math.max(1, Number(newMinQuantity) || 2),
      discounts: [disc1, finalDisc],
      imageUrl: newImageUrl.trim() || undefined
    };

    onAddProduct(product);
    setShowAddModal(false);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditBarcode(p.barcode);
    setEditName(p.name);
    setEditBrand(p.brand);
    setEditModelName(p.modelName);
    setEditCostPrice(p.costPrice);
    setEditCustomerPrice(p.customerPrice);
    setEditWholesalePrice(p.wholesalePrice);
    setEditQuantity(p.quantity);
    setEditMinQuantity(p.minQuantity);
    setEditDiscount1(p.discounts && p.discounts.length > 0 ? p.discounts[0] : 5);
    setEditFinalDiscount(p.discounts && p.discounts.length > 1 ? p.discounts[1] : 10);
    setEditImageUrl(p.imageUrl || '');
  };

  const triggerSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editBarcode.trim() || !editName.trim()) {
      alert('Item Title and Barcode cannot be empty!');
      return;
    }

    // Check barcode collision with other items
    const barcodeCollision = products.some(
      p => p.id !== editingProduct.id && p.barcode === editBarcode.trim()
    );
    if (barcodeCollision) {
      alert('This barcode is already assigned to another item! Barcodes must be unique.');
      return;
    }

    const disc1 = typeof editDiscount1 === 'number' ? Math.max(0, editDiscount1) : 5;
    const finalDisc = typeof editFinalDiscount === 'number' ? Math.max(0, editFinalDiscount) : 10;

    const updated: Product = {
      ...editingProduct,
      barcode: editBarcode.trim(),
      name: editName.trim(),
      brand: editBrand,
      modelName: editModelName.trim() || 'Standard',
      costPrice: canViewCostPrice ? (Number(editCostPrice) || 0) : (editingProduct.costPrice || 0),
      customerPrice: Number(editCustomerPrice) || 0,
      wholesalePrice: Number(editWholesalePrice) || 0,
      quantity: Math.max(0, Number(editQuantity) || 0),
      minQuantity: Math.max(1, Number(editMinQuantity) || 2),
      discounts: [disc1, finalDisc],
      imageUrl: editImageUrl.trim() || undefined
    };

    onUpdateProduct(updated);
    setEditingProduct(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs p-6 font-sans">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-600 inline-block"></span>
            Stock & Items Catalogue ({products.length} Items)
          </h3>
            <p className="text-xs text-slate-500 mt-1">
            {currentUser === 'Admin'
              ? 'Admin permission active: Add, edit, upload pictures, barcode codes, prices, discounts & delete items.'
              : currentUser === 'Shoaib'
                ? 'Manager permission active: Add, edit, upload pictures, prices & manage discounts.'
                : 'Clerk permission active: View stock & instant checkout. (Editing, photo upload, cost prices & deletion restricted).'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canModify && (
            <button
              onClick={openAddModal}
              className="bg-indigo-650 hover:bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider px-4 py-2.5 rounded-sm cursor-pointer flex items-center gap-1.5 transition-all shadow-xs shrink-0 font-display"
            >
              <Plus size={15} />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-5">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search size={14} />
        </div>
        <input
          type="text"
          placeholder="Search catalogue by item name, brand, model, or barcode number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white text-xs rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all text-slate-800 font-medium"
        />
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-sm border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-300 font-black uppercase tracking-wider text-[9px] font-display">
              <th className="p-3 border-r border-slate-800 w-12 text-center">Picture</th>
              <th className="p-3 border-r border-slate-800">Item Details & Barcode</th>
              <th className="p-3 border-r border-slate-800">In Stock</th>
              {canViewCostPrice && <th className="p-3 border-r border-slate-800">Cost Price</th>}
              <th className="p-3 border-r border-slate-800">Retail Price</th>
              <th className="p-3 border-r border-slate-800">Wholesale Price</th>
              <th className="p-3 border-r border-slate-800">Discount 1 & Final ($)</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
            {filterProducts.length === 0 ? (
              <tr>
                <td colSpan={canViewCostPrice ? 8 : 7} className="p-12 text-center text-slate-450 font-sans">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package size={32} className="text-slate-300" />
                    <p className="text-xs italic">No matching inventory items found.</p>
                    {canModify && (
                      <button
                        onClick={openAddModal}
                        className="mt-2 text-xs text-indigo-600 font-bold hover:underline font-display uppercase tracking-wider"
                      >
                        + Add Your First Item Now
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filterProducts.map((p) => {
                const lowStock = p.quantity <= p.minQuantity;
                const d1 = p.discounts && p.discounts.length > 0 ? p.discounts[0] : 5;
                const dFinal = p.discounts && p.discounts.length > 1 ? p.discounts[1] : 10;

                return (
                  <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${lowStock ? 'bg-amber-50/30' : ''}`}>
                    
                    {/* Picture Thumbnail */}
                    <td className="p-2.5 border-r border-slate-150 text-center">
                      {p.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(p.imageUrl || null)}
                          className="w-10 h-10 rounded-sm overflow-hidden border border-slate-200 bg-slate-100 hover:opacity-85 transition-opacity cursor-pointer inline-block"
                          title="Click to view full picture"
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-sm border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-350 mx-auto">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </td>

                    {/* Item Info & Barcode */}
                    <td className="p-3 border-r border-slate-150 font-sans">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-[13px]">{p.name}</span>
                        <div className="flex gap-1.5 mt-1 text-[9px] text-slate-500 items-center flex-wrap">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-sm font-black uppercase font-display border border-slate-200">
                            {p.brand}
                          </span>
                          <span className="font-mono text-slate-500">Model: {p.modelName}</span>
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-sm border border-indigo-100 flex items-center gap-1">
                            <Barcode size={11} /> {p.barcode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="p-3 border-r border-slate-150">
                      <div className="flex flex-col gap-0.5 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs font-bold ${lowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                            {p.quantity} Units
                          </span>
                          {lowStock && (
                            <span 
                              title={`Low stock alert! (Qty <= ${p.minQuantity})`}
                              className="inline-flex text-[8px] items-center gap-0.5 font-bold tracking-widest text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.5 rounded-sm uppercase font-display animate-pulse"
                            >
                              Low Stock
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Min alert: {p.minQuantity}
                        </span>
                      </div>
                    </td>

                    {/* Cost Price */}
                    {canViewCostPrice && (
                      <td className="p-3 border-r border-slate-150 font-mono text-[11px] text-slate-500">
                        ${p.costPrice}
                      </td>
                    )}

                    {/* Customer (Retail) Price */}
                    <td className="p-3 border-r border-slate-150 font-mono text-[11px]">
                      {p.customerPrice > 0 ? (
                        <span className="text-indigo-900 font-bold">${p.customerPrice}</span>
                      ) : (
                        <span className="text-amber-700 font-bold text-[10px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm">
                          Retail Pending
                        </span>
                      )}
                    </td>

                    {/* Wholesale Price */}
                    <td className="p-3 border-r border-slate-150 font-mono text-[11px] text-slate-800 font-bold">
                      ${p.wholesalePrice}
                    </td>

                    {/* Discount 1 & Final Discount */}
                    <td className="p-3 border-r border-slate-150">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-500 font-mono uppercase">Discount 1:</span>
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-1.5 py-0.2 rounded-sm border border-indigo-150 font-mono">
                            -${d1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-500 font-mono uppercase">Final Disc:</span>
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-1.5 py-0.2 rounded-sm border border-emerald-200 font-mono">
                            -${dFinal}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Quick Checkout */}
                        <button
                          onClick={() => onScanItem(p.barcode)}
                          className="text-[9px] font-black text-white bg-slate-900 hover:bg-indigo-650 px-2.5 py-1.5 rounded-sm border border-slate-800 uppercase tracking-widest font-display transition-all cursor-pointer shadow-xs"
                          title="Instant Sale Checkout"
                        >
                          Checkout
                        </button>

                        {/* Edit Item Details (Barcode, Picture, Prices, Discounts) */}
                        {canModify && (
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-sm border border-slate-200 transition-colors cursor-pointer"
                            title="Edit Item Details (Barcode, Picture, Prices & Discounts)"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}

                        {/* Delete (Admin Only) */}
                        {canDelete && (
                          <button
                            onClick={() => {
                              if (confirm(`Permanently delete "${p.name}"? This action cannot be undone.`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-sm border border-red-200 transition-colors cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Picture Fullscreen Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm p-3 max-w-md w-full relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 bg-slate-900 text-white p-1 rounded-sm cursor-pointer hover:bg-slate-800"
            >
              <X size={16} />
            </button>
            <div className="mt-6 max-h-[70vh] overflow-hidden rounded-sm bg-slate-100 flex items-center justify-center">
              <img
                src={previewImage}
                alt="Product Preview"
                className="max-h-[65vh] w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2) ADD NEW ITEM MODAL                                                    */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-opacity font-sans">
          <div className="bg-white rounded-sm shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 text-left">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 flex justify-between items-center rounded-t-sm">
              <h4 className="font-display font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                <Plus size={16} className="text-indigo-400" /> Add New Inventory Item
              </h4>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-sm cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Add Form */}
            <form onSubmit={triggerAddProduct} className="p-6 space-y-4">
              
              {/* Product Title */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                  Item Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 64GB USB Drive, iPhone 15 Pro, R-9 Handsfree"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Brand / Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apple, Samsung, Login, Ronin, Kingston"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full text-xs border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Model / Variant
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. USB 3.0, Type-C, Pro 2"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    className="w-full text-xs border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2"
                  />
                </div>
              </div>

              {/* Barcode Field with Auto-generator & QR Scanner */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-display flex items-center gap-1">
                    <Barcode size={13} className="text-indigo-600" /> Barcode Serial / QR Code *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddQrScanner(true)}
                      className="text-[10px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-sm font-bold flex items-center gap-1 cursor-pointer font-display uppercase tracking-wider transition-colors"
                      title="Scan Barcode or QR Code with camera"
                    >
                      <QrCode size={11} /> Scan QR / Barcode
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBarcode(generateUniqueBarcode())}
                      className="text-[10px] text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer font-display uppercase transition-colors"
                    >
                      <RefreshCw size={11} /> Auto-Generate
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1001, 1055, 89304928..."
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  className="w-full text-xs font-mono font-bold border border-slate-300 bg-white rounded-sm px-3 py-2 text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Picture Upload & URL Section (Hidden for Zohaib role) */}
              {canUploadImage && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm space-y-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase font-display flex items-center gap-1">
                    <ImageIcon size={13} className="text-indigo-600" /> Item Picture (Photo / URL)
                  </label>
                  
                  <div className="flex items-center gap-3">
                    {/* Thumbnail Preview */}
                    <div className="w-16 h-16 rounded-sm border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {newImageUrl ? (
                        <img
                          src={newImageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon size={20} className="text-slate-300" />
                      )}
                    </div>

                    {/* Upload Actions */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-sm cursor-pointer flex items-center gap-1 font-display">
                          <Upload size={12} />
                          <span>Choose File</span>
                          <input
                            ref={addFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageFileChange(e, setNewImageUrl)}
                            className="hidden"
                          />
                        </label>
                        {newImageUrl && (
                          <button
                            type="button"
                            onClick={() => setNewImageUrl('')}
                            className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="Or paste direct image URL (https://...)"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className="w-full text-[11px] border border-slate-300 bg-white rounded-sm px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Grid: Retail & Wholesale & Cost */}
              <div className={`grid ${canViewCostPrice ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Retail Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Customer price"
                    value={newCustomerPrice}
                    onChange={(e) => setNewCustomerPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-indigo-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Wholesale Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Shopkeeper price"
                    value={newWholesalePrice}
                    onChange={(e) => setNewWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-slate-900"
                  />
                </div>
                {canViewCostPrice && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                      Cost Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Shop purchase"
                      value={newCostPrice}
                      onChange={(e) => setNewCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs font-mono border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-slate-600"
                    />
                  </div>
                )}
              </div>

              {/* Quantity & Low Stock Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Low Stock Alert Limit *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMinQuantity}
                    onChange={(e) => setNewMinQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-amber-800"
                  />
                </div>
              </div>

              {/* Discount Options: Discount 1 and Final Discount */}
              <div className="bg-indigo-50/40 border border-indigo-150 p-3 rounded-sm">
                <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-2 font-display flex items-center gap-1">
                  <Tag size={12} /> Discount Settings (Customer Checkout in $)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-700 mb-1 font-display">
                      Discount 1 ($)
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={newDiscount1}
                      onChange={(e) => setNewDiscount1(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold border border-slate-300 bg-white rounded-sm px-3 py-2 text-indigo-800"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-700 mb-1 font-display">
                      Final Discount ($)
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 10"
                      value={newFinalDiscount}
                      onChange={(e) => setNewFinalDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold border border-slate-300 bg-white rounded-sm px-3 py-2 text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 text-slate-700 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-sm font-black text-[11px] uppercase tracking-wider cursor-pointer font-display transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 text-white bg-indigo-650 hover:bg-slate-900 py-2.5 rounded-sm font-black text-[11px] uppercase tracking-wider cursor-pointer shadow-xs font-display transition-all"
                >
                  Save & Add Item
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3) EDIT ITEM DETAILS MODAL (Barcode, Picture, Prices, Quantity, Discounts) */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-opacity font-sans">
          <div className="bg-white rounded-sm shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 text-left">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 flex justify-between items-center rounded-t-sm">
              <h4 className="font-display font-black text-xs uppercase tracking-widest flex items-center gap-1.5 truncate mr-2">
                <Edit3 size={16} className="text-indigo-400 shrink-0" /> Edit Item Details: {editingProduct.name}
              </h4>
              <div className="flex items-center gap-2 shrink-0">
                {canModify && (
                  <button 
                    type="button"
                    onClick={triggerSaveEdit}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-sm cursor-pointer shadow-xs font-display flex items-center gap-1 transition-all"
                    title="Save Item Changes (Admin & Shoaib)"
                  >
                    <Check size={13} />
                    <span>Save</span>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-sm cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={triggerSaveEdit} className="p-6 space-y-4">
              
              {/* Product Title */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                  Item Title / Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Brand / Category
                  </label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full text-xs border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Model / Variant
                  </label>
                  <input
                    type="text"
                    value={editModelName}
                    onChange={(e) => setEditModelName(e.target.value)}
                    className="w-full text-xs border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2"
                  />
                </div>
              </div>

              {/* Barcode Edit Section with Scan QR Option */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-display flex items-center gap-1">
                    <Barcode size={13} className="text-indigo-600" /> Barcode Serial / QR Code *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEditQrScanner(true)}
                      className="text-[10px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-sm font-bold flex items-center gap-1 cursor-pointer font-display uppercase tracking-wider transition-colors"
                      title="Scan QR code or Barcode with camera"
                    >
                      <QrCode size={11} /> Scan QR / Barcode
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditBarcode(generateUniqueBarcode())}
                      className="text-[10px] text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer font-display uppercase transition-colors"
                    >
                      <RefreshCw size={11} /> Generate New Barcode
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter or scan barcode / QR code..."
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  className="w-full text-xs font-mono font-bold border border-slate-300 bg-white rounded-sm px-3 py-2 text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {/* Picture Edit Section (Hidden/Read-only for Zohaib role) */}
              {canUploadImage ? (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm space-y-2">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase font-display flex items-center gap-1">
                    <ImageIcon size={13} className="text-indigo-600" /> Item Picture (Photo / URL)
                  </label>
                  
                  <div className="flex items-center gap-3">
                    {/* Preview */}
                    <div className="w-16 h-16 rounded-sm border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {editImageUrl ? (
                        <img
                          src={editImageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageIcon size={20} className="text-slate-300" />
                      )}
                    </div>

                    {/* Upload Actions */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-sm cursor-pointer flex items-center gap-1 font-display">
                          <Upload size={12} />
                          <span>Change Photo</span>
                          <input
                            ref={editFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageFileChange(e, setEditImageUrl)}
                            className="hidden"
                          />
                        </label>
                        {editImageUrl && (
                          <button
                            type="button"
                            onClick={() => setEditImageUrl('')}
                            className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="Or paste direct image URL (https://...)"
                        value={editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        className="w-full text-[11px] border border-slate-300 bg-white rounded-sm px-2.5 py-1.5"
                      />
                    </div>
                  </div>
                </div>
              ) : editImageUrl ? (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm flex items-center gap-3">
                  <div className="w-12 h-12 rounded-sm border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={editImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 uppercase font-display block">Item Photo (Read-Only)</span>
                    <span className="text-[9px] text-slate-400 font-sans italic">Photo uploading & modification disabled for Zohaib profile.</span>
                  </div>
                </div>
              ) : null}

              {/* Pricing Grid */}
              <div className={`grid ${canViewCostPrice ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Retail Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editCustomerPrice}
                    onChange={(e) => setEditCustomerPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-indigo-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Wholesale Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editWholesalePrice}
                    onChange={(e) => setEditWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-slate-900"
                  />
                </div>
                {canViewCostPrice && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                      Cost Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editCostPrice}
                      onChange={(e) => setEditCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs font-mono border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-slate-600"
                    />
                  </div>
                )}
              </div>

              {/* Quantity & Low Stock Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1 font-display">
                    Low Stock Alert Limit *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editMinQuantity}
                    onChange={(e) => setEditMinQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono border border-slate-300 bg-slate-50 focus:bg-white rounded-sm px-3 py-2 text-amber-800"
                  />
                </div>
              </div>

              {/* Discounts: Discount 1 and Final Discount */}
              <div className="bg-indigo-50/40 border border-indigo-150 p-3 rounded-sm">
                <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-2 font-display flex items-center gap-1">
                  <Tag size={12} /> Discount Settings (Customer Checkout in $)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-700 mb-1 font-display">
                      Discount 1 ($)
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={editDiscount1}
                      onChange={(e) => setEditDiscount1(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold border border-slate-300 bg-white rounded-sm px-3 py-2 text-indigo-800"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-700 mb-1 font-display">
                      Final Discount ($)
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={editFinalDiscount}
                      onChange={(e) => setEditFinalDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold border border-slate-300 bg-white rounded-sm px-3 py-2 text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Save Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 text-slate-700 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-sm font-black text-[11px] uppercase tracking-wider cursor-pointer font-display transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 text-white bg-emerald-600 hover:bg-emerald-700 py-2.5 rounded-sm font-black text-[11px] uppercase tracking-wider cursor-pointer shadow-xs font-display transition-all flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Save Changes</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* QR & Barcode Scanner Modal for Edit Item */}
      <QrCodeScannerModal
        isOpen={showEditQrScanner}
        onClose={() => setShowEditQrScanner(false)}
        onScan={(scannedCode) => {
          setEditBarcode(scannedCode);
          setShowEditQrScanner(false);
        }}
        title="Scan QR / Barcode for Item"
        subtitle={`Updating barcode code for: ${editingProduct?.name || 'Item'}`}
      />

      {/* QR & Barcode Scanner Modal for Add Item */}
      <QrCodeScannerModal
        isOpen={showAddQrScanner}
        onClose={() => setShowAddQrScanner(false)}
        onScan={(scannedCode) => {
          setNewBarcode(scannedCode);
          setShowAddQrScanner(false);
        }}
        title="Scan QR / Barcode for New Item"
        subtitle="Auto-fill barcode serial for new inventory item"
      />
    </div>
  );
};
