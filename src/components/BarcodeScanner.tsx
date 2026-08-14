import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '../types';
import { 
  Scan, 
  QrCode, 
  Search, 
  Camera, 
  CameraOff, 
  AlertCircle, 
  Upload, 
  RefreshCw, 
  Sparkles,
  Zap,
  CheckCircle2,
  Barcode,
  Plus,
  ChevronRight,
  PackageCheck,
  Tag
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { UserRole } from '../types';

interface BarcodeScannerProps {
  products: Product[];
  currentUser?: UserRole;
  onScanSuccess: (barcode: string) => void;
  onOpenAddItemModal?: (barcode?: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  products, 
  currentUser,
  onScanSuccess,
  onOpenAddItemModal 
}) => {
  const [manualInput, setManualInput] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [scanSpeed, setScanSpeed] = useState<number>(0);
  const [pulseScale, setPulseScale] = useState(1);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Matching options state
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);

  // Camera scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scannerType, setScannerType] = useState<'all' | 'barcode' | 'qr'>('all');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'qr-barcode-reader-canvas';

  // Compute matching products based on manualInput
  const matchingProducts = useMemo(() => {
    const query = manualInput.trim().toLowerCase();
    if (!query) return [];
    return products.filter((p) => {
      const matchBarcode = p.barcode.toLowerCase().includes(query);
      const matchName = p.name.toLowerCase().includes(query);
      const matchBrand = (p.brand || '').toLowerCase().includes(query);
      const matchModel = (p.modelName || '').toLowerCase().includes(query);
      return matchBarcode || matchName || matchBrand || matchModel;
    }).slice(0, 6);
  }, [manualInput, products]);

  // Click outside to close matching dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputContainerRef.current && !inputContainerRef.current.contains(event.target as Node)) {
        setIsInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Laser pulse animation
  useEffect(() => {
    if (isScanningActive || isCameraActive) {
      const interval = setInterval(() => {
        setPulseScale((prev) => (prev === 1 ? 1.04 : 1));
      }, 700);
      return () => clearInterval(interval);
    }
  }, [isScanningActive, isCameraActive]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  const triggerBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1400, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Browser audio restriction fallback
    }
  };

  const showTemporaryMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setScanMessage({ text, type });
    setTimeout(() => {
      setScanMessage(null);
    }, 4500);
  };

  const handleDecodedCode = (decodedText: string, formatName?: string) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode) return;

    setLastScannedCode(cleanCode);
    triggerBeep();
    onScanSuccess(cleanCode);

    const found = products.find(
      (p) => p.barcode.toLowerCase() === cleanCode.toLowerCase() || p.id === cleanCode
    );

    if (found) {
      showTemporaryMessage(
        `Scanned ${formatName ? `(${formatName})` : ''}: ${found.name} [Stock: ${found.quantity}]`,
        'success'
      );
    } else {
      showTemporaryMessage(
        `Scanned code: "${cleanCode}" (Item not found in current catalogue)`,
        'info'
      );
    }
  };

  const startCameraScanner = async (facingMode: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    setIsCameraActive(true);

    // Wait for container element to mount
    setTimeout(async () => {
      try {
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
          } catch {
            // ignore
          }
        }

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ];

        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport,
          verbose: false
        });
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minEdge * 0.85),
              height: Math.floor(minEdge * 0.65)
            };
          },
          aspectRatio: 1.333334
        };

        await html5QrCode.start(
          { facingMode },
          config,
          (decodedText, decodedResult) => {
            const formatStr = decodedResult?.result?.format?.formatName || 'Barcode/QR';
            handleDecodedCode(decodedText, formatStr);
          },
          () => {
            // frame without scan code - keep scanning smoothly
          }
        );

        // Check torch capability
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities();
          if (capabilities && (capabilities as any).torch) {
            setHasTorch(true);
          } else {
            setHasTorch(false);
          }
        } catch {
          setHasTorch(false);
        }

        showTemporaryMessage('Camera live! Align any Barcode or QR Code in the frame.', 'info');
      } catch (err: any) {
        console.error('Camera Scanner start error:', err);
        setIsCameraActive(false);
        setCameraError(err?.message || 'Unable to access camera. Please allow camera permissions.');
        showTemporaryMessage('Camera permission required. Please allow camera access in browser settings.', 'error');
      }
    }, 100);
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
    setTorchOn(false);
  };

  const switchCameraFacing = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      await stopCameraScanner();
      await startCameraScanner(nextFacing);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showTemporaryMessage('Processing image barcode/QR code...', 'info');
      const tempScanner = new Html5Qrcode('qr-barcode-file-scan-temp', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ],
        verbose: false
      });

      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      handleDecodedCode(decodedText, 'Image File');
    } catch (err: any) {
      showTemporaryMessage('No readable Barcode or QR Code recognized in this picture.', 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = manualInput.trim();
    if (!clean) return;

    setLastScannedCode(clean);
    const found = products.find(
      (p) => p.barcode.toLowerCase() === clean.toLowerCase() || p.id === clean
    );

    if (found) {
      onScanSuccess(found.barcode);
      setManualInput('');
      triggerBeep();
      showTemporaryMessage(`Found: ${found.name} (${found.brand})`, 'success');
    } else {
      onScanSuccess(clean);
      showTemporaryMessage(`Barcode "${clean}" searched. Not found in stock catalogue.`, 'info');
    }
  };

  const simulateQuickScan = (barcode: string) => {
    setIsScanningActive(true);
    let counter = 0;
    const interval = setInterval(() => {
      counter += 25;
      setScanSpeed(counter);
      if (counter >= 100) {
        clearInterval(interval);
        setIsScanningActive(false);
        setScanSpeed(0);
        handleDecodedCode(barcode, 'Quick Scan');
      }
    }, 80);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-sm shadow-xs w-full max-w-2xl mx-auto relative overflow-hidden font-sans">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-600"></div>

      {/* Hidden temporary div for file scanning */}
      <div id="qr-barcode-file-scan-temp" className="hidden"></div>

      {/* Header */}
      <div className="text-center mb-4 w-full">
        <div className="flex items-center justify-center gap-2">
          <Barcode size={20} className="text-indigo-600" />
          <span className="text-slate-300 font-bold">|</span>
          <QrCode size={18} className="text-indigo-600" />
        </div>
        <h2 className="text-xs font-black text-slate-900 tracking-widest uppercase font-display mt-1.5 flex items-center justify-center gap-2">
          Barcode & QR Code Live Scanner
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {currentUser === 'Zohaib' 
            ? 'Scan 1D Product Barcodes and 2D QR Codes via camera or enter barcode manually'
            : 'Scan 1D Product Barcodes, 2D QR Codes via mobile camera, upload photo, or type serial numbers'}
        </p>
      </div>

      {/* Scanner Mode Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        {!isCameraActive ? (
          <button
            type="button"
            onClick={() => startCameraScanner()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-sm shadow-xs transition-all cursor-pointer font-display"
          >
            <Camera size={15} />
            <span>Open Camera Scanner (Barcode + QR)</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={stopCameraScanner}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-sm shadow-xs transition-colors cursor-pointer font-display"
            >
              <CameraOff size={14} />
              <span>Close Camera</span>
            </button>
            <button
              type="button"
              onClick={switchCameraFacing}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-sm border border-slate-300 cursor-pointer font-display"
              title="Switch Front / Back Camera"
            >
              <RefreshCw size={13} />
              <span>Flip Camera</span>
            </button>
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-sm border cursor-pointer font-display ${
                  torchOn
                    ? 'bg-amber-400 text-slate-900 border-amber-500 font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <Zap size={13} />
                <span>{torchOn ? 'Flash ON' : 'Flash'}</span>
              </button>
            )}
          </div>
        )}

        {/* Scan picture file option (hidden for Zohaib) */}
        {currentUser !== 'Zohaib' && (
          <label className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-sm border border-slate-300 cursor-pointer transition-colors font-display">
            <Upload size={14} />
            <span>Upload Image / Photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Camera permission error banner */}
      {cameraError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-sm text-xs flex items-center gap-2 font-display w-full">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Main Scanner Container */}
      <div className="relative w-full max-w-md min-h-[220px] bg-slate-950 rounded-sm border border-slate-800 flex flex-col items-center justify-center overflow-hidden group shadow-inner">
        {/* Reticle corner guides */}
        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-indigo-400 z-20 pointer-events-none"></div>
        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-indigo-400 z-20 pointer-events-none"></div>
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-indigo-400 z-20 pointer-events-none"></div>
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-indigo-400 z-20 pointer-events-none"></div>

        {/* HTML5 QR/Barcode Video Container */}
        <div
          id={scannerContainerId}
          className={`w-full h-full min-h-[220px] overflow-hidden ${
            isCameraActive ? 'block' : 'hidden'
          }`}
        ></div>

        {/* Live Laser & Scanning overlay when camera is active */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center">
            <div
              style={{ transform: `scale(${pulseScale})` }}
              className="w-full max-w-[85%] h-[2px] bg-red-500 shadow-[0_0_10px_#ef4444] transition-all"
            ></div>
            <div className="mt-4 flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-sm border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                Scanning 1D Barcode & 2D QR
              </span>
            </div>
          </div>
        )}

        {/* Simulated scanning state */}
        {!isCameraActive && isScanningActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-indigo-950/90 backdrop-blur-[0.5px] z-10 p-4">
            <div
              style={{ transform: `scale(${pulseScale})` }}
              className="w-64 h-[2px] bg-red-500 shadow-[0_0_10px_#ef4444] absolute transition-all"
            ></div>
            <div className="text-center z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 bg-slate-900 border border-indigo-500/50 px-3 py-1 rounded-sm animate-bounce font-display">
                Decoding Barcode / QR...
              </span>
              <div className="w-48 bg-slate-800 rounded-sm h-1.5 mt-3 mx-auto overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-sm transition-all duration-100"
                  style={{ width: `${scanSpeed}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Idle display when camera is off */}
        {!isCameraActive && !isScanningActive && (
          <div className="flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="flex items-center gap-3 text-slate-500 group-hover:text-indigo-400 transition-colors">
              <Barcode size={36} />
              <span className="text-slate-600 font-bold">+</span>
              <QrCode size={32} />
            </div>
            <p className="text-xs font-bold font-display uppercase text-slate-200 tracking-wider mt-3 group-hover:text-indigo-300 transition-colors">
              Ready to Scan Barcode & QR Code
            </p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[240px] italic">
              {currentUser === 'Zohaib'
                ? 'Tap "Open Camera Scanner" above or enter barcode manually below'
                : 'Tap "Open Camera Scanner" above, drag an image, or select a shortcut below'}
            </p>
          </div>
        )}
      </div>

      {/* Active notification message banner */}
      {scanMessage && (
        <div
          className={`mt-3 w-full text-center text-[11px] font-bold px-4 py-2.5 rounded-sm border uppercase tracking-wider font-display transition-all ${
            scanMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : scanMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}
        >
          {scanMessage.text}
        </div>
      )}

      {/* Admin Action Banner after Scanning */}
      {lastScannedCode && currentUser === 'Admin' && onOpenAddItemModal && (
        <div className="mt-3 w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-sm flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 bg-slate-800 rounded-sm text-indigo-400 border border-slate-700 shrink-0">
              <Barcode size={16} />
            </div>
            <div className="truncate">
              <span className="text-[9px] text-slate-400 font-mono block uppercase tracking-wider">Scanned Serial Code</span>
              <span className="text-xs font-black font-mono text-emerald-400 truncate block">{lastScannedCode}</span>
            </div>
          </div>
          <button
            type="button"
            id="admin-scanner-add-item-btn"
            onClick={() => onOpenAddItemModal(lastScannedCode)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-sm transition-all cursor-pointer font-display flex items-center gap-1.5 shadow-xs shrink-0"
            title="Create/Add item using scanned code"
          >
            <Plus size={13} />
            <span>Add Item</span>
          </button>
        </div>
      )}

      {/* Manual Search / Barcode Input Form with Live Matching Options */}
      <form onSubmit={handleManualSubmit} className="mt-5 w-full">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest font-display">
            Manual Barcode or QR Code Input
          </label>
          {manualInput.trim() && (
            <span className="text-[10px] text-indigo-600 font-bold font-mono">
              {matchingProducts.length} match{matchingProducts.length === 1 ? '' : 'es'} found
            </span>
          )}
        </div>

        <div className="relative flex gap-2" ref={inputContainerRef}>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Enter barcode, item name, or QR code..."
              value={manualInput}
              onFocus={() => setIsInputFocused(true)}
              onChange={(e) => {
                setManualInput(e.target.value);
                setIsInputFocused(true);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs text-slate-800 border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
            />

            {/* Matching Options Dropdown */}
            {isInputFocused && manualInput.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 shadow-xl rounded-sm z-30 max-h-72 overflow-y-auto animate-in fade-in duration-150">
                {matchingProducts.length > 0 ? (
                  <div>
                    <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-display">
                        Matching Items in Stock ({matchingProducts.length})
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        Click item to checkout
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {matchingProducts.map((p) => {
                        const isOutOfStock = p.quantity <= 0;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              onScanSuccess(p.barcode);
                              setManualInput('');
                              setIsInputFocused(false);
                              triggerBeep();
                              showTemporaryMessage(`Selected: ${p.name} (${p.brand})`, 'success');
                            }}
                            className="p-2.5 hover:bg-indigo-50/70 transition-colors cursor-pointer flex items-center justify-between gap-2 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900 truncate font-sans">
                                  {p.name}
                                </span>
                                {p.brand && (
                                  <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-xs uppercase font-display">
                                    {p.brand}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                                <span className="flex items-center gap-0.5 text-indigo-600 font-bold">
                                  <Barcode size={11} /> {p.barcode}
                                </span>
                                <span>•</span>
                                <span className="text-slate-600 font-sans font-bold">
                                  ${p.customerPrice.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-sm border ${
                                  isOutOfStock
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {isOutOfStock ? '0 Left' : `${p.quantity} Stock`}
                              </span>
                              <button
                                type="button"
                                className="bg-slate-900 hover:bg-indigo-650 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm cursor-pointer font-display flex items-center gap-1 transition-colors"
                              >
                                <span>Select</span>
                                <ChevronRight size={11} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center">
                    <p className="text-xs text-slate-500 font-sans">
                      No matching item found for <span className="font-mono font-bold text-slate-800">"{manualInput}"</span>
                    </p>
                    {(currentUser === 'Admin' || currentUser === 'Shoaib') && onOpenAddItemModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenAddItemModal(manualInput.trim());
                          setIsInputFocused(false);
                        }}
                        className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-sm font-display uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus size={12} />
                        <span>Add "{manualInput.trim()}" as New Item</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="bg-slate-900 hover:bg-indigo-650 text-white text-[11px] font-black uppercase tracking-wider px-4 py-2 rounded-sm cursor-pointer shadow-xs active:scale-97 transition-all font-display"
          >
            Find & Checkout
          </button>
          {currentUser === 'Admin' && onOpenAddItemModal && (
            <button
              type="button"
              id="admin-form-add-item-btn"
              onClick={() => {
                const code = manualInput.trim() || lastScannedCode || '';
                onOpenAddItemModal(code);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-2 rounded-sm cursor-pointer shadow-xs active:scale-97 transition-all font-display flex items-center gap-1 shrink-0"
              title="Add new item with barcode"
            >
              <Plus size={13} />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </form>

      {/* Quick shortcuts (Hidden for Zohaib profile) */}
      {currentUser !== 'Zohaib' && (
        <div className="w-full mt-5 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-display">
              Quick Scan Shortcuts ({products.length} Products):
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Click to test scan & checkout
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {products.slice(0, 15).map((p) => {
              const isOutOfStock = p.quantity <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isScanningActive}
                  onClick={() => simulateQuickScan(p.barcode)}
                  className={`flex items-center justify-between p-2 rounded-sm text-left border cursor-pointer transition-all ${
                    isOutOfStock
                      ? 'bg-red-50/40 border-red-200 text-slate-400 opacity-60 text-[10px]'
                      : 'bg-slate-50 hover:bg-indigo-50/50 border-slate-200 hover:border-indigo-300 text-slate-800 text-[10px]'
                  }`}
                >
                  <div className="overflow-hidden pr-1">
                    <span className="font-bold block tracking-tight text-slate-900 truncate">
                      {p.name}
                    </span>
                    <span className="font-mono text-[9px] text-slate-500 block truncate">
                      Code: {p.barcode}
                    </span>
                  </div>
                  <div className="shrink-0">
                    <span className="text-[9px] font-bold font-mono bg-white border border-slate-200 text-indigo-600 px-1 py-0.5 rounded-sm">
                      {p.quantity}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
