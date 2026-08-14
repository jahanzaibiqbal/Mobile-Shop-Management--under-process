import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product } from '../types';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuthListener = (
  onSuccess: (user: User, token: string) => void,
  onFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onFailure();
      }
    } else {
      cachedAccessToken = null;
      onFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain access token for Google Sheets.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err) {
    console.error('Google Sign In Error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const DEFAULT_SPREADSHEET_ID = '1BYmtX-0CgXO6xaEa_O1GSAO1ol7qDfnEMJ_arbnMmYY';

export const SHEET_HEADERS = [
  'ID',
  'Barcode',
  'Name',
  'Brand',
  'Model Name',
  'Cost Price (PKR)',
  'Customer Price (PKR)',
  'Wholesale Price (PKR)',
  'Quantity',
  'Min Quantity',
  'Discount 1 (PKR)',
  'Final Discount (PKR)',
  'Picture URL'
];

/**
 * Fetch rows from Google Sheet
 */
export async function fetchSheetProducts(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  range: string = 'Sheet1!A1:Z500'
): Promise<Product[]> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in with Google first.');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch sheet data (Status ${res.status})`);
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  
  const getColIdx = (colNames: string[], defaultIdx: number) => {
    const idx = headers.findIndex(h => colNames.some(cn => h.includes(cn)));
    return idx !== -1 ? idx : defaultIdx;
  };

  const idIdx = getColIdx(['id'], 0);
  const barcodeIdx = getColIdx(['barcode', 'code', 'qr'], 1);
  const nameIdx = getColIdx(['name', 'item', 'title', 'product'], 2);
  const brandIdx = getColIdx(['brand', 'manufacturer'], 3);
  const modelIdx = getColIdx(['model'], 4);
  const costIdx = getColIdx(['cost'], 5);
  const custIdx = getColIdx(['customer', 'retail', 'price'], 6);
  const wsIdx = getColIdx(['wholesale', 'shopkeeper'], 7);
  const qtyIdx = getColIdx(['quantity', 'qty', 'stock'], 8);
  const minQtyIdx = getColIdx(['min', 'low'], 9);
  const disc1Idx = getColIdx(['discount 1', 'disc 1', 'discount', 'discounts'], 10);
  const finalDiscIdx = getColIdx(['final discount', 'final disc'], 11);
  const imgIdx = getColIdx(['picture', 'image', 'photo', 'img', 'url'], 12);

  const products: Product[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[nameIdx]) continue;

    const parseNum = (val: any, fallback: number) => {
      const parsed = parseFloat(String(val || '').replace(/[^0-9.-]+/g, ''));
      return isNaN(parsed) ? fallback : parsed;
    };

    const d1 = parseNum(row[disc1Idx], 5);
    const dFinal = row[finalDiscIdx] !== undefined ? parseNum(row[finalDiscIdx], 10) : 10;
    const imageUrl = row[imgIdx] ? String(row[imgIdx]).trim() : undefined;

    products.push({
      id: String(row[idIdx] || `sheet-prod-${i}-${Date.now()}`),
      barcode: String(row[barcodeIdx] || `100${i}`),
      name: String(row[nameIdx] || `Product ${i}`),
      brand: String(row[brandIdx] || 'Generic'),
      modelName: String(row[modelIdx] || 'Standard'),
      costPrice: parseNum(row[costIdx], 100),
      customerPrice: parseNum(row[custIdx], 150),
      wholesalePrice: parseNum(row[wsIdx], 120),
      quantity: Math.max(0, Math.floor(parseNum(row[qtyIdx], 10))),
      minQuantity: Math.max(1, Math.floor(parseNum(row[minQtyIdx], 2))),
      discounts: [d1, dFinal],
      imageUrl: imageUrl && imageUrl.startsWith('http') ? imageUrl : undefined
    });
  }

  return products;
}

/**
 * Write/Overwrite products list to Google Sheet
 */
export async function writeSheetProducts(
  products: Product[],
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  sheetName: string = 'Sheet1'
): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in with Google first.');
  }

  const values = [
    SHEET_HEADERS,
    ...products.map(p => [
      p.id,
      p.barcode,
      p.name,
      p.brand,
      p.modelName,
      p.costPrice,
      p.customerPrice,
      p.wholesalePrice,
      p.quantity,
      p.minQuantity,
      p.discounts && p.discounts.length > 0 ? p.discounts[0] : 5,
      p.discounts && p.discounts.length > 1 ? p.discounts[1] : 10,
      p.imageUrl && p.imageUrl.startsWith('http') ? p.imageUrl : ''
    ])
  ];

  const range = `${sheetName}!A1:M${values.length + 5}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to update sheet (Status ${res.status})`);
  }
}
