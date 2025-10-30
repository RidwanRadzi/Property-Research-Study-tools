import React from 'react';
import Button from './ui/Button';

interface WelcomePageProps {
  onGetStarted: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onGetStarted }) => {

  const workflowSteps = [
    { 
      title: "1. Unit Listing & Floor Plan Reference",
      description: "Begin by uploading the property's unit listing file and any relevant floor plans. This provides the foundational data for your study." 
    },
    { 
      title: "2. Comparable Property Selection",
      description: "Use the AI-powered search to find comparable properties in the area. Select the most relevant ones to build a strong market baseline." 
    },
    { 
      title: "3. Area Analysis",
      description: "Generate a comprehensive analysis of the surrounding area, including amenities, market sentiment, investment potential, and related news." 
    },
    { 
      title: "4. Data Upload & Analysis",
      description: "Upload your own Excel files for Whole Unit Rental, Asking Prices, Transactions, and Airbnb data to generate detailed, automated summaries." 
    },
    { 
      title: "5. Cash Flow Projection",
      description: "Finally, model different investment scenarios (Whole Unit, Co-Living, Airbnb) and analyze the potential cash flow and returns based on all the data you've gathered." 
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <header className="mb-10 w-full max-w-4xl">
        <h1 className="text-6xl font-extrabold text-[#700d1d] tracking-tight">
          Research Pre-Study Tools
        </h1>
        <p className="text-gray-600 mt-4 text-xl max-w-2xl mx-auto">
          Your comprehensive suite of tools for in-depth property market analysis and cash flow projection.
        </p>
      </header>

      <main className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-2xl border border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">How to Use This App</h2>
        <div className="space-y-6 text-left">
          {workflowSteps.map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#700d1d] text-white rounded-full font-bold text-lg">
                {index + 1}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="text-gray-600 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      
      <footer className="mt-12">
        <Button onClick={onGetStarted} size="md" className="text-lg px-8 py-3">
          Get Started
        </Button>
      </footer>
    </div>
  );
};

export default WelcomePage;
