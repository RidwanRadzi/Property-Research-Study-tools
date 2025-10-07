
import React, { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { findComparableProperties, findPropertyByName } from '../services/geminiService';
import { ComparableProperty, Layout, SummaryData, LayoutRentalSummary, SavedSession } from '../types';
import Spinner from './ui/Spinner';

interface HomePageProps {
  onGenerateSummary: (summaryData: SummaryData) => void;
  subjectPropertyName: string;
  setSubjectPropertyName: (name: string) => void;
  area: string;
  setArea: (area: string) => void;
  savedSessions: SavedSession[];
  onLoadSession: (id: number) => void;
  onDeleteSession: (id: number) => void;
  comparables: ComparableProperty[];
  setComparables: React.Dispatch<React.SetStateAction<ComparableProperty[]>>;
}

const HomePage: React.FC<HomePageProps> = ({ 
  onGenerateSummary, 
  subjectPropertyName, 
  setSubjectPropertyName, 
  area, 
  setArea,
  savedSessions,
  onLoadSession,
  onDeleteSession,
  comparables,
  setComparables,
}) => {
  const [residenceType, setResidenceType] = useState('Serviced Apartment/Condominium');
  const [radius, setRadius] = useState('3');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedLayoutIds, setSelectedLayoutIds] = useState<Set<string>>(new Set());

  const [specificSearchName, setSpecificSearchName] = useState('');
  const [isSpecificSearchLoading, setIsSpecificSearchLoading] = useState(false);
  const [specificSearchError, setSpecificSearchError] = useState<string | null>(null);


  const handleFindComparables = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setComparables([]);
    setSelectedLayoutIds(new Set());
    try {
      const numericRadius = parseFloat(radius);
      if (isNaN(numericRadius) || numericRadius <= 0) {
        throw new Error("Please enter a valid, positive radius.");
      }
      const results = await findComparableProperties(area, subjectPropertyName, residenceType, numericRadius);
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
  
  const handleSpecificSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specificSearchName.trim()) return;

    setIsSpecificSearchLoading(true);
    setSpecificSearchError(null);

    try {
        const result = await findPropertyByName(specificSearchName, area);
        if (result) {
            if (comparables.some(c => c.name.toLowerCase() === result.name.toLowerCase())) {
                setSpecificSearchError(`Property "${result.name}" is already in the list.`);
            } else {
                const propertyWithId: ComparableProperty = {
                    ...result,
                    id: crypto.randomUUID(),
                    layouts: result.layouts.map(l => ({...l, id: crypto.randomUUID()})),
                    isCustom: true
                };
                setComparables(prev => [...prev, propertyWithId]);
                setSpecificSearchName('');
            }
        } else {
            setSpecificSearchError(`Invalid name. Could not find property "${specificSearchName}".`);
        }
    } catch (e: any) {
        setSpecificSearchError(e.message || 'An unexpected error occurred during search.');
    } finally {
        setIsSpecificSearchLoading(false);
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
    const groupedByDevelopment: { [key: string]: { layouts: Layout[], comparable: ComparableProperty } } = {};

    selectedItems.forEach(({ comparable, layout }) => {
      const devName = comparable.name;
      if (!groupedByDevelopment[devName]) {
        groupedByDevelopment[devName] = { layouts: [], comparable: comparable };
      }
      groupedByDevelopment[devName].layouts.push(layout);
    });

    for (const devName in groupedByDevelopment) {
      const { layouts, comparable } = groupedByDevelopment[devName];
      const prices = layouts.map(l => l.askingPrice);
      const sizes = layouts.map(l => l.sizeSqft);

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      const minSize = Math.min(...sizes);
      const maxSize = Math.max(...sizes);
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;

      const sizeRange = minSize === maxSize ? `${minSize.toLocaleString()} sqft` : `${minSize.toLocaleString()} - ${maxSize.toLocaleString()} sqft`;

      const avgPricePsf = avgPrice / avgSize;

      // Rental breakdown by layout type
      const rentalBreakdown: LayoutRentalSummary[] = [];
      const groupedByLayoutType: { [key: string]: Layout[] } = {};
      layouts.forEach(layout => {
          if (!groupedByLayoutType[layout.layoutType]) {
              groupedByLayoutType[layout.layoutType] = [];
          }
          groupedByLayoutType[layout.layoutType].push(layout);
      });

      for (const layoutType in groupedByLayoutType) {
          const layoutGroup = groupedByLayoutType[layoutType];
          const rentalsInGroup = layoutGroup.map(l => l.rentalPrice);
          const sizesInGroup = layoutGroup.map(l => l.sizeSqft);
          const pricesInGroup = layoutGroup.map(l => l.askingPrice);
          
          const minRental = Math.min(...rentalsInGroup);
          const maxRental = Math.max(...rentalsInGroup);
          
          const minSizeInGroup = Math.min(...sizesInGroup);
          const maxSizeInGroup = Math.max(...sizesInGroup);

          const minAskingPrice = Math.min(...pricesInGroup);
          const maxAskingPrice = Math.max(...pricesInGroup);
          
          const totalRental = rentalsInGroup.reduce((a, b) => a + b, 0);
          const totalSize = sizesInGroup.reduce((a, b) => a + b, 0);
          const totalAskingPrice = pricesInGroup.reduce((a,b) => a+b, 0);

          const avgRentalPsf = totalSize > 0 ? totalRental / totalSize : 0;
          const avgAskingPricePsf = totalSize > 0 ? totalAskingPrice / totalSize : 0;

          rentalBreakdown.push({
              layoutType: layoutType,
              rentalRange: `RM ${minRental.toLocaleString()} - RM ${maxRental.toLocaleString()}`,
              sizeRange: minSizeInGroup === maxSizeInGroup ? `${minSizeInGroup.toLocaleString()} sqft` : `${minSizeInGroup.toLocaleString()} - ${maxSizeInGroup.toLocaleString()} sqft`,
              avgRentalPsf: avgRentalPsf,
              askingPriceRange: `RM ${minAskingPrice.toLocaleString()} - RM ${maxAskingPrice.toLocaleString()}`,
              avgAskingPricePsf: avgAskingPricePsf,
              count: layoutGroup.length
          });
      }

      rentalBreakdown.sort((a, b) => a.layoutType.localeCompare(b.layoutType));


      summary[devName] = {
        priceRange: `RM ${minPrice.toLocaleString()} - RM ${maxPrice.toLocaleString()}`,
        avgPrice,
        sizeRange,
        avgPricePsf,
        rentalBreakdown,
        count: layouts.length,
        yearOfCompletion: comparable.yearOfCompletion,
        totalUnits: comparable.totalUnits,
        tenure: comparable.tenure,
      };
    }
    
    onGenerateSummary(summary);
  };


  return (
    <div className="flex flex-col items-center w-full">
      <header className="text-center mb-10 w-full">
        <h1 className="text-5xl font-bold text-[#700d1d] tracking-tight">
          Far Capital Pre Study
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
          <div className="md:col-span-2">
            <label htmlFor="propertyName" className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
            <Input id="propertyName" type="text" value={subjectPropertyName} onChange={e => setSubjectPropertyName(e.target.value)} placeholder="e.g., Vybe" required />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="residenceType" className="block text-sm font-medium text-gray-700 mb-1">Residence Type</label>
            <select 
              id="residenceType" 
              value={residenceType} 
              onChange={e => setResidenceType(e.target.value)} 
              required
              className="w-full h-10 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#700d1d] focus:border-[#700d1d] transition duration-150 ease-in-out"
            >
                <option>Serviced Apartment/Condominium</option>
                <option>Apartment</option>
                <option>Landed Property</option>
            </select>
          </div>
          <div>
            <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
            <Input id="radius" type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="e.g., 3" required min="1" />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full h-10">
            {isLoading ? <><Spinner /> Searching...</> : 'Find Comparables'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600 flex items-center justify-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="text-left">
            <strong>Pro Tip:</strong> The AI prioritizes the <strong>nearest</strong> properties within your radius and will strictly match the selected <strong>residence type</strong>.
          </span>
        </div>

        {error && <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}
        
        <form onSubmit={handleSpecificSearch} className="mt-6 w-full max-w-7xl bg-gray-50 p-4 rounded-lg shadow-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 text-lg mb-3">Add a Specific Comparable Property</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="flex-grow w-full">
                    <label htmlFor="specific-property-name" className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                    <Input id="specific-property-name" type="text" value={specificSearchName} onChange={e => setSpecificSearchName(e.target.value)} placeholder="e.g., The Tamarind" required />
                </div>
                <Button type="submit" disabled={isSpecificSearchLoading || !area} className="h-10 w-full sm:w-auto flex-shrink-0" title={!area ? "Please enter an Area / Location in the main form first" : ""}>
                    {isSpecificSearchLoading ? <><Spinner /> Searching...</> : 'Add to List'}
                </Button>
            </div>
            {specificSearchError && <div className="mt-2 text-sm text-red-600">{specificSearchError}</div>}
        </form>

        {savedSessions.length > 0 && (
          <div className="mt-8 w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">My Recent Searches</h2>
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 space-y-3">
                  {savedSessions.map(session => (
                      <div key={session.id} className="flex flex-wrap justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors gap-4">
                          <div>
                              <p className="font-semibold text-gray-900">{session.name}</p>
                              <p className="text-sm text-gray-500">Saved on: {new Date(session.date).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                              <Button onClick={() => onLoadSession(session.id)} size="sm">Load</Button>
                              <Button onClick={() => onDeleteSession(session.id)} variant="danger" size="sm">Delete</Button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
        )}

        {comparables.length > 0 && (
          <div className="mt-8 overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
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
                                            {prop.isCustom && <span className="block text-xs font-bold text-[#700d1d] ml-6 mt-1">MANUALLY ADDED</span>}
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
      
    </div>
  );
};

export default HomePage;
