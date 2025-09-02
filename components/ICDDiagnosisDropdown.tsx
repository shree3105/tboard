'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import apiClient from '@/lib/api';
import { ICDCodeSimple } from '@/lib/types';

interface ICDDiagnosisDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function ICDDiagnosisDropdown({
  value,
  onChange,
  placeholder = "Search diagnosis...",
  className = "",
  disabled = false
}: ICDDiagnosisDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [icdCodes, setIcdCodes] = useState<ICDCodeSimple[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<ICDCodeSimple | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  console.log('🏥 ICDDiagnosisDropdown: Component rendered with value:', value, 'searchQuery:', searchQuery);

  // Load ICD codes when component mounts or search query changes
  useEffect(() => {
    const loadICDCodes = async () => {
      if (!searchQuery.trim()) {
        setIcdCodes([]);
        return;
      }

      console.log('🔍 ICDDiagnosisDropdown: Searching for:', searchQuery);
      setIsLoading(true);
      try {
        console.log('📡 ICDDiagnosisDropdown: Calling API...');
        const codes = await apiClient.getICDCodes(searchQuery, 50);
        console.log('✅ ICDDiagnosisDropdown: API response:', codes);
        setIcdCodes(codes);
      } catch (error) {
        console.error('❌ ICDDiagnosisDropdown: Failed to load ICD codes:', error);
        // Fallback to empty array - user can still type freely
        setIcdCodes([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(loadICDCodes, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Component mount effect
  useEffect(() => {
    console.log('🚀 ICDDiagnosisDropdown: Component mounted');
    return () => console.log('💀 ICDDiagnosisDropdown: Component unmounted');
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find selected code when value changes
  useEffect(() => {
    if (value && icdCodes.length > 0) {
      const found = icdCodes.find(code => 
        code.sub_code === value || code.label === value
      );
      if (found) {
        setSelectedCode(found);
      }
    }
  }, [value, icdCodes]);

  const handleSelectCode = (code: ICDCodeSimple) => {
    setSelectedCode(code);
    onChange(code.label); // Use the human-readable label
    setSearchQuery(code.label);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedCode(null);
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('🔤 ICDDiagnosisDropdown: Input changed to:', newValue);
    setSearchQuery(newValue);
    onChange(newValue); // Allow free text input
    setIsOpen(true);
  };

  // Initialize search query when value changes externally
  useEffect(() => {
    if (value && !searchQuery) {
      console.log('🔄 ICDDiagnosisDropdown: Setting search query from external value:', value);
      setSearchQuery(value);
    }
  }, [value, searchQuery]);

  // Debug search query changes
  useEffect(() => {
    console.log('🔍 ICDDiagnosisDropdown: Search query changed to:', searchQuery);
  }, [searchQuery]);

  const handleInputFocus = () => {
    if (searchQuery.trim()) {
      setIsOpen(true);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <Search className="h-3 w-3 text-gray-400" />
        </div>

        {/* Clear Button */}
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-6 flex items-center pr-1 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Dropdown Arrow */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
          type="button"
          disabled={disabled}
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-2 py-1 text-xs text-gray-500 text-center">
              Searching...
            </div>
          ) : icdCodes.length > 0 ? (
            <div className="py-1">
              {icdCodes.map((code) => (
                <button
                  key={code.id}
                  onClick={() => handleSelectCode(code)}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  type="button"
                >
                  <div className="font-mono text-blue-600 text-xs">{code.sub_code}</div>
                  <div className="text-gray-900 text-xs">{code.label}</div>
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="px-2 py-1 text-xs text-gray-500 text-center">
              No diagnosis codes found
            </div>
          ) : (
            <div className="px-2 py-1 text-xs text-gray-500 text-center">
              Start typing to search diagnosis codes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
