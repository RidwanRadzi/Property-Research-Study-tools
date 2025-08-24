import React, { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { findComparableProperties } from '../services/geminiService';
import { ComparableProperty, Layout, SummaryData } from '../types';
import Spinner from './ui/Spinner';
import CustomComparableForm from './CustomComparableForm';

interface HomePageProps {
  onGenerateSummary: (summaryData: SummaryData) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onGenerateSummary }) => {
  const [area, setArea] = useState('Cyberjaya');
  const [propertyName, setPropertyName] = useState('Vybe');
  const [residenceType, setResidenceType] = useState('Serviced Residence');
  const [comparables, setComparables] = useState<ComparableProperty[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedLayoutIds, setSelectedLayoutIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFindComparables = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setComparables([]);
    setSelectedLayoutIds(new Set());
    try {
      const results = await findComparableProperties(area, propertyName, residenceType);
      const resultsWithIds = results.map(c => ({
          ...c,
          id: crypto.randomUUID(),
          layouts: c.layouts.map(l => ({...l, id: crypto.randomUUID()}))
      }))
      setComparables(resultsWithIds);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLayout = (layoutId: string) => {
    setSelectedLayoutIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layoutId)) {
        newSet.delete(layoutId);
      } else {
        newSet.add(layoutId);
      }
      return newSet;
    });
  };

  const handleSelectProperty = (propertyId: string, select: boolean) => {
    const property = comparables.find(p => p.id === propertyId);
    if (!property) return;

    setSelectedLayoutIds(prev => {
        const newSet = new Set(prev);
        property.layouts.forEach(layout => {
            if(select) {
                newSet.add(layout.id);
            } else {
                newSet.delete(layout.id);
            }
        });
        return newSet;
    });
  };

  const handleSaveCustomProperty = (newProperty: Omit<ComparableProperty, 'id'>) => {
    const propertyWithId: ComparableProperty = {
      ...newProperty,
      id: crypto.randomUUID(),
      layouts: newProperty.layouts.map(l => ({...l, id: crypto.randomUUID()})),
      isCustom: true
    };
    setComparables(prev => [...prev, propertyWithId]);
    setIsModalOpen(false);
  };
  
  const handleAnalyze = () => {
    const selectedItems: { comparable: ComparableProperty, layout: Layout }[] = [];
    comparables.forEach(c => {
        c.layouts.forEach(l => {
            if (selectedLayoutIds.has(l.id)) {
                selectedItems.push({ comparable: c, layout: l });
            }
        })
    });

    if (selectedItems.length === 0) return;

    const summary: SummaryData = {};
    const groupedByLayout: { [key: string]: Layout[] } = {};

    selectedItems.forEach(({ layout }) => {
        if (!groupedByLayout[layout.layoutType]) {
            groupedByLayout[layout.layoutType] = [];
        }
        groupedByLayout[layout.layoutType].push(layout);
    });

    for (const layoutType in groupedByLayout) {
        const layouts = groupedByLayout[layoutType];
        const prices = layouts.map(l => l.askingPrice);
        const rentals = layouts.map(l => l.rentalPrice);

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        const minRental = Math.min(...rentals);
        const maxRental = Math.max(...rentals);
        const avgRental = rentals.reduce((a, b) => a + b, 0) / rentals.length;

        summary[layoutType] = {
            priceRange: `RM ${minPrice.toLocaleString()} - RM ${maxPrice.toLocaleString()}`,
            avgPrice,
            rentalRange: `RM ${minRental.toLocaleString()} - RM ${maxRental.toLocaleString()}`,
            avgRental,
            count: layouts.length,
        };
    }
    
    onGenerateSummary(summary);
  };


  return (
    <div className="flex flex-col items-center w-full">
      <header className="text-center mb-10 w-full">
        <h1 className="text-5xl font-bold text-[#700d1d] tracking-tight">
          Property Comparables Analysis
        </h1>
        <p className="text-gray-600 mt-4 text-lg max-w-2xl mx-auto">
          Enter your subject property to find AI-generated comparables. Select the best fits, add your own, and generate a market summary.
        </p>
      </header>

      <main className="w-full max-w-7xl">
        <form onSubmit={handleFindComparables} className="bg-gray-50 p-6 rounded-lg shadow-lg border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">Area / Location</label>
            <Input id="area" type="text" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g., Cyberjaya" required />
          </div>
          <div>
            <label htmlFor="propertyName" className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
            <Input id="propertyName" type="text" value={propertyName} onChange={e => setPropertyName(e.target.value)} placeholder="e.g., Vybe" required />
          </div>
          <div>
            <label htmlFor="residenceType" className="block text-sm font-medium text-gray-700 mb-1">Residence Type</label>
            <select 
              id="residenceType" 
              value={residenceType} 
              onChange={e => setResidenceType(e.target.value)} 
              required
              className="w-full h-10 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#700d1d] focus:border-[#700d1d] transition duration-150 ease-in-out"
            >
                <option>Serviced Residence</option>
                <option>Apartment</option>
                <option>Landed Property</option>
            </select>
          </div>
          <Button type="submit" disabled={isLoading} className="md:col-start-4 w-full h-10">
            {isLoading ? <><Spinner /> Searching...</> : 'Find Comparables'}
          </Button>
        </form>

        {error && <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}
        
        <div className="mt-4 text-right">
            <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-gray-600 hover:bg-gray-500 focus:ring-gray-500">
                Add Custom Comparable
            </Button>
        </div>

        {comparables.length > 0 && (
          <div className="mt-4 overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-3 font-semibold text-gray-600 w-12"></th>
                  <th className="p-3 font-semibold text-gray-600">Property Name</th>
                  <th className="p-3 font-semibold text-gray-600">Details</th>
                  <th className="p-3 font-semibold text-gray-600">Layout</th>
                  <th className="p-3 font-semibold text-gray-600">Size (sqft)</th>
                  <th className="p-3 font-semibold text-gray-600">Asking Price</th>
                  <th className="p-3 font-semibold text-gray-600">Price PSF</th>
                  <th className="p-3 font-semibold text-gray-600">Rental</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comparables.map((prop) => {
                    const allLayoutsSelected = prop.layouts.every(l => selectedLayoutIds.has(l.id));
                    return (
                        <React.Fragment key={prop.id}>
                            {prop.layouts.map((layout, layoutIndex) => (
                                <tr key={layout.id} className={`hover:bg-gray-50 ${selectedLayoutIds.has(layout.id) ? 'bg-red-50' : ''}`}>
                                    <td className="p-3 text-center">
                                        <input type="checkbox" checked={selectedLayoutIds.has(layout.id)} onChange={() => handleSelectLayout(layout.id)} className="h-4 w-4 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]" />
                                    </td>
                                    {layoutIndex === 0 && (
                                        <td rowSpan={prop.layouts.length} className="p-3 font-medium text-gray-900 align-top border-l border-r border-gray-200">
                                            <div>
                                                <input type="checkbox" checked={allLayoutsSelected} onChange={(e) => handleSelectProperty(prop.id, e.target.checked)} className="h-4 w-4 mr-2 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]" />
                                                <span>{prop.name}</span>
                                            </div>
                                            <span className="block text-xs font-normal text-gray-500 ml-6">~{prop.distanceKm.toFixed(1)} km away</span>
                                            {prop.isCustom && <span className="block text-xs font-bold text-[#700d1d] ml-6 mt-1">CUSTOM</span>}
                                        </td>
                                    )}
                                    {layoutIndex === 0 && (
                                         <td rowSpan={prop.layouts.length} className="p-3 text-gray-700 align-top border-r border-gray-200 whitespace-nowrap">
                                            <div className="text-xs">
                                                <div><strong>Tenure:</strong> {prop.tenure}</div>
                                                <div><strong>Completed:</strong> {prop.yearOfCompletion}</div>
                                                <div><strong>Units:</strong> {prop.totalUnits.toLocaleString()}</div>
                                            </div>
                                         </td>
                                    )}
                                    <td className="p-3 font-medium text-gray-800">{layout.layoutType}</td>
                                    <td className="p-3 text-gray-700">{layout.sizeSqft.toLocaleString()}</td>
                                    <td className="p-3 text-gray-700">RM {layout.askingPrice.toLocaleString()}</td>
                                    <td className="p-3 text-gray-700">RM {(layout.askingPrice / layout.sizeSqft).toFixed(0)}</td>
                                    <td className="p-3 text-gray-700">RM {layout.rentalPrice.toLocaleString()}</td>
                                </tr>
                            ))}
                        </React.Fragment>
                    )
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {selectedLayoutIds.size > 0 && (
            <div className="mt-8 text-center">
                <Button onClick={handleAnalyze} size="md">
                    Analyze Selection ({selectedLayoutIds.size} layouts)
                </Button>
            </div>
        )}

      </main>
      
      {isModalOpen && <CustomComparableForm onSave={handleSaveCustomProperty} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default HomePage;