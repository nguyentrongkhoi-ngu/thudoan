'use client';

import { useState, useRef, useEffect } from 'react';
import useSearch, { SearchFilters } from '@/hooks/useSearch';

interface SearchFieldProps {
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  withSuggestions?: boolean;
  withFilters?: boolean;
  defaultFilters?: SearchFilters;
  onSearch?: (term: string, filters: SearchFilters) => void;
}

const SearchField = ({
  size = 'md',
  placeholder = 'Tìm kiếm sản phẩm...',
  className = '',
  autoFocus = false,
  withSuggestions = true,
  withFilters = false,
  defaultFilters,
  onSearch
}: SearchFieldProps) => {
  const {
    searchTerm,
    setSearchTerm,
    suggestions,
    isLoadingSuggestions,
    recentSearches,
    filters,
    executeSearch,
    removeSavedSearch
  } = useSearch({ defaultFilters });
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus on input if enabled
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm, filters);
    } else {
      executeSearch();
    }
    setShowSuggestions(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    if (onSearch) {
      onSearch(suggestion, filters);
    } else {
      executeSearch(suggestion);
    }
    setShowSuggestions(false);
  };

  // Remove a saved search term
  const handleRemoveSavedSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeSavedSearch(term);
  };

  // Highlight text based on search term
  const highlightText = (text: string, query: string) => {
    if (!query || query.trim() === '') return text;
    
    try {
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return (
        <>
          {parts.map((part, index) => 
            part.toLowerCase() === query.toLowerCase() 
              ? <span key={index} className="bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white">{part}</span> 
              : part
          )}
        </>
      );
    } catch (e) {
      return text;
    }
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'py-1.5 px-3 pl-8 text-sm';
      case 'lg':
        return 'py-3 px-5 pl-12 text-lg';
      case 'md':
      default:
        return 'py-2 px-4 pl-10 text-base';
    }
  };

  // Get icon size classes
  const getIconSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4 left-2.5';
      case 'lg':
        return 'h-6 w-6 left-4';
      case 'md':
      default:
        return 'h-5 w-5 left-3';
    }
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <form onSubmit={handleSearch} className="flex w-full">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className={`w-full ${getSizeClasses()} rounded-l-xl border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            autoComplete="off"
          />
          <div className={`absolute ${getIconSizeClasses()} top-1/2 transform -translate-y-1/2 text-base-content/70`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* Suggestions dropdown */}
          {withSuggestions && showSuggestions && (searchTerm.length > 0 || recentSearches.length > 0) && (
            <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-base-100 rounded-lg shadow-lg border border-base-300 max-h-60 overflow-auto">
              {searchTerm.length > 0 && (
                <div className="p-2">
                  <div className="text-sm font-medium text-base-content/70 px-3 py-1.5">Gợi ý từ khóa</div>
                  {isLoadingSuggestions ? (
                    <div className="flex items-center justify-center py-3">
                      <span className="loading loading-spinner loading-sm text-primary"></span>
                    </div>
                  ) : suggestions.length > 0 ? (
                    <>
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="w-full text-left px-3 py-2 hover:bg-base-200 rounded-lg flex items-center cursor-pointer"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {highlightText(suggestion, searchTerm)}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="px-3 py-2 text-base-content/50">
                      Không có gợi ý nào
                    </div>
                  )}
                </div>
              )}
              
              {recentSearches.length > 0 && (
                <div className={`p-2 ${searchTerm.length > 0 && suggestions.length > 0 ? 'border-t border-base-300' : ''}`}>
                  <div className="text-sm font-medium text-base-content/70 px-3 py-1.5 flex justify-between items-center">
                    <span>Tìm kiếm gần đây</span>
                  </div>
                  {recentSearches.map((search, index) => (
                    <div
                      key={index}
                      className="w-full text-left px-3 py-2 hover:bg-base-200 rounded-lg flex items-center justify-between group cursor-pointer"
                      onClick={() => handleSuggestionClick(search)}
                    >
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-base-content/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {searchTerm ? highlightText(search, searchTerm) : search}
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-base-300 rounded-full transition-opacity"
                        onClick={(e) => handleRemoveSavedSearch(e, search)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-base-content/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          className={`bg-primary hover:bg-primary-focus text-primary-content rounded-r-xl transition-colors ${
            size === 'sm' ? 'px-3' : size === 'lg' ? 'px-8' : 'px-6'
          }`}
        >
          Tìm kiếm
        </button>
      </form>
    </div>
  );
};

export default SearchField; 