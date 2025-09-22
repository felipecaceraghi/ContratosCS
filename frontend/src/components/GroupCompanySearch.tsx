'use client';

import { useState, useEffect, useRef } from 'react';
import { companiesAPI } from '@/lib/api';
import { Company } from '@/types';

interface GroupCompanySearchProps {
  onCompaniesSelect?: (companies: Company[]) => void;
  placeholder?: string;
  selectedCompanies?: Company[];
}

interface Group {
  cod: string;
  name: string;
  group_name: string;
  company_count: number;
}

export default function GroupCompanySearch({ 
  onCompaniesSelect, 
  placeholder = "Buscar grupo...",
  selectedCompanies = []
}: GroupCompanySearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  
  // O estado local de empresas selecionadas é usado internamente pela função handleGroupSelect
  const [, _setSelectedCompanies] = useState<Company[]>(selectedCompanies);
  const searchRef = useRef<HTMLDivElement>(null);

  // Update internal state when prop changes
  useEffect(() => {
    _setSelectedCompanies(selectedCompanies);
  }, [selectedCompanies]);

  // Debounce search for groups
  useEffect(() => {
    if (searchTerm.length < 3) {
      setGroups([]);
      setShowGroupDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoadingGroups(true);
      try {
        const result = await companiesAPI.search(searchTerm);
        if (result.status === 'success') {
          setGroups(result.companies);
          setShowGroupDropdown(true);
        }
      } catch (error) {
        console.error('Erro na busca de grupos:', error);
        setGroups([]);
      } finally {
        setIsLoadingGroups(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowGroupDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGroupSelect = async (group: Group) => {
    // Verificar se o grupo já está selecionado
    const isAlreadySelected = selectedCompanies.some(company => company.group_name === group.group_name);
    
    if (isAlreadySelected) {
      // Se já está selecionado, remover o grupo
      const filteredCompanies = selectedCompanies.filter(company => company.group_name !== group.group_name);
      _setSelectedCompanies(filteredCompanies);
      onCompaniesSelect?.(filteredCompanies);
      setShowGroupDropdown(false);
      setSearchTerm('');
      return;
    }
    
    setShowGroupDropdown(false);
    setSearchTerm('');
    
    // Carregar empresas do grupo e adicionar às já selecionadas
    try {
      const result = await companiesAPI.getCompaniesByGroup(group.group_name);
      if (result.status === 'success') {
        // Adicionar o nome do grupo a cada empresa
        const companiesWithGroup = result.companies.map((company: Company) => ({
          ...company,
          group_name: group.group_name
        }));
        
        // Combinar com empresas já selecionadas
        const allCompanies = [...selectedCompanies, ...companiesWithGroup];
        _setSelectedCompanies(allCompanies);
        onCompaniesSelect?.(allCompanies);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas do grupo:', error);
    }
  };

  const clearSelection = () => {
    _setSelectedCompanies([]);
    onCompaniesSelect?.([]);
  };

  const removeGroup = (groupName: string) => {
    const filteredCompanies = selectedCompanies.filter(company => company.group_name !== groupName);
    _setSelectedCompanies(filteredCompanies);
    onCompaniesSelect?.(filteredCompanies);
  };

  // Obter lista de grupos únicos selecionados
  const selectedGroups = Array.from(new Set(selectedCompanies.map(company => company.group_name)));
  const totalCompanies = selectedCompanies.length;

  return (
    <div className="space-y-4">
      {/* Busca de Grupos */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ color: '#000000' }}
          />
          {isLoadingGroups && (
            <div className="absolute right-3 top-2.5">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>

        {/* Dropdown de Grupos */}
        {showGroupDropdown && groups.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {groups.map((group, index) => {
              const isSelected = selectedCompanies.some(company => company.group_name === group.group_name);
              return (
                <button
                  key={index}
                  onClick={() => handleGroupSelect(group)}
                  className={`w-full px-4 py-3 text-left border-b last:border-b-0 focus:outline-none transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 hover:bg-blue-100' 
                      : 'hover:bg-gray-50'
                  }`}
                  style={{ color: '#000000' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium flex items-center">
                        {isSelected && <span className="text-blue-600 mr-2">✓</span>}
                        {group.group_name}
                      </div>
                      <div className="text-sm opacity-70">{group.company_count} empresas</div>
                    </div>
                    {isSelected && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Selecionado
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grupos Selecionados */}
      {selectedGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">
              Grupos Selecionados ({selectedGroups.length})
            </h4>
            <span className="text-sm text-gray-500">
              {totalCompanies} empresas no total
            </span>
          </div>
          <div className="space-y-2">
            {selectedGroups.map((groupName, index) => {
              const groupCompanies = selectedCompanies.filter(company => company.group_name === groupName);
              return (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <div>
                        <div className="font-medium text-gray-900">{groupName}</div>
                        <div className="text-sm text-gray-600">{groupCompanies.length} empresas</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeGroup(groupName)}
                      className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={clearSelection}
              className="w-full text-sm py-2 px-3 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Limpar Todos os Grupos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
