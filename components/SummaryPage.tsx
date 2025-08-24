import React from 'react';
import { SummaryData } from '../types';
import Button from './ui/Button';

interface SummaryPageProps {
  summaryData: SummaryData | null;
  onNavigateHome: () => void;
  onNavigateToTransactionFilter: () => void;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ summaryData, onNavigateHome, onNavigateToTransactionFilter }) => {
  if (!summaryData) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">No summary data available.</h2>
        <p className="mt-2 text-gray-600">Please go back and select some comparable properties first.</p>
        <Button onClick={onNavigateHome} className="mt-6">Back to Search</Button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return `RM ${Math.round(value).toLocaleString()}`;
  }

  return (
    <div className="flex flex-col items-center w-full">
        <header className="text-center mb-10 w-full">
            <h1 className="text-5xl font-bold text-[#700d1d] tracking-tight">
            Market Analysis Summary
            </h1>
            <p className="text-gray-600 mt-4 text-lg max-w-3xl mx-auto">
            Here is the summary of the comparable properties you selected. Use these insights to inform your cash flow projection.
            </p>
      </header>
      
      <main className="w-full max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(summaryData).map(([layoutType, data]) => (
                <div key={layoutType} className="bg-white p-6 rounded-xl border border-gray-200 shadow-xl flex flex-col">
                    <h3 className="font-bold text-2xl text-[#700d1d]">{layoutType}</h3>
                    <p className="text-sm font-medium text-gray-500 mb-6">Based on {data.count} selected units</p>
                    
                    <div className="space-y-4 text-base">
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-gray-600">Avg. Asking Price:</span>
                            <span className="font-bold text-lg text-gray-900">{formatCurrency(data.avgPrice)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-gray-600">Price Range:</span>
                            <span className="text-gray-800">{data.priceRange}</span>
                        </div>
                         <hr className="my-4"/>
                         <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-gray-600">Avg. Rental:</span>
                            <span className="font-bold text-lg text-gray-900">{formatCurrency(data.avgRental)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-gray-600">Rental Range:</span>
                            <span className="text-gray-800">{data.rentalRange}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="mt-12 flex justify-center items-center gap-6">
            <Button onClick={onNavigateHome} variant="primary" className="bg-gray-600 hover:bg-gray-500 focus:ring-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Search
            </Button>
            <Button onClick={onNavigateToTransactionFilter} size="md">
                Proceed to Transaction Analysis
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            </Button>
        </div>
      </main>
    </div>
  );
};

export default SummaryPage;