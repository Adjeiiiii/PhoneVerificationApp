import React, { useEffect, useRef, useState } from 'react';

interface NavbarProps {
  searchQuery: string;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLogout: () => void;
  toggleUserDropdown: () => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  newUsersCount: number;
  markNotificationsAsSeen: () => void;
  leftContent?: React.ReactNode;
  passedUsersCount: number;
  failedUsersCount: number;
}

const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  handleSearchChange,
  handleLogout,
  toggleUserDropdown,
  showDropdown,
  setShowDropdown,
  newUsersCount,
  markNotificationsAsSeen,
  leftContent,
  passedUsersCount,
  failedUsersCount,
}) => {
  const [notificationsViewed, setNotificationsViewed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowDropdown]);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!notificationsViewed && (newUsersCount > 0 || passedUsersCount > 0 || failedUsersCount > 0)) {
      markNotificationsAsSeen();
      setNotificationsViewed(true);
    }
  };

  useEffect(() => {
    if (newUsersCount > 0 || passedUsersCount > 0 || failedUsersCount > 0) {
      setNotificationsViewed(false);
    }
  }, [newUsersCount, passedUsersCount, failedUsersCount]);

  const totalNotifications = newUsersCount + passedUsersCount + failedUsersCount;

  return (
    <div className="fixed top-0 left-0 right-0 w-full z-50 bg-blue-900 text-white shadow-md">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Left nav */}
        <div className="flex items-center gap-4 md:gap-6">
          {leftContent ? (
            leftContent
          ) : (
            <a
              href="/admin-ops"
              className="text-white font-semibold hover:text-red-200 transition text-sm md:text-base"
            >
              Database Operations
            </a>
          )}
        </div>
        
        {/* Right nav */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="rounded-md px-3 py-1.5 text-black focus:outline-none focus:ring-2 focus:ring-blue-500 w-28 md:w-48 text-sm"
            />
            <i className="fas fa-search text-gray-400 absolute right-2 top-2 text-sm"></i>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              className="relative p-1.5 rounded-full hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={handleNotificationClick}
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {!notificationsViewed && totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 animate-pulse bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {totalNotifications}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 transform origin-top-right transition-all duration-200 ease-out">
                <div className="p-4">
                  <h3 className="text-gray-900 font-medium mb-2">Recent Activity</h3>
                  <div className="space-y-2">
                    {newUsersCount > 0 && (
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">New Users Added</p>
                        <p>{newUsersCount} new user{newUsersCount === 1 ? '' : 's'} added to the system</p>
                      </div>
                    )}
                    {passedUsersCount > 0 && (
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">Passed Verification</p>
                        <p>{passedUsersCount} user{passedUsersCount === 1 ? '' : 's'} passed verification</p>
                      </div>
                    )}
                    {failedUsersCount > 0 && (
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">Failed Verification</p>
                        <p>{failedUsersCount} user{failedUsersCount === 1 ? '' : 's'} failed verification</p>
                      </div>
                    )}
                    {totalNotifications === 0 && (
                      <p className="text-sm text-gray-500">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={toggleUserDropdown}
              className="flex items-center gap-2 hover:bg-blue-800 rounded-full p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="User menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* User Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 transform origin-top-right transition-all duration-200 ease-out">
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
