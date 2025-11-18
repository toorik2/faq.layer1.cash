import { createSignal, createEffect, For, Show } from 'solid-js';
import Fuse from 'fuse.js';
import { Search, ChevronDown, ChevronRight, Grid3X3, ArrowLeft } from 'lucide-solid';
import type { FAQData, FAQCategory, FAQ } from './types';

type ViewMode = 'featured' | 'category' | 'all' | 'search';

interface FeaturedFAQ {
  question: string;
  answer: string;
  categoryName: string;
  categorySource: string;
}

export default function App() {
  const [faqData, setFaqData] = createSignal<FAQData | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [showCategories, setShowCategories] = createSignal(false);
  const [selectedCategory, setSelectedCategory] = createSignal<string | null>(null);
  const [viewMode, setViewMode] = createSignal<ViewMode>('featured');
  const [openFaqIndex, setOpenFaqIndex] = createSignal<string | null>(null);
  const [fuse, setFuse] = createSignal<Fuse<FeaturedFAQ> | null>(null);

  createEffect(() => {
    fetch('/data/all-faqs.json')
      .then(res => res.json())
      .then((data: FAQData) => {
        setFaqData(data);

        const allFaqs = data.categories.flatMap(cat =>
          cat.faqs.map(faq => ({
            question: faq.question,
            answer: faq.answer,
            categoryName: cat.name,
            categorySource: cat.source
          }))
        );

        const fuseInstance = new Fuse(allFaqs, {
          keys: ['question', 'answer'],
          threshold: 0.1,
          ignoreLocation: true,
          findAllMatches: true
        });

        setFuse(fuseInstance);

        // Auto-expand first featured question
        setOpenFaqIndex('featured-0');
      });
  });

  // Get featured questions - diverse sampling from different categories
  const featuredQuestions = () => {
    const data = faqData();
    if (!data) return [];

    const featured: FeaturedFAQ[] = [];
    const usedCategories = new Set<string>();

    // First, find "What is this FAQ" question
    for (const cat of data.categories) {
      const introFaq = cat.faqs.find(faq =>
        faq.question.toLowerCase().includes('what is this faq')
      );
      if (introFaq) {
        featured.push({
          question: introFaq.question,
          answer: introFaq.answer,
          categoryName: cat.name,
          categorySource: cat.source
        });
        usedCategories.add(cat.name);
        break;
      }
    }

    // Then pick one from each of the next categories until we have 5
    for (const cat of data.categories) {
      if (featured.length >= 5) break;
      if (usedCategories.has(cat.name)) continue;
      if (cat.faqs.length === 0) continue;

      // Pick the first FAQ from this category
      const faq = cat.faqs[0];
      featured.push({
        question: faq.question,
        answer: faq.answer,
        categoryName: cat.name,
        categorySource: cat.source
      });
      usedCategories.add(cat.name);
    }

    return featured;
  };

  // Get questions for selected category
  const categoryQuestions = () => {
    const data = faqData();
    const catName = selectedCategory();
    if (!data || !catName) return [];

    // Aggregate across all categories with the same name
    const allFaqsInCategory = data.categories
      .filter(c => c.name === catName)
      .flatMap(cat => cat.faqs.map(faq => ({
        question: faq.question,
        answer: faq.answer,
        categoryName: cat.name,
        categorySource: cat.source
      })));

    // Return first 5 questions from category
    return allFaqsInCategory.slice(0, 5);
  };

  // Get all questions for selected category
  const allCategoryQuestions = () => {
    const data = faqData();
    const catName = selectedCategory();
    if (!data || !catName) return [];

    // Aggregate across all categories with the same name
    return data.categories
      .filter(c => c.name === catName)
      .flatMap(cat => cat.faqs.map(faq => ({
        question: faq.question,
        answer: faq.answer,
        categoryName: cat.name,
        categorySource: cat.source
      })));
  };

  // Get ALL questions from ALL categories
  const allQuestions = () => {
    const data = faqData();
    if (!data) return [];

    return data.categories.flatMap(cat =>
      cat.faqs.map(faq => ({
        question: faq.question,
        answer: faq.answer,
        categoryName: cat.name,
        categorySource: cat.source
      }))
    );
  };

  // Get search results
  const searchResults = () => {
    const query = searchQuery().trim();
    if (!query || !fuse()) return [];

    const results = fuse()!.search(query).map(result => result.item);

    // If category is selected, filter results to only that category
    const catName = selectedCategory();
    if (catName) {
      return results.filter(item => item.categoryName === catName);
    }

    return results;
  };

  // Current questions to display
  const currentQuestions = () => {
    const mode = viewMode();

    if (mode === 'search' && searchQuery().trim()) {
      return searchResults();
    }
    if (mode === 'category') {
      return categoryQuestions();
    }
    if (mode === 'all') {
      if (selectedCategory()) {
        return allCategoryQuestions();
      }
      return allQuestions();
    }
    return featuredQuestions();
  };

  const totalFaqs = () => faqData()?.total_faqs || 0;

  const uniqueCategories = () => {
    const data = faqData();
    if (!data) return [];
    const seen = new Set<string>();
    return data.categories
      .map(c => c.name)
      .filter(name => {
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      });
  };

  const totalCategories = () => uniqueCategories().length;

  const toggleFaq = (index: number) => {
    const key = `faq-${index}`;
    setOpenFaqIndex(openFaqIndex() === key ? null : key);
  };

  const isFaqOpen = (index: number) => {
    if (viewMode() === 'featured' && index === 0 && openFaqIndex() === 'featured-0') {
      return true;
    }
    return openFaqIndex() === `faq-${index}`;
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setViewMode('category');
    setShowCategories(false);
    setOpenFaqIndex(null);
  };

  const handleViewAll = () => {
    if (viewMode() === 'category' && selectedCategory()) {
      setViewMode('all');
    } else {
      setSelectedCategory(null);
      setViewMode('all');
    }
  };

  const handleBackToFeatured = () => {
    setSelectedCategory(null);
    setViewMode('featured');
    setOpenFaqIndex('featured-0');
    setSearchQuery('');
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setViewMode('search');
    } else {
      // If in a category, go back to category view, otherwise featured
      if (selectedCategory()) {
        setViewMode('category');
      } else {
        setViewMode('featured');
      }
    }
  };

  const getCategoryCount = (categoryName: string) => {
    const data = faqData();
    if (!data) return 0;
    // Aggregate across all categories with the same name (different sources)
    return data.categories
      .filter(c => c.name === categoryName)
      .reduce((sum, cat) => sum + cat.faqs.length, 0);
  };

  const searchPlaceholder = () => {
    const catName = selectedCategory();
    if (catName) {
      // Use generic text for long category names to avoid overflow
      if (catName.length > 25) {
        return `Search within current category... [${getCategoryCount(catName)} questions]`;
      }
      return `Search within ${catName}... [${getCategoryCount(catName)} questions]`;
    }
    return `Search all questions... [Current total of ${totalFaqs()}]`;
  };

  // Replace hardcoded numbers in intro FAQ answer with actual values
  const formatAnswer = (answer: string) => {
    return answer
      .replace(/643\+? questions/gi, `${totalFaqs()} questions`)
      .replace(/54 categories/gi, `${totalCategories()} categories`);
  };

  return (
    <>
      <div class="container">
        <nav class="header-nav">
          <a href="https://faq.layer1.cash" class="nav-link active">FAQ</a>
          <a href="https://arena.layer1.cash" class="nav-link">Arena</a>
          <a href="https://jump.layer1.cash" class="nav-link">Jump</a>
        </nav>
        <header>
          <h1>Bitcoin Cash Technical FAQ</h1>

          <div class="search-bar">
            <Search class="search-icon" size={20} />
            <input
              type="text"
              class="search-input"
              placeholder={searchPlaceholder()}
              value={searchQuery()}
              onInput={(e) => handleSearchInput(e.currentTarget.value)}
            />
          </div>

          <div class="action-buttons">
            <button
              class={`browse-button ${showCategories() ? 'active' : ''}`}
              onClick={() => setShowCategories(!showCategories())}
            >
              <Grid3X3 size={18} />
              <span>Browse {totalCategories()} Categories</span>
              <ChevronDown
                class={`browse-icon ${showCategories() ? 'rotated' : ''}`}
                size={16}
              />
            </button>
          </div>

          <Show when={showCategories()}>
            <div class="category-accordion">
              <div class="category-grid">
                <For each={uniqueCategories()}>
                  {(catName) => (
                    <button
                      class="category-card"
                      onClick={() => handleCategorySelect(catName)}
                    >
                      <span class="category-card-name">{catName}</span>
                      <span class="category-card-count">{getCategoryCount(catName)}</span>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </header>
      </div>

      <div class="container">
        <main class="faq-content">
          <Show when={viewMode() !== 'featured' || searchQuery().trim()}>
            <button class="back-button" onClick={handleBackToFeatured}>
              <ArrowLeft size={18} />
              <span>Back to Start</span>
            </button>
          </Show>

          <div class="section-header">
            <Show when={viewMode() === 'featured' && !searchQuery().trim()}>
              <h2>Featured Questions</h2>
            </Show>
            <Show when={viewMode() === 'search' && searchQuery().trim()}>
              <h2>Search Results ({searchResults().length})</h2>
            </Show>
            <Show when={viewMode() === 'category' && selectedCategory()}>
              <h2>{selectedCategory()} <span class="header-count">Top 5</span></h2>
            </Show>
            <Show when={viewMode() === 'all' && selectedCategory()}>
              <h2>{selectedCategory()} <span class="header-count">All {getCategoryCount(selectedCategory()!)}</span></h2>
            </Show>
            <Show when={viewMode() === 'all' && !selectedCategory()}>
              <h2>All Questions <span class="header-count">{totalFaqs()}</span></h2>
            </Show>
          </div>

          <Show
            when={currentQuestions().length > 0}
            fallback={
              <div class="no-results">
                <h3>No results found</h3>
                <p>Try adjusting your search query</p>
              </div>
            }
          >
            <For each={currentQuestions()}>
              {(faq, index) => (
                <div class={`faq-item ${isFaqOpen(index()) ? 'open' : ''}`}>
                  <button
                    class="faq-question"
                    onClick={() => {
                      if (viewMode() === 'featured' && openFaqIndex() === 'featured-0') {
                        setOpenFaqIndex(null);
                      }
                      toggleFaq(index());
                    }}
                  >
                    <span class="faq-question-text">{faq.question}</span>
                    <ChevronDown class="faq-icon" size={20} />
                  </button>
                  <div class="faq-answer">
                    <div class="faq-answer-content">{formatAnswer(faq.answer)}</div>
                    <div class="faq-meta">
                      <span class="faq-category-tag">{faq.categoryName}</span>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>

          <Show when={viewMode() === 'featured' && !searchQuery().trim()}>
            <div class="view-all-section">
              <button class="view-all-button" onClick={handleViewAll}>
                View All {totalFaqs()} Questions
                <ChevronRight size={18} />
              </button>
            </div>
          </Show>

          <Show when={viewMode() === 'category' && selectedCategory() && getCategoryCount(selectedCategory()!) > 5}>
            <div class="view-all-section">
              <button class="view-all-button" onClick={handleViewAll}>
                Show All {getCategoryCount(selectedCategory()!)} Questions in {selectedCategory()}
                <ChevronRight size={18} />
              </button>
            </div>
          </Show>
        </main>
      </div>
    </>
  );
}
