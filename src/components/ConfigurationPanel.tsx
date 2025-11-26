import type { MezzanineConfig, Accessory, LoadCapacity, StairType, PalletGateWidth } from '../types';

interface ConfigurationPanelProps {
  config: MezzanineConfig;
  onConfigChange: (config: MezzanineConfig) => void;
}

// Helper function to calculate perimeter in meters
const calculatePerimeter = (length: number, width: number): number => {
  return 2 * ((length / 1000) + (width / 1000));
};

// Helper function to calculate space occupied by stairs (each stair is 1m wide)
const calculateStairsSpace = (accessories: Accessory[]): number => {
  return accessories
    .filter(a => a.type === 'stairs')
    .reduce((sum, stair) => sum + (stair.quantity * 1.0), 0); // 1m per stair
};

// Helper function to calculate space occupied by pallet gates
const calculatePalletGatesSpace = (accessories: Accessory[]): number => {
  return accessories
    .filter(a => a.type === 'palletGate')
    .reduce((sum, gate) => {
      const gateWidth = parseFloat(gate.width || '2000mm') / 1000; // Convert mm to meters
      return sum + (gate.quantity * gateWidth);
    }, 0);
};

// Helper function to calculate total railing length used
const calculateTotalRailingLength = (accessories: Accessory[]): number => {
  return accessories
    .filter(a => a.type === 'railings')
    .reduce((sum, railing) => sum + (railing.quantity * (railing.length || 0)), 0);
};

// Helper function to calculate available perimeter for railings
const calculateAvailablePerimeter = (config: MezzanineConfig): number => {
  const perimeter = calculatePerimeter(config.length, config.width);
  const stairsSpace = calculateStairsSpace(config.accessories);
  const palletGatesSpace = calculatePalletGatesSpace(config.accessories);
  return Math.max(0, perimeter - stairsSpace - palletGatesSpace);
};

export default function ConfigurationPanel({ config, onConfigChange }: ConfigurationPanelProps) {
  const handleDimensionChange = (field: 'length' | 'width' | 'height', value: number) => {
    onConfigChange({ ...config, [field]: value });
  };

  const handleLoadChange = (load: LoadCapacity) => {
    onConfigChange({ ...config, loadCapacity: load });
  };

  const addAccessory = (type: 'stairs' | 'railings' | 'palletGate') => {
    // Check if adding railings would exceed available perimeter
    if (type === 'railings') {
      const availablePerimeter = calculateAvailablePerimeter(config);
      const currentRailingLength = calculateTotalRailingLength(config.accessories);
      const defaultLength = 10;
      
      if (currentRailingLength + defaultLength > availablePerimeter) {
        alert(`Cannot add more railings. Available perimeter: ${availablePerimeter.toFixed(2)}m, Current usage: ${currentRailingLength.toFixed(2)}m`);
        return;
      }
    }
    
    const newAccessory: Accessory = {
      id: `${type}-${Date.now()}`,
      type,
      quantity: 1,
      ...(type === 'stairs' && { stairType: 'Straight 1m' }),
      ...(type === 'railings' && { length: 10 }),
      ...(type === 'palletGate' && { width: '2000mm' }),
    };
    onConfigChange({
      ...config,
      accessories: [...config.accessories, newAccessory],
    });
  };

  const removeAccessory = (id: string) => {
    onConfigChange({
      ...config,
      accessories: config.accessories.filter((a) => a.id !== id),
    });
  };

  const updateAccessory = (id: string, updates: Partial<Accessory>) => {
    const accessory = config.accessories.find(a => a.id === id);
    if (!accessory) return;
    
    // If updating railings, validate against available perimeter
    if (accessory.type === 'railings') {
      const availablePerimeter = calculateAvailablePerimeter(config);
      
      // Calculate current total excluding this railing
      const otherRailingsLength = config.accessories
        .filter(a => a.type === 'railings' && a.id !== id)
        .reduce((sum, r) => sum + (r.quantity * (r.length || 0)), 0);
      
      // Calculate new length for this railing
      const newQuantity = updates.quantity !== undefined ? updates.quantity : accessory.quantity;
      const newLength = updates.length !== undefined ? updates.length : accessory.length || 0;
      const newTotalForThis = newQuantity * newLength;
      
      const totalRailingLength = otherRailingsLength + newTotalForThis;
      
      if (totalRailingLength > availablePerimeter) {
        alert(`Cannot update railings. Available perimeter: ${availablePerimeter.toFixed(2)}m, Requested total: ${totalRailingLength.toFixed(2)}m`);
        return;
      }
    }
    
    // If adding stairs or pallet gates, check if existing railings need adjustment
    if ((accessory.type === 'stairs' || accessory.type === 'palletGate') && updates.quantity !== undefined) {
      const newConfig = {
        ...config,
        accessories: config.accessories.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      };
      
      const newAvailablePerimeter = calculateAvailablePerimeter(newConfig);
      const currentRailingLength = calculateTotalRailingLength(newConfig.accessories);
      
      if (currentRailingLength > newAvailablePerimeter) {
        const excessRailing = currentRailingLength - newAvailablePerimeter;
        alert(`Warning: Adding this ${accessory.type} will exceed available perimeter by ${excessRailing.toFixed(2)}m. Please reduce railings first.`);
        return;
      }
    }
    
    onConfigChange({
      ...config,
      accessories: config.accessories.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6 h-full">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Adjust the target and load</h2>

      {/* Dimensions */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select length (mm): {config.length.toLocaleString()}
          </label>
            <input
            type="range"
            min="2000"
            max="20000"
            step="100"
            value={config.length}
            onChange={(e) => handleDimensionChange('length', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select width (mm): {config.width.toLocaleString()}
          </label>
            <input
            type="range"
            min="2000"
            max="20000"
            step="100"
            value={config.width}
            onChange={(e) => handleDimensionChange('width', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select height (mm): {config.height.toLocaleString()}
          </label>
            <input
            type="range"
            min="2000"
            max="6000"
            step="100"
            value={config.height}
            onChange={(e) => handleDimensionChange('height', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
        </div>
      </div>

      {/* Perimeter Information */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Perimeter Information</h4>
        <div className="text-xs space-y-1 text-blue-800">
          <div className="flex justify-between">
            <span>Total Perimeter:</span>
            <span className="font-medium">{calculatePerimeter(config.length, config.width).toFixed(2)}m</span>
          </div>
          <div className="flex justify-between">
            <span>Stairs Space:</span>
            <span className="font-medium">{calculateStairsSpace(config.accessories).toFixed(2)}m</span>
          </div>
          <div className="flex justify-between">
            <span>Pallet Gates Space:</span>
            <span className="font-medium">{calculatePalletGatesSpace(config.accessories).toFixed(2)}m</span>
          </div>
          <div className="flex justify-between">
            <span>Railings Used:</span>
            <span className="font-medium">{calculateTotalRailingLength(config.accessories).toFixed(2)}m</span>
          </div>
          <hr className="my-1 border-blue-300" />
          <div className="flex justify-between font-semibold">
            <span>Available for Railings:</span>
            <span className={calculateAvailablePerimeter(config) < calculateTotalRailingLength(config.accessories) ? 'text-red-600' : 'text-green-600'}>
              {calculateAvailablePerimeter(config).toFixed(2)}m
            </span>
          </div>
        </div>
      </div>

      {/* Load Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select load per m²
        </label>
        <div className="flex gap-2">
          {([250, 350, 500] as LoadCapacity[]).map((load) => (
            <button
              key={load}
              onClick={() => handleLoadChange(load)}
              className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
                config.loadCapacity === load
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {load}KG
            </button>
          ))}
        </div>
      </div>

      {/* Accessories */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add accessories</h3>
        
        <div className="space-y-3 mb-4">
          <button
            onClick={() => addAccessory('stairs')}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium"
          >
            + Add Stairs
          </button>
          <button
            onClick={() => addAccessory('railings')}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium"
          >
            + Add Railings
          </button>
          <button
            onClick={() => addAccessory('palletGate')}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium"
          >
            + Add Pallet Gate
          </button>
        </div>

        {/* Accessories List */}
        <div className="space-y-4">
          {config.accessories.map((accessory) => (
            <div key={accessory.id} className="border border-gray-200 rounded p-3 bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-gray-700 capitalize">
                  {accessory.type === 'palletGate' ? 'Pallet Gate' : accessory.type}
                </span>
                <button
                  onClick={() => removeAccessory(accessory.id)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  ×
                </button>
              </div>

              {accessory.type === 'stairs' && (
                <div className="space-y-2">
                  <select
                    value={accessory.stairType || 'Straight 1m'}
                    onChange={(e) =>
                      updateAccessory(accessory.id, { stairType: e.target.value as StairType })
                    }
                    className="w-full p-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="Straight 1m">Straight 1m</option>
                    <option value="Straight 1.5m">Straight 1.5m</option>
                    <option value="Straight 2m">Straight 2m</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateAccessory(accessory.id, {
                          quantity: Math.max(1, accessory.quantity - 1),
                        })
                      }
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center">{accessory.quantity}</span>
                    <button
                      onClick={() =>
                        updateAccessory(accessory.id, { quantity: accessory.quantity + 1 })
                      }
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {accessory.type === 'railings' && (
                <div className="space-y-2">
                  <input
                    type="number"
                    min="1"
                    value={accessory.length || 10}
                    onChange={(e) =>
                      updateAccessory(accessory.id, { length: parseFloat(e.target.value) })
                    }
                    className="w-full p-1 border border-gray-300 rounded text-sm"
                    placeholder="Length (meters)"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateAccessory(accessory.id, {
                          quantity: Math.max(1, accessory.quantity - 1),
                        })
                      }
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center">{accessory.quantity}</span>
                    <button
                      onClick={() =>
                        updateAccessory(accessory.id, { quantity: accessory.quantity + 1 })
                      }
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {accessory.type === 'palletGate' && (
                <div className="space-y-2">
                  <select
                    value={accessory.width || '2000mm'}
                    onChange={(e) =>
                      updateAccessory(accessory.id, { width: e.target.value as PalletGateWidth })
                    }
                    className="w-full p-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="2000mm">2000mm</option>
                    <option value="2500mm">2500mm</option>
                    <option value="3000mm">3000mm</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateAccessory(accessory.id, {
                          quantity: Math.max(1, accessory.quantity - 1),
                        })
                      }
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center">{accessory.quantity}</span>
                    <button
                      onClick={() =>
                        updateAccessory(accessory.id, { quantity: accessory.quantity + 1 })
                      }
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

