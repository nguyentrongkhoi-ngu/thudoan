import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  inStock?: boolean;
  rating?: number;
}

export interface UseSearchProps {
  defaultSearchTerm?: string;
  defaultFilters?: SearchFilters;
  saveHistory?: boolean;
}

export interface UseSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  suggestions: string[];
  isLoadingSuggestions: boolean;
  recentSearches: string[];
  filters: SearchFilters;
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  resetFilters: () => void;
  executeSearch: (term?: string) => void;
  removeSavedSearch: (term: string) => void;
}

const useSearch = ({
  defaultSearchTerm = '',
  defaultFilters = { sort: 'relevance' },
  saveHistory = true
}: UseSearchProps = {}): UseSearchReturn => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State từ URL
  const searchQuery = searchParams.get('q') || defaultSearchTerm;
  const initialFilters = useMemo(() => {
    return {
      category: searchParams.get('category') || defaultFilters.category,
      minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice') || '0') : defaultFilters.minPrice,
      maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice') || '0') : defaultFilters.maxPrice,
      sort: searchParams.get('sort') || defaultFilters.sort || 'relevance',
      inStock: searchParams.get('inStock') === 'true' || defaultFilters.inStock,
      rating: searchParams.get('rating') ? parseInt(searchParams.get('rating') || '0') : defaultFilters.rating,
    };
  }, [searchParams, defaultFilters]);

  // State
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && saveHistory) {
      const searches = localStorage.getItem('recentSearches');
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    }
  }, [saveHistory]);

  // Fetch suggestions when search term changes
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(`/api/products/suggestions?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
          setSuggestions([]);
          return;
        }

        const data = await response.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    // Debounce fetch
    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Lưu tìm kiếm vào lịch sử
  const saveSearch = (term: string) => {
    if (!saveHistory || term.trim() === '') return;
    
    let searches = [...recentSearches];
    // Remove if exists to prevent duplicates
    searches = searches.filter(s => s !== term);
    // Add to beginning of array
    searches.unshift(term);
    // Keep only the last 10 searches
    searches = searches.slice(0, 10);
    
    setRecentSearches(searches);
    localStorage.setItem('recentSearches', JSON.stringify(searches));
  };

  // Xóa một tìm kiếm khỏi lịch sử
  const removeSavedSearch = (term: string) => {
    if (!saveHistory) return;
    
    const searches = recentSearches.filter(s => s !== term);
    setRecentSearches(searches);
    localStorage.setItem('recentSearches', JSON.stringify(searches));
  };

  // Set một filter
  const setFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      sort: 'relevance'
    });
  };

  // Thực hiện tìm kiếm
  const executeSearch = (term?: string) => {
    const searchValue = term !== undefined ? term : searchTerm;
    
    if (searchValue && searchValue.trim() !== '') {
      saveSearch(searchValue.trim());
    }
    
    // Build URL params
    const params = new URLSearchParams();
    if (searchValue && searchValue.trim() !== '') {
      params.set('q', searchValue.trim());
    }
    
    // Add all active filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== false) {
        params.set(key, String(value));
      }
    });
    
    router.push(`/search?${params.toString()}`);
  };

  return {
    searchTerm,
    setSearchTerm,
    suggestions,
    isLoadingSuggestions,
    recentSearches,
    filters,
    setFilter,
    resetFilters,
    executeSearch,
    removeSavedSearch
  };
};

export default useSearch; 