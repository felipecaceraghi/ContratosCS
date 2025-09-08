'use client';

import { useState, useEffect, useRef } from 'react';
import { companiesAPI } from '@/lib/api';
import { Company } from '@/types';

interface CompanySearchMultipleProps {
  onCompaniesSelect?: (companies: Company[]) => void;
  placeholder?: string;
  selectedCompanies?: Company[];
}

export default function CompanySearchMultiple({ 
  onCompaniesSelect, 
  placeholder = "Buscar empresa...",
  selectedCompanies = []
}: CompanySearchMultipleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [internalSelectedCompanies, setInternalSelectedCompanies] = useState<Company[]>(selectedCompanies);
  const searchRef = useRef<HTMLDivElement>(null);

  // Update internal state when prop changes
  useEffect(() => {
    setInternalSelectedCompanies(selectedCompanies);
  }, [selectedCompanies]);

  // Debounce search
  useEffect(() => {
    if (searchTerm.length < 3) {
      setCompanies([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await companiesAPI.search(searchTerm);
        if (result.status === 'success') {
          setCompanies(result.companies);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Erro na busca:', error);
        setCompanies([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCompanySelect = (company: Company) => {
    // Check if company is already selected
    const isAlreadySelected = internalSelectedCompanies.some(c => c.cod === company.cod);
    
    if (!isAlreadySelected) {
      const newSelectedCompanies = [...internalSelectedCompanies, company];
      setInternalSelectedCompanies(newSelectedCompanies);
      
      if (onCompaniesSelect) {
        onCompaniesSelect(newSelectedCompanies);
      }
    }
    
    setSearchTerm('');
    setShowDropdown(false);
    setCompanies([]);
  };

  const handleRemoveCompany = (companyToRemove: Company) => {
    const newSelectedCompanies = internalSelectedCompanies.filter(c => c.cod !== companyToRemove.cod);
    setInternalSelectedCompanies(newSelectedCompanies);
    
    if (onCompaniesSelect) {
      onCompaniesSelect(newSelectedCompanies);
    }
  };

  const clearAllSelections = () => {
    setInternalSelectedCompanies([]);
    if (onCompaniesSelect) {
      onCompaniesSelect([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all force-black-text !text-black"
            style={{ 
              color: '#000000 !important',
              WebkitTextFillColor: '#000000 !important'
            }}
          />
          
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Dropdown Results */}
        {showDropdown && companies.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {companies.map((company) => {
              const isSelected = internalSelectedCompanies.some(c => c.cod === company.cod);
              return (
                <button
                  key={company.cod}
                  onClick={() => handleCompanySelect(company)}
                  disabled={isSelected}
                  className={`w-full px-4 py-3 text-left border-b border-gray-100 last:border-b-0 focus:outline-none transition-colors ${
                    isSelected 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'hover:bg-gray-50 focus:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{company.cod}</div>
                      <div className="text-sm text-gray-600">{company.name}</div>
                    </div>
                    {isSelected && (
                      <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* No results message */}
        {showDropdown && companies.length === 0 && searchTerm.length >= 3 && !isLoading && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
            Nenhuma empresa encontrada
          </div>
        )}
      </div>

      {/* Selected Companies */}
      {internalSelectedCompanies.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">
              Empresas Selecionadas ({internalSelectedCompanies.length})
            </h4>
            <button
              onClick={clearAllSelections}
              className="text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              Limpar todas
            </button>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {internalSelectedCompanies.map((company) => (
              <div 
                key={company.cod}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div>
                  <div className="font-medium text-blue-900">{company.cod}</div>
                  <div className="text-sm text-blue-700">{company.name}</div>
                </div>
                <button
                  onClick={() => handleRemoveCompany(company)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
