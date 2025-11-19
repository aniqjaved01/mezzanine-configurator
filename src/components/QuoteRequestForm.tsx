import { useState, FormEvent, ChangeEvent } from 'react';
import type { MezzanineConfig, Pricing, QuoteRequest, LoadCapacity } from '../types';
import { submitQuoteRequest } from '../services/api';

interface QuoteRequestFormProps {
  config: MezzanineConfig;
  pricing: Pricing;
  onClose: () => void;
}

export default function QuoteRequestForm({ config, pricing, onClose }: QuoteRequestFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    telephone: '',
    note: '',
    postalCode: '',
    installation: false,
  });
  const [pictures, setPictures] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((file) => {
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        return validTypes.includes(file.type);
      });
      setPictures(files);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setSubmitStatus({ success: false, message: 'Name is required' });
      return false;
    }
    if (!formData.email.trim()) {
      setSubmitStatus({ success: false, message: 'Email is required' });
      return false;
    }
    if (!formData.telephone.trim()) {
      setSubmitStatus({ success: false, message: 'Telephone is required' });
      return false;
    }
    if (!formData.postalCode.trim()) {
      setSubmitStatus({ success: false, message: 'Postal code is required' });
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setSubmitStatus({ success: false, message: 'Invalid email format' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    // Determine which accessories are selected
    const hasStairs = config.accessories.some((a) => a.type === 'stairs');
    const hasRailings = config.accessories.some((a) => a.type === 'railings');
    const hasPalletGate = config.accessories.some((a) => a.type === 'palletGate');

    const quoteRequest: QuoteRequest = {
      name: formData.name,
      companyName: formData.companyName,
      email: formData.email,
      telephone: formData.telephone,
      pictures: pictures.length > 0 ? pictures : undefined,
      note: formData.note || undefined,
      dimensions: {
        length: config.length / 1000, // Convert to meters for display
        width: config.width / 1000,
        height: config.height / 1000,
      },
      load: config.loadCapacity,
      accessories: {
        stairs: hasStairs,
        railings: hasRailings,
        palletGate: hasPalletGate,
        installation: formData.installation,
      },
      postalCode: formData.postalCode,
      pricing,
    };

    try {
      const response = await submitQuoteRequest(quoteRequest);
      setSubmitStatus({
        success: response.success,
        message: response.message,
      });
      if (response.success) {
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      setSubmitStatus({
        success: false,
        message: 'An error occurred while submitting the request',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Price request</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telephone number
                </label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
            </div>

            {/* Pictures */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pictures
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple
                onChange={handleFileChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Feel free to upload a sketch or drawing. File types allowed: JPG, PNG and PDF
              </p>
            </div>

            {/* Pricing Information Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pricing Information
              </label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm max-h-32 overflow-y-auto">
                <div>Total, freely delivered Oslo, unassembled: {pricing.totalPrice.toLocaleString()} excl. VAT</div>
                <div>Price per square meter: {pricing.pricePerSquareMeter.toLocaleString()} excl. VAT</div>
                <div className="mt-2">Example leasing</div>
                <div>3 years: {pricing.leasing3Years.toLocaleString()} excl. VAT</div>
                <div>5 years: {pricing.leasing5Years.toLocaleString()} excl. VAT</div>
              </div>
            </div>

            {/* Note/Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note / Message
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length
                </label>
                <input
                  type="number"
                  value={(config.length / 1000).toFixed(1)}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Enter total length in meters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width
                </label>
                <input
                  type="number"
                  value={(config.width / 1000).toFixed(1)}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Enter total width in meters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height top floor
                </label>
                <input
                  type="number"
                  value={(config.height / 1000).toFixed(1)}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Enter total height above floor in meters</p>
              </div>
            </div>

            {/* Load */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Load
              </label>
              <select
                value={config.loadCapacity}
                readOnly
                className="w-full p-2 border border-gray-300 rounded bg-gray-100"
              >
                <option value={250}>250 kg/m²</option>
                <option value={350}>350 kg/m²</option>
                <option value={500}>500 kg/m²</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Select the desired load in kg/m²</p>
            </div>

            {/* Accessories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accessories
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.accessories.some((a) => a.type === 'stairs')}
                    readOnly
                    className="mr-2"
                  />
                  <span>Stairs</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.accessories.some((a) => a.type === 'railings')}
                    readOnly
                    className="mr-2"
                  />
                  <span>Railings</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.accessories.some((a) => a.type === 'palletGate')}
                    readOnly
                    className="mr-2"
                  />
                  <span>Pallet gate</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="installation"
                    checked={formData.installation}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span>Want a price for installation</span>
                </label>
              </div>
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal code
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                To calculate shipping we need your zip code.
              </p>
            </div>

            {/* Submit Status */}
            {submitStatus && (
              <div
                className={`p-3 rounded ${
                  submitStatus.success
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {submitStatus.message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded transition-colors"
            >
              {isSubmitting ? 'Sending...' : 'SEND MESSAGE'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

