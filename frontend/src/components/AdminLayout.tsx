import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  searchQuery?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  title,
  searchQuery,
  onSearchChange 
}) => {
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Map<string, number>>(new Map());
  
  // Determine current page based on route
  const getCurrentPage = (): 'dashboard' | 'database' | 'gift-cards' | 'enrollment' => {
    if (location.pathname.includes('admin-dashboard')) return 'dashboard';
    if (location.pathname.includes('admin-ops')) return 'database';
    if (location.pathname.includes('admin-gift-cards')) return 'gift-cards';
    if (location.pathname.includes('admin-enrollment')) return 'enrollment';
    return 'dashboard';
  };

  // Save scroll position before navigation
  useEffect(() => {
    const currentPath = location.pathname;
    if (contentRef.current) {
      scrollPositions.current.set(currentPath, contentRef.current.scrollTop);
    }
  }, [location.pathname]);

  // Restore scroll position after navigation
  useEffect(() => {
    const currentPath = location.pathname;
    const savedPosition = scrollPositions.current.get(currentPath);
    
    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      if (contentRef.current && savedPosition !== undefined) {
        contentRef.current.scrollTop = savedPosition;
      } else if (contentRef.current) {
        // If no saved position, scroll to top smoothly
        contentRef.current.scrollTop = 0;
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AdminSidebar currentPage={getCurrentPage()} />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Top Bar */}
          {(title || searchQuery !== undefined) && (
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                {title && <h2 className="text-xl font-semibold text-gray-800">{title}</h2>}
                {searchQuery !== undefined && onSearchChange && (
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={onSearchChange}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <svg
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <main ref={contentRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

