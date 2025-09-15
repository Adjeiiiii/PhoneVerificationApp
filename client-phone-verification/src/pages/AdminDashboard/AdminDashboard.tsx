import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../Footer/Footer';
import Navbar from '../NavBar/Navbar';
import { api } from '../../utils/api';

interface Stats {
  totalVerifications: number;
  usedLinks: number;
  availableLinks: number;
  // acceptedVerifications: number; // Remove accepted
  // failedVerifications: number; // Remove failed
}

interface VerificationRecord {
  id: string; // Changed from number to string to handle UUIDs
  phone_number: string;
  email: string;
  assigned_link: string | null;
  status: string; // "passed", "failed", or ""
  sms_sent_at: string | null; // SMS timestamp
  email_status: string; // Email status (placeholder for future)
  email_sent_at: string | null; // Email timestamp (placeholder for future)
}

interface LinkRecord {
  id: string; // Changed from number to string to handle UUIDs
  link: string;
  used: boolean;
  assigned_to: string | null;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalVerifications: 0,
    usedLinks: 0,
    availableLinks: 0,
    // acceptedVerifications: 0, // Remove accepted
    // failedVerifications: 0, // Remove failed
  });

  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');


  // For multiple select
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Edit user
  const [editRecord, setEditRecord] = useState<VerificationRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Link override
  const [unusedLinks, setUnusedLinks] = useState<LinkRecord[]>([]);
  const [overrideLink, setOverrideLink] = useState(false);

  // Navbar dropdown
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // For custom delete modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<VerificationRecord | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkResendModal, setShowBulkResendModal] = useState(false);

  // For success/failure messages
  const [bulkActionMessage, setBulkActionMessage] = useState<string>('');

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Pagination controls
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Records per page change
  const handleRecordsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing records per page
  };

  // Clear success/failure messages automatically after 3s
  useEffect(() => {
    if (bulkActionMessage) {
      const timer = setTimeout(() => {
        setBulkActionMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [bulkActionMessage]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin-login');
      return;
    }
    fetchStatsAndRecords();
  }, [navigate]);


  const fetchStatsAndRecords = () => {
    console.log('Fetching stats and records...');
    // 1) stats
    api.get('/api/admin/stats')
      .then((data) => {
        console.log('Stats data:', data);
        if (data) setStats(data);
      })
      .catch((err) => {
        console.error('Stats error:', err);
        setStats({ totalVerifications: 0, usedLinks: 0, availableLinks: 0 });
      });

    // 2) invitations (instead of verifications)
    api.get('/api/admin/invitations')
      .then((data: any) => {
        console.log('Invitations data:', data);
        if (data && data.content) {
          // Convert backend format to frontend format
          const convertedRecords = data.content.map((invitation: any) => ({
            id: invitation.id,
            phone_number: invitation.participant?.phone || '',
            email: invitation.participant?.email || '', // Use actual participant email
            assigned_link: invitation.linkUrl || '',
            status: invitation.messageStatus || 'pending', // SMS status
            sms_sent_at: invitation.sentAt || invitation.queuedAt || '',
            // Email fields - show actual data
            email_status: invitation.participant?.email || 'N/A', // Show actual email address
            email_sent_at: invitation.sentAt || invitation.queuedAt || 'N/A'  // Show actual timestamp
          }));
          console.log('Converted records:', convertedRecords);
          setRecords(convertedRecords);
        } else {
          console.log('No content in invitations data');
          setRecords([]);
        }
      })
      .catch((err) => {
        console.error('Records error:', err);
        setRecords([]);
      });

    // 3) links => unused
    api.get('/api/admin/links')
      .then((data: any) => {
        if (data && data.content) {
          const freeLinks = data.content
            .filter((ln: any) => ln.status === 'AVAILABLE')
            .slice(0, 5)
            .map((link: any) => ({
              id: link.id,
              link: link.linkUrl, // Map linkUrl to link
              used: link.status !== 'AVAILABLE', // Map status to used boolean
              assigned_to: null // Backend doesn't provide assigned_to yet
            }));
          setUnusedLinks(freeLinks);
        }
      })
      .catch((err) => console.error('Links error:', err));
  };

  // For searching phone_number, email, link, or status
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };



  // Filtered records based on search & status filter
  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.phone_number.toLowerCase().includes(q) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.assigned_link && r.assigned_link.toLowerCase().includes(q)) ||
      (r.status && r.status.toLowerCase().includes(q));

    return matchesSearch;
  });

  // Calculate pagination values
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  // Bulk selection functions
  const toggleSelectRecord = (id: string) => {
    if (selectedRecordIds.includes(id)) {
      setSelectedRecordIds(selectedRecordIds.filter((x) => x !== id));
    } else {
      setSelectedRecordIds([...selectedRecordIds, id]);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = filteredRecords.every((r) =>
      selectedRecordIds.includes(r.id)
    );
    if (allSelected) {
      // Deselect all filtered records
      setSelectedRecordIds(
        selectedRecordIds.filter((id) => !filteredRecords.some((r) => r.id === id))
      );
    } else {
      // Add all filtered record ids
      const newSelected = filteredRecords.map((r) => r.id);
      setSelectedRecordIds([...new Set([...selectedRecordIds, ...newSelected])]);
    }
  };

  // Navbar dropdown
  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  // Logout
  const handleLogout = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      localStorage.removeItem('adminToken');
      navigate('/admin-login');
      return;
    }
    api.post('/api/admin/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        localStorage.removeItem('adminToken');
        navigate('/admin-login');
      })
      .catch(() => {
        localStorage.removeItem('adminToken');
        navigate('/admin-login');
      });
  };

  // Open edit modal
  const handleEdit = (rec: VerificationRecord) => {
    setEditRecord({ ...rec });
    if (rec.status === 'passed' && rec.assigned_link) {
      setOverrideLink(false);
    } else {
      setOverrideLink(true);
    }
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditRecord(null);
    setShowEditModal(false);
  };

  // Status editing removed - admins can no longer edit status

  const handleOverrideChange = (checked: boolean) => {
    setOverrideLink(checked);
  };

  const handleSaveChanges = () => {
    if (!editRecord) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const data = {
      phone_number: editRecord.phone_number,
      email: editRecord.email_status, // Use email_status for actual email
      assigned_link: editRecord.assigned_link,
      // Status editing removed - admins can no longer edit status
    };

    api.put(`/api/admin/update-user/${editRecord.id}`, data, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        // Refresh data immediately
        fetchStatsAndRecords();
        // Close modal and clear edit record
        setShowEditModal(false);
        setEditRecord(null);
        // Show success message
        setBulkActionMessage('Changes saved successfully');
      })
      .catch((err) => {
        console.error('Update error:', err);
        setBulkActionMessage('Failed to save changes');
      });
  };

  const handleResendEmail = (rec: VerificationRecord) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    api.post('/api/participants/resend-survey-link', { phone: rec.phone_number, body: 'resend' }, { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        if (data.ok) {
          // Refresh data immediately
          fetchStatsAndRecords();
          // Close modal and clear edit record
          setShowEditModal(false);
          setEditRecord(null);
          // Show success message
          setBulkActionMessage('Email resent successfully');
        } else {
          setBulkActionMessage(data.error || 'Failed to resend email');
        }
      })
      .catch((err) => {
        console.error('Resend error:', err);
        setBulkActionMessage('Failed to resend email');
      });
  };

  // Bulk resend email
  const handleBulkResendEmail = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const requests = selectedRecordIds.map((id) => {
      const record = records.find((r) => r.id === id);
      if (!record) return Promise.resolve(null);
      const body = { phone: record.phone_number, body: 'resend' };
      return api.post('/api/participants/resend-survey-link', body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    });
    Promise.all(requests)
      .then(() => {
        // Instead of alert, we show a small success message
        setBulkActionMessage(
          `Resend email requests sent for ${selectedRecordIds.length} selected record${
            selectedRecordIds.length > 1 ? 's' : ''
          }.`
        );
        fetchStatsAndRecords();
      })
      .catch((err) => console.error('Bulk resend error:', err));
  };

  // Called by the modal's "Resend" button to confirm bulk resend
  const proceedBulkResendEmail = () => {
    handleBulkResendEmail();
    setShowBulkResendModal(false);
  };

  // Single delete user
  const confirmDeleteUser = (rec: VerificationRecord) => {
    setDeleteRecord(rec);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeleteRecord(null);
    setShowDeleteModal(false);
  };

  const proceedDelete = () => {
    if (!deleteRecord) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    api.delete(`/api/admin/delete-user/${deleteRecord.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        // Refresh data immediately
        fetchStatsAndRecords();
        // Close both modals and clear records
        setShowDeleteModal(false);
        setShowEditModal(false);
        setDeleteRecord(null);
        setEditRecord(null);
        // Show success message
        setBulkActionMessage('User deleted successfully');
      })
      .catch((err) => {
        console.error('Delete error:', err);
        setBulkActionMessage('Failed to delete user');
      });
  };

  // Bulk delete
  const proceedBulkDelete = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || selectedRecordIds.length === 0) return;

    // Delete each selected record
    Promise.all(
      selectedRecordIds.map((id) =>
        api.delete(`/api/admin/delete-user/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      )
    )
      .then(() => {
        // Refresh data immediately
        fetchStatsAndRecords();
        // Clear selection and close modal
        setSelectedRecordIds([]);
        setShowBulkDeleteModal(false);
        // Show success message
        setBulkActionMessage('Selected users deleted successfully');
      })
      .catch((err) => {
        console.error('Bulk delete error:', err);
        setBulkActionMessage('Failed to delete some users');
      });
  };

  // Convert UTC to Eastern Time for sms_sent_at
  const formatSmsSentAt = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', { timeZone: 'America/New_York' });
  };

  // Add state for action menu
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Add function to toggle action menu
  const toggleActionMenu = (id: string) => {
    setActiveActionMenu(activeActionMenu === id ? null : id);
  };

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeActionMenu !== null && !(event.target as Element).closest('.relative')) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeActionMenu]);

  console.log('AdminDashboard rendering, records:', records.length, 'stats:', stats);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar
        searchQuery={searchQuery}
        handleSearchChange={handleSearchChange}
        handleLogout={handleLogout}
        toggleUserDropdown={toggleUserDropdown}
        showDropdown={showUserDropdown}
        setShowDropdown={setShowUserDropdown}
        newUsersCount={0}
        markNotificationsAsSeen={() => {}}
        leftContent={null}
        passedUsersCount={0}
        failedUsersCount={0}
      />
      <div className="flex-1 overflow-auto pt-16 pb-12">
        <div className="container mx-auto px-4 py-8">
          {/* Notification Banner */}
          {bulkActionMessage && (
            <div className={`mb-4 p-4 rounded-md ${
              bulkActionMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {bulkActionMessage}
            </div>
          )}

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-3 text-center">
              <h3 className="text-gray-600 text-xs md:text-sm mb-1">
                Total Verifications
              </h3>
              <p className="text-lg md:text-xl font-semibold">
                {stats.totalVerifications}
              </p>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Bulk Actions Bar */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${selectedRecordIds.length === 0 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700 text-white'}`}
                  disabled={selectedRecordIds.length === 0}
                  onClick={() => setShowBulkDeleteModal(true)}
                >
                  <i className="fas fa-trash-alt mr-2"></i>
                  Delete Selected ({selectedRecordIds.length})
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${selectedRecordIds.length === 0 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white'}`}
                  disabled={selectedRecordIds.length === 0}
                  onClick={() => setShowBulkResendModal(true)}
                >
                  <i className="fas fa-envelope mr-2"></i>
                  Resend Email ({selectedRecordIds.length})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={recordsPerPage}
                  onChange={handleRecordsPerPageChange}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-visible relative">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-700 text-left">
                    <th className="p-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredRecords.length > 0 &&
                          filteredRecords.every((r) => selectedRecordIds.includes(r.id))
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-2 w-28">Phone #</th>
                    <th className="p-2 w-32">SMS Status</th>
                    <th className="p-2 w-32">Email Address</th>
                    <th className="p-2 w-44">Assigned Link</th>
                    <th className="p-2 w-36">SMS Sent At</th>
                    <th className="p-2 w-36">Email Sent At</th>
                    <th className="p-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((r) => {
                      // const _link = r.assigned_link || 'None Assigned';
                      return (
                        <tr key={r.id} className="border-b hover:bg-gray-50 transition">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={selectedRecordIds.includes(r.id)}
                              onChange={() => toggleSelectRecord(r.id)}
                            />
                          </td>
                          <td className="p-2 break-words">{r.phone_number}</td>
                          <td className="p-2 break-words">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              r.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              r.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              r.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              r.status === 'failed' ? 'bg-red-100 text-red-800' :
                              r.status === 'queued' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {r.status || 'pending'}
                            </span>
                          </td>
                          <td className="p-2 break-words">
                            {r.email_status && r.email_status !== 'N/A' ? (
                              <span className="text-blue-600 font-medium">{r.email_status}</span>
                            ) : (
                              <span className="text-gray-500">No email</span>
                            )}
                          </td>
                          <td className="p-2 break-words">
                            {r.assigned_link ? (
                              <a 
                                href={r.assigned_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline truncate block max-w-xs"
                              >
                                {r.assigned_link}
                              </a>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="p-2 break-words">
                            {formatSmsSentAt(r.sms_sent_at)}
                          </td>
                          <td className="p-2 break-words">
                            {r.email_sent_at && r.email_sent_at !== 'N/A' ? (
                              <span className="text-gray-700">{formatSmsSentAt(r.email_sent_at)}</span>
                            ) : (
                              <span className="text-gray-500">Not sent</span>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="relative">
                              <button
                                onClick={() => toggleActionMenu(r.id)}
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 focus:outline-none"
                                aria-label="Actions"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              {activeActionMenu === r.id && (
                                <div 
                                  className="fixed transform -translate-x-full mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                                  style={{
                                    zIndex: 1000,
                                    top: 'auto',
                                    left: 'auto'
                                  }}
                                >
                                  <div className="py-1" role="menu">
                                    <button
                                      onClick={() => {
                                        handleEdit(r);
                                        setActiveActionMenu(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      role="menuitem"
                                    >
                                      <svg className="mr-3 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit Details
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleResendEmail(r);
                                        setActiveActionMenu(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      role="menuitem"
                                    >
                                      <svg className="mr-3 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      Resend Email
                                    </button>
                                    <button
                                      onClick={() => {
                                        confirmDeleteUser(r);
                                        setActiveActionMenu(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                      role="menuitem"
                                    >
                                      <svg className="mr-3 h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                  <button
                    key={number}
                    onClick={() => handlePageChange(number)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      currentPage === number
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {number}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />


      {/* Modals */}
      {showEditModal && editRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold text-white">Edit User Details</h2>
              <p className="text-blue-100 text-sm mt-1">ID: {editRecord.id}</p>
            </div>

            <div className="p-6">
              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editRecord.phone_number}
                    onChange={(e) => setEditRecord({ ...editRecord, phone_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS Status</label>
                  <input
                    type="text"
                    value={editRecord.status || 'pending'} // Show actual SMS status
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">SMS status is managed automatically by Twilio</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editRecord.email_status || ''} // Use email_status field for actual email
                    onChange={(e) => setEditRecord({ ...editRecord, email_status: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email will be sent automatically when survey link is assigned</p>
                </div>

                {/* Status editing removed - admins can no longer edit status */}

                {editRecord.status === 'passed' && (
                  <div className="space-y-3">
                    {editRecord.assigned_link ? (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-md">
                        <p className="text-sm text-blue-700">
                          <span className="font-medium">Current Link:</span><br />
                          {editRecord.assigned_link}
                        </p>
                        <label className="mt-2 inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={overrideLink}
                            onChange={(e) => handleOverrideChange(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-blue-700">Assign new link?</span>
                        </label>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-r-md">
                        <p className="text-sm text-yellow-700">No link currently assigned</p>
                      </div>
                    )}

                    {(!editRecord.assigned_link || overrideLink) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Link</label>
                        <select
                          value={editRecord.assigned_link || ''}
                          onChange={(e) => setEditRecord({ ...editRecord, assigned_link: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">(none)</option>
                          {unusedLinks.map((ln) => (
                            <option key={ln.id} value={ln.link}>{ln.link}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
            <p className="text-sm text-gray-700 mb-3">
              Are you sure you want to delete this user record?
            </p>
            <p className="italic text-gray-600 mb-4">
              Phone: {deleteRecord.phone_number} <br />
              Email: {deleteRecord.email}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>
              <button
                className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md text-sm"
                onClick={proceedDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Confirm Bulk Deletion</h3>
            <p className="text-sm text-gray-700 mb-3">
              Are you sure you want to delete {selectedRecordIds.length} selected record
              {selectedRecordIds.length > 1 ? 's' : ''}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
                onClick={() => setShowBulkDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md text-sm"
                onClick={proceedBulkDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkResendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Confirm Bulk Resend</h3>
            <p className="text-sm text-gray-700 mb-3">
              Are you sure you want to resend emails to {selectedRecordIds.length}{' '}
              selected record
              {selectedRecordIds.length > 1 ? 's' : ''}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
                onClick={() => setShowBulkResendModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-sm"
                onClick={proceedBulkResendEmail}
              >
                Resend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

