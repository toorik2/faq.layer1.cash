import { createSignal, createEffect, For, Show } from 'solid-js';
import Fuse from 'fuse.js';
import { Search, ChevronDown } from 'lucide-solid';
import type { FAQData, FAQCategory, FAQ } from './types';

export default function App() {
  const [faqData, setFaqData] = createSignal<FAQData | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal('All');
  const [openFaqIndex, setOpenFaqIndex] = createSignal<string | null>(null);
  const [fuse, setFuse] = createSignal<Fuse<{ question: string; answer: string; categoryName: string; categorySource: string }> | null>(null);

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
          threshold: 0.3,
          ignoreLocation: true
        });

        setFuse(fuseInstance);
      });
  });

  const filteredCategories = () => {
    const data = faqData();
    if (!data) return [];

    const query = searchQuery().trim();
    const category = selectedCategory();

    if (!query && category === 'All') {
      return data.categories;
    }

    let categories = data.categories;

    if (category !== 'All') {
      categories = categories.filter(cat => cat.name === category);
    }

    if (query && fuse()) {
      const searchResults = fuse()!.search(query);
      const resultSet = new Set(
        searchResults.map(result => `${result.item.categoryName}:${result.item.question}`)
      );

      categories = categories.map(cat => ({
        ...cat,
        faqs: cat.faqs.filter(faq => resultSet.has(`${cat.name}:${faq.question}`))
      })).filter(cat => cat.faqs.length > 0);
    }

    return categories;
  };

  const totalResults = () => {
    return filteredCategories().reduce((sum, cat) => sum + cat.faqs.length, 0);
  };

  const categoryList = () => {
    const data = faqData();
    if (!data) return [];

    const counts = new Map<string, number>();
    data.categories.forEach(cat => {
      counts.set(cat.name, (counts.get(cat.name) || 0) + cat.faqs.length);
    });

    return [
      { name: 'All', count: data.total_faqs, source: '' },
      ...data.categories.map(cat => ({
        name: cat.name,
        count: cat.faqs.length,
        source: cat.source
      }))
    ];
  };

  const toggleFaq = (categoryName: string, index: number) => {
    const key = `${categoryName}-${index}`;
    setOpenFaqIndex(openFaqIndex() === key ? null : key);
  };

  const isFaqOpen = (categoryName: string, index: number) => {
    return openFaqIndex() === `${categoryName}-${index}`;
  };

  return (
    <>
      <header>
        <div class="container">
          <h1>Bitcoin Cash Technical FAQ</h1>

          <div class="search-bar">
            <Search class="search-icon" size={20} />
            <input
              type="text"
              class="search-input"
              placeholder="Search FAQs..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
          </div>
        </div>
      </header>

      <div class="container">
        <div class="main-content">
          <aside class="sidebar">
            <h2>Categories</h2>
            <ul class="category-list">
              <For each={categoryList()}>
                {(cat) => (
                  <li class="category-item">
                    <button
                      class={`category-button ${selectedCategory() === cat.name ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.name)}
                    >
                      <span>{cat.name}</span>
                      <span class="category-count">{cat.count}</span>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </aside>

          <main class="faq-list">
            <Show when={searchQuery() || selectedCategory() !== 'All'}>
              <p class="result-count">
                {totalResults()} {totalResults() === 1 ? 'result' : 'results'}
              </p>
            </Show>

            <Show
              when={filteredCategories().length > 0}
              fallback={
                <div class="no-results">
                  <h3>No results found</h3>
                  <p>Try adjusting your search or filter</p>
                </div>
              }
            >
              <For each={filteredCategories()}>
                {(category: FAQCategory) => (
                  <>
                    <For each={category.faqs}>
                      {(faq: FAQ, index) => (
                        <div class={`faq-item ${isFaqOpen(category.name, index()) ? 'open' : ''}`}>
                          <button
                            class="faq-question"
                            onClick={() => toggleFaq(category.name, index())}
                          >
                            <span class="faq-question-text">{faq.question}</span>
                            <ChevronDown class="faq-icon" size={20} />
                          </button>
                          <div class="faq-answer">
                            <div class="faq-answer-content">{faq.answer}</div>
                          </div>
                        </div>
                      )}
                    </For>
                  </>
                )}
              </For>
            </Show>
          </main>
        </div>
      </div>
    </>
  );
}
