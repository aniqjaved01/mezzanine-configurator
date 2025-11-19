import { describe, it, expect, vi } from 'vitest';
import { submitQuoteRequest } from './api';
import type { QuoteRequest } from '../types';

describe('api', () => {
  describe('submitQuoteRequest', () => {
    it('should return a response with success or failure', async () => {
      const quoteRequest: QuoteRequest = {
        name: 'Test User',
        companyName: 'Test Company',
        email: 'test@example.com',
        telephone: '123456789',
        dimensions: {
          length: 9.4,
          width: 4.0,
          height: 3.0,
        },
        load: 250,
        accessories: {
          stairs: true,
          railings: true,
          palletGate: false,
          installation: false,
        },
        postalCode: '1234',
        pricing: {
          basePrice: 50000,
          dimensionPrice: 10000,
          loadPrice: 0,
          accessoriesPrice: 15000,
          totalPrice: 75000,
          pricePerSquareMeter: 2000,
          squareMeters: 37.6,
          leasing3Years: 600,
          leasing5Years: 450,
        },
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const response = await submitQuoteRequest(quoteRequest);

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('message');
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.message).toBe('string');

      if (response.success) {
        expect(response.data).toBeDefined();
      }

      // Verify that the request was logged
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should simulate API delay', async () => {
      const quoteRequest: QuoteRequest = {
        name: 'Test User',
        companyName: 'Test Company',
        email: 'test@example.com',
        telephone: '123456789',
        dimensions: {
          length: 9.4,
          width: 4.0,
          height: 3.0,
        },
        load: 250,
        accessories: {
          stairs: false,
          railings: false,
          palletGate: false,
          installation: false,
        },
        postalCode: '1234',
        pricing: {
          basePrice: 50000,
          dimensionPrice: 10000,
          loadPrice: 0,
          accessoriesPrice: 0,
          totalPrice: 60000,
          pricePerSquareMeter: 1500,
          squareMeters: 37.6,
          leasing3Years: 500,
          leasing5Years: 350,
        },
      };

      const startTime = Date.now();
      await submitQuoteRequest(quoteRequest);
      const endTime = Date.now();

      // Should take at least 1500ms (with some tolerance)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1400);
    });
  });
});

