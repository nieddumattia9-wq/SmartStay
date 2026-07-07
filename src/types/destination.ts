export interface Destination {

    id: string;
  
    name: string;
  
    country: string;
  
    type: string;
  
    city: string;
  
    referenceId: string | null;
  
    lat: number | null;
  
    lng: number | null;
  
  }
  
  export interface SearchDestinationsResponse {
  
    success: boolean;
  
    message: string | null;
  
    code?: number | string | null;
  
    destinations: Destination[];
  
  }