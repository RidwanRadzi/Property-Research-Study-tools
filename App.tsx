import React, { useState } from 'react';
import HomePage from './components/HomePage';
import ProjectionPage from './components/ProjectionPage';
import SummaryPage from './components/SummaryPage';
import TransactionFilterPage from './components/TransactionFilterPage';
import { Property, SummaryData } from './types';

type Page = 'home' | 'summary' | 'transactionFilter' | 'projection';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  
  const defaultProperty: Property = {
    id: Date.now(),
    type: `Subject Property`,
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

  const navigateTo = (pageName: Page) => {
    setPage(pageName);
  };

  const updateProperty = (id: number, field: keyof Property, value: string | number) => {
    setProperties(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

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
      maintenanceSinking: 350,
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

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      {page === 'home' && <HomePage onGenerateSummary={handleGenerateSummary} />}
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
          onNavigateToProjection={() => navigateTo('projection')}
        />
      )}
      {page === 'projection' && (
        <ProjectionPage
          properties={properties}
          onUpdateProperty={updateProperty}
          onAddProperty={addProperty}
          onRemoveProperty={removeProperty}
          onNavigateBack={() => navigateTo('transactionFilter')}
        />
      )}
    </div>
  );
};

export default App;