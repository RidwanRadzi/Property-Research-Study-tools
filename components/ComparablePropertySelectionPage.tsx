

import React, { useState, useRef, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { findComparablePropertiesAI, findPropertyByName } from '../services/geminiService';
import { ComparableProperty, Layout, SummaryData, LayoutRentalSummary } from '../types';
import Spinner from './ui/Spinner';

interface ComparablePropertySelectionPageProps {
  onGenerateSummary: (summaryData: SummaryData) => void;
  subjectPropertyName: string;
  setSubjectPropertyName: (name: string) => void;
  area: string;
  setArea: (area: string) => void;
  comparables: ComparableProperty[];
  setComparables: React.Dispatch<React.SetStateAction<ComparableProperty[]>>;
}

const layoutOptions = [
    'Studio',
    '1 Bedroom',
    '2 Bedrooms',
    '3 Bedrooms',
    '4 Bedrooms',
    '5+ Bedrooms'
];

const groupLayouts = (layouts: Layout[]) => {
  const grouped: { [key: string]: Layout[] } = {};
  layouts.forEach(layout => {
    if (!grouped[layout.layoutType]) {
      grouped[layout.layoutType] = [];
    }
    grouped[layout.layoutType].push(layout);
  });

  return Object.entries(grouped).map(([layoutType, layoutsInGroup]) => {
    const sizes = layoutsInGroup.map(l => l.sizeSqft);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const sizeRange = minSize === maxSize ? `${minSize} sqft` : `${minSize} - ${maxSize} sqft`;
    
    return {
      type: layoutType,
      range: `(${sizeRange})`,
      layouts: layoutsInGroup, // Keep original layouts for their IDs
    };
  }).sort((a, b) => a.type.localeCompare(b.type));
};


const ComparablePropertySelectionPage: React.FC<ComparablePropertySelectionPageProps> = ({ 
  onGenerateSummary,
  subjectPropertyName, 
  setSubjectPropertyName, 
  area, 
  setArea,
  comparables,
  setComparables,
}) => {
  const [residenceType, setResidenceType] = useState('Serviced Apartment/Condominium');
  const [radius, setRadius] = useState('3');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayouts, setSelectedLayouts] = useState<string[]>([]);
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
  
  const [selectedLayoutIds, setSelectedLayoutIds] = useState<Set<string>>(new Set());

  const [specificSearchName, setSpecificSearchName] = useState('');
  const [isSpecificSearchLoading, setIsSpecificSearchLoading] = useState(false);
  const [specificSearchError, setSpecificSearchError] = useState<string | null>(null);

  const layoutDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(event.target as Node)) {
        setIsLayoutDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLayoutToggle = (layout: string) => {
    setSelectedLayouts(prev => 
      prev.includes(layout) 
        ? prev.filter(l => l !== layout) 
        : [...prev, layout]
    );
  };

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
      
      const results = await findComparablePropertiesAI(area, subjectPropertyName, residenceType, numericRadius, selectedLayouts);
      
      const resultsWithIds = results.map(c => ({
          ...c,
          id: crypto.randomUUID(),
          layouts: c.layouts.map(l => ({...l, id: crypto.randomUUID()}))
      }));
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
            setSpecificSearchError(`Could not find property "${specificSearchName}".`);
        }
    } catch (e: any) {
        setSpecificSearchError(e.message || 'An unexpected error occurred during search.');
    } finally {
        setIsSpecificSearchLoading(false);
    }
  };

  const handleRemoveProperty = (propertyId: string) => {
    setComparables(prev => prev.filter(p => p.id !== propertyId));
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

  const handleSelectLayoutGroup = (layouts: Layout[], select: boolean) => {
      setSelectedLayoutIds(prev => {
        const newSet = new Set(prev);
        layouts.forEach(layout => {
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

      const rentalBreakdown: LayoutRentalSummary[] = [];
      const groupedByLayoutType: { [key: string]: Layout[] } = {};
      layouts.forEach(layout => {
          if (!groupedByLayoutType[layout.layoutType]) {
              groupedByLayoutType[layout.layoutType] = [];
          }
          groupedByLayoutType[layout.layoutType].push(layout);
      });

      for (const layoutType in groupedByLayoutType) {
          const group = groupedByLayoutType[layoutType];
          const rentals = group.map(l => l.rentalPrice);
          const sizesInGroup = group.map(l => l.sizeSqft);
          const pricesInGroup = group.map(l => l.askingPrice);
          const minRental = Math.min(...rentals);
          const maxRental = Math.max(...rentals);
          const minSizeInGroup = Math.min(...sizesInGroup);
          const maxSizeInGroup = Math.max(...sizesInGroup);
          const minAskingPrice = Math.min(...pricesInGroup);
          const maxAskingPrice = Math.max(...pricesInGroup);
          const totalRental = rentals.reduce((a, b) => a + b, 0);
          const totalSize = sizesInGroup.reduce((a, b) => a + b, 0);
          const totalAskingPrice = pricesInGroup.reduce((a,b) => a+b, 0);
          const avgRentalPsf = totalSize > 0 ? totalRental / totalSize : 0;
          const avgAskingPricePsf = totalSize > 0 ? totalAskingPrice / totalSize : 0;

          rentalBreakdown.push({
              layoutType,
              rentalRange: `RM ${minRental.toLocaleString()} - RM ${maxRental.toLocaleString()}`,
              sizeRange: minSizeInGroup === maxSizeInGroup ? `${minSizeInGroup.toLocaleString()} sqft` : `${minSizeInGroup.toLocaleString()} - ${maxSizeInGroup.toLocaleString()} sqft`,
              avgRentalPsf,
              askingPriceRange: `RM ${minAskingPrice.toLocaleString()} - RM ${maxAskingPrice.toLocaleString()}`,
              avgAskingPricePsf,
              count: group.length
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
    <>
      <form onSubmit={handleFindComparables} className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="md:col-span-2">
          <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">Area / Location</label>
          <Input id="area" type="text" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g., Cyberjaya" required />
        </div>
        <div className="md:col-span-3">
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
        <div className="md:col-span-2 relative">
          <label htmlFor="layout-button" className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
          <button
              id="layout-button"
              type="button"
              onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
              className="w-full h-10 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm text-left flex justify-between items-center"
          >
              <span className="truncate">
                  {selectedLayouts.length > 0 ? selectedLayouts.join(', ') : 'Any Layout'}
              </span>
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
          </button>
          {isLayoutDropdownOpen && (
              <div ref={layoutDropdownRef} className="absolute z-10 top-full mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                  {layoutOptions.map(option => (
                      <label key={option} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          <input
                              type="checkbox"
                              checked={selectedLayouts.includes(option)}
                              onChange={() => handleLayoutToggle(option)}
                              className="h-4 w-4 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]"
                          />
                          <span className="ml-3">{option}</span>
                      </label>
                  ))}
              </div>
          )}
        </div>
        <div>
          <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
          <Input id="radius" type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="e.g., 3" required min="1" />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full h-10 md:col-span-5">
          {isLoading ? <><Spinner /> Searching...</> : `Find Comparables`}
        </Button>
      </form>

      <form onSubmit={handleSpecificSearch} className="mt-6 w-full bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 text-lg mb-3">Add a Specific Comparable Property</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="flex-grow w-full">
                  <label htmlFor="specific-property-name" className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                  <Input id="specific-property-name" type="text" value={specificSearchName} onChange={e => setSpecificSearchName(e.target.value)} placeholder="e.g., The Tamarind" required />
              </div>
              <Button type="submit" disabled={isSpecificSearchLoading || !area} className="h-10 w-full sm:w-auto flex-shrink-0" title={!area ? "Please enter an Area / Location in the main form first" : ""}>
                  {isSpecificSearchLoading ? <><Spinner /> Adding...</> : 'Add to List'}
              </Button>
          </div>
          {specificSearchError && <div className="mt-2 text-sm text-red-600">{specificSearchError}</div>}
      </form>

      {error && <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}
      
      {isLoading && <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-4 text-gray-600">Finding comparable properties...</span></div>}

      {comparables.length > 0 && !isLoading && (
        <div className="mt-8 overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-3 font-semibold text-gray-600">Property Name</th>
                <th className="p-3 font-semibold text-gray-600">Details</th>
                <th className="p-3 font-semibold text-gray-600">Available Layouts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comparables.map((prop) => {
                const grouped = groupLayouts(prop.layouts);
                const allLayoutsInPropSelected = prop.layouts.length > 0 && prop.layouts.every(l => selectedLayoutIds.has(l.id));
                return (
                  <tr key={prop.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900 align-top">
                          <div className="flex items-start gap-2">
                            <input 
                              type="checkbox" 
                              checked={allLayoutsInPropSelected} 
                              onChange={(e) => handleSelectProperty(prop.id, e.target.checked)} 
                              className="h-4 w-4 mt-1 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]"
                              aria-label={`Select all layouts for ${prop.name}`}
                            />
                            <div>
                                {prop.name}
                                <span className="block text-xs font-normal text-gray-500">~{prop.distanceKm.toFixed(1)} km away</span>
                                {prop.isCustom && <span className="block text-xs font-bold text-blue-600 mt-1">MANUALLY ADDED</span>}
                                <Button onClick={() => handleRemoveProperty(prop.id)} variant="danger" size="sm" className="mt-2 !text-[10px] !py-0.5 !px-1.5">
                                    Remove
                                </Button>
                            </div>
                          </div>
                      </td>
                      <td className="p-3 text-gray-700 align-top border-l border-r border-gray-200 whitespace-nowrap">
                          <div className="text-xs">
                              <div><strong>Tenure:</strong> {prop.tenure}</div>
                              <div><strong>Completed:</strong> {prop.yearOfCompletion}</div>
                              <div><strong>Units:</strong> {prop.totalUnits.toLocaleString()}</div>
                          </div>
                      </td>
                      <td className="p-3 text-gray-700 align-top">
                        <div className="space-y-2">
                           {grouped.map((group) => {
                             const allInGroupSelected = group.layouts.every(l => selectedLayoutIds.has(l.id));
                             return (
                               <div key={group.type} className="flex items-center gap-2">
                                   <input 
                                     type="checkbox"
                                     checked={allInGroupSelected}
                                     onChange={(e) => handleSelectLayoutGroup(group.layouts, e.target.checked)}
                                     className="h-4 w-4 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]"
                                     aria-label={`Select all ${group.type} layouts for ${prop.name}`}
                                   />
                                   <label className="font-medium text-gray-800">
                                       {group.type}
                                       <span className="text-xs font-normal text-gray-500 ml-1">{group.range}</span>
                                   </label>
                               </div>
                           )})}
                        </div>
                      </td>
                  </tr>
                );
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
    </>
  );
};

export default ComparablePropertySelectionPage;