export type HotelDataConfidence =
  | "full"
  | "partial"
  | "limited";

export interface AvailableHotelData {

  hasPrice: boolean;

  hasBasePrice: boolean;

  hasSaving: boolean;

  hasStars: boolean;

  hasReviewScore: boolean;

  hasReviewCount: boolean;

  hasDistance: boolean;

  hasImage: boolean;

  hasAddress: boolean;

  hasCoordinates: boolean;

  hasAmenities: boolean;

}

export interface HotelOffer {

  id: string;

  provider: string;

  price: number;

  basePrice: number;

  saving: number;

  currency: string;

  cancellationPolicy: string | null;

  refundableTag?: string | null;

  refundable?: boolean | null;

  freeCancellationUntil?: string | null;

  cancellationPenalty?: number | null;

  cancellationPenaltyCurrency?: string | null;

  cancellationPenaltyType?: string | null;

  cancellationTimezone?: string | null;

  taxesIncluded: boolean | null;

  includedTaxes?: number;

  excludedTaxes?: number;

  unknownTaxes?: number;

  totalKnownCost?: number | null;

  roomName: string | null;

  bookable: boolean;

  redirectable?: boolean;

}

export interface Hotel {

  id: string;

  dataSources: string[];

  dataConfidence: HotelDataConfidence;

  availableData: AvailableHotelData;

  offers: HotelOffer[];

  name: string;

  provider: string;

  stars: number;

  reviewScore: number | null;

  reviewCount: number | null;

  reviewText: string;

  price: number;

  basePrice: number;

  saving: number;

  currency: string;

  taxesIncluded?: boolean | null;

  includedTaxes?: number;

  excludedTaxes?: number;

  unknownTaxes?: number;

  totalKnownCost?: number | null;

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

export interface HotelDetails {

  id: string;

  provider: string;

  name: string;

  description: string | null;

  stars: number;

  reviewScore: number | null;

  reviewCount: number | null;

  address: string;

  city: string;

  country: string;

  latitude: number | null;

  longitude: number | null;

  images: string[];

  amenities: string[];

  facilities: string[];

  checkIn: string | null;

  checkOut: string | null;

}

export interface HotelDetailsResponse {

  success: boolean;

  hotel: HotelDetails | null;

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