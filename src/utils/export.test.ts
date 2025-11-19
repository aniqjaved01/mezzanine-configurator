import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToCSV, exportToJSON } from './export';
import type { MezzanineConfig, Pricing } from '../types';

describe('export', () => {
  beforeEach(() => {
    // Mock document.createElement and related DOM methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Create a mock link element
    const mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
    };
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportToCSV', () => {
    it('should create and trigger CSV download', () => {
      const config: MezzanineConfig = {
        length: 9400,
        width: 4000,
        height: 3000,
        loadCapacity: 250,
        accessories: [],
      };

      const pricing: Pricing = {
        basePrice: 50000,
        dimensionPrice: 10000,
        loadPrice: 0,
        accessoriesPrice: 0,
        totalPrice: 60000,
        pricePerSquareMeter: 1500,
        squareMeters: 37.6,
        leasing3Years: 500,
        leasing5Years: 350,
      };

      exportToCSV(config, pricing);

      expect(document.createElement).toHaveBeenCalledWith('a');
      const linkElement = document.createElement('a') as any;
      expect(linkElement.setAttribute).toHaveBeenCalled();
      expect(linkElement.click).toHaveBeenCalled();
    });
  });

  describe('exportToJSON', () => {
    it('should create and trigger JSON download', () => {
      const config: MezzanineConfig = {
        length: 9400,
        width: 4000,
        height: 3000,
        loadCapacity: 250,
        accessories: [
          {
            id: 'stairs-1',
            type: 'stairs',
            quantity: 1,
            stairType: 'Straight 1m',
          },
        ],
      };

      const pricing: Pricing = {
        basePrice: 50000,
        dimensionPrice: 10000,
        loadPrice: 0,
        accessoriesPrice: 15000,
        totalPrice: 75000,
        pricePerSquareMeter: 2000,
        squareMeters: 37.6,
        leasing3Years: 600,
        leasing5Years: 450,
      };

      exportToJSON(config, pricing);

      expect(document.createElement).toHaveBeenCalledWith('a');
      const linkElement = document.createElement('a') as any;
      expect(linkElement.setAttribute).toHaveBeenCalled();
      expect(linkElement.click).toHaveBeenCalled();
    });
  });
});

