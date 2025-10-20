import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminNavigationProps {
  currentPage: 'dashboard' | 'database' | 'gift-cards';
}

const AdminNavigation: React.FC<AdminNavigationProps> = ({ currentPage }) => {
  const navigate = useNavigate();

  const getButtonClass = (page: string) => {
    const isActive = currentPage === page;
    if (isActive) {
      return "bg-blue-600 text-white px-3 py-1 rounded-md text-xs md:text-sm font-semibold";
    }
    return "bg-gray-100 text-gray-800 border border-gray-300 px-3 py-1 rounded-md text-xs md:text-sm hover:bg-gray-200 transition";
  };

  return (
    <div className="flex items-center gap-3 md:gap-6">
      <span className="text-sm md:text-base font-semibold text-white">Admin Panel</span>
      
      <button
        onClick={() => navigate('/admin-dashboard')}
        className={getButtonClass('dashboard')}
      >
        Dashboard
      </button>
      
      <button
        onClick={() => navigate('/admin-ops')}
        className={getButtonClass('database')}
      >
        Database Operations
      </button>
      
      <button
        onClick={() => navigate('/admin-gift-cards')}
        className={getButtonClass('gift-cards')}
      >
        Gift Cards
      </button>
    </div>
  );
};

export default AdminNavigation;
