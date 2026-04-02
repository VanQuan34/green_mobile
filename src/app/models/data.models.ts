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
}

export interface Invoice {
  id: string;
  buyerName: string;
  buyerAddress: string;
  buyerPhone: string;
  productId: string;
  productName: string;
  productPrice: number;
  amountPaid: number;
  debt: number;
  isFullyPaid: boolean;
  createdAt: Date;
}
