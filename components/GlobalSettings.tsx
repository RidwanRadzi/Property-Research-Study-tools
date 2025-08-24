
import React from 'react';
import { GlobalSettings as GlobalSettingsType } from '../types';
import Input from './ui/Input';

interface GlobalSettingsProps {
  settings: GlobalSettingsType;
  onSettingsChange: React.Dispatch<React.SetStateAction<GlobalSettingsType>>;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ settings, onSettingsChange }) => {
  const handleChange = (field: keyof GlobalSettingsType, value: string) => {
    const numValue = parseFloat(value) || 0;
    onSettingsChange(prev => ({ ...prev, [field]: numValue }));
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-lg border border-gray-200 flex-grow">
      <h2 className="text-xl font-semibold mb-3 text-[#700d1d]">Global Assumptions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>
    </div>
  );
};

export default GlobalSettings;