
import React, { useState } from 'react';
import { AirbnbScraperData, AirbnbListing } from '../types';
import { scrapeAirbnbListings } from '../services/geminiService';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import Input from './ui/Input';

interface AirbnbScraperPageProps {
  area: string;
  data: AirbnbScraperData | null;
  onSetData: (data: AirbnbScraperData | null) => void;
  onNavigateToUnitListings: () => void;
}

const AirbnbScraperPage: React.FC<AirbnbScraperPageProps> = ({ area, data, onSetData, onNavigateToUnitListings }) => {
    const [city, setCity] = useState('Selangor'); // Default city, can be changed by user
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleScrape = async () => {
        if (!area || !city) {
            setError("Both area and city must be provided for an accurate search.");
            return;
        }
        setIsLoading(true);
        setError(null);
        onSetData(null);
        try {
            const result = await scrapeAirbnbListings(area, city);
            const listingsWithIds = result.listings.map(r => ({ ...r, id: crypto.randomUUID() }));
            onSetData({
                area: area,
                city: city,
                listings: listingsWithIds,
                averagePricePerNight: result.averagePricePerNight,
                estimatedOccupancyRate: result.estimatedOccupancyRate,
            });
        } catch (e: any) {
            setError(e.message || "An unknown error occurred while scraping.");
            onSetData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const renderDataView = (data: AirbnbScraperData) => (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h3 className="text-xl font-semibold text-gray-800 truncate">
                    Airbnb Listings for: <span className="font-normal text-gray-600">{data.area}, {data.city}</span>
                </h3>
                <Button onClick={() => onSetData(null)} variant="danger" size="sm">
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
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

    const renderInitialView = () => (
        <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg mt-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-xl font-semibold text-gray-700">Ready to Scrape Airbnb</h3>
            <p className="mt-1 text-sm text-gray-500">Enter a city and click the button below to fetch live short-stay rental data.</p>
        </div>
    );


    return (
        <div className="-mt-8">
            <header className="text-center mb-10 w-full">
                <h1 className="text-4xl font-bold text-[#700d1d] tracking-tight">Airbnb Listing Scraper</h1>
                <p className="text-gray-600 mt-2">Get real-time Airbnb data for your subject area to analyze short-stay rental potential.</p>
            </header>
            
            <main className="w-full max-w-7xl mx-auto">
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
                            {isLoading ? <><Spinner /> Scraping...</> : `Scrape Airbnb Listings for ${area}, ${city}`}
                        </Button>
                    </div>
                </div>
                
                {isLoading && (
                    <div className="flex justify-center items-center py-20">
                        <Spinner />
                        <span className="ml-4 text-lg text-gray-700">Fetching Airbnb data... This may take a moment.</span>
                    </div>
                )}
                
                {error && <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}
                
                {!isLoading && !error && (data ? renderDataView(data) : renderInitialView())}
            </main>

            <div className="mt-12 w-full max-w-7xl flex justify-center items-center gap-6">
                <Button onClick={onNavigateToUnitListings} size="md">
                    Next: Unit Listing
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Button>
            </div>
        </div>
    );
};

export default AirbnbScraperPage;