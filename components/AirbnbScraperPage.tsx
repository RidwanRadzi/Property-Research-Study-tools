
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { AirbnbScraperData, ScraperMode, AirbnbFileData, AirbnbLayoutSummary, AirbnbOccupancySummary, AirbnbRawData } from '../types';
import { scrapeAirbnbListings, scrapeAirbnbListingsAI } from '../services/geminiService';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import Input from './ui/Input';

interface AirbnbScraperPageProps {
  area: string;
  scrapedData: AirbnbScraperData | null;
  onSetScrapedData: (data: AirbnbScraperData | null) => void;
  fileData: AirbnbFileData | null;
  onSetFileData: (data: AirbnbFileData | null) => void;
  scraperMode: ScraperMode;
}

const AirbnbScraperPage: React.FC<AirbnbScraperPageProps> = ({ 
    area, 
    scrapedData, 
    onSetScrapedData,
    fileData,
    onSetFileData,
    scraperMode 
}) => {
    const [city, setCity] = useState('Selangor');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'scrape' | 'upload'>('scrape');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleScrape = async () => {
        if (!area || !city) {
            setError("Both area and city must be provided for an accurate search.");
            return;
        }
        setIsLoading(true);
        setError(null);
        onSetScrapedData(null);
        try {
            let result;
            if (scraperMode === 'live') {
                result = await scrapeAirbnbListings(area, city);
            } else {
                result = await scrapeAirbnbListingsAI(area, city);
            }

            const listingsWithIds = result.listings.map(r => ({ ...r, id: crypto.randomUUID() }));
            onSetScrapedData({
                area: area,
                city: city,
                listings: listingsWithIds,
                averagePricePerNight: result.averagePricePerNight,
                estimatedOccupancyRate: result.estimatedOccupancyRate,
            });
        } catch (e: any) {
            setError(e.message || "An unknown error occurred while scraping.");
            onSetScrapedData(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    const calculateSummary = (data: AirbnbRawData[]): { layoutSummary: AirbnbLayoutSummary[], occupancySummary: AirbnbOccupancySummary | null, error: string | null } => {
        if (data.length === 0) {
            return { layoutSummary: [], occupancySummary: null, error: "The uploaded file is empty." };
        };

        const headers = Object.keys(data[0]);
        const findKey = (possibleKeys: string[]): string | undefined => {
            for (const key of possibleKeys) {
                const foundHeader = headers.find(h => h.toLowerCase().trim().includes(key));
                if (foundHeader) return foundHeader;
            }
            return undefined;
        };
        
        const layoutKey = findKey(['no. bedroom', 'bedroom', 'layout']);
        const dailyRateKey = findKey(['daily rate', 'rate']);
        const occupancyKey = findKey(['occupancy rate', 'occupancy']);

        if (!layoutKey || !dailyRateKey || !occupancyKey) {
            let missing = [
                !layoutKey && "'No. Bedroom'",
                !dailyRateKey && "'Daily Rate'",
                !occupancyKey && "'Occupancy Rate'"
            ].filter(Boolean).join(', ');
            return { layoutSummary: [], occupancySummary: null, error: `Could not find required columns. Please ensure your Excel file has columns for: ${missing}.` };
        }
        
        const cleanNumeric = (val: any) => parseFloat(String(val).replace(/[RM,%]/g, '').trim());

        const groupedByLayout: { [key: string]: { rates: number[], occupancies: number[] } } = {};
        const allOccupancies: number[] = [];

        data.forEach(row => {
            const layoutType = String(row[layoutKey] || 'N/A');
            const dailyRate = cleanNumeric(row[dailyRateKey]);
            const occupancy = cleanNumeric(row[occupancyKey]);
            
            if (layoutType && !isNaN(dailyRate) && !isNaN(occupancy)) {
                if (!groupedByLayout[layoutType]) {
                    groupedByLayout[layoutType] = { rates: [], occupancies: [] };
                }
                groupedByLayout[layoutType].rates.push(dailyRate);
                groupedByLayout[layoutType].occupancies.push(occupancy);
                allOccupancies.push(occupancy);
            }
        });
        
        if (Object.keys(groupedByLayout).length === 0) {
            return { layoutSummary: [], occupancySummary: null, error: "No valid data rows could be processed. Please check the data format." };
        }

        const layoutSummary: AirbnbLayoutSummary[] = Object.entries(groupedByLayout).map(([layoutType, data]) => {
            const rateSum = data.rates.reduce((a, b) => a + b, 0);
            const occupancySum = data.occupancies.reduce((a, b) => a + b, 0);
            return {
                layoutType,
                count: data.rates.length,
                avgDailyRate: data.rates.length > 0 ? rateSum / data.rates.length : 0,
                highestDailyRate: data.rates.length > 0 ? Math.max(...data.rates) : 0,
                avgOccupancyRate: data.occupancies.length > 0 ? occupancySum / data.occupancies.length : 0,
            };
        }).sort((a,b) => a.layoutType.localeCompare(b.layoutType));

        let occupancySummary: AirbnbOccupancySummary | null = null;
        if (allOccupancies.length > 3) {
            allOccupancies.sort((a, b) => a - b);
            
            const getQuartile = (q: number) => {
                const pos = (allOccupancies.length - 1) * q;
                const base = Math.floor(pos);
                const rest = pos - base;
                if (allOccupancies[base + 1] !== undefined) {
                    return allOccupancies[base] + rest * (allOccupancies[base + 1] - allOccupancies[base]);
                } else {
                    return allOccupancies[base];
                }
            };
            
            occupancySummary = {
                worstOccupancyRate: getQuartile(0.25),
                currentOccupancyRate: getQuartile(0.50),
                bestOccupancyRate: getQuartile(0.75),
            };
        }

        return { layoutSummary, occupancySummary, error: null };
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        onSetFileData(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) throw new Error("No sheets found in the Excel file.");
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: AirbnbRawData[] = XLSX.utils.sheet_to_json(worksheet);
                const { layoutSummary, occupancySummary, error } = calculateSummary(jsonData);
                
                if (error) {
                    setError(error);
                    onSetFileData(null);
                } else {
                    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
                    onSetFileData({
                        fileName: file.name,
                        headers,
                        rawData: jsonData,
                        layoutSummary,
                        occupancySummary,
                    });
                }
            } catch (err: any) {
                setError(`Error processing file: ${err.message}`);
                onSetFileData(null);
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

    const triggerFileSelect = () => fileInputRef.current?.click();

    const renderScraperView = () => (
        <>
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Area / Neighborhood</label>
                        <div className="p-2 h-10 border border-gray-200 bg-gray-50 rounded-md text-gray-800">{area}</div>
                    </div>
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <Input id="city" type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g., Kuala Lumpur" required />
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <Button onClick={handleScrape} disabled={isLoading || !area || !city}>
                        {isLoading ? <><Spinner /> Scraping...</> : `Scrape Airbnb (${scraperMode === 'ai' ? 'AI Mode' : 'Live Scraper'})`}
                    </Button>
                </div>
            </div>
            {isLoading && (
                <div className="flex justify-center items-center py-20">
                    <Spinner /><span className="ml-4 text-lg text-gray-700">Fetching Airbnb data... This may take a moment.</span>
                </div>
            )}
            {!isLoading && !error && (scrapedData ? renderScrapedDataView(scrapedData) : renderInitialScrapeView())}
        </>
    );

    const renderUploadView = () => (
        <>
             {isLoading && (
                <div className="flex justify-center items-center py-20">
                    <Spinner /><span className="ml-4 text-lg text-gray-700">Analyzing Airbnb data...</span>
                </div>
            )}
            {!isLoading && !error && (fileData ? renderFileDataView(fileData) : renderInitialUploadView())}
        </>
    );

    const renderScrapedDataView = (data: AirbnbScraperData) => (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h3 className="text-xl font-semibold text-gray-800 truncate">
                    Airbnb Listings for: <span className="font-normal text-gray-600">{data.area}, {data.city}</span>
                </h3>
                <Button onClick={() => onSetScrapedData(null)} variant="danger" size="sm">
                    Clear Data & Scrape Again
                </Button>
            </div>
            {data.averagePricePerNight !== undefined && data.estimatedOccupancyRate !== undefined && (
                <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xl text-center">
                        <h4 className="text-lg font-semibold text-gray-600">Average Price / Night</h4>
                        <p className="text-4xl font-bold text-[#700d1d] mt-2">
                            RM{data.averagePricePerNight.toFixed(0)}
                        </p>
                    </div>
                    <div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xl text-center h-full">
                            <h4 className="text-lg font-semibold text-gray-600">Estimated Occupancy Rate</h4>
                            <p className="text-4xl font-bold text-[#700d1d] mt-2">
                                {data.estimatedOccupancyRate.toFixed(0)}%
                            </p>
                        </div>
                        <div className="mt-2 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-md border">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                            <span>This is an AI-driven estimate based on the number of listings found, review frequency, and general market demand for this specific area.</span>
                        </div>
                    </div>
                </div>
            )}
             <div className="overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200 max-h-[70vh]">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600">Listing Title</th>
                            <th className="p-3 font-semibold text-gray-600">Price/Night</th>
                            <th className="p-3 font-semibold text-gray-600">Rating</th>
                            <th className="p-3 font-semibold text-gray-600">Reviews</th>
                            <th className="p-3 font-semibold text-gray-600">Type</th>
                            <th className="p-3 font-semibold text-gray-600">Guests</th>
                            <th className="p-3 font-semibold text-gray-600">Beds</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.listings.map(listing => (
                            <tr key={listing.id} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900 max-w-xs truncate">
                                    <a href={listing.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600" title={listing.title}>
                                        {listing.title}
                                    </a>
                                </td>
                                <td className="p-3 text-gray-700 font-semibold">RM{listing.pricePerNight.toLocaleString()}</td>
                                <td className="p-3 text-gray-700">{listing.rating > 0 ? listing.rating.toFixed(2) : 'N/A'}</td>
                                <td className="p-3 text-gray-700">{listing.numberOfReviews}</td>
                                <td className="p-3 text-gray-700">{listing.propertyType}</td>
                                <td className="p-3 text-gray-700 text-center">{listing.guests}</td>
                                <td className="p-3 text-gray-700 text-center">{listing.beds}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const renderFileDataView = (data: AirbnbFileData) => (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h3 className="text-xl font-semibold text-gray-800 truncate">
                    Airbnb Summary: <span className="font-normal text-gray-600">{data.fileName}</span>
                </h3>
                <Button onClick={() => onSetFileData(null)} variant="danger" size="sm">
                    Clear Data & Upload New
                </Button>
            </div>
             <div className="overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-3 font-semibold text-gray-600">Layout</th>
                            <th className="p-3 font-semibold text-gray-600 text-center">Listings</th>
                            <th className="p-3 font-semibold text-gray-600">Average Daily Rate (RM)</th>
                            <th className="p-3 font-semibold text-gray-600">Highest Daily Rate (RM)</th>
                            <th className="p-3 font-semibold text-gray-600">Average Occupancy Rate (%)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.layoutSummary.map(summary => (
                            <tr key={summary.layoutType} className="hover:bg-gray-50">
                                <td className="p-3 font-medium text-gray-900">{summary.layoutType}</td>
                                <td className="p-3 text-gray-700 text-center">{summary.count}</td>
                                <td className="p-3 text-gray-700 font-semibold">{summary.avgDailyRate.toFixed(2)}</td>
                                <td className="p-3 text-gray-700">{summary.highestDailyRate.toFixed(2)}</td>
                                <td className="p-3 text-gray-700 font-semibold">{summary.avgOccupancyRate.toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data.occupancySummary && (
                <div className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Occupancy Rate Analysis</h3>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
                        <table className="min-w-full text-sm text-left">
                            <tbody className="divide-y divide-gray-200">
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 font-semibold text-gray-600 w-1/3">Best Occupancy Rate (3rd Quartile)</td>
                                    <td className="p-3 text-gray-700 font-bold">{data.occupancySummary.bestOccupancyRate.toFixed(2)}%</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 font-semibold text-gray-600">Current Occupancy Rate (Median)</td>
                                    <td className="p-3 text-gray-700 font-bold">{data.occupancySummary.currentOccupancyRate.toFixed(2)}%</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="p-3 font-semibold text-gray-600">Worst Occupancy Rate (1st Quartile)</td>
                                    <td className="p-3 text-gray-700 font-bold">{data.occupancySummary.worstOccupancyRate.toFixed(2)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Raw Data from {data.fileName}</h3>
                <div className="overflow-x-auto bg-white rounded-lg shadow ring-1 ring-gray-200 max-h-[60vh]">
                    <table className="min-w-full text-sm text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr>{data.headers.map(header => <th key={header} className="p-3 font-semibold text-gray-600 border-b-2 border-gray-300">{header}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.rawData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50">
                                    {data.headers.map(header => <td key={`${rowIndex}-${header}`} className="p-3 text-gray-700 whitespace-nowrap">{String(row[header])}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderInitialScrapeView = () => (
        <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg mt-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <h3 className="mt-2 text-xl font-semibold text-gray-700">Ready to Scrape Airbnb</h3>
            <p className="mt-1 text-sm text-gray-500">Enter a city and click the button to fetch live short-stay rental data.</p>
        </div>
    );

    const renderInitialUploadView = () => (
        <>
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 text-center mt-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload Airbnb Data File</h2>
                <p className="text-gray-600 mb-4">Select an XLS or XLSX file to begin analysis.</p>
                <Button onClick={triggerFileSelect} disabled={isLoading}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    {isLoading ? 'Processing...' : 'Browse & Upload File'}
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>
            </div>
            <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg mt-8">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <h3 className="mt-2 text-xl font-semibold text-gray-700">No Data Uploaded</h3>
                <p className="mt-1 text-sm text-gray-500">Upload an Excel file to see the Airbnb price summary.</p>
            </div>
        </>
    );

    return (
        <div className="-mt-8">
            <header className="text-center mb-10 w-full">
                <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">Airbnb</h1>
                <p className="text-gray-600 mt-2">Analyze short-stay rental potential by scraping live data or uploading your own file.</p>
            </header>
            
            <main className="w-full max-w-7xl mx-auto">
                 <div className="flex justify-center mb-6">
                    <div className="flex rounded-lg shadow-sm border border-gray-300 bg-gray-100 p-1 space-x-1">
                        <button
                            onClick={() => setMode('scrape')}
                            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#700d1d] ${mode === 'scrape' ? 'bg-white text-[#700d1d] shadow' : 'bg-transparent text-gray-600 hover:bg-white/60'}`}
                        >
                            Scrape Airbnb
                        </button>
                        <button
                            onClick={() => setMode('upload')}
                            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#700d1d] ${mode === 'upload' ? 'bg-white text-[#700d1d] shadow' : 'bg-transparent text-gray-600 hover:bg-white/60'}`}
                        >
                           Upload File
                        </button>
                    </div>
                </div>

                {error && <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}
                
                {mode === 'scrape' ? renderScraperView() : renderUploadView()}
            </main>

        </div>
    );
};

export default AirbnbScraperPage;
