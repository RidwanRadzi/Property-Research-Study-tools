
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { TransactionData, TransactionDevelopmentSummary, TransactionRawData } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

interface TransactionPageProps {
  data: TransactionData | null;
  onSetData: (data: TransactionData | null) => void;
}

const TransactionPage: React.FC<TransactionPageProps> = ({ data, onSetData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const calculateSummary = (rawData: TransactionRawData[]): { summary: TransactionDevelopmentSummary[], error: string | null } => {
        if (rawData.length === 0) {
            return { summary: [], error: "The uploaded file contains no valid data after filtering." };
        };

        const headers = Object.keys(rawData[0]);
        const findKey = (possibleKeys: string[]): string | undefined => {
            for (const key of possibleKeys) {
                const foundHeader = headers.find(h => h.toLowerCase().trim().includes(key));
                if (foundHeader) return foundHeader;
            }
            return undefined;
        };

        const devKey = findKey(['development', 'project']);
        const priceKey = findKey(['price']);
        const sizeKey = findKey(['size', 'sqft', 'built-up', 'bu']);


        if (!devKey || !priceKey || !sizeKey) {
            let missing = [
                !devKey && "'Development'",
                !priceKey && "'Price'",
                !sizeKey && "'Size (sqft)'"
            ].filter(Boolean).join(', ');
            return { summary: [], error: `Could not find required columns. Please ensure your Excel file has columns for: ${missing}.` };
        }
        
        const cleanNumeric = (val: any) => parseFloat(String(val).replace(/[RM,]/g, '').trim());

        const groupedByDev: { [key: string]: { prices: number[], psfs: number[] } } = {};
        rawData.forEach(row => {
            const devName = row[devKey];
            const price = cleanNumeric(row[priceKey]);
            const size = cleanNumeric(row[sizeKey]);

            if (devName && !isNaN(price) && !isNaN(size) && size > 0) {
                if (!groupedByDev[devName]) {
                    groupedByDev[devName] = { prices: [], psfs: [] };
                }
                groupedByDev[devName].prices.push(price);
                groupedByDev[devName].psfs.push(price / size);
            }
        });
        
        const finalSummary: TransactionDevelopmentSummary[] = Object.entries(groupedByDev).map(([devName, {prices, psfs}]) => {
            prices.sort((a, b) => a - b);
            let medianPrice;
            const midPrice = Math.floor(prices.length / 2);
            medianPrice = prices.length % 2 === 0 ? (prices[midPrice - 1] + prices[midPrice]) / 2 : prices[midPrice];
            
            psfs.sort((a, b) => a - b);
            let medianPsf;
            const midPsf = Math.floor(psfs.length / 2);
            medianPsf = psfs.length % 2 === 0 ? (psfs[midPsf - 1] + psfs[midPsf]) / 2 : psfs[midPsf];

            return {
                developmentName: devName,
                count: prices.length,
                medianPrice,
                medianPsf,
            };
        }).sort((a,b) => a.developmentName.localeCompare(b.developmentName));

        if (finalSummary.length === 0) {
            return { summary: [], error: "No valid data could be summarized from the file." };
        }
        return { summary: finalSummary, error: null };
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        onSetData(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) throw new Error("No sheets found in the Excel file.");
                
                const worksheet = workbook.Sheets[sheetName];
                
                // Manually parse to handle headers more robustly
                const dataAoA: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

                if (dataAoA.length < 2) { // Need at least a header and one data row
                    throw new Error("The Excel file must contain a header row and at least one data row.");
                }

                const fileHeaders = dataAoA[0].map(h => String(h || '').trim());
                const dataRows = dataAoA.slice(1);

                const jsonData: TransactionRawData[] = dataRows.map(row => {
                    const rowData: TransactionRawData = {};
                    fileHeaders.forEach((header, index) => {
                        if (header) { // Ensure header is not an empty string
                            rowData[header] = row[index];
                        }
                    });
                    return rowData;
                });
                
                const sellerKey = fileHeaders.find(h => h.toLowerCase().trim().includes('seller'));

                if (!sellerKey) {
                    throw new Error("Could not automatically find the 'Seller' column in your Excel file. Filtering could not be applied. Please ensure the header is in the first row.");
                }
                
                // Filter the data based on the 'Seller' column
                const corporateKeywords = ["sdn bhd", "berhad"];
                const filteredData = jsonData.filter(row => {
                    const sellerValue = row[sellerKey];
                    const sellerName = sellerValue ? String(sellerValue).trim() : '';

                    // 1. Eliminate blank/undefined sellers
                    if (!sellerName) {
                        return false;
                    }

                    const sellerLower = sellerName.toLowerCase();

                    // 2. Eliminate sellers with corporate keywords
                    for (const keyword of corporateKeywords) {
                        if (sellerLower.includes(keyword)) {
                            return false;
                        }
                    }
                    
                    return true; // Keep the row if it passes all checks
                });

                if (filteredData.length === 0) {
                    throw new Error("After filtering for corporate and blank sellers, no valid transactions remained. Please check your data.");
                }

                const { summary, error } = calculateSummary(filteredData);
                
                if (error) {
                    setError(error);
                    onSetData(null);
                } else {
                    onSetData({
                        fileName: file.name,
                        headers: fileHeaders,
                        rawData: filteredData, // Use the filtered data for display
                        summary,
                    });
                }

            } catch (err: any) {
                setError(`Error processing file: ${err.message}`);
                onSetData(null);
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setError("Failed to read the file.");
            setIsLoading(false);
        };
        reader.readAsArrayBuffer(file);
        
        event.target.value = '';
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const renderDataView = (data: TransactionData) => (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h3 className="text-xl font-semibold text-gray-800 truncate">
                    Transaction Summary: <span className="font-normal text-gray-600">{data.fileName}</span>
                </h3>
                <Button onClick={() => onSetData(null)} variant="danger" size="sm">
                    Clear Data & Upload New
                </Button>
            </div>
             <div className="overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600">Development Name</th>
                            <th className="p-3 font-semibold text-gray-600 text-center">Listings</th>
                            <th className="p-3 font-semibold text-gray-600">Median Price (RM)</th>
                            <th className="p-3 font-semibold text-gray-600">Median Price (PSF)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.summary.map(dev => (
                            <tr key={dev.developmentName} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">{dev.developmentName}</td>
                                <td className="p-3 text-gray-700 text-center">{dev.count}</td>
                                <td className="p-3 text-gray-700 font-semibold">{dev.medianPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td className="p-3 text-gray-700 font-semibold">{dev.medianPsf.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Filtered Raw Data from {data.fileName}</h3>
                <div className="overflow-x-auto bg-white rounded-lg shadow ring-1 ring-gray-200 max-h-[60vh]">
                    <table className="min-w-full text-sm text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr>
                                {data.headers.map(header => (
                                    <th key={header} className="p-3 font-semibold text-gray-600 border-b-2 border-gray-300">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.rawData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50">
                                    {data.headers.map(header => (
                                        <td key={`${rowIndex}-${header}`} className="p-3 text-gray-700 whitespace-nowrap">{String(row[header])}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderUploadView = () => (
        <>
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload Transaction Data</h2>
                <p className="text-gray-600 mb-4">Select an XLS or XLSX file to begin.</p>
                <Button onClick={triggerFileSelect} disabled={isLoading}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {isLoading ? 'Processing...' : 'Browse & Upload File'}
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
            </div>
            <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg mt-8">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-xl font-semibold text-gray-700">No Data Uploaded</h3>
                <p className="mt-1 text-sm text-gray-500">Upload an Excel file to see the transaction summary.</p>
            </div>
        </>
    );

    return (
        <div className="-mt-8">
            <header className="text-center mb-10 w-full">
                <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">Transaction Summary</h1>
                <p className="text-gray-600 mt-2">Upload an Excel file to generate a summary of median price and PSF by development.</p>
            </header>
            
            <main className="w-full max-w-7xl mx-auto">
                {isLoading && (
                    <div className="flex justify-center items-center py-20">
                        <Spinner />
                        <span className="ml-4 text-lg text-gray-700">Analyzing transaction data...</span>
                    </div>
                )}
                {error && <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}
                
                {!isLoading && !error && (data ? renderDataView(data) : renderUploadView())}
            </main>

        </div>
    );
};

export default TransactionPage;
