import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { 
  initAuthListener, 
  googleSignIn, 
  googleSignOut, 
  fetchSheetProducts, 
  writeSheetProducts, 
  DEFAULT_SPREADSHEET_ID 
} from '../lib/googleSheets';
import { User } from 'firebase/auth';
import { FileSpreadsheet, RefreshCw, UploadCloud, DownloadCloud, LogIn, LogOut, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface GoogleSheetsSyncProps {
  products: Product[];
  onImportProducts: (newProducts: Product[]) => void;
  triggerToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({
  products,
  onImportProducts,
  triggerToast
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(DEFAULT_SPREADSHEET_ID);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAutoSync, setIsAutoSync] = useState(true);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'export' | 'import' | null;
  }>({ isOpen: false, type: null });

  useEffect(() => {
    const unsubscribe = initAuthListener(
      (u, token) => {
        setUser(u);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time automatic sync on inventory state mutation
  useEffect(() => {
    if (!user || !accessToken || !isAutoSync) return;

    const timer = setTimeout(async () => {
      try {
        setSyncStatus('syncing');
        await writeSheetProducts(products, spreadsheetId);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSyncedTime(timeStr);
        setSyncStatus('success');
      } catch (err) {
        console.error('Auto live-sync failed:', err);
        setSyncStatus('error');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [products, user, accessToken, isAutoSync, spreadsheetId]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        triggerToast('Connected to Google Sheets successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      triggerToast(err.message || 'Google Sign In failed.', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setAccessToken(null);
      triggerToast('Signed out from Google Sheets.', 'info');
    } catch (err: any) {
      triggerToast('Sign out failed.', 'error');
    }
  };

  const executeExportToSheet = async () => {
    if (!accessToken) {
      triggerToast('Please sign in with Google first.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      await writeSheetProducts(products, spreadsheetId);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedTime(timeStr);
      triggerToast(`Successfully exported ${products.length} inventory items to Google Sheet!`, 'success');
    } catch (err: any) {
      console.error('Export failed:', err);
      triggerToast(err.message || 'Failed to export inventory to Google Sheet.', 'error');
    } finally {
      setIsSyncing(false);
      setConfirmModal({ isOpen: false, type: null });
    }
  };

  const executeImportFromSheet = async () => {
    if (!accessToken) {
      triggerToast('Please sign in with Google first.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const imported = await fetchSheetProducts(spreadsheetId);
      if (imported.length === 0) {
        triggerToast('No valid inventory rows found in Google Sheet.', 'info');
      } else {
        onImportProducts(imported);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedTime(timeStr);
        triggerToast(`Successfully imported ${imported.length} items from Google Sheet!`, 'success');
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      triggerToast(err.message || 'Failed to import inventory from Google Sheet.', 'error');
    } finally {
      setIsSyncing(false);
      setConfirmModal({ isOpen: false, type: null });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs mb-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-150">
        
        {/* Header Title */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest font-display flex items-center gap-2">
              Google Sheets Live Inventory Sync
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sync catalogue stock rates and items directly with your linked Google Sheet
            </p>
          </div>
        </div>

        {/* User Auth Status / Sign In Button */}
        <div>
          {!user ? (
            <button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="gsi-material-button flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-sm font-display text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-800 font-display">{user.displayName || user.email}</span>
                <span className="text-[10px] text-emerald-600 font-mono flex items-center justify-end gap-1">
                  <CheckCircle2 size={10} /> Connected
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out from Google account"
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-sm cursor-pointer transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sheet Configuration & Operations */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        
        {/* Spreadsheet ID Input */}
        <div className="md:col-span-1">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 font-display">
            Target Google Sheet ID
          </label>
          <div className="relative">
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value.trim())}
              placeholder="Google Spreadsheet ID"
              className="w-full text-xs font-mono border border-slate-250 bg-slate-50 rounded-sm pl-2.5 pr-8 py-2 text-slate-800"
            />
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Google Sheet in new tab"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Sync Operations & Auto-Sync Toggle */}
        <div className="md:col-span-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 p-2 rounded-sm">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAutoSync}
                onChange={(e) => setIsAutoSync(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-xs border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 font-display">
                Auto Live-Sync
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                (Syncs sales & stock changes instantly)
              </span>
            </label>

            <div className="flex items-center gap-2">
              {syncStatus === 'syncing' && (
                <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 font-mono font-bold px-2 py-0.5 rounded-sm flex items-center gap-1">
                  <RefreshCw size={11} className="animate-spin" /> Live Syncing...
                </span>
              )}
              {syncStatus === 'success' && lastSyncedTime && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-mono font-bold px-2 py-0.5 rounded-sm flex items-center gap-1">
                  <CheckCircle2 size={11} /> Live Synced: {lastSyncedTime}
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 font-mono font-bold px-2 py-0.5 rounded-sm flex items-center gap-1">
                  <AlertCircle size={11} /> Sync Retry Pending
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export to Sheet */}
            <button
              onClick={() => setConfirmModal({ isOpen: true, type: 'export' })}
              disabled={!user || isSyncing}
              className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm cursor-pointer flex items-center justify-center gap-1.5 transition-colors font-display shadow-xs"
            >
              <UploadCloud size={14} />
              <span>Manual Export</span>
            </button>

            {/* Import from Sheet */}
            <button
              onClick={() => setConfirmModal({ isOpen: true, type: 'import' })}
              disabled={!user || isSyncing}
              className="flex-1 min-w-[140px] bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm cursor-pointer flex items-center justify-center gap-1.5 transition-colors font-display shadow-xs"
            >
              <DownloadCloud size={14} />
              <span>Manual Import</span>
            </button>
          </div>
        </div>
      </div>

      {!user && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-sm mt-3 flex items-center gap-1.5">
          <AlertCircle size={13} className="shrink-0" />
          <span>Please click <strong>Sign in with Google</strong> above to enable live sync with Google Sheets.</span>
        </p>
      )}

      {/* User Confirmation Dialog for Sheet Mutation */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm shadow-xl border border-slate-200 max-w-md w-full p-5 text-left font-sans animate-in fade-in zoom-in-95 duration-100">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest font-display flex items-center gap-2 mb-2">
              <AlertCircle className="text-emerald-600" size={16} />
              Confirm Google Sheets Operation
            </h4>
            
            {confirmModal.type === 'export' ? (
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                You are about to write <strong>{products.length} local inventory items</strong> to Google Sheet (ID: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px] text-slate-800">{spreadsheetId}</code>). This will update sheet headers and row data.
              </p>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                You are about to fetch inventory rows from Google Sheet (ID: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px] text-slate-800">{spreadsheetId}</code>) and update your local store catalogue.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, type: null })}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-sm uppercase tracking-wider font-display cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.type === 'export' ? executeExportToSheet : executeImportFromSheet}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-sm uppercase tracking-wider font-display cursor-pointer shadow-xs"
              >
                {confirmModal.type === 'export' ? 'Confirm Export' : 'Confirm Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
