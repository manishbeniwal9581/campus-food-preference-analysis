export type FoodCategory =
  | 'North Indian'
  | 'South Indian'
  | 'Chinese'
  | 'Fast Food'
  | 'Snacks'
  | 'Healthy Food';

export const FOOD_CATEGORIES: FoodCategory[] = [
  'North Indian',
  'South Indian',
  'Chinese',
  'Fast Food',
  'Snacks',
  'Healthy Food',
];

export type PriceRange = '₹20–₹50' | '₹50–₹100' | '₹100–₹150' | '₹150+';

export const PRICE_RANGES: PriceRange[] = [
  '₹20–₹50',
  '₹50–₹100',
  '₹100–₹150',
  '₹150+',
];

export type FeedbackStatus = 'New' | 'Reviewed' | 'Actioned';

export type AvailabilityStatus = 'Available' | 'Sold Out' | 'Seasonal';

export interface SurveyResponse {
  id: string;
  studentName: string;
  department: string;
  semester: string;
  preferredCategory: FoodCategory;
  favouriteItem: string;
  priceRange: PriceRange;
  qualityRating: number;
  tasteRating: number;
  hygieneRating: number;
  overallRating: number;
  suggestions: string;
  createdAt: string;
  isDemo: boolean;
  feedbackStatus: FeedbackStatus;
}

export interface MenuItem {
  id: string;
  name: string;
  category: FoodCategory;
  price: number;
  priceRange: PriceRange;
  imageUrl: string;
  availability: AvailabilityStatus;
  rating: number;
  reviewCount: number;
  isVeg: boolean;
  description: string;
  prepTimeMins: number;
}

export interface HistoricalReport {
  id: string;
  title: string;
  periodType: 'Daily' | 'Weekly' | 'Monthly';
  createdAt: string;
  totalResponses: number;
  avgRating: number;
  satisfactionPct: number;
  topCategory: FoodCategory;
  topPriceRange: PriceRange;
  summaryNotes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'gemini' | 'local-analytics';
}

export type AppTab =
  | 'overview'
  | 'survey'
  | 'assistant'
  | 'menu'
  | 'recommendations'
  | 'analytics'
  | 'import-export';

export interface BootstrapPayload {
  surveys: SurveyResponse[];
  menuItems: MenuItem[];
  reports: HistoricalReport[];
  storageMode: string;
}
