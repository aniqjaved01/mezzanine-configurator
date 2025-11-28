import type { MezzanineConfig, Pricing, Accessory } from '../types';

// Base pricing constants
const BASE_PRICE = 50000; // Base price in currency units
const PRICE_PER_SQUARE_METER_BASE = 2000; // Base price per m²
const DIMENSION_MULTIPLIER = 0.001; // Factor for dimension calculations

// Load capacity multipliers
const LOAD_MULTIPLIERS: Record<number, number> = {
  250: 1.0,
  350: 1.2,
  500: 1.5,
};

// Accessory base prices
const STAIRS_BASE_PRICE = 15000;
const CORNER_STAIRS_BASE_PRICE = 25000; // Corner stairs cost more (includes Repos platform)
const RAILING_PRICE_PER_METER = 800;
const PALLET_GATE_BASE_PRICE = 12000;

// Repos platform dimensions (fixed)
const REPOS_LENGTH = 3.0; // meters
const REPOS_DEPTH = 1.4; // meters
const REPOS_AREA = REPOS_LENGTH * REPOS_DEPTH; // 4.2 m²

// Leasing interest factors
const LEASING_3_YEARS_FACTOR = 0.029; // 2.9% annual interest
const LEASING_5_YEARS_FACTOR = 0.035; // 3.5% annual interest

/**
 * Calculate square meters from dimensions (including Repos if Corner stairs present)
 */
export function calculateSquareMeters(length: number, width: number, accessories: Accessory[] = []): number {
  let baseArea = (length * width) / 1000000; // Convert mm² to m²
  
  // Check if there's a Corner stair - if so, add Repos area
  const hasCornerStair = accessories.some(a => a.type === 'stairs' && a.stairType?.includes('Corner stairs'));
  if (hasCornerStair) {
    baseArea += REPOS_AREA;
  }
  
  return baseArea;
}

/**
 * Calculate dimension-based pricing
 */
function calculateDimensionPrice(length: number, width: number, height: number): number {
  const volume = (length * width * height) / 1000000000; // Convert mm³ to m³
  return volume * PRICE_PER_SQUARE_METER_BASE * DIMENSION_MULTIPLIER * 100;
}

/**
 * Calculate load capacity pricing multiplier
 */
function getLoadMultiplier(loadCapacity: number): number {
  return LOAD_MULTIPLIERS[loadCapacity] || 1.0;
}

/**
 * Calculate accessory pricing
 */
function calculateAccessoriesPrice(accessories: Accessory[]): number {
  let total = 0;

  for (const accessory of accessories) {
    switch (accessory.type) {
      case 'stairs': {
        // Check if it's a Corner stair
        const isCornerStair = accessory.stairType?.includes('Corner stairs');
        const stairPrice = isCornerStair ? CORNER_STAIRS_BASE_PRICE : STAIRS_BASE_PRICE;
        total += stairPrice * accessory.quantity;
        break;
      }
      case 'railings':
        if (accessory.length) {
          total += RAILING_PRICE_PER_METER * accessory.length * accessory.quantity;
        }
        break;
      case 'palletGate':
        total += PALLET_GATE_BASE_PRICE * accessory.quantity;
        break;
    }
  }

  return total;
}

/**
 * Calculate total pricing for a mezzanine configuration
 */
export function calculatePricing(config: MezzanineConfig): Pricing {
  const squareMeters = calculateSquareMeters(config.length, config.width, config.accessories);
  
  const basePrice = BASE_PRICE;
  const dimensionPrice = calculateDimensionPrice(config.length, config.width, config.height);
  const loadMultiplier = getLoadMultiplier(config.loadCapacity);
  const loadPrice = (basePrice + dimensionPrice) * (loadMultiplier - 1);
  const accessoriesPrice = calculateAccessoriesPrice(config.accessories);

  const totalPrice = (basePrice + dimensionPrice) * loadMultiplier + accessoriesPrice;
  const pricePerSquareMeter = squareMeters > 0 ? totalPrice / squareMeters : 0;

  // Leasing calculations (monthly payment)
  const leasing3Years = (totalPrice * LEASING_3_YEARS_FACTOR) / 36; // 36 months
  const leasing5Years = (totalPrice * LEASING_5_YEARS_FACTOR) / 60; // 60 months

  return {
    basePrice,
    dimensionPrice,
    loadPrice,
    accessoriesPrice,
    totalPrice,
    pricePerSquareMeter,
    squareMeters,
    leasing3Years,
    leasing5Years,
  };
}

