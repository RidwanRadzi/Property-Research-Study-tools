
import React, { useState, useEffect } from 'react';
import { getAreaAnalysis } from '../services/geminiService';
import { AreaAnalysisData } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';

interface AreaAnalysisPageProps {
    onNavigateToWholeUnitRentals: () => void;
    area: string;
    propertyName: string;
}

const AreaAnalysisPage: React.FC<AreaAnalysisPageProps> = ({ onNavigateToWholeUnitRentals, area, propertyName }) => {
    const [analysisData, setAnalysisData] = useState<AreaAnalysisData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalysis = async () => {
            if (!area || !propertyName) {
                setError("Area and property name are required to generate an analysis.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const data = await getAreaAnalysis(area, propertyName);
                setAnalysisData(data);
            } catch (e: any) {
                setError(e.message || "An unknown error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalysis();
    }, [area, propertyName]);
    
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-center py-20 bg-gray-50 rounded-lg shadow-inner">
                    <Spinner />
                    <p className="mt-4 text-lg font-semibold text-gray-700">Generating Market Analysis for {area}...</p>
                    <p className="text-gray-500">This might take a moment.</p>
                </div>
            );
        }

        if (error) {
            return <div className="text-center text-red-600 bg-red-50 p-6 rounded-lg shadow">{error}</div>;
        }

        if (!analysisData) {
            return <div className="text-center text-gray-600 bg-gray-50 p-6 rounded-lg shadow">No analysis data could be generated.</div>;
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Amenities Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xl">
                    <h2 className="text-2xl font-bold text-[#700d1d] mb-4 border-b pb-2">Amenities</h2>
                    <div className="space-y-6">
                        {analysisData.amenities.map(category => (
                            <div key={category.category}>
                                <h3 className="font-semibold text-lg text-gray-800 mb-2">{category.category}</h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                                    {category.items.map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Market Sentiments Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xl">
                    <h2 className="text-2xl font-bold text-[#700d1d] mb-4 border-b pb-2">Market Sentiments</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg text-gray-800 mb-2">Overall Sentiment</h3>
                            <p className="text-gray-700">{analysisData.marketSentiments.overallSentiment}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-gray-800 mb-2">Growth Potential</h3>
                            <p className="text-gray-700">{analysisData.marketSentiments.growthPotential}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-gray-800 mb-2">Rental Demand</h3>
                            <p className="text-gray-700">{analysisData.marketSentiments.rentalDemand}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-gray-800 mb-2">Key Drivers</h3>
                             <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                                {analysisData.marketSentiments.keyDrivers.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-gray-800 mb-2">Potential Risks</h3>
                             <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                                {analysisData.marketSentiments.potentialRisks.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Investment POV Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xl">
                    <h2 className="text-2xl font-bold text-[#700d1d] mb-4 border-b pb-2">Investment POV</h2>
                    <div className="space-y-6">
                        <div>
                            <p className="text-gray-700 italic">"{analysisData.investmentPOV.summary}"</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-green-700 mb-2">Strengths</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                                {analysisData.investmentPOV.strengths.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-red-700 mb-2">Weaknesses</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                                {analysisData.investmentPOV.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-blue-700 mb-2">Opportunities</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                                {analysisData.investmentPOV.opportunities.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-orange-700 mb-2">Threats</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                                {analysisData.investmentPOV.threats.map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* News Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xl">
                    <h2 className="text-2xl font-bold text-[#700d1d] mb-4 border-b pb-2">Related News</h2>
                    <div className="space-y-6">
                        {analysisData.news && analysisData.news.length > 0 ? (
                            analysisData.news.map((article, index) => (
                                <div key={index} className="border-l-4 border-[#700d1d] pl-4">
                                    <h3 className="font-bold text-lg text-gray-900">{article.title}</h3>
                                    <p className="text-sm text-gray-500 font-medium mb-1">{article.source}</p>
                                    <p className="text-gray-700 mb-2">{article.summary}</p>
                                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#700d1d] hover:underline">
                                        Read More &rarr;
                                    </a>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600 italic">No recent news found for this specific development.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full -mt-8">
            <header className="text-center mb-10 w-full">
                <h1 className="text-5xl font-bold text-[#700d1d] tracking-tight">
                    Area Analysis
                </h1>
                <p className="text-gray-600 mt-4 text-lg max-w-3xl mx-auto">
                    AI-generated summary of amenities and market sentiments for <span className="font-bold">{propertyName}</span> in <span className="font-bold">{area}</span>.
                </p>
            </header>

            <main className="w-full max-w-7xl">
                {renderContent()}
            </main>

            <div className="mt-12 w-full max-w-7xl flex justify-center items-center gap-6">
                <Button onClick={onNavigateToWholeUnitRentals} size="md" disabled={isLoading || !!error}>
                    Next: Whole Unit Rental
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Button>
            </div>
        </div>
    );
};

export default AreaAnalysisPage;
