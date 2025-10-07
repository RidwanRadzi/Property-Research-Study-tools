import React from 'react';
import { GlobalSettings as GlobalSettingsType } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';

interface GlobalSettingsProps {
  settings: GlobalSettingsType;
  onSettingsChange: React.Dispatch<React.SetStateAction<GlobalSettingsType>>;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ settings, onSettingsChange }) => {
  const handleChange = (field: keyof GlobalSettingsType, value: string) => {
    const numValue = parseFloat(value) || 0;
    onSettingsChange(prev => ({ ...prev, [field]: numValue }));
  };

  const handleRentalAssumptionChange = (id: string, field: 'type' | 'rent', value: string | number) => {
    onSettingsChange(prev => ({
      ...prev,
      rentalAssumptions: prev.rentalAssumptions.map(a =>
        a.id === id ? { ...a, [field]: value } : a
      ),
    }));
  };

  const addRentalAssumption = () => {
    onSettingsChange(prev => ({
      ...prev,
      rentalAssumptions: [
        ...prev.rentalAssumptions,
        { id: crypto.randomUUID(), type: '', rent: 0 },
      ],
    }));
  };

  const removeRentalAssumption = (id: string) => {
    onSettingsChange(prev => ({
      ...prev,
      rentalAssumptions: prev.rentalAssumptions.filter(a => a.id !== id),
    }));
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-lg border border-gray-200 flex-grow">
      <h2 className="text-xl font-semibold mb-3 text-[#700d1d]">Assumptions</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label htmlFor="interestRate" className="block text-xs font-medium text-gray-600 mb-1">
            Interest Rate (%)
          </label>
          <Input
            id="interestRate"
            type="number"
            value={settings.interestRate}
            onChange={e => handleChange('interestRate', e.target.value)}
            step="0.01"
            className="py-1"
          />
        </div>
        <div>
          <label htmlFor="loanTenure" className="block text-xs font-medium text-gray-600 mb-1">
            Loan Tenure (Years)
          </label>
          <Input
            id="loanTenure"
            type="number"
            value={settings.loanTenure}
            onChange={e => handleChange('loanTenure', e.target.value)}
            className="py-1"
          />
        </div>
        <div>
          <label htmlFor="managementFeePercent" className="block text-xs font-medium text-gray-600 mb-1">
            Co-liv Mgt. Fee (%)
          </label>
          <Input
            id="managementFeePercent"
            type="number"
            value={settings.managementFeePercent}
            onChange={e => handleChange('managementFeePercent', e.target.value)}
            className="py-1"
          />
        </div>
        <div>
          <label htmlFor="maintenanceFeePsf" className="block text-xs font-medium text-gray-600 mb-1">
            Maintenance Fee (PSF)
          </label>
          <Input
            id="maintenanceFeePsf"
            type="number"
            value={settings.maintenanceFeePsf}
            onChange={e => handleChange('maintenanceFeePsf', e.target.value)}
            step="0.01"
            className="py-1"
          />
        </div>
        <div>
          <label htmlFor="lppsaInterestRate" className="block text-xs font-medium text-gray-600 mb-1">
            LPPSA Rate (%)
          </label>
          <Input
            id="lppsaInterestRate"
            type="number"
            value={settings.lppsaInterestRate}
            onChange={e => handleChange('lppsaInterestRate', e.target.value)}
            step="0.01"
            className="py-1"
          />
        </div>
      </div>
      
      <hr className="my-4 border-gray-200"/>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Airbnb Assumptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="airbnbOperatorFee" className="block text-xs font-medium text-gray-600 mb-1">
                Operator Fee (%)
              </label>
              <Input
                id="airbnbOperatorFee"
                type="number"
                value={settings.airbnbOperatorFee}
                onChange={e => handleChange('airbnbOperatorFee', e.target.value)}
                className="py-1"
              />
            </div>
            <div>
              <label htmlFor="airbnbCurrentOccupancy" className="block text-xs font-medium text-gray-600 mb-1">
                Current Case Occ. (%)
              </label>
              <Input
                id="airbnbCurrentOccupancy"
                type="number"
                value={settings.airbnbCurrentOccupancy}
                onChange={e => handleChange('airbnbCurrentOccupancy', e.target.value)}
                className="py-1"
              />
            </div>
            <div>
              <label htmlFor="airbnbBestOccupancy" className="block text-xs font-medium text-gray-600 mb-1">
                Best Case Occ. (%)
              </label>
              <Input
                id="airbnbBestOccupancy"
                type="number"
                value={settings.airbnbBestOccupancy}
                onChange={e => handleChange('airbnbBestOccupancy', e.target.value)}
                className="py-1"
              />
            </div>
            <div>
              <label htmlFor="airbnbWorstOccupancy" className="block text-xs font-medium text-gray-600 mb-1">
                Worst Case Occ. (%)
              </label>
              <Input
                id="airbnbWorstOccupancy"
                type="number"
                value={settings.airbnbWorstOccupancy}
                onChange={e => handleChange('airbnbWorstOccupancy', e.target.value)}
                className="py-1"
              />
            </div>
        </div>
      </div>

      <hr className="my-4 border-gray-200"/>

      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Rental Assumptions (Whole Unit)</h3>
        <div className="space-y-3">
            {(settings.rentalAssumptions || []).map((assumption) => (
                <div key={assumption.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                    <div>
                         <label htmlFor={`type-${assumption.id}`} className="block text-xs font-medium text-gray-600 mb-1">Layout Type</label>
                         <Input
                            id={`type-${assumption.id}`}
                            type="text"
                            value={assumption.type}
                            onChange={e => handleRentalAssumptionChange(assumption.id, 'type', e.target.value)}
                            placeholder="e.g. 3 Bedrooms"
                            className="py-1"
                         />
                    </div>
                    <div>
                         <label htmlFor={`rent-${assumption.id}`} className="block text-xs font-medium text-gray-600 mb-1">Monthly Rent (RM)</label>
                         <Input
                            id={`rent-${assumption.id}`}
                            type="number"
                            value={assumption.rent}
                            onChange={e => handleRentalAssumptionChange(assumption.id, 'rent', parseFloat(e.target.value) || 0)}
                            className="py-1"
                         />
                    </div>
                    <div className="pt-5">
                        <Button onClick={() => removeRentalAssumption(assumption.id)} variant="danger" size="sm" className="!p-1.5 h-8 w-8">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </Button>
                    </div>
                </div>
            ))}
        </div>
        <Button onClick={addRentalAssumption} size="sm" className="mt-4 bg-gray-600 hover:bg-gray-500 focus:ring-gray-500">
            Add Rental Assumption
        </Button>
      </div>
    </div>
  );
};

export default GlobalSettings;