import { describe, it, expect } from 'vitest';
import { calculatePricing, calculateSquareMeters } from './pricing';
import type { MezzanineConfig } from '../types';

describe('pricing', () => {
  describe('calculateSquareMeters', () => {
    it('should calculate square meters correctly', () => {
      expect(calculateSquareMeters(10000, 5000)).toBe(50); // 10m × 5m = 50 m²
      expect(calculateSquareMeters(9400, 4000)).toBeCloseTo(37.6, 1);
    });
  });

  describe('calculatePricing', () => {
    it('should calculate pricing for basic configuration', () => {
      const config: MezzanineConfig = {
        length: 9400,
        width: 4000,
        height: 3000,
        loadCapacity: 250,
        accessories: [],
      };

      const pricing = calculatePricing(config);

      expect(pricing.basePrice).toBeGreaterThan(0);
      expect(pricing.dimensionPrice).toBeGreaterThan(0);
      expect(pricing.totalPrice).toBeGreaterThan(0);
      expect(pricing.squareMeters).toBeCloseTo(37.6, 1);
      expect(pricing.pricePerSquareMeter).toBeGreaterThan(0);
    });

    it('should apply load capacity multiplier correctly', () => {
      const baseConfig: MezzanineConfig = {
        length: 10000,
        width: 5000,
        height: 3000,
        loadCapacity: 250,
        accessories: [],
      };

      const config350: MezzanineConfig = { ...baseConfig, loadCapacity: 350 };
      const config500: MezzanineConfig = { ...baseConfig, loadCapacity: 500 };

      const pricing250 = calculatePricing(baseConfig);
      const pricing350 = calculatePricing(config350);
      const pricing500 = calculatePricing(config500);

      // 350KG should be more expensive than 250KG
      expect(pricing350.totalPrice).toBeGreaterThan(pricing250.totalPrice);
      // 500KG should be more expensive than 350KG
      expect(pricing500.totalPrice).toBeGreaterThan(pricing350.totalPrice);
    });

    it('should calculate accessories pricing', () => {
      const config: MezzanineConfig = {
        length: 10000,
        width: 5000,
        height: 3000,
        loadCapacity: 250,
        accessories: [
          {
            id: 'stairs-1',
            type: 'stairs',
            quantity: 1,
            stairType: 'Straight 1m',
          },
          {
            id: 'railings-1',
            type: 'railings',
            quantity: 1,
            length: 20,
          },
          {
            id: 'palletGate-1',
            type: 'palletGate',
            quantity: 1,
            width: '2000mm',
          },
        ],
      };

      const pricing = calculatePricing(config);

      expect(pricing.accessoriesPrice).toBeGreaterThan(0);
      expect(pricing.totalPrice).toBeGreaterThan(pricing.basePrice + pricing.dimensionPrice);
    });

    it('should calculate leasing prices', () => {
      const config: MezzanineConfig = {
        length: 10000,
        width: 5000,
        height: 3000,
        loadCapacity: 250,
        accessories: [],
      };

      const pricing = calculatePricing(config);

      expect(pricing.leasing3Years).toBeGreaterThan(0);
      expect(pricing.leasing5Years).toBeGreaterThan(0);
      // 5 years should have lower monthly payment than 3 years
      expect(pricing.leasing5Years).toBeLessThan(pricing.leasing3Years);
    });

    it('should handle multiple quantities of accessories', () => {
      const config: MezzanineConfig = {
        length: 10000,
        width: 5000,
        height: 3000,
        loadCapacity: 250,
        accessories: [
          {
            id: 'stairs-1',
            type: 'stairs',
            quantity: 2,
            stairType: 'Straight 1m',
          },
        ],
      };

      const pricing = calculatePricing(config);

      const singleStairConfig: MezzanineConfig = {
        ...config,
        accessories: [
          {
            id: 'stairs-1',
            type: 'stairs',
            quantity: 1,
            stairType: 'Straight 1m',
          },
        ],
      };

      const singlePricing = calculatePricing(singleStairConfig);

      // Two stairs should cost more than one
      expect(pricing.accessoriesPrice).toBeGreaterThan(singlePricing.accessoriesPrice);
    });
  });
});

