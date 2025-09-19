
import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import ProjectionPage from './components/ProjectionPage';
import SummaryPage from './components/SummaryPage';
import TransactionFilterPage from './components/TransactionFilterPage';
import AreaAnalysisPage from './components/AreaAnalysisPage';
import FloorplanPage from './components/FloorplanPage';
import UnitListingPage from './components/UnitListingPage';
import RoomRentalPage from './components/RoomRentalPage';
import { Property, SummaryData, Floorplan, UnitListing, GlobalSettings, ProjectionMode, SavedSession, TransactionSummary } from './types';

type Page = 'home' | 'summary' | 'transactionFilter' | 'areaAnalysis' | 'projection' | 'floorplan' | 'unitListing' | 'roomRental';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [subjectPropertyName, setSubjectPropertyName] = useState('Vybe');
  const [area, setArea] = useState('Cyberjaya');

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
    maintenanceSinking: 350,
    cleaning: 150,
    wifi: 150,
  };

  const [properties, setProperties] = useState<Property[]>([defaultProperty]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [unitListing, setUnitListing] = useState<UnitListing | null>(null);
  const [transactionSummaries, setTransactionSummaries] = useState<TransactionSummary[]>([]);

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
    const newSession: SavedSession = {
      id: Date.now(),
      name: `${subjectPropertyName} - ${area}`,
      date: new Date().toISOString(),
      subjectPropertyName,
      area,
      properties,
      summary,
      floorplans,
      unitListing,
      transactionSummaries,
      globalSettings,
      projectionMode,
      loanPercentage1,
      loanPercentage2,
    };
    
    const updatedSessions = [...savedSessions, newSession];
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
      setGlobalSettings(sessionToLoad.globalSettings);
      setProjectionMode(sessionToLoad.projectionMode);
      setLoanPercentage1(sessionToLoad.loanPercentage1);
      setLoanPercentage2(sessionToLoad.loanPercentage2);
      navigateTo('projection');
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

  const navigateTo = (pageName: Page) => {
    setPage(pageName);
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
    const newProperty: Property = {
      id: Date.now(),
      type: `Comparable Property`,
      bedroomsType: '3 Bedrooms',
      size: 1000,
      spaPrice: 1000000,
      valuationPsf: 1000,
      netPsf: 650,
      wholeUnitRental: 3000,
      coLivingRental: 3000,
      maintenanceSinking: 1000 * globalSettings.maintenanceFeePsf,
      cleaning: 150,
      wifi: 150,
    };
    setProperties(prev => [...prev, newProperty]);
  };

  const removeProperty = (id: number) => {
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  const handleGenerateSummary = (summaryData: SummaryData) => {
    setSummary(summaryData);
    navigateTo('summary');
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
            maintenanceSinking: (unit.size || 0) * globalSettings.maintenanceFeePsf,
            cleaning: 150,
            wifi: 150,
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


  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      {page === 'home' && (
        <HomePage 
          onGenerateSummary={handleGenerateSummary} 
          subjectPropertyName={subjectPropertyName} 
          setSubjectPropertyName={setSubjectPropertyName} 
          area={area} 
          setArea={setArea} 
          savedSessions={savedSessions}
          onLoadSession={handleLoadSession}
          onDeleteSession={handleDeleteSession}
        />
      )}
      {page === 'summary' && (
        <SummaryPage 
          summaryData={summary}
          onNavigateHome={() => navigateTo('home')}
          onNavigateToTransactionFilter={() => navigateTo('transactionFilter')}
        />
      )}
      {page === 'transactionFilter' && (
        <TransactionFilterPage
          onNavigateBack={() => navigateTo('summary')}
          onNavigateToAreaAnalysis={() => navigateTo('areaAnalysis')}
          onSetSummaries={handleSetTransactionSummaries}
        />
      )}
      {page === 'areaAnalysis' && (
          <AreaAnalysisPage
            onNavigateBack={() => navigateTo('transactionFilter')}
            onNavigateToUnitListings={() => navigateTo('unitListing')}
            area={area}
            propertyName={subjectPropertyName}
          />
      )}
      {page === 'projection' && (
        <ProjectionPage
          properties={properties}
          onUpdateProperty={updateProperty}
          onAddProperty={addProperty}
          onRemoveProperty={removeProperty}
          onNavigateBack={() => navigateTo('unitListing')}
          onNavigateToFloorplans={() => navigateTo('floorplan')}
          onNavigateToRoomRentals={() => navigateTo('roomRental')}
          subjectPropertyName={subjectPropertyName}
          globalSettings={globalSettings}
          setGlobalSettings={setGlobalSettings}
          projectionMode={projectionMode}
          setProjectionMode={setProjectionMode}
          loanPercentage1={loanPercentage1}
          setLoanPercentage1={setLoanPercentage1}
          loanPercentage2={loanPercentage2}
          setLoanPercentage2={setLoanPercentage2}
          onSaveSession={handleSaveSession}
          transactionSummaries={transactionSummaries}
          onUpdateTransactionSummary={handleUpdateTransactionSummary}
        />
      )}
      {page === 'floorplan' && (
        <FloorplanPage
          floorplans={floorplans}
          onAddFloorplan={addFloorplan}
          onRemoveFloorplan={removeFloorplan}
          onNavigateBack={() => navigateTo('projection')}
        />
      )}
      {page === 'unitListing' && (
        <UnitListingPage
          listing={unitListing}
          onSetListing={handleSetUnitListing}
          onNavigateBack={() => navigateTo('areaAnalysis')}
          onProceedToProjection={handleCreateProjectionsFromListings}
        />
      )}
      {page === 'roomRental' && (
        <RoomRentalPage
          onNavigateBack={() => navigateTo('projection')}
        />
      )}
    </div>
  );
};

export default App;
