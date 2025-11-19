import type { MezzanineConfig, Pricing } from '../types';
import { exportToCSV, exportToJSON } from '../utils/export';

interface SummaryPanelProps {
  config: MezzanineConfig;
  pricing: Pricing;
  onRequestQuote: () => void;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatNumberWithDecimals(num: number, decimals: number = 1): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export default function SummaryPanel({ config, pricing, onRequestQuote }: SummaryPanelProps) {
  const handleExportCSV = () => {
    exportToCSV(config, pricing);
  };

  const handleExportJSON = () => {
    exportToJSON(config, pricing);
  };

  const getAccessoryDescription = (accessory: typeof config.accessories[0]): string => {
    switch (accessory.type) {
      case 'stairs':
        return `Stairs 38° H${config.height}xL3840xB1000mm`;
      case 'railings':
        return `Railings H1100mm with kick plate, ${accessory.length || 0} meters`;
      case 'palletGate':
        return `Pallet gate with spring-loaded doors, ${accessory.width || '2000mm'}`;
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6 h-full">
      {/* Dimensions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Dimensions</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Length:</span>
            <span className="font-medium">{formatNumber(config.length)} mm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Depth:</span>
            <span className="font-medium">{formatNumber(config.width)} mm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Height (top floor):</span>
            <span className="font-medium">{formatNumber(config.height)} mm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Load:</span>
            <span className="font-medium">{config.loadCapacity} kg/m²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Square meter:</span>
            <span className="font-medium">{formatNumberWithDecimals(pricing.squareMeters, 1)} m²</span>
          </div>
        </div>
      </div>

      {/* Accessories */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Accessories</h3>
        {config.accessories.length === 0 ? (
          <p className="text-sm text-gray-500">No accessories added</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {config.accessories.map((accessory) => (
              <li key={accessory.id} className="text-gray-700">
                {getAccessoryDescription(accessory)} {accessory.quantity > 1 && `(x${accessory.quantity})`}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pricing */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Prices</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total, freely delivered Oslo, unassembled:</span>
          </div>
          <div className="text-lg font-bold text-gray-800 mb-2">
            {formatNumber(pricing.totalPrice)} excl. VAT
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Price per square meter:</span>
            <span className="font-medium">{formatNumber(pricing.pricePerSquareMeter)} excl. VAT</span>
          </div>
          <div className="mt-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Example leasing:</div>
            <div className="space-y-1 pl-4">
              <div className="flex justify-between">
                <span className="text-gray-600">3 years:</span>
                <span className="font-medium">{formatNumber(pricing.leasing3Years)} excl. VAT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">5 years:</span>
                <span className="font-medium">{formatNumber(pricing.leasing5Years)} excl. VAT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleExportCSV}
          className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-medium transition-colors"
        >
          Export to CSV
        </button>
        <button
          onClick={handleExportJSON}
          className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-medium transition-colors"
        >
          Export to JSON
        </button>
      </div>

      {/* Quote Request Button */}
      <div>
        <p className="text-xs text-gray-500 mb-3">
          Prices are intended as an estimate and may vary from a specific solution.
        </p>
        <button
          onClick={onRequestQuote}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-colors"
        >
          REQUEST A QUOTE
        </button>
      </div>
    </div>
  );
}

