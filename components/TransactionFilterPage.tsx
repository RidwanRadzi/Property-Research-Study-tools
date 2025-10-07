
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, TransactionSummary, ComparableProperty } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

interface TransactionFilterPageProps {
    onNavigateToAreaAnalysis: () => void;
    onSetSummaries: (summaries: Omit<TransactionSummary, 'id'>[]) => void;
    comparables: ComparableProperty[];
}

const TransactionFilterPage: React.FC<TransactionFilterPageProps> = ({ onNavigateToAreaAnalysis, onSetSummaries, comparables }) => {
    const [filteredData, setFilteredData] = useState<Transaction[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [identifiedKeys, setIdentifiedKeys] = useState<{ devKey: string; priceKey: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const calculateSummaries = (data: Transaction[], fileHeaders: string[]) => {
        setError(null);
        setIdentifiedKeys(null);
        onSetSummaries([]);

        // Helper to find a header based on keywords
        const findKey = (keywords: string[]): string | undefined => {
            for (const keyword of keywords) {
                const foundHeader = fileHeaders.find(h => h.toLowerCase().trim().includes(keyword));
                if (foundHeader) return foundHeader;
            }
            return undefined;
        };

        // --- Find Price Key ---
        const priceKey = findKey(['price (rm)', 'price']);
        if (!priceKey) {
            setError("Could not automatically identify the 'Price (RM)' column. Please check the Excel file header.");
            return;
        }

        // --- Find Development Key ---
        let devKey = findKey(['development', 'project', 'property']);

        // If not found by keyword, try matching with comparable property names
        if (!devKey && comparables.length > 0 && data.length > 0) {
            const comparableNames = new Set(comparables.map(c => String(c.name).toLowerCase().trim()));
            if (comparableNames.size > 0) {
                let bestMatch = { header: '', score: 0 };
                // Find the column that has the most matches with the comparable property names
                for (const header of fileHeaders) {
                    let currentScore = 0;
                    // Check a sample of rows for efficiency
                    const sampleSize = Math.min(50, data.length);
                    for (let i = 0; i < sampleSize; i++) {
                        const cellValue = String(data[i][header] || '').toLowerCase().trim();
                        if (comparableNames.has(cellValue)) {
                            currentScore++;
                        }
                    }
                    if (currentScore > bestMatch.score) {
                        bestMatch = { header, score: currentScore };
                    }
                }
                // Use a threshold to confirm the match (e.g., at least 2 matches)
                if (bestMatch.score > 1) {
                    devKey = bestMatch.header;
                }
            }
        }

        if (!devKey) {
            setError("Could not automatically identify the 'Development' column. Please check the Excel file header or ensure comparables are loaded from the home page.");
            return;
        }
        
        setIdentifiedKeys({ devKey, priceKey });

        const groupedByDev: { [key: string]: number[] } = {};
        data.forEach(row => {
            const devName = row[devKey!];
            const price = parseFloat(String(row[priceKey!]).replace(/,/g, ''));
            if (devName && !isNaN(price)) {
                if (!groupedByDev[devName]) {
                    groupedByDev[devName] = [];
                }
                groupedByDev[devName].push(price);
            }
        });

        const summaries: Omit<TransactionSummary, 'id'>[] = Object.entries(groupedByDev).map(([devName, prices]) => {
            prices.sort((a, b) => a - b);
            let medianPrice;
            const mid = Math.floor(prices.length / 2);
            if (prices.length % 2 === 0) {
                medianPrice = (prices[mid - 1] + prices[mid]) / 2;
            } else {
                medianPrice = prices[mid];
            }

            return {
                development: devName,
                medianPrice: medianPrice,
                transactionCount: prices.length
            };
        });
        
        summaries.sort((a, b) => a.development.localeCompare(b.development));
        onSetSummaries(summaries);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setError(null);
        setFilteredData([]);
        setHeaders([]);
        setFileName(null);
        setIdentifiedKeys(null);

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
                const jsonData: Transaction[] = XLSX.utils.sheet_to_json<Transaction>(worksheet);

                if (jsonData.length === 0) {
                    throw new Error("The Excel file is empty or has an unsupported format.");
                }
                
                const corporateKeywords = ["sdn bhd", "sdn. bhd.", "berhad", "development", "construction"];
                const cleanedData = jsonData.filter(t => {
                    const sellerName = t['Seller'] ? String(t['Seller']).trim() : '';
                    const buyerName = t['Buyer'] ? String(t['Buyer']).trim() : '';

                    if (sellerName === '' || buyerName === '') return false;
                    
                    const sellerLower = sellerName.toLowerCase();
                    const buyerLower = buyerName.toLowerCase();

                    for (const keyword of corporateKeywords) {
                        if (sellerLower.includes(keyword) || buyerLower.includes(keyword)) {
                            return false;
                        }
                    }
                    return true;
                });

                if (cleanedData.length === 0) {
                    setError("No valid individual transactions found after filtering. All rows were removed.");
                    onSetSummaries([]);
                } else {
                    const fileHeaders = Object.keys(cleanedData[0]);
                    setHeaders(fileHeaders);
                    setFilteredData(cleanedData);
                    calculateSummaries(cleanedData, fileHeaders);
                }
                
                setFileName(file.name);
            } catch (err: any) {
                setError(`Error processing file: ${err.message}`);
                onSetSummaries([]);
            } finally {
                setProcessing(false);
            }
        };
        reader.onerror = () => {
            setError("Failed to read the file.");
            setProcessing(false);
        };
        reader.readAsArrayBuffer(file);
        
        event.target.value = '';
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };
    
    const renderPreviewTable = () => (
        <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Filtered Transactions: <span className="font-normal text-gray-600">{fileName}</span></h3>
            <div className="overflow-x-auto bg-white rounded-lg shadow ring-1 ring-gray-200 max-h-[60vh]">
                <table className="min-w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr>
                            {headers.map(header => (
                                <th key={header} className="p-3 font-semibold text-gray-600 border-b-2 border-gray-300">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                                {headers.map(header => (
                                    <td key={`${rowIndex}-${header}`} className="p-3 text-gray-700 whitespace-nowrap">{String(row[header])}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col items-center w-full -mt-8">
            <header className="text-center mb-10 w-full">
                <h1 className="text-5xl font-bold text-[#700d1d] tracking-tight">Transaction</h1>
                <p className="text-gray-600 mt-4 text-lg max-w-3xl mx-auto">
                    Upload an Excel file. The app will automatically find the development and price columns, filter out corporate sales, and generate a summary.
                </p>
            </header>

            <main className="w-full max-w-7xl">
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                    <div className="text-center">
                         <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload Transaction Data</h2>
                         <p className="text-gray-600 mb-4">Select an XLS or XLSX file to begin.</p>
                         <Button onClick={triggerFileSelect} disabled={processing}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {processing ? 'Processing...' : (fileName ? 'Upload a Different File' : 'Browse & Upload File')}
                         </Button>
                         <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                         />
                    </div>

                    {identifiedKeys && (
                        <div className="mt-4 text-center text-sm text-green-800 bg-green-50 p-3 rounded-md">
                            Successfully identified columns: 
                            <strong> Development</strong> as '{identifiedKeys.devKey}' and 
                            <strong> Price</strong> as '{identifiedKeys.priceKey}'.
                        </div>
                    )}
                    
                    {error && <div className="mt-4 text-center text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

                    {processing && (
                        <div className="flex justify-center items-center py-10">
                            <Spinner />
                            <span className="ml-4 text-lg text-gray-700">Analyzing data...</span>
                        </div>
                    )}
                    
                    {!processing && fileName && filteredData.length > 0 && (
                        renderPreviewTable()
                    )}
                    
                    {!processing && fileName && filteredData.length === 0 && !error && (
                         <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg mt-4">
                            <h3 className="text-xl font-semibold text-gray-700">No Data to Display</h3>
                            <p className="mt-1 text-sm text-gray-500">All rows from the file were removed by the filtering rules.</p>
                        </div>
                    )}
                </div>
            </main>

            <div className="mt-12 w-full max-w-7xl flex justify-center items-center gap-6">
                <Button onClick={onNavigateToAreaAnalysis} size="md">
                    Next: Area Analysis
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Button>
            </div>
        </div>
    );
};

export default TransactionFilterPage;
