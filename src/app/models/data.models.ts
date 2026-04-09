export interface Product {
  id: string;
  stt?: number;
  image: string;
  name: string;
  imei: string;
  capacity: string;
  color: string;
  status: string;
  originalPrice: number;
  sellingPrice: number;
  sale?: boolean;
  purchaseDate?: Date | string;
  amountPaid?: number;
  debt?: number;
}

export interface Invoice {
  id: string;
  buyerName: string;
  buyerAddress: string;
  buyerPhone: string;
  
  // New: Multiple products
  products?: Product[]; 
  totalAmount: number;

  // Legacy (Keep for backward compatibility for now)
  productId?: string;
  productName?: string;
  productPrice?: number;
  
  amountPaid: number;
  debt: number;
  isFullyPaid: boolean;
  createdAt: Date;
}

export interface MediaItem {
  id: string;
  url: string;
  thumbnail: string;
  name: string;
  date: string;
}

export interface DashboardStats {
  soldCount: number;
  inventoryCount: number;
  totalRevenue: number;
  totalPaid: number;
  totalDebt: number;
  totalCapital: number;
  totalExpectedRevenue: number;
}

export interface Customer {
  p_id: number;
  name: string;
  phone: string;
  address: string;
}

