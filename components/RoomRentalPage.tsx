import React, { useState, useMemo } from 'react';
import { RoomRentalListing } from '../types';
import { findRoomRentals } from '../services/geminiService';
import Button from './ui/Button';
import Input from './ui/Input';
import Spinner from './ui/Spinner';

interface RoomRentalPageProps {
  onNavigateBack: () => void;
}

const RoomRentalPage: React.FC<RoomRentalPageProps> = ({ onNavigateBack }) => {
  const [area, setArea] = useState('Cyberjaya');
  const [listings, setListings] = useState<RoomRentalListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!area.trim()) return;

    setIsLoading(true);
    setError(null);
    setListings([]);

    try {
      const results = await findRoomRentals(area);
      const resultsWithIds = results.map(r => ({ ...r, id: crypto.randomUUID() }));
      
      const getRoomOrder = (roomType: string): number => {
          const lower = roomType.toLowerCase();
          if (lower.includes('master')) return 1;
          if (lower.includes('medium')) return 2;
          if (lower.includes('small') || lower.includes('single')) return 3;
          return 4;
      };
      
      resultsWithIds.sort((a, b) => getRoomOrder(a.roomType) - getRoomOrder(b.roomType));

      setListings(resultsWithIds);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const rentalSummary = useMemo(() => {
    if (listings.length === 0) return null;

    const summaryData: { [key: string]: { prices: number[] } } = {
        'Master Room': { prices: [] },
        'Medium Room': { prices: [] },
        'Small/Single Room': { prices: [] },
    };

    listings.forEach(listing => {
        const lowerType = listing.roomType.toLowerCase();
        if (lowerType.includes('master')) {
            summaryData['Master Room'].prices.push(listing.rentalPrice);
        } else if (lowerType.includes('medium')) {
            summaryData['Medium Room'].prices.push(listing.rentalPrice);
        } else if (lowerType.includes('small') || lowerType.includes('single')) {
            summaryData['Small/Single Room'].prices.push(listing.rentalPrice);
        }
    });
    
    return Object.entries(summaryData)
        .map(([roomType, data]) => {
            if (data.prices.length === 0) return null;
            const count = data.prices.length;
            const minPrice = Math.min(...data.prices);
            const maxPrice = Math.max(...data.prices);
            const avgPrice = data.prices.reduce((a, b) => a + b, 0) / count;
            return { roomType, count, minPrice, maxPrice, avgPrice };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

  }, [listings]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-20">
          <Spinner />
          <span className="ml-4 text-lg text-gray-700">Searching for room rentals...</span>
        </div>
      );
    }

    if (error) {
      return <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>;
    }

    if (listings.length > 0) {
      return (
        <div className="mt-8">
            {rentalSummary && rentalSummary.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Rental Summary for {area}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rentalSummary.map(summary => (
                             <div key={summary.roomType} className="bg-white p-6 rounded-xl border border-gray-200 shadow-xl flex flex-col">
                                <h3 className="font-bold text-xl text-[#700d1d]">{summary.roomType}</h3>
                                <p className="text-sm font-medium text-gray-500 mb-4">{summary.count} listings found</p>
                                <div className="space-y-2 text-base">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-semibold text-gray-600">Price Range:</span>
                                        <span className="font-bold text-gray-900">
                                            RM{summary.minPrice.toLocaleString()} - RM{summary.maxPrice.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-semibold text-gray-600">Average Price:</span>
                                        <span className="font-bold text-lg text-gray-900">
                                            RM{Math.round(summary.avgPrice).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="overflow-x-auto bg-white rounded-lg shadow-2xl ring-1 ring-gray-200">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="p-3 font-semibold text-gray-600">Property Name</th>
                        <th className="p-3 font-semibold text-gray-600">Room Type</th>
                        <th className="p-3 font-semibold text-gray-600">Furnishing</th>
                        <th className="p-3 font-semibold text-gray-600">Rental Price (MYR)</th>
                        <th className="p-3 font-semibold text-gray-600">Source</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {listings.map(listing => (
                        <tr key={listing.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{listing.propertyName}</td>
                        <td className="p-3 text-gray-700">{listing.roomType}</td>
                        <td className="p-3 text-gray-700">{listing.furnishing}</td>
                        <td className="p-3 text-gray-700 font-semibold">{listing.rentalPrice.toLocaleString()}</td>
                        <td className="p-3 text-gray-700">{listing.source}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
      );
    }

    return (
        <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg mt-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-xl font-semibold text-gray-700">Ready to Search</h3>
            <p className="mt-1 text-sm text-gray-500">Enter an area and click search to find room rental listings.</p>
        </div>
    );
  };

  return (
    <>
      <header className="text-center mb-10 w-full">
        <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">Room Rental Reference</h1>
        <p className="text-gray-600 mt-2">Find room rental prices for co-living analysis from sources like ibilik.my and mudah.my.</p>
      </header>

      <main className="w-full max-w-7xl mx-auto">
        <form onSubmit={handleSearch} className="bg-gray-50 p-6 rounded-lg shadow-lg border border-gray-200 flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-grow w-full">
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">Area / Location</label>
            <Input id="area" type="text" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g., Cyberjaya" required />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto h-10 flex-shrink-0">
            {isLoading ? <><Spinner /> Searching...</> : 'Search Room Rentals'}
          </Button>
        </form>

        {renderContent()}
      </main>
      
       <div className="mt-12 text-center">
            <Button onClick={onNavigateBack} variant="primary" className="bg-gray-600 hover:bg-gray-500 focus:ring-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Cash Flow Projection
            </Button>
        </div>
    </>
  );
};

export default RoomRentalPage;