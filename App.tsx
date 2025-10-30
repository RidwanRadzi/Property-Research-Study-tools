import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import WelcomePage from './components/WelcomePage';
import ComparablePropertySelectionPage from './components/ComparablePropertySelectionPage';
import ProjectionPage from './components/ProjectionPage';
import AreaAnalysisPage from './components/AreaAnalysisPage';
import FloorplanPage from './components/FloorplanPage';
import UnitListingPage from './components/UnitListingPage';
import RoomRentalPage from './components/RoomRentalPage';
import WholeUnitRentalPage from './components/WholeUnitRentalPage';
import AskingPricePage from './components/AskingPricePage';
import AirbnbScraperPage from './components/AirbnbScraperPage';
import LiveScraperInfoModal from './components/LiveScraperInfoModal';
import TransactionPage from './components/TransactionPage';
import { setLiveScraperBaseUrl } from './services/geminiService';
// FIX: Removed import for 'DiscoveredComparableProperty' as it does not exist in the types file.
import { Property, SummaryData, Floorplan, UnitListing, GlobalSettings, ProjectionMode, SavedSession, TransactionSummary, WholeUnitRentalData, AskingPriceData, AirbnbScraperData, ComparableProperty, ScraperMode, TransactionData, AirbnbFileData, RoomRentalData, WholeUnitDevelopmentSummary } from './types';
import Button from './components/ui/Button';

type Page = 'welcome' | 'home' | 'areaAnalysis' | 'wholeUnitRental' | 'askingPrice' | 'airbnbScraper' | 'unitListing' | 'projection' | 'floorplan' | 'roomRental' | 'transaction' | 'comparablePropertySelection';

// FIX: Changed JSX.Element to React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
const pageConfig: { id: Page; name: string; icon: React.ReactElement }[] = [
    { id: 'unitListing', name: 'Unit Listing', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13zM7 12a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13z" clipRule="evenodd" /></svg> },
    { id: 'floorplan', name: 'Floor Plan Reference', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg> },
    { id: 'comparablePropertySelection', name: 'Comparable Property Selection', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13zM7 12a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13z" clipRule="evenodd" /></svg> },
    { id: 'areaAnalysis', name: 'Area Analysis', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg> },
    { id: 'wholeUnitRental', name: 'Whole Unit Rental', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> },
    { id: 'askingPrice', name: 'Asking Price', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.134.635l-1.414-1.414A4.5 4.5 0 019 4.5V3a1 1 0 012 0v1.5a4.5 4.5 0 01-2.582 4.082l-1.99 1.99a2.5 2.5 0 00.334 4.418V16a1 1 0 01-2 0v-1.5a4.5 4.5 0 012.582-4.082l1.99-1.99z" /></svg> },
    { id: 'transaction', name: 'Transaction', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.134.635l-1.414-1.414A4.5 4.5 0 019 4.5V3a1 1 0 012 0v1.5a4.5 4.5 0 01-2.582 4.082l-1.99 1.99a2.5 2.5 0 00.334 4.418V16a1 1 0 01-2 0v-1.5a4.5 4.5 0 012.582-4.082l1.99-1.99z" /></svg> },
    { id: 'roomRental', name: 'Room Rental', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" /></svg> },
    { id: 'airbnbScraper', name: 'Airbnb', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.527-1.973 6.012 6.012 0 011.912 2.706C16.27 9.34 16 10.09 16 11c0 .424-.026.84-.076 1.252l-2.115-2.115a1 1 0 00-1.414 0L10 12.586l-1.301-1.301a1 1 0 00-1.414 0l-2.115 2.115A7.962 7.962 0 014 11c0-.91.27-1.66.668-2.973z" clipRule="evenodd" /></svg> },
    { id: 'projection', name: 'Cash Flow Projection', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428a1 1 0 00.928 0l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> },
];

const Sidebar: React.FC<{ currentPage: Page; navigateTo: (page: Page) => void; onNavigateHome: () => void; }> = ({ currentPage, navigateTo, onNavigateHome }) => (
    <aside className="w-64 bg-gray-800 text-white flex flex-col flex-shrink-0 h-screen sticky top-0">
        <div className="h-16 flex items-center justify-center px-4 border-b border-gray-700">
            <h2 className="text-lg font-bold tracking-tight">Far Capital Study</h2>
        </div>
        <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
            {pageConfig.map(item => (
                <a
                    key={item.id}
                    href="#"
                    onClick={(e) => { e.preventDefault(); navigateTo(item.id); }}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        currentPage === item.id
                            ? 'bg-[#700d1d] text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                </a>
            ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
             <a
                href="#"
                onClick={(e) => { e.preventDefault(); onNavigateHome(); }}
                className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                New / Load Study
            </a>
        </div>
    </aside>
);

const Header: React.FC<{ title: string; onSave: () => void; }> = ({ title, onSave }) => (
    <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <div className="flex items-center gap-4">
                <button
                    onClick={onSave}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-md text-white bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Session
                </button>
            </div>
        </div>
    </header>
);

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('welcome');
  const [subjectPropertyName, setSubjectPropertyName] = useState('Vybe');
  const [area, setArea] = useState('Cyberjaya');
  const [comparables, setComparables] = useState<ComparableProperty[]>([]);
    // FIX: Changed 'DiscoveredComparableProperty' to 'ComparableProperty' as the former is not a defined type.
    const [discoveredComparables, setDiscoveredComparables] = useState<ComparableProperty[]>([]);
  const [scraperMode, setScraperMode] = useState<ScraperMode>('ai');

  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [liveScraperUrl, setLiveScraperUrl] = useState('');

  // Load URL from session storage on initial component mount
  useEffect(() => {
    const storedUrl = sessionStorage.getItem('liveScraperBaseUrl');
    if (storedUrl) {
      setLiveScraperUrl(storedUrl);
    }
  }, []);

  // Persist URL to session storage whenever it changes
  useEffect(() => {
    setLiveScraperBaseUrl(liveScraperUrl);
  }, [liveScraperUrl]);

  const defaultProperty: Property = {
    id: Date.now(),
    type: `Type A`,
    bedroomsType: '3 Bedrooms',
    size: 1000,
    spaPrice: 500000,
    valuationPsf: 500,
    netPsf: 480,
    wholeUnitRental: 2500,
    coLivingRental: 3000,
    airbnbRentalPerNight: 190,
    maintenanceSinking: 350,
    wifi: 100,
  };

  const [properties, setProperties] = useState<Property[]>([defaultProperty]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [unitListing, setUnitListing] = useState<UnitListing | null>(null);
  const [transactionSummaries, setTransactionSummaries] = useState<TransactionSummary[]>([]);
  const [wholeUnitRentalData, setWholeUnitRentalData] = useState<WholeUnitRentalData | null>(null);
  const [askingPriceData, setAskingPriceData] = useState<AskingPriceData | null>(null);
  const [airbnbScraperData, setAirbnbScraperData] = useState<AirbnbScraperData | null>(null);
  const [airbnbFileData, setAirbnbFileData] = useState<AirbnbFileData | null>(null);
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [roomRentalData, setRoomRentalData] = useState<RoomRentalData | null>(null);


  // State lifted from ProjectionPage for session management
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('wholeUnit');
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    interestRate: 4.5,
    loanTenure: 35,
    managementFeePercent: 12,
    maintenanceFeePsf: 0.33,
    lppsaInterestRate: 4.0,
    rentalAssumptions: [
        { id: crypto.randomUUID(), type: '3 Bedrooms', rent: 2500 },
        { id: crypto.randomUUID(), type: '2 Bedrooms', rent: 2000 },
        { id: crypto.randomUUID(), type: 'Studio', rent: 1500 },
    ],
    airbnbOperatorFee: 25,
    airbnbCurrentOccupancy: 50,
    airbnbBestOccupancy: 65,
    airbnbWorstOccupancy: 45,
  });
  const [loanPercentage1, setLoanPercentage1] = useState(90);
  const [loanPercentage2, setLoanPercentage2] = useState(70);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem('farCapitalSessions');
      if (storedSessions) {
        setSavedSessions(JSON.parse(storedSessions));
      }
    } catch (error) {
      console.error("Failed to load sessions from localStorage", error);
    }
  }, []);

  const handleSaveSession = () => {
    const sessionName = `${subjectPropertyName} - ${area}`;
    const newSession: SavedSession = {
      id: Date.now(),
      name: sessionName,
      date: new Date().toISOString(),
      subjectPropertyName,
      area,
      properties,
      summary,
      floorplans,
      unitListing,
      transactionSummaries,
      wholeUnitRentalData,
      askingPriceData,
      transactionData,
      airbnbScraperData,
      airbnbFileData,
      roomRentalData,
      globalSettings,
      projectionMode,
      loanPercentage1,
      loanPercentage2,
    };
    
    // Check if a session with the same name already exists
    const existingSessionIndex = savedSessions.findIndex(s => s.name === sessionName);

    let updatedSessions;
    if (existingSessionIndex > -1) {
        if(window.confirm(`A session named "${sessionName}" already exists. Do you want to overwrite it?`)) {
            updatedSessions = [...savedSessions];
            updatedSessions[existingSessionIndex] = newSession;
        } else {
            return; // User cancelled overwrite
        }
    } else {
       updatedSessions = [...savedSessions, newSession];
    }
    
    setSavedSessions(updatedSessions);
    try {
      localStorage.setItem('farCapitalSessions', JSON.stringify(updatedSessions));
      alert('Session saved successfully!');
    } catch (error) {
      console.error("Failed to save session to localStorage", error);
      alert('Failed to save session.');
    }
  };

  const handleLoadSession = (sessionId: number) => {
    const sessionToLoad = savedSessions.find(s => s.id === sessionId);
    if (sessionToLoad) {
      setSubjectPropertyName(sessionToLoad.subjectPropertyName);
      setArea(sessionToLoad.area);
      setProperties(sessionToLoad.properties);
      setSummary(sessionToLoad.summary);
      setFloorplans(sessionToLoad.floorplans);
      setUnitListing(sessionToLoad.unitListing);
      setTransactionSummaries(sessionToLoad.transactionSummaries || []);
      setWholeUnitRentalData(sessionToLoad.wholeUnitRentalData || null);
      setAskingPriceData(sessionToLoad.askingPriceData || null);
      setTransactionData(sessionToLoad.transactionData || null);
      setAirbnbScraperData(sessionToLoad.airbnbScraperData || null);
      setAirbnbFileData(sessionToLoad.airbnbFileData || null);
      setRoomRentalData(sessionToLoad.roomRentalData || null);
      setGlobalSettings(sessionToLoad.globalSettings);
      setProjectionMode(sessionToLoad.projectionMode);
      setLoanPercentage1(sessionToLoad.loanPercentage1);
      setLoanPercentage2(sessionToLoad.loanPercentage2);
      navigateTo('projection'); // Go to the main projection page after loading
    }
  };

  const handleDeleteSession = (sessionId: number) => {
    if (window.confirm("Are you sure you want to delete this saved session?")) {
      setSavedSessions(prevSessions => {
        const updatedSessions = prevSessions.filter(s => s.id !== sessionId);
        try {
          localStorage.setItem('farCapitalSessions', JSON.stringify(updatedSessions));
        } catch (error) {
          console.error("Failed to update sessions in localStorage", error);
        }
        return updatedSessions;
      });
    }
  };
  
  const handleRenameSession = (sessionId: number, newName: string) => {
    if (!newName.trim()) {
        alert("Session name cannot be empty.");
        return;
    }
    
    const isDuplicate = savedSessions.some(s => s.name.toLowerCase() === newName.toLowerCase().trim() && s.id !== sessionId);
    if (isDuplicate) {
        alert(`A session named "${newName}" already exists. Please choose a different name.`);
        return;
    }

    setSavedSessions(prevSessions => {
        const updatedSessions = prevSessions.map(s => 
            s.id === sessionId ? { ...s, name: newName.trim() } : s
        );
        try {
            localStorage.setItem('farCapitalSessions', JSON.stringify(updatedSessions));
        } catch (error) {
            console.error("Failed to update session name in localStorage", error);
            // Optionally revert state or show an error message
        }
        return updatedSessions;
    });
  };

  const handleUpdateAssumptionsFromRentalData = (summary: WholeUnitDevelopmentSummary[] | null) => {
    if (!summary || summary.length === 0) return;

    const lowestMeanRents: { [bedroomType: string]: number } = {};

    for (const development of summary) {
        for (const bedroom of development.bedrooms) {
            const currentLowest = lowestMeanRents[bedroom.bedroomType];
            if (currentLowest === undefined || bedroom.meanRent < currentLowest) {
                lowestMeanRents[bedroom.bedroomType] = bedroom.meanRent;
            }
        }
    }

    const newAssumptions = Object.entries(lowestMeanRents).map(([type, rent]) => ({
        id: crypto.randomUUID(),
        type: type,
        rent: Math.round(rent),
    }));

    if (newAssumptions.length > 0) {
        setGlobalSettings(prevSettings => ({
            ...prevSettings,
            rentalAssumptions: newAssumptions,
        }));
    }
  };
  
  const handleNavigateHome = () => {
    // Optionally reset state when going home to start fresh
    setSubjectPropertyName('Vybe');
    setArea('Cyberjaya');
    setProperties([defaultProperty]);
    setSummary(null);
    setFloorplans([]);
    setUnitListing(null);
    setTransactionSummaries([]);
    setWholeUnitRentalData(null);
    setAskingPriceData(null);
    setTransactionData(null);
    setAirbnbScraperData(null);
    setAirbnbFileData(null);
    setRoomRentalData(null);
    setComparables([]);
    setDiscoveredComparables([]);
    navigateTo('home');
  }
  
  const handleCreateNewStudy = () => {
    // Reset state for a new study
    setSubjectPropertyName('');
    setArea('');
    setProperties([defaultProperty]);
    setSummary(null);
    setFloorplans([]);
    setUnitListing(null);
    setTransactionSummaries([]);
    setWholeUnitRentalData(null);
    setAskingPriceData(null);
    setTransactionData(null);
    setAirbnbScraperData(null);
    setAirbnbFileData(null);
    setRoomRentalData(null);
    setComparables([]);
    setDiscoveredComparables([]);
    // Navigate to the first page of the workflow
    navigateTo('unitListing');
  };

  const navigateTo = (pageName: Page) => {
    setPage(pageName);
  };
  
  const handleNextPage = () => {
    const currentPageIndex = pageConfig.findIndex(p => p.id === page);
    if (currentPageIndex > -1 && currentPageIndex < pageConfig.length - 1) {
        const nextPage = pageConfig[currentPageIndex + 1];
        navigateTo(nextPage.id);
    }
  };

  const updateProperty = (id: number, field: keyof Property, value: string | number) => {
    setProperties(prev =>
      prev.map(p => {
        if (p.id !== id) {
          return p;
        }

        const updatedProperty = { ...p, [field]: value };
        
        if (field === 'size') {
          const newSize = Number(value);
          if(!isNaN(newSize)) {
              const newMaintenanceSinking = newSize * globalSettings.maintenanceFeePsf;
              updatedProperty.maintenanceSinking = Math.round(newMaintenanceSinking * 100) / 100;
          }
        }
        
        if (field === 'bedroomsType') {
            const newBedroomsType = String(value);
            const assumption = globalSettings.rentalAssumptions.find(a => a.type.toLowerCase() === newBedroomsType.toLowerCase());
            if (assumption) {
                updatedProperty.wholeUnitRental = assumption.rent;
            }
        }
        
        return updatedProperty;
      })
    );
  };

  useEffect(() => {
    const updatedProperties = properties.map(p => {
        const newMaintenanceSinking = p.size * globalSettings.maintenanceFeePsf;
        const roundedValue = Math.round(newMaintenanceSinking * 100) / 100;
        if (p.maintenanceSinking !== roundedValue) {
            return { ...p, maintenanceSinking: roundedValue };
        }
        return p;
    });

    if (JSON.stringify(properties) !== JSON.stringify(updatedProperties)) {
        setProperties(updatedProperties);
    }
  }, [globalSettings.maintenanceFeePsf, properties]);


  const addProperty = () => {
    setProperties(prev => {
      // Determine the next layout letter based on the previous state
      let nextLetter = 'A';
      const layoutProperties = prev.filter(p => p.type.startsWith('Layout '));
      if (layoutProperties.length > 0) {
        const lastLetter = layoutProperties
          .map(p => p.type.split(' ')[1]) // get the letter part
          .filter(l => l && l.length === 1 && l >= 'A' && l <= 'Z') // ensure it's a single capital letter
          .sort() // sort alphabetically
          .pop(); // get the last (highest) letter
        
        if (lastLetter) {
          nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
        }
      }

      const newProperty: Property = {
        id: Date.now(),
        type: `Layout ${nextLetter}`,
        bedroomsType: '3 Bedrooms',
        size: 1000,
        spaPrice: 1000000,
        valuationPsf: 1000,
        netPsf: 650,
        wholeUnitRental: 3000,
        coLivingRental: 3000,
        airbnbRentalPerNight: 190,
        maintenanceSinking: 1000 * globalSettings.maintenanceFeePsf,
        wifi: 100,
      };
      return [...prev, newProperty];
    });
  };

  const removeProperty = (id: number) => {
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  const handleGenerateSummary = () => {
    // This function will now navigate to the next page in the sequence
    navigateTo('areaAnalysis');
  };

  const addFloorplan = (floorplan: Floorplan) => {
    setFloorplans(prev => [...prev, floorplan]);
  };

  const removeFloorplan = (id: string) => {
    setFloorplans(prev => prev.filter(fp => fp.id !== id));
  };
  
  const handleSetUnitListing = (listing: UnitListing | null) => {
    setUnitListing(listing);
  };

  const handleCreateProjectionsFromListings = (selectedUnits: { type: string; size: number; spaPrice: number }[]) => {
    if (selectedUnits.length === 0) {
        setProperties([defaultProperty]);
    } else {
        const newProperties: Property[] = selectedUnits.map((unit, index) => ({
            id: Date.now() + index,
            type: unit.type || `Unit ${index + 1}`,
            bedroomsType: unit.type || 'N/A', // Layout type becomes bedrooms type
            size: unit.size || 0,
            spaPrice: unit.spaPrice || 0,
            valuationPsf: unit.size > 0 ? unit.spaPrice / unit.size : 500,
            netPsf: unit.size > 0 ? (unit.spaPrice / unit.size) * 0.95 : 480, // Sensible default
            wholeUnitRental: 2500, // Default, can be adjusted
            coLivingRental: 3000, // Default, can be adjusted
            airbnbRentalPerNight: 190, // Default, can be adjusted
            maintenanceSinking: (unit.size || 0) * globalSettings.maintenanceFeePsf,
            wifi: 100,
        }));
        setProperties(newProperties);
    }
    navigateTo('projection');
  };
  
  const handleSetTransactionSummaries = (summaries: Omit<TransactionSummary, 'id'>[]) => {
    const summariesWithIds = summaries.map(s => ({ ...s, id: crypto.randomUUID() }));
    setTransactionSummaries(summariesWithIds);
  };

  const handleUpdateTransactionSummary = (id: string, field: keyof Omit<TransactionSummary, 'id'>, value: string | number) => {
      setTransactionSummaries(prev =>
          prev.map(s => (s.id === id ? { ...s, [field]: value } : s))
      );
  };

  const renderPage = () => {
    switch (page) {
        case 'welcome':
            return <WelcomePage onGetStarted={() => navigateTo('home')} />;
        case 'home':
            return <HomePage 
              savedSessions={savedSessions}
              onLoadSession={handleLoadSession}
              onDeleteSession={handleDeleteSession}
              onRenameSession={handleRenameSession}
              onCreateNewStudy={handleCreateNewStudy}
            />;
        case 'comparablePropertySelection':
            // FIX: Corrected props passed to ComparablePropertySelectionPage.
            // It expects 'comparables' and 'setComparables', not 'discoveredComparables'.
            return <ComparablePropertySelectionPage 
              onGenerateSummary={handleGenerateSummary}
              subjectPropertyName={subjectPropertyName} 
              setSubjectPropertyName={setSubjectPropertyName} 
              area={area} 
              setArea={setArea} 
              comparables={discoveredComparables}
              setComparables={setDiscoveredComparables}
            />;
        case 'areaAnalysis':
            return <AreaAnalysisPage area={area} propertyName={subjectPropertyName} />;
        case 'wholeUnitRental':
            return <WholeUnitRentalPage 
                data={wholeUnitRentalData} 
                onSetData={setWholeUnitRentalData} 
                onSummaryGenerated={handleUpdateAssumptionsFromRentalData}
            />;
        case 'transaction':
            return <TransactionPage data={transactionData} onSetData={setTransactionData} />;
        case 'askingPrice':
            return <AskingPricePage data={askingPriceData} onSetData={setAskingPriceData} />;
        case 'airbnbScraper':
            return <AirbnbScraperPage 
                area={area} 
                scrapedData={airbnbScraperData} 
                onSetScrapedData={setAirbnbScraperData}
                fileData={airbnbFileData}
                onSetFileData={setAirbnbFileData}
                scraperMode={scraperMode} 
            />;
        case 'unitListing':
            return <UnitListingPage listing={unitListing} onSetListing={handleSetUnitListing} onProceedToProjection={handleCreateProjectionsFromListings} />;
        case 'projection':
            return <ProjectionPage
              properties={properties}
              onUpdateProperty={updateProperty}
              onAddProperty={addProperty}
              onRemoveProperty={removeProperty}
              subjectPropertyName={subjectPropertyName}
              globalSettings={globalSettings}
              setGlobalSettings={setGlobalSettings}
              projectionMode={projectionMode}
              setProjectionMode={setProjectionMode}
              loanPercentage1={loanPercentage1}
              setLoanPercentage1={setLoanPercentage1}
              loanPercentage2={loanPercentage2}
              setLoanPercentage2={setLoanPercentage2}
              transactionSummaries={transactionSummaries}
              onUpdateTransactionSummary={handleUpdateTransactionSummary}
            />;
        case 'floorplan':
            return <FloorplanPage floorplans={floorplans} onAddFloorplan={addFloorplan} onRemoveFloorplan={removeFloorplan} />;
        case 'roomRental':
            return <RoomRentalPage data={roomRentalData} onSetData={setRoomRentalData} />;
        default:
             return <WelcomePage onGetStarted={() => navigateTo('home')} />;
    }
  }


  if (page === 'welcome' || page === 'home') {
    return (
        <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8 font-sans">
            {renderPage()}
            <LiveScraperInfoModal 
                isOpen={isScraperModalOpen}
                onClose={() => setIsScraperModalOpen(false)}
            />
        </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex bg-gray-100">
        <Sidebar currentPage={page} navigateTo={navigateTo} onNavigateHome={handleNavigateHome} />
        <div className="flex-grow flex flex-col h-screen">
            <Header 
              title={`${subjectPropertyName} - ${area}`} 
              onSave={handleSaveSession} 
            />
            <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {renderPage()}
            </main>
            {page !== 'projection' && (
                <footer className="p-4 sm:p-6 lg:p-8 pt-4 flex justify-center border-t border-gray-200 bg-white">
                    <Button onClick={handleNextPage} size="md">
                        Next
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Button>
                </footer>
            )}
        </div>
        <LiveScraperInfoModal 
            isOpen={isScraperModalOpen}
            onClose={() => setIsScraperModalOpen(false)}
        />
    </div>
  );
};

export default App;