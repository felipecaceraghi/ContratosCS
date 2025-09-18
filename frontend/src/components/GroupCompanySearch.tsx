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
  
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedCompanies_, setSelectedCompanies_] = useState<Company[]>(selectedCompanies);
  const searchRef = useRef<HTMLDivElement>(null);

  // Update internal state when prop changes
  useEffect(() => {
    setSelectedCompanies_(selectedCompanies);
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
    setSelectedGroup(group);
    setShowGroupDropdown(false);
    setSearchTerm('');
    
    // Carregar empresas do grupo automaticamente mas não mostrar na tela
    try {
      const result = await companiesAPI.getCompaniesByGroup(group.group_name);
      if (result.status === 'success') {
        // Adicionar o nome do grupo a cada empresa
        const companiesWithGroup = result.companies.map((company: any) => ({
          ...company,
          group_name: group.group_name
        }));
        
        setSelectedCompanies_(companiesWithGroup);
        onCompaniesSelect?.(companiesWithGroup);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas do grupo:', error);
    }
  };

  const clearSelection = () => {
    setSelectedGroup(null);
    setSelectedCompanies_([]);
    onCompaniesSelect?.([]);
  };

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
            {groups.map((group, index) => (
              <button
                key={index}
                onClick={() => handleGroupSelect(group)}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b last:border-b-0 focus:bg-blue-50 focus:outline-none"
                style={{ color: '#000000' }}
              >
                <div className="font-medium">{group.group_name}</div>
                <div className="text-sm opacity-70">{group.company_count} empresas</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grupo Selecionado */}
      {selectedGroup && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <h4 className="font-medium" style={{ color: '#000000' }}>
                {selectedGroup.group_name}
              </h4>
            </div>
            <button
              onClick={clearSelection}
              className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
