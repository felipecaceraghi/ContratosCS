import React from 'react';
import Link from 'next/link';

interface ContractCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  isAvailable?: boolean;
}

export default function ContractCard({ 
  title, 
  description, 
  icon, 
  href, 
  isAvailable = true 
}: ContractCardProps) {
  const cardContent = (
    <div className={`bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 border border-gray-100 ${!isAvailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="flex items-center mb-4">
        <div className="text-3xl mr-4">{icon}</div>
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      
      {description && (
        <p className="text-gray-600 mb-6 leading-relaxed">
          {description}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isAvailable 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isAvailable ? 'Disponível' : 'Em breve'}
        </div>
        
        {isAvailable && (
          <div className="text-blue-600 font-medium">
            Acessar →
          </div>
        )}
      </div>
    </div>
  );

  if (!isAvailable) {
    return cardContent;
  }

  return (
    <Link href={href} className="block">
      {cardContent}
    </Link>
  );
}