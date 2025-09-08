'use client';

import { useState, useEffect, useRef } from 'react';
import { companiesAPI } from '@/lib/api';
import { Company, CompanyDetails } from '@/types';
import LoadingSpinner from './LoadingSpinner';

interface CompanySearchProps {
  onCompanySelect?: (company: Company) => void;
  placeholder?: string;
  className?: string;
}

export default function CompanySearch({ 
  onCompanySelect, 
  placeholder = "Buscar empresa por código ou nome...",
  className = ""
}: CompanySearchProps) {
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [error, setError] = useState('');
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar empresas quando query muda
  useEffect(() => {
    const searchCompanies = async () => {
      if (query.length < 3) {
        setCompanies([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const result = await companiesAPI.search(query);
        
        if (result.status === 'success') {
          setCompanies(result.companies);
          setIsOpen(true);
        } else {
          setError(result.message || 'Erro na busca');
          setCompanies([]);
          setIsOpen(false);
        }
      } catch (err: any) {
        setError('Erro ao buscar empresas');
        setCompanies([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchCompanies, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleCompanySelect = async (company: Company) => {
    setSelectedCompany(company);
    setQuery(`${company.cod} - ${company.name}`);
    setIsOpen(false);
    
    // Buscar detalhes da empresa
    try {
      const details = await companiesAPI.getDetails(company.cod);
      if (details.status === 'success') {
        setCompanyDetails(details.company);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes:', err);
    }
    
    onCompanySelect?.(company);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Reset quando limpar o input
    if (!value) {
      setSelectedCompany(null);
      setCompanyDetails(null);
      setCompanies([]);
      setIsOpen(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSelectedCompany(null);
    setCompanyDetails(null);
    setCompanies([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors duration-200 placeholder-gray-400 bg-white !text-black force-black-text"
            style={{ 
              color: '#000000 !important',
              WebkitTextFillColor: '#000000 !important'
            }}
          />
          
          {/* Search Icon or Loading */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : query ? (
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {companies.length > 0 ? (
              <ul className="py-1">
                {companies.map((company) => (
                  <li key={company.cod}>
                    <button
                      onClick={() => handleCompanySelect(company)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">
                              {company.cod.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {company.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {company.cod} • {company.group_name || 'Sem grupo'}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.length >= 3 && !isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Nenhuma empresa encontrada
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Selected Company Details */}
      {selectedCompany && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {selectedCompany.cod.substring(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {selectedCompany.name}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                Código: <span className="font-medium">{selectedCompany.cod}</span>
              </p>
              {selectedCompany.group_name && (
                <p className="text-sm text-gray-600">
                  Grupo: <span className="font-medium">{selectedCompany.group_name}</span>
                </p>
              )}
            </div>
          </div>

          {/* Company Details */}
          {companyDetails?.details && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Informações Adicionais</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {Object.entries(companyDetails.details)
                  .filter(([key, value]) => value && value !== 'nan' && value !== '')
                  .slice(0, 8) // Mostrar apenas os primeiros 8 campos
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-medium text-gray-900 truncate ml-2">{String(value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Help */}
      {!query && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-blue-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como buscar:</p>
              <ul className="space-y-1">
                <li>• Digite pelo menos 3 caracteres</li>
                <li>• Busque por código da empresa ou nome</li>
                <li>• Selecione uma empresa para ver os detalhes</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
