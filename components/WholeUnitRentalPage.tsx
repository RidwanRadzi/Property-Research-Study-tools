import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { WholeUnitRentalData, WholeUnitDevelopmentSummary, WholeUnitRentalRawData } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

interface WholeUnitRentalPageProps {
  data: WholeUnitRentalData | null;
  onSetData: (data: WholeUnitRentalData | null) => void;
  onSummaryGenerated: (summary: WholeUnitDevelopmentSummary[]) => void;
}

const WholeUnitRentalPage: React.FC<WholeUnitRentalPageProps> = ({ data, onSetData, onSummaryGenerated }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const calculateSummary = (data: WholeUnitRentalRawData[]): { summary: WholeUnitDevelopmentSummary[], error: string | null } => {
        if (data.length === 0) {
            return { summary: [], error: "The uploaded file is empty." };
        };

        const headers = Object.keys(data[0]);
        const findKey = (possibleKeys: string[]): string | undefined => {
            for (const key of possibleKeys) {
                const foundHeader = headers.find(h => h.toLowerCase().trim().includes(key));
                if (foundHeader) return foundHeader;
            }
            return undefined;
        };

        const devKey = findKey(['development', 'project']);
        const bedroomKey = findKey(['bedroom', 'layout', 'type']);
        const rentKey = findKey(['rent', 'price']);
        const sizeKey = findKey(['size', 'sqft']);

        if (!devKey || !bedroomKey || !rentKey || !sizeKey) {
            let missing = [
                !devKey && "'Development'",
                !bedroomKey && "'No. Bedroom'",
                !rentKey && "'Rental Price'",
                !sizeKey && "'Size (sqft)'"
            ].filter(Boolean).join(', ');
            return { summary: [], error: `Could not find required columns. Please ensure your Excel file has columns for: ${missing}.` };
        }
        
        const cleanNumeric = (val: any) => parseFloat(String(val).replace(/[RM,]/g, '').trim());

        // Pre-process data and group by development
        const groupedByDev: { [key: string]: any[] } = {};
        data.forEach(row => {
            const devName = row[devKey];
            const rent = cleanNumeric(row[rentKey]);
            const size = cleanNumeric(row[sizeKey]);

            if (devName && !isNaN(rent) && !isNaN(size) && size > 0) {
                if (!groupedByDev[devName]) {
                    groupedByDev[devName] = [];
                }
                groupedByDev[devName].push({
                    ...row,
                    _rent: rent,
                    _size: size,
                    _psf: rent / size
                });
            }
        });
        
        const finalSummary: WholeUnitDevelopmentSummary[] = Object.entries(groupedByDev).map(([devName, listings]) => {
            const groupedByBedroom: { [key: string]: any[] } = {};
            listings.forEach(listing => {
                const bedroomType = listing[bedroomKey] || 'N/A';
                 if (!groupedByBedroom[bedroomType]) {
                    groupedByBedroom[bedroomType] = [];
                }
                groupedByBedroom[bedroomType].push(listing);
            });

            const bedroomSummaries = Object.entries(groupedByBedroom).map(([bedroomType, items]) => {
                const rents = items.map(i => i._rent);
                const psfs = items.map(i => i._psf);

                // --- Mean Calculation ---
                const meanRent = rents.length > 0 ? rents.reduce((a, b) => a + b, 0) / rents.length : 0;

                // --- Mode Calculation ---
                let modeRent: number | string = 'N/A';
                if (rents.length > 1) {
                    const frequencyMap: { [key: number]: number } = {};
                    let maxFreq = 0;
                    
                    for (const rent of rents) {
                        frequencyMap[rent] = (frequencyMap[rent] || 0) + 1;
                        if (frequencyMap[rent] > maxFreq) {
                            maxFreq = frequencyMap[rent];
                        }
                    }

                    if (maxFreq > 1) {
                        const modes = Object.keys(frequencyMap)
                            .filter(rent => frequencyMap[Number(rent)] === maxFreq)
                            .map(Number);
                        modeRent = modes.join(', ');
                    }
                }


                return {
                    bedroomType,
                    count: items.length,
                    minRent: Math.min(...rents),
                    maxRent: Math.max(...rents),
                    minPsf: Math.min(...psfs),
                    maxPsf: Math.max(...psfs),
                    meanRent,
                    modeRent,
                };
            }).sort((a,b) => a.bedroomType.localeCompare(b.bedroomType));

            return {
                developmentName: devName,
                bedrooms: bedroomSummaries,
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
                if (!sheetName) {
                    throw new Error("No sheets found in the Excel file.");
                }
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: WholeUnitRentalRawData[] = XLSX.utils.sheet_to_json(worksheet);
                
                const { summary, error } = calculateSummary(jsonData);
                
                if (error) {
                    setError(error);
                    onSetData(null);
                } else {
                    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
                    onSetData({
                        fileName: file.name,
                        headers,
                        rawData: jsonData,
                        summary,
                    });
                    onSummaryGenerated(summary);
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

    const renderDataView = (data: WholeUnitRentalData) => (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h3 className="text-xl font-semibold text-gray-800 truncate">
                    Rental Summary: <span className="font-normal text-gray-600">{data.fileName}</span>
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
                            <th className="p-3 font-semibold text-gray-600">No. Bedroom</th>
                            <th className="p-3 font-semibold text-gray-600 text-center">Listings</th>
                            <th className="p-3 font-semibold text-gray-600">Whole Unit Rental Range (RM)</th>
                            <th className="p-3 font-semibold text-gray-600">Mean Rent (RM)</th>
                            <th className="p-3 font-semibold text-gray-600">Mode Rent (RM)</th>
                            <th className="p-3 font-semibold text-gray-600">Rental PSF Range (RM)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.summary.flatMap(dev => dev.bedrooms.map((bed, bedIndex) => (
                            <tr key={`${dev.developmentName}-${bed.bedroomType}`} className="hover:bg-gray-50">
                                {bedIndex === 0 && (
                                    <td rowSpan={dev.bedrooms.length} className="p-3 font-medium text-gray-900 align-top border-r">{dev.developmentName}</td>
                                )}
                                <td className="p-3 text-gray-800">{bed.bedroomType}</td>
                                <td className="p-3 text-gray-700 text-center">{bed.count}</td>
                                <td className="p-3 text-gray-700 font-semibold">{`${bed.minRent.toLocaleString()} - ${bed.maxRent.toLocaleString()}`}</td>
                                <td className="p-3 text-gray-700">{bed.meanRent.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                                <td className="p-3 text-gray-700">{bed.modeRent}</td>
                                <td className="p-3 text-gray-700">{`${bed.minPsf.toFixed(2)} - ${bed.maxPsf.toFixed(2)}`}</td>
                            </tr>
                        )))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Raw Data from {data.fileName}</h3>
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
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Upload Rental Data</h2>
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
                <p className="mt-1 text-sm text-gray-500">Upload an Excel file to see the whole unit rental summary.</p>
            </div>
        </>
    );

    return (
        <div className="-mt-8">
            <header className="text-center mb-10 w-full">
                <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">Whole Unit Rental Summary</h1>
                <p className="text-gray-600 mt-2">Upload an Excel file to generate a summary of rental prices and PSF by development and bedroom type.</p>
            </header>
            
            <main className="w-full max-w-7xl mx-auto">
                {isLoading && (
                    <div className="flex justify-center items-center py-20">
                        <Spinner />
                        <span className="ml-4 text-lg text-gray-700">Analyzing rental data...</span>
                    </div>
                )}
                {error && <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}
                
                {!isLoading && !error && (data ? renderDataView(data) : renderUploadView())}
            </main>

        </div>
    );
};

export default WholeUnitRentalPage;