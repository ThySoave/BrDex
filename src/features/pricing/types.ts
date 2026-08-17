export interface CommunityPrice {
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  sampleCount: number;
}

export interface ReferencePrice {
  priceBrl: number;
  source: string;
}

export interface CardPricesData {
  community: CommunityPrice | null;
  reference: ReferencePrice | null;
}
