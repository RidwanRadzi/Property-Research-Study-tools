import { GoogleGenAI, Type } from "@google/genai";
import { ComparableProperty } from '../types';

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
        description: 'A list of all available layouts for this property.',
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

export const findComparableProperties = async (
  area: string,
  propertyName: string,
  residenceType: string
): Promise<ComparableProperty[]> => {
  const prompt = `
    You are a Malaysian property market analyst. Your task is to provide a list of 10 comparable properties.
    The data should be realistic but can be fictionalized for analysis purposes.
    All properties should be within a 3-5km radius of the subject property.
    Prioritize properties completed from 2020 onwards, listing them first, followed by older properties.
    For each comparable property, provide its year of completion (use "n/a" if unknown), total number of units, and tenure (Freehold/Leasehold).
    Crucially, for each property, you MUST list ALL available layouts (e.g., Studio, 2 Bedrooms, 3 Bedrooms, etc.) with their respective size, asking price, and estimated rental price.
    
    Subject Property Details:
    - Name: "${propertyName}"
    - Location / Area: "${area}"
    - Residence Type: "${residenceType}"

    Please provide 10 comparable properties based on these details.
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
