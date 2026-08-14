import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  X, 
  Upload, 
  RefreshCw, 
  Check, 
  QrCode, 
  Barcode, 
  AlertCircle 
} from 'lucide-react';

interface QrCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  title?: string;
  subtitle?: string;
}

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan QR Code or Barcode',
  subtitle = 'Point your camera at a QR code or barcode to scan and auto-fill'
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerElementId = 'qr-modal-scanner-viewport';

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
      // Audio context restricted or unavailable
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch {
        // Ignore stop errors
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  const startScanner = async (facing: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    setScannedResult(null);
    setCameraActive(true);

    setTimeout(async () => {
      try {
        await stopScanner();

        const container = document.getElementById(scannerElementId);
        if (!container) return;

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

        const qrScanner = new Html5Qrcode(scannerElementId, {
          formatsToSupport,
          verbose: false
        });
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minEdge * 0.85),
              height: Math.floor(minEdge * 0.75)
            };
          },
          aspectRatio: 1.333334
        };

        await qrScanner.start(
          { facingMode: facing },
          config,
          (decodedText) => {
            const clean = decodedText.trim();
            if (clean) {
              triggerBeep();
              setScannedResult(clean);
              stopScanner();
              onScan(clean);
              setTimeout(() => {
                onClose();
              }, 400);
            }
          },
          () => {
            // Frame search
          }
        );
        setCameraActive(true);
      } catch (err: any) {
        console.error('Camera QR scanner error:', err);
        setCameraError(
          err?.message || 'Unable to access camera. Please check browser permissions or upload an image file.'
        );
        setCameraActive(false);
      }
    }, 150);
  };

  const handleFlipCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (cameraActive) {
      startScanner(nextFacing);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await stopScanner();
      const qrScanner = new Html5Qrcode(scannerElementId, { verbose: false });
      const decodedText = await qrScanner.scanFile(file, true);
      const clean = decodedText.trim();
      if (clean) {
        triggerBeep();
        setScannedResult(clean);
        onScan(clean);
        setTimeout(() => {
          onClose();
        }, 400);
      }
    } catch {
      setCameraError('Could not detect a valid QR code or barcode in this image. Please try a clearer photo.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (clean) {
      triggerBeep();
      onScan(clean);
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setCameraError(null);
      setManualCode('');
      startScanner('environment');
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-150 text-left">
      <div className="bg-white rounded-sm shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-indigo-400" />
            <div>
              <h4 className="font-display font-black text-xs uppercase tracking-widest text-white">
                {title}
              </h4>
              <p className="text-[10px] text-slate-400 font-sans">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-sm cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scanner Viewport Area */}
        <div className="p-4 space-y-3">
          
          {/* Camera Frame Container */}
          <div className="relative bg-slate-950 rounded-sm overflow-hidden min-h-[220px] max-h-[280px] flex items-center justify-center border border-slate-800">
            
            {/* Viewport canvas */}
            <div id={scannerElementId} className="w-full h-full" />

            {/* Overlay if not active */}
            {!cameraActive && !scannedResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-900/90 text-slate-300">
                <Camera size={36} className="text-slate-500 mb-2" />
                <p className="text-xs font-bold text-slate-200 font-display uppercase tracking-wider">
                  Camera Inactive
                </p>
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-sm cursor-pointer font-display uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Camera size={13} />
                  <span>Start Camera</span>
                </button>
              </div>
            )}

            {/* Scanned Result Flash */}
            {scannedResult && (
              <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-4 text-center z-20 animate-in fade-in">
                <Check size={40} className="text-emerald-400 mb-2" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 font-display">
                  Code Scanned Successfully!
                </span>
                <span className="text-sm font-black font-mono text-white mt-1 bg-emerald-900/80 border border-emerald-500 px-3 py-1 rounded-sm">
                  {scannedResult}
                </span>
              </div>
            )}
          </div>

          {/* Camera Error Message */}
          {cameraError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm flex items-start gap-2 font-sans">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-sm border border-slate-300 font-display font-bold flex items-center gap-1 cursor-pointer"
                >
                  <CameraOff size={13} />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-sm border border-indigo-200 font-display font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Camera size={13} />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleFlipCamera}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-sm border border-slate-300 font-display font-bold flex items-center gap-1 cursor-pointer"
                title="Switch between front and rear cameras"
              >
                <RefreshCw size={13} />
                <span>Flip</span>
              </button>
            </div>

            {/* Photo Upload Option */}
            <label className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-sm border border-slate-300 font-display font-bold flex items-center gap-1 cursor-pointer">
              <Upload size={13} />
              <span>Upload Photo</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualConfirm} className="pt-2 border-t border-slate-200">
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 font-display">
              Or Type Code Manually:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter serial / barcode number..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 text-xs font-mono font-bold px-3 py-1.5 border border-slate-300 rounded-sm bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-slate-900 hover:bg-indigo-650 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-sm cursor-pointer font-display uppercase tracking-wider"
              >
                Use Code
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
