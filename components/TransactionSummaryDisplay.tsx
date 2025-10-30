

import React from 'react';
import { TransactionSummary } from '../types';
import Input from './ui/Input';

interface TransactionSummaryDisplayProps {
  summaries: TransactionSummary[];
  onUpdate: (id: string, field: keyof Omit<TransactionSummary, 'id'>, value: string | number) => void;
}

const TransactionSummaryDisplay: React.FC<TransactionSummaryDisplayProps> = ({ summaries, onUpdate }) => {
  if (!summaries || summaries.length === 0) {
    return null;
  }

  return (
    <div className="my-8">
      <h2 className="text-2xl font-semibold mb-4 text-[#700d1d]">Transaction Data Summary</h2>
      <div className="overflow-x-auto bg-white rounded-lg shadow ring-1 ring-gray-200">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-3 font-semibold text-gray-600">Development Name</th>
              <th className="p-3 font-semibold text-gray-600">Median Price (RM)</th>
              <th className="p-3 font-semibold text-gray-600">Median BU (PSF)</th>
              <th className="p-3 font-semibold text-gray-600">Transaction Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {summaries.map(summary => (
              <tr key={summary.id} className="hover:bg-gray-50">
                <td className="p-1.5 bg-yellow-50">
                  <Input
                    type="text"
                    value={summary.development}
                    onChange={e => onUpdate(summary.id, 'development', e.target.value)}
                    className="bg-transparent focus:bg-white"
                  />
                </td>
                <td className="p-1.5 bg-yellow-50">
                  <Input
                    type="number"
                    value={summary.medianPrice}
                    onChange={e => onUpdate(summary.id, 'medianPrice', parseFloat(e.target.value) || 0)}
                    className="bg-transparent focus:bg-white"
                  />
                </td>
                <td className="p-1.5 bg-yellow-50">
                  <Input
                    type="number"
                    value={summary.medianPsf.toFixed(2)}
                    onChange={e => onUpdate(summary.id, 'medianPsf', parseFloat(e.target.value) || 0)}
                    className="bg-transparent focus:bg-white"
                  />
                </td>
                <td className="p-3 text-gray-700 text-center">{summary.transactionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionSummaryDisplay;