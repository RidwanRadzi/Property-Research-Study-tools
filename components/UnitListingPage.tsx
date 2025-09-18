
import React, { useRef, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { UnitListing } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import Input from './ui/Input';

interface UnitListingPageProps {
  listing: UnitListing | null;
  onSetListing: (listing: UnitListing | null) => void;
  onNavigateBack: () => void;
  onProceedToProjection: (selectedUnits: { type: string; size: number; spaPrice: number }[]) => void;
}

// Data structure for the analysis result
interface AnalysisResult {
    sizeKey: string;
    priceKey: string;
    unitNoKey: string;
    // Stores the Unit No. of the single best deal for each size
    winningUnits: { [size: string]: string | number };
}

const UnitListingPage: React.FC<UnitListingPageProps> = ({ listing, onSetListing, onNavigateBack, onProceedToProjection }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightEnabled, setHighlightEnabled] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Analyze data whenever a new listing is set
  const analysisResult = useMemo<AnalysisResult | null>(() => {
    if (!listing || !listing.rows.length) return null;

    const { headers, rows } = listing;

    // Helper to find a key from a list of possible names (case-insensitive)
    const findKey = (possibleKeys: string[]): string | undefined => {
        for (const key of possibleKeys) {
            const foundHeader = headers.find(h => h.toLowerCase().trim() === key);
            if (foundHeader) return foundHeader;
        }
        return undefined;
    };

    const sizeKey = findKey(['sqft']);
    const priceKey = findKey(['spa price (rm)']);
    const unitNoKey = findKey(['unit no.', 'unit no']);

    if (!sizeKey || !priceKey || !unitNoKey) {
      console.warn("Could not find required 'SQFT', 'SPA Price (RM)', or 'Unit No.' columns for highlighting.");
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

      // Find the lowest price in the group
      const lowestPrice = Math.min(...items.map(item => Number(item[priceKey])).filter(p => !isNaN(p)));
      
      // Find the first unit that has this lowest price
      const bestUnit = items.find(item => Number(item[priceKey]) === lowestPrice);

      if (bestUnit) {
        winningUnits[size] = bestUnit[unitNoKey];
      }
    });

    return { sizeKey, priceKey, unitNoKey, winningUnits };
  }, [listing]);

  const columnKeys = useMemo<{ sizeKey?: string; priceKey?: string; typeKey?: string }>(() => {
    if (!listing || listing.headers.length < 7) {
        return {};
    }

    const typeKey = listing.headers[1]; // 2nd column
    const sizeKey = listing.headers[2]; // 3rd column
    const priceKey = listing.headers[6]; // 7th column

    // A simple validation to ensure keys were found
    if (typeKey && sizeKey && priceKey) {
        return { typeKey, sizeKey, priceKey };
    }
    return {};
  }, [listing]);

  const canProceed = !!(columnKeys.sizeKey && columnKeys.priceKey && columnKeys.typeKey && selectedRows.size > 0);

  const processAndSetListing = (jsonData: any[], fileName: string) => {
      if (jsonData.length === 0) {
        throw new Error("The Excel file is empty or has an unsupported format.");
      }

      const headers = Object.keys(jsonData[0]);
      onSetListing({
        name: fileName,
        headers: headers,
        rows: jsonData,
      });
      setHighlightEnabled(false);
      setSelectedRows(new Set());
  }

  const handleParseFile = (file: File) => {
    setIsLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            throw new Error("No sheets found in the Excel file.");
        }
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
        processAndSetListing(jsonData, file.name);

      } catch (err: any) {
         setError(`Error parsing file: ${err.message}`);
         onSetListing(null);
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
      handleParseFile(event.target.files[0]);
      event.target.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl) {
      setError('Please enter a Google Sheet URL.');
      return;
    }
    
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = googleSheetUrl.match(regex);
    if (!match || !match[1]) {
      setError('Invalid Google Sheet URL format. Please provide a standard shareable link.');
      return;
    }

    const sheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet. Status: ${response.status}. Make sure the sheet's link sharing is set to "Anyone with the link".`);
      }
      const arrayBuffer = await response.arrayBuffer();
      
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
       if (!sheetName) {
            throw new Error("No sheets found in the Google Sheet.");
        }
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
      
      const sheetDisplayName = `Google Sheet - ${sheetId.substring(0, 12)}`;
      processAndSetListing(jsonData, sheetDisplayName);

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred while fetching the Google Sheet.');
      onSetListing(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearListing = () => {
    onSetListing(null);
    setGoogleSheetUrl('');
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
      if (!listing || !canProceed) return;

      const { sizeKey, priceKey, typeKey } = columnKeys;
      
      const selectedData = Array.from(selectedRows).map(rowIndex => {
          const row = listing.rows[rowIndex];
          return {
              type: String(row[typeKey!]),
              size: Number(row[sizeKey!]),
              spaPrice: Number(row[priceKey!]),
          };
      });

      onProceedToProjection(selectedData);
  };

  return (
    <>
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">Unit Listing Reference</h1>
        <p className="text-gray-600 mt-2">Upload a listing, select units, and proceed to generate a cash flow projection.</p>
      </header>

      <main>
        {!listing && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-6 rounded-lg shadow-lg border border-gray-200 text-center flex flex-col justify-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload from PC</h2>
              <p className="text-gray-600 mb-4">Select an XLS or XLSX file to display.</p>
              <Button onClick={triggerFileSelect} disabled={isLoading}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Browse & Upload File
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              />
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-lg border border-gray-200 text-center flex flex-col justify-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Import from Google Drive</h2>
              <p className="text-gray-600 mb-4">Paste the URL of a public Google Sheet.</p>
              <div className="flex gap-2">
                 <Input 
                   type="text"
                   value={googleSheetUrl}
                   onChange={e => setGoogleSheetUrl(e.target.value)}
                   placeholder="https://docs.google.com/spreadsheets/..."
                   disabled={isLoading}
                 />
                 <Button onClick={handleFetchGoogleSheet} disabled={isLoading} className="flex-shrink-0">
                   Load
                 </Button>
              </div>
            </div>
          </div>
        )}
        
        {isLoading && (
            <div className="flex justify-center items-center py-20">
                <Spinner />
                <span className="ml-4 text-lg text-gray-700">Processing data...</span>
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
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <div className="flex-grow">
                        <h2 className="text-xl font-bold text-gray-800 truncate" title={listing.name}>{listing.name}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {analysisResult && (
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
                 {!analysisResult && (
                     <div className="text-sm text-yellow-800 bg-yellow-50 p-3 rounded-md mb-4">
                        <strong>Note:</strong> Could not find "SQFT", "SPA Price (RM)", and "Unit No." columns to enable best deal highlighting.
                    </div>
                )}
                 {listing && (!columnKeys.sizeKey || !columnKeys.priceKey || !columnKeys.typeKey) && (
                    <div className="text-sm text-red-800 bg-red-50 p-3 rounded-md mb-4">
                        <strong>Error:</strong> Cannot proceed. Please ensure your file has at least 7 columns, with Layout Type in the 2nd, SQFT in the 3rd, and SPA Price (RM) in the 7th.
                    </div>
                )}
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
                            {listing.rows.map((row: any, rowIndex) => {
                                let isBestDealRow = false;
                                if (highlightEnabled && analysisResult) {
                                    const size = row[analysisResult.sizeKey];
                                    const unitNo = row[analysisResult.unitNoKey];
                                    if (size !== undefined && unitNo !== undefined) {
                                        const winningUnitNo = analysisResult.winningUnits[String(size)];
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
                                    {listing.headers.map(header => (
                                        <td 
                                            key={`${rowIndex}-${header}`} 
                                            className={`p-3 text-gray-700 whitespace-nowrap ${isBestDealRow ? 'font-bold' : ''}`}
                                        >
                                            {row[header]}
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
            <Button onClick={onNavigateBack} variant="primary" className="bg-gray-600 hover:bg-gray-500 focus:ring-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Area Analysis
            </Button>
            {listing && (
                <Button onClick={handleProceed} size="md" disabled={!canProceed} title={!canProceed ? "Please select units and ensure required columns are present." : ""}>
                    Proceed to Projection ({selectedRows.size} selected)
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Button>
            )}
        </div>
      </main>
    </>
  );
};

export default UnitListingPage;
