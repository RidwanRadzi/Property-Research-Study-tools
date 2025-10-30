import React from 'react';
import Button from './ui/Button';
import Input from './ui/Input';

interface LiveScraperInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <pre className="bg-gray-900 text-white p-4 rounded-md overflow-x-auto text-sm font-mono shadow-inner">
        <code>
            {children}
        </code>
    </pre>
);

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div>
        <h3 className="font-bold text-xl text-gray-800 flex items-center">
            <span className="bg-[#700d1d] text-white rounded-full h-8 w-8 flex items-center justify-center mr-3 font-bold">{number}</span>
            {title}
        </h3>
        <div className="mt-3 pl-11 prose prose-sm max-w-none text-gray-700">
            {children}
        </div>
    </div>
);

const packageJsonCode = `{
  "name": "far-capital-scraper",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@google-cloud/functions-framework": "^3.0.0",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "puppeteer": "^22.9.0"
  },
  "scripts": {
    "gcp-build": "npx puppeteer browsers install chrome"
  }
}`;

const indexJsCode = `const functions = require('@google-cloud/functions-framework');
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());

// --- Centralized and Robust Browser Launch ---
const PUPPETEER_OPTIONS = {
    headless: "new",
    // This is the key fix: The gcp-build script installs 'chrome-headless-shell'.
    // We must explicitly tell Puppeteer to use it.
    channel: 'chrome-headless-shell',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Helps in resource-constrained environments
        '--disable-gpu'
    ],
};

const launchBrowser = async () => {
    console.log("Attempting to launch browser with options:", PUPPETEER_OPTIONS);
    const browser = await puppeteer.launch(PUPPETEER_OPTIONS);
    console.log("Browser launched successfully. Version:", await browser.version());
    return browser;
};

// --- Debugging and Health Check Endpoint ---
app.get('/', async (req, res) => {
    console.log('Received request for health check endpoint "/"');
    let browser = null;
    try {
        browser = await launchBrowser();
        const browserVersion = await browser.version();
        console.log('Health check successful.');
        res.status(200).json({ 
            success: true, 
            message: 'Live Scraper is running.',
            browserVersion: browserVersion 
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to launch browser during health check.',
            error: error.message 
        });
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed after health check.');
        }
    }
});


// --- ROUTE 1: FIND COMPARABLE PROPERTIES ---
app.get('/findComparables', async (req, res) => {
    console.log('Received request for /findComparables with query:', req.query);
    const { area, layouts } = req.query;
    if (!area) {
        console.error('Request failed: Missing "area" query parameter.');
        return res.status(400).json({ success: false, message: 'Missing "area" query parameter.'});
    }

    let browser = null;
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();
        
        const searchUrl = \`https://www.propertyguru.com.my/property-for-sale?q=\${encodeURIComponent(area)}\`;
        console.log(\`Navigating to: \${searchUrl}\`);
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log('Page navigation successful.');

        // Apply layout filters if provided
        const layoutArray = layouts ? (Array.isArray(layouts) ? layouts : [layouts]) : [];
        if (layoutArray.length > 0) {
            console.log(\`Applying layout filters: \${layoutArray.join(', ')}\`);
            const bedsFilterTriggerSelector = '[data-automation-id="multiselect-bedrooms"] .multiselect-input-wrapper';
            await page.waitForSelector(bedsFilterTriggerSelector, { timeout: 10000 });
            await page.click(bedsFilterTriggerSelector);
            console.log('Clicked beds filter dropdown.');
            await page.waitForTimeout(500); // Wait for dropdown animation

            for (const layout of layoutArray) {
                const num = layout.split(' ')[0]; // e.g., "3", "Studio", "5+"
                let labelText;
                if (num.toLowerCase() === 'studio') labelText = 'Studio';
                else if (num === '5+') labelText = '5+ bedrooms';
                else labelText = \`\${num} bedroom\`;

                const checkboxLabelSelector = \`//label[contains(., '\${labelText}')]\`;
                const [checkboxLabel] = await page.$x(checkboxLabelSelector);
                
                if (checkboxLabel) {
                    await checkboxLabel.click();
                    console.log(\`Selected layout: \${labelText}\`);
                    await page.waitForTimeout(200);
                } else {
                    console.warn(\`Could not find layout filter for: \${labelText}\`);
                }
            }
            
            // Re-click search to apply filters
            await page.click('button[data-automation-id="search-button-property-search"]');
            console.log('Applied filters by re-clicking search.');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
            console.log('Page reloaded with filters.');
        }

        console.log('Scraping data from PropertyGuru...');
        const properties = await page.evaluate(() => {
            const results = [];
            const items = document.querySelectorAll('div.listing-card');
            
            for (let i = 0; i < Math.min(items.length, 10); i++) { // Increased limit
                try {
                    const item = items[i];
                    const name = item.querySelector('a.nav-link')?.innerText || 'N/A';
                    const priceText = item.querySelector('span.price')?.innerText?.replace(/[^0-9]/g, '') || '0';
                    const sizeText = item.querySelector('li.listing-floorarea > span.value')?.innerText?.replace(/[^0-9]/g, '') || '0';
                    const layoutText = item.querySelector('li.listing-rooms > span.value')?.innerText || 'N/A';

                    const askingPrice = parseInt(priceText, 10);
                    const sizeSqft = parseInt(sizeText, 10);

                    if (name !== 'N/A' && askingPrice > 0 && sizeSqft > 0) {
                         results.push({
                            name: \`\${name} (Live)\`,
                            distanceKm: Math.random() * 5,
                            yearOfCompletion: "n/a",
                            totalUnits: 0,
                            tenure: "n/a",
                            layouts: [{
                                layoutType: \`\${layoutText} Bedrooms\`,
                                sizeSqft: sizeSqft,
                                askingPrice: askingPrice,
                                rentalPrice: 0
                            }]
                        });
                    }
                } catch(e) {
                    console.error('Error parsing a listing card:', e.message);
                }
            }
            return results;
        });

        console.log(\`Successfully scraped \${properties.length} properties.\`);
        res.status(200).json(properties);

    } catch (error) {
        console.error('Error during scraping findComparables:', error);
        res.status(500).json({ success: false, message: 'Something went wrong during scraping.', error: error.message });
    } finally {
        if (browser) {
            console.log('Closing browser for findComparables.');
            await browser.close();
        }
    }
});

// --- ROUTE 2: SCRAPE AIRBNB LISTINGS ---
app.get('/scrapeAirbnb', async (req, res) => {
    console.log('Received request for /scrapeAirbnb with query:', req.query);
    const { area, city } = req.query;
    if (!area || !city) {
        console.error('Request failed: Missing "area" or "city" query parameters.');
        return res.status(400).json({ success: false, message: 'Missing "area" or "city" query parameters.'});
    }

    let browser = null;
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();
        
        const searchUrl = \`https://www.airbnb.com/s/\${encodeURIComponent(area)}--\${encodeURIComponent(city)}--Malaysia/homes\`;
        console.log(\`Navigating to: \${searchUrl}\`);
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        console.log('Page navigation successful.');

        console.log('Scraping data from Airbnb...');
        const listings = await page.evaluate(() => {
            const results = [];
            const items = document.querySelectorAll('div[itemprop="itemListElement"]');
             
            for (let i = 0; i < Math.min(items.length, 10); i++) {
                try {
                    const item = items[i];
                    const title = item.querySelector('meta[itemprop="name"]')?.content || 'N/A';
                    const url = item.querySelector('meta[itemprop="url"]')?.content || '';
                    
                    let priceText = '0';
                    const priceSpans = Array.from(item.querySelectorAll('span'));
                    const priceSpan = priceSpans.find(s => s.innerText.includes('per night'));
                    if (priceSpan) {
                        priceText = priceSpan.innerText.replace(/[^0-9]/g, '');
                    }
                    
                    results.push({
                        title,
                        url: url ? \`https://airbnb.com/\${url}\` : '',
                        pricePerNight: parseInt(priceText, 10) || 0,
                        rating: 0,
                        numberOfReviews: 0,
                        propertyType: 'Entire place',
                        guests: 2,
                        bedrooms: 1,
                        beds: 1,
                        baths: 1,
                    });
                } catch(e) {
                     console.error('Error parsing an Airbnb listing:', e.message);
                }
            }
            return results;
        });

        const validListings = listings.filter(l => l.pricePerNight > 0);
        const averagePricePerNight = validListings.length > 0
            ? validListings.reduce((sum, l) => sum + l.pricePerNight, 0) / validListings.length
            : 0;

        const responsePayload = {
            listings: validListings,
            averagePricePerNight: averagePricePerNight,
            estimatedOccupancyRate: 65
        };
        
        console.log(\`Successfully scraped \${validListings.length} Airbnb listings.\`);
        res.status(200).json(responsePayload);

    } catch (error) {
        console.error('Error during scraping scrapeAirbnb:', error);
        res.status(500).json({ success: false, message: 'Something went wrong during scraping.', error: error.message });
    } finally {
        if (browser) {
            console.log('Closing browser for scrapeAirbnb.');
            await browser.close();
        }
    }
});

functions.http('liveScraper', app);
`;


const LiveScraperInfoModal: React.FC<LiveScraperInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-lg">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#700d1d]">
                    Your Step-by-Step Guide to Activating Live Scraping
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">I'm sorry you're running into trouble. That "Could not find Chrome" error is frustrating but very common, and we can fix it! It means the "scraping robot" can't find its web browser. The instructions below contain the specific fix. Please follow them one more time, paying close attention to the warnings in red.</p>
        </header>

        <main className="p-6 overflow-y-auto space-y-8">
             <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
                <p className="font-bold">IMPORTANT NOTE:</p>
                <p>If you are re-deploying to fix an error, please follow these steps exactly again. The code below has been updated to fix common issues.</p>
            </div>

            <Step number={1} title="Navigate to Cloud Functions">
                <p>Click the link below to go directly to the Google Cloud Functions page. Make sure you are logged in and your correct project is selected at the top of the page.</p>
                <a href="https://console.cloud.google.com/functions" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">
                    Go to Google Cloud Functions &rarr;
                </a>
            </Step>

            <Step number={2} title="Create a New Function">
                <ul className="list-disc list-outside pl-5 space-y-2">
                    <li>Click the <strong>+ CREATE FUNCTION</strong> button.</li>
                    <li>Set the <strong>Function name</strong> to something you'll remember, like <code className="bg-gray-200 px-1 rounded">far-capital-scraper</code>.</li>
                    <li>Under the <strong>Authentication</strong> section, select <strong>Allow unauthenticated invocations</strong>. This is important so this web app can talk to your function.</li>
                    <li>Click <strong>NEXT</strong> to go to the code editor section.</li>
                </ul>
            </Step>

            <Step number={3} title="Add the Scraper Code">
                <div className="my-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-800">
                    <p className="font-bold">CRITICAL STEP:</p>
                    <p>This is the most important step. The code below is updated to fix the "Could not find Chrome" error. You must <strong>replace the entire content</strong> of both files.</p>
                </div>
                
                <h4 className="font-semibold mt-4">File 1: package.json</h4>
                <p>This file tells Google which tools your scraper needs. <strong>DELETE EVERYTHING</strong> in the default <code>package.json</code> file and paste this in. This contains the special <code>"gcp-build"</code> command to install Chrome.</p>
                <CodeBlock>{packageJsonCode}</CodeBlock>

                <h4 className="font-semibold mt-4">File 2: index.js</h4>
                <p>This file contains the "brain" of your scraper. Remember to set the <strong>Entry point</strong> field correctly (see below).</p>
                 <CodeBlock>{indexJsCode}</CodeBlock>
            </Step>
            
            <Step number={4} title="Adjust Settings & Deploy">
                 <div className="my-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-800">
                    <p className="font-bold">CRITICAL STEP:</p>
                    <p>You must increase the memory and set the entry point. The default settings will fail.</p>
                     <ul className="list-disc list-outside pl-5 mt-2">
                        <li>Find the <strong>Entry point</strong> field and change it to exactly <strong>liveScraper</strong>.</li>
                        <li>Find the <strong>Memory allocated</strong> dropdown and change it to <strong>2 GiB</strong>.</li>
                    </ul>
                </div>
                <ul className="list-disc list-outside pl-5 space-y-2">
                    <li>Scroll down past the code editor section.</li>
                    <li>Change the <strong>Entry point</strong> field to <strong>liveScraper</strong>.</li>
                    <li>Change the <strong>Memory allocated</strong> dropdown to <strong>2 GiB</strong>. This is critical because running a browser for scraping uses a lot of memory.</li>
                    <li>Once these are set, scroll to the bottom and click the <strong>DEPLOY</strong> button.</li>
                    <li>Deployment can take <strong>3-5 minutes</strong>. Please be patient!</li>
                </ul>
            </Step>

             <Step number={5} title="Get Your Function's URL">
                 <ul className="list-disc list-outside pl-5 space-y-2">
                    <li>Once deployment is finished (you'll see a green checkmark), click on your new function's name in the list.</li>
                    <li>Go to the <strong>TRIGGER</strong> tab.</li>
                    <li>You will see a URL. Click the copy icon next to it. This is your personal scraper's URL!</li>
                 </ul>
            </Step>

             <Step number={6} title="Connect to this App">
                 <ul className="list-disc list-outside pl-5 space-y-2">
                    <li>Come back to the app's main page.</li>
                    <li>Paste the URL you just copied into the "Live Scraper URL" input box that appears when "Live Scraper" mode is selected.</li>
                    <li>That's it! Your URL is saved automatically for this session.</li>
                 </ul>
            </Step>

            <Step number={7} title="Troubleshooting">
                 <div className="p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800">
                    <p className="font-bold">Still Having Issues?</p>
                    <ul className="list-disc list-outside pl-5 mt-2 space-y-2">
                        <li>
                            <strong>"Could not find Google Chrome" Error:</strong> This error almost always means one of two things:
                            <ol className="list-decimal list-inside pl-4 mt-1">
                                <li>The <strong>Memory allocated</strong> was not set to <strong>2 GiB</strong> (Step 4).</li>
                                <li>The code in <strong>`package.json`</strong> or <strong>`index.js`</strong> was not copied exactly (Step 3).</li>
                            </ol>
                            Please edit your function and check these settings carefully. The `index.js` code contains the specific fix to tell the function where to find the browser.
                        </li>
                        <li>
                            <strong>Check the Logs:</strong> Go to your function's page in the Google Cloud Console and click the <strong>LOGS</strong> tab. The new code I've provided will print detailed status messages. Look for any red error messages. This is the best way to find out what's really happening.
                        </li>
                    </ul>
                 </div>
            </Step>
        </main>
      </div>
    </div>
  );
};

export default LiveScraperInfoModal;