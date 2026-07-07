export interface Hotel {

    id: string;
  
    name: string;
  
    provider: string;
  
    stars: number;
  
    reviewScore: number | null;
  
    reviewText: string;
  
    price: number;
  
    basePrice: number;
  
    saving: number;
  
    currency: string;
  
    distance: number | null;
  
    image: string;
  
    address: string;
  
    city: string;
  
    country: string;
  
    latitude: number | null;
  
    longitude: number | null;
  
    amenities: string[];
  
    facilities: string[];
  
  }
  
  export interface SearchHotelsResponse {
  
    success: boolean;
  
    message: string | null;
  
    code?: number | string | null;
  
    searchId: string | null;
  
    status: string | null;
  
    searchIncomplete: boolean;
  
    isContinuing?: boolean;
  
    nextResultsKey: string | null;
  
    currency: string;
  
    totalHotels: number;
  
    hotels: Hotel[];
  
  }
  
  export interface SearchSession {
  
    searchId: string;
  
    status: string | null;
  
    searchIncomplete: boolean;
  
    isContinuing: boolean;
  
    currency: string | null;
  
    nextResultsKey: string | null;
  
    totalHotels: number;
  
    hotels: Hotel[];
  
    lastError: string | null;
  
    createdAt: number | null;
  
    updatedAt: number | null;
  
  }
  
  export interface SearchSessionResponse {
  
    success: boolean;
  
    session: SearchSession;
  
  }