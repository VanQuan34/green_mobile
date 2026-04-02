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
