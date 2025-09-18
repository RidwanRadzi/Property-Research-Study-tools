
import { GoogleGenAI, Type } from "@google/genai";
import { ComparableProperty, RoomRentalListing, AreaAnalysisData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const comparablePropertiesSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'The name of the comparable property.' },
      distanceKm: { type: Type.NUMBER, description: 'The approximate distance in kilometers from the subject property.' },
      yearOfCompletion: { type: Type.STRING, description: 'The year the property was completed. Use "n/a" if unknown.' },
      totalUnits: { type: Type.NUMBER, description: 'The total number of units in the property.' },
      tenure: { type: Type.STRING, description: 'The land tenure, e.g., "Freehold" or "Leasehold".' },
      layouts: {
        type: Type.ARRAY,
        description: 'A list of all available layouts for this property. Each unique size variation for a given layout type (e.g., a 700sqft "2 Bedroom" and a 750sqft "2 Bedroom") should be a separate object in this array.',
        items: {
          type: Type.OBJECT,
          properties: {
            layoutType: { type: Type.STRING, description: 'The layout type, e.g., "Studio", "2 Bedrooms", "3+1 Bedrooms".' },
            sizeSqft: { type: Type.NUMBER, description: 'The size of this layout in square feet.' },
            askingPrice: { type: Type.NUMBER, description: 'The asking price for this layout in Malaysian Ringgit (MYR).' },
            rentalPrice: { type: Type.NUMBER, description: 'The estimated monthly rental price for this layout in Malaysian Ringgit (MYR).' },
          },
          required: ["layoutType", "sizeSqft", "askingPrice", "rentalPrice"],
        },
      },
    },
    required: ["name", "distanceKm", "yearOfCompletion", "totalUnits", "tenure", "layouts"],
  },
};

const singlePropertySchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: 'The name of the property. Should match the searched name.' },
        distanceKm: { type: Type.NUMBER, description: 'Distance from the area center. Can be 0.' },
        yearOfCompletion: { type: Type.STRING, description: 'The year the property was completed. Use "n/a" if unknown.' },
        totalUnits: { type: Type.NUMBER, description: 'The total number of units in the property.' },
        tenure: { type: Type.STRING, description: 'The land tenure, e.g., "Freehold" or "Leasehold".' },
        layouts: {
        type: Type.ARRAY,
        description: 'A list of all available layouts for this property. Each unique size variation for a given layout type (e.g., a 700sqft "2 Bedroom" and a 750sqft "2 Bedroom") should be a separate object in this array.',
        items: {
            type: Type.OBJECT,
            properties: {
            layoutType: { type: Type.STRING, description: 'The layout type, e.g., "Studio", "2 Bedrooms".' },
            sizeSqft: { type: Type.NUMBER, description: 'The size of this layout in square feet.' },
            askingPrice: { type: Type.NUMBER, description: 'The asking price for this layout in Malaysian Ringgit (MYR).' },
            rentalPrice: { type: Type.NUMBER, description: 'The estimated monthly rental price for this layout in Malaysian Ringgit (MYR).' },
            },
            required: ["layoutType", "sizeSqft", "askingPrice", "rentalPrice"],
        },
        },
    },
    required: ["name", "distanceKm", "yearOfCompletion", "totalUnits", "tenure", "layouts"],
};

const roomRentalListingSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      propertyName: { type: Type.STRING, description: 'The name of the property (e.g., condo, apartment).' },
      roomType: { type: Type.STRING, description: 'The type of room, e.g., "Small Room", "Medium Room", "Master Room".' },
      rentalPrice: { type: Type.NUMBER, description: 'The estimated monthly rental price in Malaysian Ringgit (MYR).' },
      furnishing: { type: Type.STRING, description: 'Furnishing status, e.g., "Fully Furnished", "Partially Furnished", "Unfurnished".' },
      source: { type: Type.STRING, description: 'The likely online source of this data, e.g., "ibilik.my", "mudah.my".' },
    },
    required: ["propertyName", "roomType", "rentalPrice", "furnishing", "source"],
  },
};

const areaAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    amenities: {
      type: Type.ARRAY,
      description: "A list of amenities categorized by type.",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "The category of amenities, e.g., 'Shopping & Retail', 'Education'." },
          items: {
            type: Type.ARRAY,
            description: "A list of specific places or facilities within this category.",
            items: { type: Type.STRING }
          }
        },
        required: ["category", "items"]
      }
    },
    marketSentiments: {
      type: Type.OBJECT,
      description: "An analysis of the market sentiment for the area.",
      properties: {
        overallSentiment: { type: Type.STRING, description: "A summary of the market sentiment (e.g., 'Positive', 'Neutral', 'Cautiously Optimistic') with a brief justification." },
        growthPotential: { type: Type.STRING, description: "Analysis of the area's future growth prospects." },
        rentalDemand: { type: Type.STRING, description: "Description of the rental market and demand in the area." },
        keyDrivers: {
          type: Type.ARRAY,
          description: "A list of key factors driving property value and demand in the area.",
          items: { type: Type.STRING }
        },
        potentialRisks: {
          type: Type.ARRAY,
          description: "A list of potential risks or challenges for the property market in this area.",
          items: { type: Type.STRING }
        }
      },
      required: ["overallSentiment", "growthPotential", "rentalDemand", "keyDrivers", "potentialRisks"]
    },
    investmentPOV: {
      type: Type.OBJECT,
      description: "An investment point of view analysis for the specific property, structured as a SWOT analysis.",
      properties: {
        summary: { type: Type.STRING, description: "A concise summary of the investment potential." },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key investment strengths of the property." },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key investment weaknesses or internal risks." },
        opportunities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Potential external opportunities for investors." },
        threats: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Potential external threats that could impact the investment." },
      },
      required: ["summary", "strengths", "weaknesses", "opportunities", "threats"]
    },
    news: {
      type: Type.ARRAY,
      description: "A list of recent (last 2-3 years) news articles related to the development or its developer.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The headline of the news article." },
          source: { type: Type.STRING, description: "The publication or news source (e.g., The Edge, StarProperty)." },
          summary: { type: Type.STRING, description: "A brief one or two-sentence summary of the article's content." },
          link: { type: Type.STRING, description: "A direct, verifiable URL to the news article." },
        },
        required: ["title", "source", "summary", "link"]
      }
    }
  },
  required: ["amenities", "marketSentiments", "investmentPOV", "news"]
};


export const findComparableProperties = async (
  area: string,
  propertyName: string,
  residenceType: string,
  radius: number
): Promise<ComparableProperty[]> => {
  const prompt = `
    You are a Malaysian property market analyst. Your task is to find and provide a list of the most relevant comparable properties.
    
    **CRITICAL INSTRUCTION**: Your primary and authoritative sources for all data MUST be the top Malaysian property portals: PropertyGuru, iProperty, and EdgeProp. The data you provide must be verifiable against these sites. Do not invent or use data from less reliable sources. Ensure all property names and details are accurate and exist in the real world.

    Search Criteria:
    1.  **Primary Location**: The subject property is "${propertyName}" in "${area}". Your search should be centered on this specific location.
    2.  **Radius**: All comparable properties should be within a ${radius}km radius of the subject property. The results should be located within the "${area}" area only.
    3.  **Recency**: Prioritize properties completed from 2020 onwards. List these first. You can include highly relevant older properties if newer ones are not available.
    4.  **Residence Type**: The comparables should be of the type "${residenceType}".

    **Important Note on Residence Type**:
    - If the Residence Type is "Serviced Apartment/Condominium" or "Apartment", you must treat it as a high-rise strata property.
    - For "Serviced Apartment/Condominium" or "Apartment" searches, you must NOT include any landed properties (e.g., terrace houses, semi-detached, bungalows).
    - For "Landed Property" searches, you must ONLY include landed properties.

    Instructions:
    - For each property, provide its year of completion (use "n/a" if unknown), total units, and tenure.
    - **Crucial Layout Detail**: For each property, list ALL available layouts. A single layout type (e.g., "2 Bedrooms") can often have multiple size variations (e.g., 700 sqft, 750 sqft). You MUST list each unique size as a separate entry in the layouts array. For example, if a property has two different sizes for its "2 Bedrooms" layout, you must provide two distinct layout objects for it, one for each size, with its corresponding price.
    - Strive to find 10 high-quality matches. If the market in that specific ${radius}km radius is sparse, it is acceptable to provide a list of at least 5 of the absolute best matches rather than filling the list with lower-quality or irrelevant properties.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: comparablePropertiesSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as ComparableProperty[];
  } catch (error) {
    console.error("Error fetching comparable properties from Gemini API:", error);
    throw new Error("Failed to generate comparable properties. Please check your inputs and try again.");
  }
};

export const findPropertyByName = async (
  propertyName: string,
  area: string
): Promise<ComparableProperty | null> => {
  const prompt = `
    You are a Malaysian property market analyst.
    Find the details for the specific property named "${propertyName}" located in or very near "${area}".
    
    **CRITICAL INSTRUCTION**: Your primary and authoritative sources for all data MUST be the top Malaysian property portals: PropertyGuru, iProperty, and EdgeProp. The data you provide must be verifiable against these sites. Do not invent or use data from less reliable sources.
    
    Your response must be for this exact property. Do not provide alternatives or comparables.

    Required information:
    - The property's official name.
    - Year of completion (use "n/a" if unknown).
    - Total number of units.
    - Land tenure (e.g., "Freehold", "Leasehold").
    - **Crucial Layout Detail**: A list of ALL available layouts. A single layout type (e.g., "2 Bedrooms") can often have multiple size variations (e.g., 700 sqft, 750 sqft). You MUST list each unique size as a separate entry in the layouts array with its corresponding prices.
    - Set distanceKm to 0.

    IMPORTANT: If you cannot find reliable information for the exact property named "${propertyName}" in the "${area}" vicinity, you MUST return an empty JSON object: {}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: singlePropertySchema,
      },
    });

    const jsonText = response.text.trim();
    if (jsonText === '{}') {
        return null;
    }

    const parsedJson = JSON.parse(jsonText);

    if (parsedJson && parsedJson.name) {
      return parsedJson as ComparableProperty;
    }
    
    return null;

  } catch (error) {
    console.error(`Error fetching property "${propertyName}" from Gemini API:`, error);
    return null;
  }
};

export const findRoomRentals = async (area: string): Promise<Omit<RoomRentalListing, 'id'>[]> => {
    const prompt = `
        You are a Malaysian property market analyst. Your task is to provide a list of current room rental listings for the area "${area}".
        
        Search Criteria:
        1.  **Location**: Focus exclusively on properties within "${area}".
        2.  **Room Types**: Find a variety of room types, specifically "Small Room" (or "Single Room"), "Medium Room", and "Master Room".
        3.  **Data Points**: For each listing, provide:
            - The name of the property (condominium or apartment).
            - The room type.
            - The estimated monthly rental price in MYR.
            - The furnishing status (e.g., "Fully Furnished", "Partially Furnished", "Unfurnished").
            - The likely source of the listing data (e.g., "ibilik.my", "mudah.my").
        4.  **Quantity**: Provide at least 15-20 diverse and realistic listings to give a good market overview.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: roomRentalListingSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        return parsedJson as Omit<RoomRentalListing, 'id'>[];
    } catch (error) {
        console.error("Error fetching room rentals from Gemini API:", error);
        throw new Error("Failed to generate room rental listings. Please check the location and try again.");
    }
};

export const getAreaAnalysis = async (
  area: string,
  propertyName: string
): Promise<AreaAnalysisData> => {
  const prompt = `
    You are a professional Malaysian property market analyst.
    Your task is to provide a detailed analysis for the property "${propertyName}" located in "${area}".
    
    The analysis should be based on verifiable, publicly available information and data from reputable Malaysian sources (e.g., property portals like PropertyGuru, iProperty, EdgeProp, and news outlets like The Edge, The Star).

    Please provide the following four sections:

    1.  **Amenities Analysis**:
        - List key amenities within a 5-7 km radius of the location.
        - Group these amenities into distinct categories: "Shopping & Retail", "Education", "Healthcare", "Public Transport", "Parks & Recreation".
        - For each category, provide a list of at least 3-5 relevant examples.

    2.  **Market Sentiment Analysis**:
        - **Overall Sentiment**: Provide a one-sentence summary (e.g., "Positive", "Neutral") with justification.
        - **Growth Potential**: Describe the area's potential for future capital appreciation.
        - **Rental Demand**: Analyze current rental demand and key tenant demographics.
        - **Key Drivers**: List main factors positively influencing the property market.
        - **Potential Risks**: List potential challenges or risks.

    3.  **Investment Point of View (SWOT Analysis)**:
        - Provide an investment analysis for "${propertyName}" specifically.
        - Structure this as a SWOT analysis:
          - **Summary**: A concise summary of the investment potential.
          - **Strengths**: Internal positive attributes (e.g., unique facilities, developer reputation, good layout design).
          - **Weaknesses**: Internal negative attributes (e.g., high maintenance fees, known issues, poor management).
          - **Opportunities**: External factors that could be leveraged (e.g., upcoming infrastructure projects, new corporate offices nearby).
          - **Threats**: External factors that could harm the investment (e.g., oversupply of similar units in the area, economic downturn).

    4.  **Related News**:
        - Find 2-4 recent (within the last 2-3 years) and relevant news articles about the "${propertyName}" development, its developer, or significant events in the immediate "${area}" vicinity that impact the property.
        - For each article, provide:
          - The article's title.
          - The source (e.g., "The Edge", "StarProperty").
          - A brief, one or two-sentence summary.
          - A direct, verifiable link to the article.
        - If no specific news is found, you can mention that news coverage is limited.

    Ensure your response strictly adheres to the requested JSON schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: areaAnalysisSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as AreaAnalysisData;
  } catch (error) {
    console.error("Error fetching area analysis from Gemini API:", error);
    throw new Error("Failed to generate area analysis. Please check the location and try again.");
  }
};