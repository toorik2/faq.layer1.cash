export interface FAQ {
  question: string;
  answer: string;
}

export interface FAQCategory {
  name: string;
  description: string;
  source: string;
  faqs: FAQ[];
}

export interface FAQData {
  title: string;
  description: string;
  total_faqs: number;
  categories: FAQCategory[];
}

export interface CategoryInfo {
  name: string;
  count: number;
  source: string;
}
