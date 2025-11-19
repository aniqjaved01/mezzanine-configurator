import type { MezzanineConfig, Pricing } from '../types';

/**
 * Format number with English locale formatting
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format number with decimals
 */
function formatNumberWithDecimals(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Export configuration to CSV format
 */
export function exportToCSV(config: MezzanineConfig, pricing: Pricing): void {
  const rows: string[] = [];

  // Header
  rows.push('Mezzanine Configuration Export');
  rows.push('');

  // Dimensions
  rows.push('Dimensions');
  rows.push(`Length,${formatNumber(config.length)} mm`);
  rows.push(`Width,${formatNumber(config.width)} mm`);
  rows.push(`Height,${formatNumber(config.height)} mm`);
  rows.push(`Load Capacity,${config.loadCapacity} kg/m²`);
  rows.push(`Square Meters,${formatNumberWithDecimals(pricing.squareMeters, 1)} m²`);
  rows.push('');

  // Accessories
  rows.push('Accessories');
  if (config.accessories.length === 0) {
    rows.push('None');
  } else {
    rows.push('Type,Details,Quantity');
    for (const accessory of config.accessories) {
      let details = '';
      switch (accessory.type) {
        case 'stairs':
          details = accessory.stairType || 'Straight 1m';
          break;
        case 'railings':
          details = `${accessory.length || 0} meters`;
          break;
        case 'palletGate':
          details = accessory.width || '2000mm';
          break;
      }
      rows.push(`${accessory.type},${details},${accessory.quantity}`);
    }
  }
  rows.push('');

  // Pricing
  rows.push('Pricing');
  rows.push(`Base Price,${formatNumber(pricing.basePrice)}`);
  rows.push(`Dimension Price,${formatNumber(pricing.dimensionPrice)}`);
  rows.push(`Load Price,${formatNumber(pricing.loadPrice)}`);
  rows.push(`Accessories Price,${formatNumber(pricing.accessoriesPrice)}`);
  rows.push(`Total Price,${formatNumber(pricing.totalPrice)} excl. VAT`);
  rows.push(`Price per Square Meter,${formatNumber(pricing.pricePerSquareMeter)} excl. VAT`);
  rows.push(`Leasing 3 Years (monthly),${formatNumber(pricing.leasing3Years)} excl. VAT`);
  rows.push(`Leasing 5 Years (monthly),${formatNumber(pricing.leasing5Years)} excl. VAT`);

  // Create CSV content
  const csvContent = rows.join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `mezzanine-config-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export configuration to JSON format
 */
export function exportToJSON(config: MezzanineConfig, pricing: Pricing): void {
  const exportData = {
    config,
    pricing,
    exportedAt: new Date().toISOString(),
  };

  const jsonContent = JSON.stringify(exportData, null, 2);

  // Create blob and download
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `mezzanine-config-${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

