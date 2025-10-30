

import React from 'react';
// FIX: Import DevelopmentSummary to correctly type the data from summaryData.
import { SummaryData, DevelopmentSummary } from '../types';
import Button from './ui/Button';

interface SummaryPageProps {
  summaryData: SummaryData | null;
  onNavigateToAreaAnalysis: () => void;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ summaryData, onNavigateToAreaAnalysis }) => {
  if (!summaryData) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">No summary data available.</h2>
        <p className="mt-2 text-gray-600">Please go back to the Home page and select some comparable properties first.</p>
      </div>
    );
  }

  const formatPsf = (value: number) => `RM ${value.toFixed(2)} psf`;

  return (
    <div className="flex flex-col items-center w-full -mt-8">
      <header className="text-center mb-10 w-full">
        <h1 className="text-5xl font-bold text-[#700d1d] tracking-tight">
          Market Analysis Summary
        </h1>
        <p className="text-gray-600 mt-4 text-lg max-w-3xl mx-auto">
          Here is the summary of the comparable properties you selected. Use these insights to inform your cash flow projection.
        </p>
      </header>
      
      <main className="w-full max-w-7xl">
        <div className="overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Development Name</th>
                        <th className="p-3 font-semibold text-gray-600">Year</th>
                        <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Total Units</th>
                        <th className="p-3 font-semibold text-gray-600">Tenure</th>
                        <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Layout Type</th>
                        <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Size Range</th>
                        <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Asking Price Range</th>
                        <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Avg. Asking PSF</th>
                        <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Rental Range</th>
                        <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Avg. Rental PSF</th>
                        <th className="p-3 font-semibold text-gray-600">Count</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {Object.entries(summaryData).flatMap(([devName, devData]) => {
                        // FIX: Add type assertion to ensure devData is treated as DevelopmentSummary.
                        const typedDevData = devData as DevelopmentSummary;
                        if (typedDevData.rentalBreakdown.length === 0) {
                            return (
                                <tr key={devName}>
                                    <td className="p-3 font-medium text-gray-900">{devName}</td>
                                    <td className="p-3 text-gray-700">{typedDevData.yearOfCompletion}</td>
                                    <td className="p-3 text-gray-700">{typedDevData.totalUnits.toLocaleString()}</td>
                                    <td className="p-3 text-gray-700">{typedDevData.tenure}</td>
                                    <td className="p-3 text-gray-500 italic" colSpan={7}>No layout-specific data selected</td>
                                </tr>
                            );
                        }

                        return typedDevData.rentalBreakdown.map((layoutData, layoutIndex) => (
                            <tr key={`${devName}-${layoutData.layoutType}`} className="hover:bg-gray-50">
                                {layoutIndex === 0 && (
                                    <>
                                        <td rowSpan={typedDevData.rentalBreakdown.length} className="p-3 font-medium text-gray-900 align-top border-r">{devName}</td>
                                        <td rowSpan={typedDevData.rentalBreakdown.length} className="p-3 text-gray-700 align-top border-r">{typedDevData.yearOfCompletion}</td>
                                        <td rowSpan={typedDevData.rentalBreakdown.length} className="p-3 text-gray-700 align-top border-r">{typedDevData.totalUnits.toLocaleString()}</td>
                                        <td rowSpan={typedDevData.rentalBreakdown.length} className="p-3 text-gray-700 align-top border-r">{typedDevData.tenure}</td>
                                    </>
                                )}
                                <td className="p-3 font-medium text-gray-800 whitespace-nowrap">{layoutData.layoutType}</td>
                                <td className="p-3 text-gray-700 whitespace-nowrap">{layoutData.sizeRange}</td>
                                <td className="p-3 text-gray-700 whitespace-nowrap">{layoutData.askingPriceRange}</td>
                                <td className="p-3 text-gray-700 whitespace-nowrap">{formatPsf(layoutData.avgAskingPricePsf)}</td>
                                <td className="p-3 text-gray-700 whitespace-nowrap">{layoutData.rentalRange}</td>
                                <td className="p-3 text-gray-700 whitespace-nowrap">{formatPsf(layoutData.avgRentalPsf)}</td>
                                <td className="p-3 text-gray-700 text-center">{layoutData.count}</td>
                            </tr>
                        ));
                    })}
                </tbody>
            </table>
        </div>

        <div className="mt-12 flex justify-center items-center gap-6">
            <Button onClick={onNavigateToAreaAnalysis} size="md">
                Next: Area Analysis
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