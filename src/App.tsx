import { useState, useMemo } from 'react';
import type { MezzanineConfig, Pricing } from './types';
import { calculatePricing } from './utils/pricing';
import { useLocalStorage } from './hooks/useLocalStorage';
import ConfigurationPanel from './components/ConfigurationPanel';
import MezzanineViewer from './components/MezzanineViewer';
import SummaryPanel from './components/SummaryPanel';
import QuoteRequestForm from './components/QuoteRequestForm';

const DEFAULT_CONFIG: MezzanineConfig = {
  length: 9400,
  width: 4000,
  height: 3000,
  loadCapacity: 250,
  accessories: [],
};

function App() {
  const [config, setConfig] = useLocalStorage<MezzanineConfig>('mezzanine-config', DEFAULT_CONFIG);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const pricing = useMemo(() => calculatePricing(config), [config]);

  const handleConfigChange = (newConfig: MezzanineConfig) => {
    setConfig(newConfig);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Mezzanine Configurator</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-3">
            <ConfigurationPanel config={config} onConfigChange={handleConfigChange} />
          </div>

          {/* Center Panel - 3D Viewer */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-lg shadow-md p-2 h-[600px]">
              <MezzanineViewer config={config} />
            </div>
          </div>

          {/* Right Panel - Summary */}
          <div className="lg:col-span-3">
            <SummaryPanel 
              config={config} 
              pricing={pricing} 
              onRequestQuote={() => setShowQuoteForm(true)} 
            />
          </div>
        </div>
      </div>

      {/* Quote Request Modal */}
      {showQuoteForm && (
        <QuoteRequestForm
          config={config}
          pricing={pricing}
          onClose={() => setShowQuoteForm(false)}
        />
      )}
    </div>
  );
}

export default App;
