import React, { useRef, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { UnitListing, UnitListingAnalysisResult } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { analyzeUnitListingFile } from '../services/geminiService';

interface UnitListingPageProps {
  listing: UnitListing | null;
  onSetListing: (listing: UnitListing | null) => void;
  onProceedToProjection: (selectedUnits: { type: string; size: number; spaPrice: number }[]) => void;
}

// Data structure for the "best deal" analysis result
interface BestDealAnalysis {
    // Stores the Unit No. of the single best deal for each size
    winningUnits: { [size: string]: string | number };
}

const UnitListingPage: React.FC<UnitListingPageProps> = ({ listing, onSetListing, onProceedToProjection }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [columnAnalysis, setColumnAnalysis] = useState<UnitListingAnalysisResult | null>(null);

  const bestDealAnalysis = useMemo<BestDealAnalysis | null>(() => {
    if (!listing || !listing.rows.length || !columnAnalysis) return null;

    const { sizeKey, priceKey, unitNoKey } = columnAnalysis;
    const { rows } = listing;

    if (!sizeKey || !priceKey || !unitNoKey) return null;
    if (!listing.headers.includes(sizeKey) || !listing.headers.includes(priceKey) || !listing.headers.includes(unitNoKey)) {
        console.warn("AI identified columns not found in the actual headers.");
        return null;
    }

    const winningUnits: { [size: string]: string | number } = {};
    const groups: { [size: string]: any[] } = {};

    // Group rows by size
    rows.forEach(row => {
      const size = row[sizeKey];
      if (size !== undefined) {
        const sizeStr = String(size);
        if (!groups[sizeStr]) {
          groups[sizeStr] = [];
        }
        groups[sizeStr].push(row);
      }
    });
    
    // For each size group, find the single best unit
    Object.entries(groups).forEach(([size, items]) => {
      if (items.length === 0) return;

      const lowestPrice = Math.min(...items.map(item => Number(item[priceKey])).filter(p => !isNaN(p)));
      const bestUnit = items.find(item => Number(item[priceKey]) === lowestPrice);

      // FIX: Added type checking for the value from the Excel sheet before assigning it.
      // The `bestUnit` is of type `any` and its properties could be of any type.
      // This ensures that only strings or numbers are assigned to `winningUnits`, matching its type definition.
      if (bestUnit) {
        const val = bestUnit[unitNoKey];
        if (typeof val === 'string' || typeof val === 'number') {
            winningUnits[size] = val;
        }
      }
    });

    return { winningUnits };
  }, [listing, columnAnalysis]);

  const canProceed = !!(columnAnalysis && selectedRows.size > 0);

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    onSetListing(null);
    setColumnAnalysis(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheets found in the Excel file.");
        
        const worksheet = workbook.Sheets[sheetName];
        // FIX: Ensure jsonData is correctly typed as an array of indexable records.
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            throw new Error("The Excel file is empty or has no data.");
        }
        
        const headers = Object.keys(jsonData[0]);
        const sampleRows = jsonData.slice(0, 5);

        const analysis = await analyzeUnitListingFile(headers, sampleRows);
        setColumnAnalysis(analysis);
        onSetListing({
            name: file.name,
            headers: headers,
            rows: jsonData,
        });
        setHighlightEnabled(false);
        setSelectedRows(new Set());

      } catch (err: any) {
         setError(`Error processing file: ${err.message}`);
         onSetListing(null);
         setColumnAnalysis(null);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
        setError("Failed to read the file.");
        setIsLoading(false);
    }
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFile(event.target.files[0]);
      event.target.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        processFile(event.dataTransfer.files[0]);
        event.dataTransfer.clearData();
    }
  };
  
  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(isEntering);
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleClearListing = () => {
    onSetListing(null);
    setColumnAnalysis(null);
    setError(null);
    setHighlightEnabled(false);
    setSelectedRows(new Set());
  };

  const handleSelectRow = (rowIndex: number) => {
    setSelectedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(rowIndex)) {
            newSet.delete(rowIndex);
        } else {
            newSet.add(rowIndex);
        }
        return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          const allRowIndices = new Set(listing?.rows.map((_, index) => index) || []);
          setSelectedRows(allRowIndices);
      } else {
          setSelectedRows(new Set());
      }
  };

  const handleProceed = () => {
      if (!listing || !columnAnalysis || !canProceed) return;

      const { typeKey, sizeKey, priceKey } = columnAnalysis;
      
      const selectedData = Array.from(selectedRows).map(rowIndex => {
          // FIX: Removed unnecessary cast as `listing.rows` is now strongly typed.
          const row = listing.rows[rowIndex];
          return {
              type: String(row[typeKey] || 'N/A'),
              size: Number(row[sizeKey] || 0),
              spaPrice: Number(row[priceKey] || 0),
          };
      });

      onProceedToProjection(selectedData);
  };

  return (
    <div className="-mt-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">Unit Listing Reference</h1>
        <p className="text-gray-600 mt-2">Drop your Excel file to let the AI identify columns and find the best deals.</p>
      </header>

      <main>
        {!listing && !isLoading && (
            <div
                onDrop={handleDrop}
                onDragOver={(e) => handleDragEvents(e, true)}
                onDragEnter={(e) => handleDragEvents(e, true)}
                onDragLeave={(e) => handleDragEvents(e, false)}
                onClick={triggerFileSelect}
                className={`
                    bg-gray-50 p-6 rounded-lg shadow-lg border-2 border-dashed border-gray-300 text-center
                    flex flex-col justify-center items-center min-h-[250px] cursor-pointer
                    transition-all duration-300
                    ${isDragging ? 'border-[#700d1d] bg-red-50 scale-105' : 'hover:border-gray-400'}
                `}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 text-gray-400 transition-colors ${isDragging ? 'text-[#700d1d]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-800 mt-4">
                    {isDragging ? "Drop the file to start!" : "Drag & Drop Excel File"}
                </h2>
                <p className="text-gray-600 mt-1">or click here to browse your computer</p>
            </div>
        )}
        
        {isLoading && (
            <div className="flex justify-center items-center py-20 min-h-[250px] bg-gray-50 rounded-lg shadow-inner">
                <Spinner />
                <span className="ml-4 text-lg text-gray-700">AI is analyzing your file...</span>
            </div>
        )}

        {error && (
             <div className="text-center text-red-600 bg-red-50 p-4 rounded-md my-6">
                <p>{error}</p>
                <Button onClick={handleClearListing} variant="danger" size="sm" className="mt-2">Try Again</Button>
             </div>
        )}

        {listing && (
            <div className="bg-white rounded-lg shadow-2xl ring-1 ring-gray-200 p-4">
                <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 truncate" title={listing.name}>{listing.name}</h2>
                        {columnAnalysis && (
                             <div className="text-xs text-gray-600 bg-gray-100 p-2 mt-2 rounded-md border border-gray-200">
                                <span className="font-semibold">AI Column Mapping:</span>
                                <span> Type: <strong className="text-gray-800">'{columnAnalysis.typeKey}'</strong> |</span>
                                <span> Size: <strong className="text-gray-800">'{columnAnalysis.sizeKey}'</strong> |</span>
                                <span> Price: <strong className="text-gray-800">'{columnAnalysis.priceKey}'</strong> |</span>
                                <span> Unit No: <strong className="text-gray-800">'{columnAnalysis.unitNoKey}'</strong></span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        {bestDealAnalysis && (
                            <div className="flex items-center gap-2 p-2 rounded-md bg-gray-100">
                                <label htmlFor="highlight-toggle" className="text-sm font-medium text-gray-700 cursor-pointer">Highlight Best Deals</label>
                                <input
                                    id="highlight-toggle"
                                    type="checkbox"
                                    checked={highlightEnabled}
                                    onChange={e => setHighlightEnabled(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]"
                                />
                            </div>
                        )}
                        <Button onClick={handleClearListing} variant="danger" size="sm">
                            Clear & Load New
                        </Button>
                    </div>
                </div>
                
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="min-w-full text-sm text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr>
                                <th className="p-3 w-12">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={listing.rows.length > 0 && selectedRows.size === listing.rows.length}
                                        className="h-4 w-4 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]"
                                    />
                                </th>
                                {listing.headers.map(header => (
                                    <th key={header} className="p-3 font-semibold text-gray-600 border-b-2 border-gray-300">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {listing.rows.map((row, rowIndex) => {
                                let isBestDealRow = false;
                                if (highlightEnabled && bestDealAnalysis && columnAnalysis) {
                                    const size = row[columnAnalysis.sizeKey];
                                    const unitNo = row[columnAnalysis.unitNoKey];
                                    if (size !== undefined && unitNo !== undefined) {
                                        const winningUnitNo = bestDealAnalysis.winningUnits[String(size)];
                                        if (unitNo === winningUnitNo) {
                                            isBestDealRow = true;
                                        }
                                    }
                                }

                                return (
                                <tr 
                                    key={rowIndex} 
                                    className={`transition-colors ${selectedRows.has(rowIndex) ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                                    style={{ backgroundColor: isBestDealRow ? '#fef08a' : undefined }}
                                >
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(rowIndex)}
                                            onChange={() => handleSelectRow(rowIndex)}
                                            className="h-4 w-4 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]"
                                        />
                                    </td>
                                    {/* FIX: Explicitly type the 'header' variable as a string to prevent a potential type inference issue that causes an indexing error. */}
                                    {listing.headers.map((header: string) => (
                                        <td 
                                            key={`${rowIndex}-${header}`} 
                                            className={`p-3 text-gray-700 whitespace-nowrap ${isBestDealRow ? 'font-bold' : ''}`}
                                        >
                                            {/* FIX: Cast row to 'any' to resolve 'unknown' index type error. This is a safe escape hatch for data from external files. */}
                                            {String((row as any)[header])}
                                        </td>
                                    ))}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        <div className="mt-12 w-full flex justify-center items-center gap-6">
            {listing && (
                <Button onClick={handleProceed} size="md" disabled={!canProceed} title={!canProceed ? "Please select units to proceed." : ""}>
                    Proceed to Projection ({selectedRows.size} selected)
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Button>
            )}
        </div>
      </main>
    </div>
  );
};

export default UnitListingPage;
