import React, { useState } from 'react';
import Papa from 'papaparse';
import { Transaction, SortedTransactionSummary, TransactionSummary } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

interface TransactionFilterPageProps {
    onNavigateBack: () => void;
    onNavigateToProjection: () => void;
}

const TransactionFilterPage: React.FC<TransactionFilterPageProps> = ({ onNavigateBack, onNavigateToProjection }) => {
    const [csvData, setCsvData] = useState('');
    const [developerNameFilter, setDeveloperNameFilter] = useState('');
    const [filterOptions, setFilterOptions] = useState({
        excludeBlankSeller: true,
        excludeSdnBhd: true,
    });
    const [summary, setSummary] = useState<SortedTransactionSummary | null>(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = () => {
        setProcessing(true);
        setError(null);
        setSummary(null);

        if (!csvData.trim()) {
            setError('Please paste your CSV data into the text area.');
            setProcessing(false);
            return;
        }

        Papa.parse<Transaction>(csvData, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError(`Error parsing CSV: ${results.errors[0].message}`);
                    setProcessing(false);
                    return;
                }
                
                if (!results.data.length || !results.meta.fields?.includes('Development') || !results.meta.fields?.includes('Seller Name') || !results.meta.fields?.includes('Price') || !results.meta.fields?.includes('Year of Completion')) {
                    setError('Invalid CSV format. Please ensure your data has the required columns: "Development", "Seller Name", "Price", "Year of Completion".');
                    setProcessing(false);
                    return;
                }

                processTransactions(results.data);
            },
            error: (err) => {
                setError(`Failed to parse CSV data: ${err.message}`);
                setProcessing(false);
            }
        });
    };
    
    const processTransactions = (transactions: Transaction[]) => {
        const lowerCaseDevNames = developerNameFilter.split(',').map(name => name.trim().toLowerCase()).filter(name => name);

        const filtered = transactions.filter(t => {
            if (!t.Development || t.Price === null || t.Price === undefined) return false;
            
            const sellerName = t['Seller Name'] ? String(t['Seller Name']).toLowerCase() : '';

            if (filterOptions.excludeBlankSeller && !sellerName) return false;
            if (filterOptions.excludeSdnBhd && sellerName.includes('sdn bhd')) return false;

            if (lowerCaseDevNames.length > 0 && lowerCaseDevNames.some(devName => sellerName.includes(devName))) {
                return false;
            }
            
            return true;
        });
        
        const groupedByDev = filtered.reduce((acc, t) => {
            const devName = t.Development;
            if (!acc[devName]) {
                acc[devName] = [];
            }
            acc[devName].push(t);
            return acc;
        }, {} as Record<string, Transaction[]>);

        const summaryList: TransactionSummary[] = [];

        for (const devName in groupedByDev) {
            const group = groupedByDev[devName];
            const prices = group.map(t => t.Price).sort((a, b) => a - b);
            
            let medianPrice;
            const mid = Math.floor(prices.length / 2);
            if (prices.length % 2 === 0) {
                medianPrice = (prices[mid - 1] + prices[mid]) / 2;
            } else {
                medianPrice = prices[mid];
            }
            
            summaryList.push({
                development: devName,
                medianPrice: medianPrice,
                transactionCount: group.length
            });
        }
        
        const sortedSummary: SortedTransactionSummary = {
            newDevelopments: [],
            oldDevelopments: []
        };
        
        summaryList.forEach(summaryItem => {
            const year = groupedByDev[summaryItem.development][0]['Year of Completion'];
            if (year >= 2020) {
                sortedSummary.newDevelopments.push(summaryItem);
            } else {
                sortedSummary.oldDevelopments.push(summaryItem);
            }
        });
        
        setSummary(sortedSummary);
        setProcessing(false);
    };

    return (
        <div className="flex flex-col items-center w-full">
            <header className="text-center mb-10 w-full">
                <h1 className="text-5xl font-bold text-[#700d1d] tracking-tight">Transaction Data Analysis</h1>
                <p className="text-gray-600 mt-4 text-lg max-w-3xl mx-auto">
                    Paste transaction data from Edgeprop to filter and generate a summary of median prices by development.
                </p>
            </header>

            <main className="w-full max-w-7xl">
                <div className="bg-gray-50 p-6 rounded-lg shadow-lg border border-gray-200">
                    <label htmlFor="csvData" className="block text-sm font-medium text-gray-700 mb-2">
                        Paste CSV Data Here
                    </label>
                    <textarea
                        id="csvData"
                        rows={10}
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#700d1d] focus:border-[#700d1d]"
                        placeholder={'Example:\nDevelopment,Seller Name,Price,Year of Completion\n"Project A","John Doe",500000,2022\n"Project B","Some Dev Sdn Bhd",650000,2018'}
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                    />
                     <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Filter Options</label>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <input id="blank-seller" type="checkbox" checked={filterOptions.excludeBlankSeller} onChange={e => setFilterOptions({...filterOptions, excludeBlankSeller: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]" />
                                    <label htmlFor="blank-seller" className="ml-2 text-sm text-gray-800">Exclude rows with blank seller name</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="sdn-bhd" type="checkbox" checked={filterOptions.excludeSdnBhd} onChange={e => setFilterOptions({...filterOptions, excludeSdnBhd: e.target.checked})} className="h-4 w-4 rounded border-gray-300 text-[#700d1d] focus:ring-[#700d1d]" />
                                    <label htmlFor="sdn-bhd" className="ml-2 text-sm text-gray-800">Exclude rows where seller contains "Sdn Bhd"</label>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="developer-name" className="block text-sm font-medium text-gray-700 mb-2">
                                Developer Name(s) to Exclude
                            </label>
                            <input
                                id="developer-name"
                                type="text"
                                value={developerNameFilter}
                                onChange={(e) => setDeveloperNameFilter(e.target.value)}
                                placeholder="e.g., Sunway, SP Setia (comma-separated)"
                                className="w-full bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#700d1d] focus:border-[#700d1d]"
                            />
                        </div>
                    </div>
                    <div className="mt-6 text-center">
                        <Button onClick={handleAnalyze} disabled={processing}>
                            {processing ? <><Spinner /> Analyzing...</> : "Analyze Transactions"}
                        </Button>
                    </div>
                </div>

                {error && <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}

                {summary && (
                    <div className="mt-10">
                        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Transaction Summary</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <SummaryCard title="New Developments (2020+)" developments={summary.newDevelopments} />
                            <SummaryCard title="Old Developments (<2020)" developments={summary.oldDevelopments} />
                        </div>
                    </div>
                )}
            </main>

            <div className="mt-12 w-full max-w-7xl flex justify-center items-center gap-6">
                <Button onClick={onNavigateBack} variant="primary" className="bg-gray-600 hover:bg-gray-500 focus:ring-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Market Summary
                </Button>
                <Button onClick={onNavigateToProjection} size="md">
                    Proceed to Cash Flow Projection
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Button>
            </div>
        </div>
    );
};

const SummaryCard: React.FC<{title: string, developments: TransactionSummary[]}> = ({ title, developments }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xl">
        <h3 className="font-bold text-2xl text-[#700d1d] mb-4">{title}</h3>
        {developments.length > 0 ? (
            <ul className="divide-y divide-gray-200">
                {developments.map(dev => (
                    <li key={dev.development} className="py-3 flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-gray-800">{dev.development}</p>
                            <p className="text-xs text-gray-500">{dev.transactionCount} transactions</p>
                        </div>
                        <p className="font-bold text-lg text-gray-900">RM {dev.medianPrice.toLocaleString()}</p>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500">No developments match the criteria.</p>
        )}
    </div>
);


export default TransactionFilterPage;