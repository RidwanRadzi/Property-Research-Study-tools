import React, { useState } from 'react';
import { ComparableProperty, Layout } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';

interface CustomComparableFormProps {
  onSave: (property: Omit<ComparableProperty, 'id'>) => void;
  onClose: () => void;
}

const CustomComparableForm: React.FC<CustomComparableFormProps> = ({ onSave, onClose }) => {
  const [property, setProperty] = useState<Omit<ComparableProperty, 'id' | 'isCustom'>>({
    name: '',
    distanceKm: 0,
    yearOfCompletion: '',
    totalUnits: 0,
    tenure: 'Freehold',
    layouts: [{ id: crypto.randomUUID(), layoutType: '3 Bedrooms', sizeSqft: 1000, askingPrice: 500000, rentalPrice: 2000 }],
  });

  const handlePropertyChange = (field: keyof Omit<ComparableProperty, 'layouts'| 'id'>, value: string | number) => {
    setProperty(prev => ({ ...prev, [field]: value }));
  };

  const handleLayoutChange = (index: number, field: keyof Omit<Layout, 'id'>, value: string | number) => {
    const newLayouts = [...property.layouts];
    (newLayouts[index] as any)[field] = value;
    setProperty(prev => ({ ...prev, layouts: newLayouts }));
  };
  
  const addLayout = () => {
    setProperty(prev => ({
      ...prev,
      layouts: [...prev.layouts, { id: crypto.randomUUID(), layoutType: '', sizeSqft: 0, askingPrice: 0, rentalPrice: 0 }]
    }));
  };

  const removeLayout = (index: number) => {
    setProperty(prev => ({
        ...prev,
        layouts: prev.layouts.filter((_, i) => i !== index)
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(property);
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-[#700d1d] mb-6">Add Custom Comparable Property</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
              <Input type="text" value={property.name} onChange={e => handlePropertyChange('name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenure</label>
              <select value={property.tenure} onChange={e => handlePropertyChange('tenure', e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#700d1d] focus:border-[#700d1d]">
                  <option>Freehold</option>
                  <option>Leasehold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year of Completion</label>
              <Input type="text" value={property.yearOfCompletion} onChange={e => handlePropertyChange('yearOfCompletion', e.target.value)} placeholder="e.g., 2023 or n/a" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Units</label>
              <Input type="number" value={property.totalUnits} onChange={e => handlePropertyChange('totalUnits', Number(e.target.value))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
              <Input type="number" value={property.distanceKm} step="0.1" onChange={e => handlePropertyChange('distanceKm', Number(e.target.value))} required />
            </div>
          </div>
          
          <hr />

          <h3 className="text-lg font-semibold text-gray-800">Layouts</h3>
          {property.layouts.map((layout, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-md relative">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Layout Type</label>
                <Input type="text" value={layout.layoutType} onChange={e => handleLayoutChange(index, 'layoutType', e.target.value)} placeholder="e.g., 2 Bedrooms" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Size (sqft)</label>
                <Input type="number" value={layout.sizeSqft} onChange={e => handleLayoutChange(index, 'sizeSqft', Number(e.target.value))} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Asking Price</label>
                <Input type="number" value={layout.askingPrice} onChange={e => handleLayoutChange(index, 'askingPrice', Number(e.target.value))} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rental Price</label>
                <Input type="number" value={layout.rentalPrice} onChange={e => handleLayoutChange(index, 'rentalPrice', Number(e.target.value))} required />
              </div>
              {property.layouts.length > 1 && (
                <div className="absolute top-2 right-2">
                  <Button type="button" onClick={() => removeLayout(index)} variant="danger" size="sm" className="!p-1 h-6 w-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </Button>
                </div>
              )}
            </div>
          ))}
          <Button type="button" onClick={addLayout} variant="primary" className="bg-gray-600 hover:bg-gray-500 focus:ring-gray-500" size="sm">Add Another Layout</Button>
          
          <div className="flex justify-end gap-4 mt-8">
            <Button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400">Cancel</Button>
            <Button type="submit">Save Property</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomComparableForm;