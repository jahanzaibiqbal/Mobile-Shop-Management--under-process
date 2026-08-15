export type UserRole = 'Admin' | 'Zohaib' | 'Shoaib';

export interface Product {
  id: string;
  barcode: string;           // Primary Barcode / Barcode 1
  barcodes?: string[];       // Barcodes 1 to 10 for the same item
  name: string;
  brand: string;
  modelName: string;
  costPrice: number;       // The original purchase cost by the shop in PKR
  customerPrice: number;   // Retail price for normal customers in PKR
  wholesalePrice: number;  // Wholesale price for other shopkeepers in PKR
  quantity: number;        // Stock count
  minQuantity: number;     // Trigger warning for low stock
  discounts: number[];     // [Discount 1, Final Discount] simple discount amounts in PKR
  imageUrl?: string;       // Picture of the product (base64 data URL or external URL)
}

export interface SaleLog {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  buyerType: 'customer' | 'shopkeeper';
  unitPrice: number;
  costPrice?: number;      // Snapshot cost price for accurate profit ledger
  discountApplied: number; // simple discount amount in PKR
  finalPrice: number;      // total transaction price
  quantity: number;
  date: string;
  soldBy: UserRole;
  customerPhone?: string;  // For notifications
}

export interface NotificationLog {
  id: string;
  type: 'SMS' | 'Alert' | 'System';
  recipient: string;
  message: string;
  date: string;
  status: 'sent' | 'pending';
}
