export type LoadCapacity = 250 | 350 | 500;

export type StairType = 'Straight 1m' | 'Straight 1.5m' | 'Straight 2m';
export type PalletGateWidth = '2000mm' | '2500mm' | '3000mm';

export interface Accessory {
  id: string;
  type: 'stairs' | 'railings' | 'palletGate';
  quantity: number;
  // Stairs specific
  stairType?: StairType;
  // Railings specific
  length?: number; // in meters
  // Pallet gate specific
  width?: PalletGateWidth;
}

export interface MezzanineConfig {
  length: number; // in mm
  width: number; // in mm
  height: number; // in mm
  loadCapacity: LoadCapacity; // kg per m²
  accessories: Accessory[];
}

export interface Pricing {
  basePrice: number;
  dimensionPrice: number;
  loadPrice: number;
  accessoriesPrice: number;
  totalPrice: number;
  pricePerSquareMeter: number;
  squareMeters: number;
  leasing3Years: number;
  leasing5Years: number;
}

export interface QuoteRequest {
  name: string;
  companyName: string;
  email: string;
  telephone: string;
  pictures?: File[];
  note?: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  load: LoadCapacity;
  accessories: {
    stairs: boolean;
    railings: boolean;
    palletGate: boolean;
    installation: boolean;
  };
  postalCode: string;
  pricing: Pricing;
}

