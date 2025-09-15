import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Navbar from '../NavBar/Navbar';
import Footer from '../Footer/Footer';
import { api } from '../../utils/api';

interface LinkRecord {
  id: string; // Changed from number to string for UUIDs
  link: string;
  used: boolean;
  assigned_phone: string | null;
  assigned_email: string | null;
}

type FilterOption = 'all' | 'used' | 'unused';

const AdminDBOps: React.FC = () => {
  const navigate = useNavigate();

  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // For multiple select
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);

  // For pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // For bulk action message
  const [actionMessage, setActionMessage] = useState('');

  // For bulk delete modal
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // For editing a link
  const [editLink, setEditLink] = useState<LinkRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // For CSV uploads
  const [csvSuccessCount, setCsvSuccessCount] = useState<number | null>(null);
  const [showCsvSuccessModal, setShowCsvSuccessModal] = useState(false);

  // Filter option
  const [filter, setFilter] = useState<FilterOption>('all');

  // For delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<LinkRecord | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // CSV file name
  const [selectedFilename, setSelectedFilename] = useState('');

  // For Navbar search input
  const [searchQuery, setSearchQuery] = useState('');

  // For Navbar user dropdown (handled inside Navbar)
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Dummy notifications: track the number of links when last seen
  const [lastSeenCount, setLastSeenCount] = useState<number>(0);

  // Add new state for CSV upload modal
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [csvBatchLabel, setCsvBatchLabel] = useState('');
  const [csvUploadedBy, setCsvUploadedBy] = useState('');
  const [csvNotes, setCsvNotes] = useState('');

  // For actions dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin-login');
      return;
    }
    fetchLinks(token);
  }, [navigate]);

  const fetchLinks = (token: string) => {
    // Fetch both links and invitations to determine actual usage
    Promise.all([
      api.get('/api/admin/links', { headers: { Authorization: `Bearer ${token}` } }),
      api.get('/api/admin/invitations', { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(([linksData, invitationsData]: [any, any]) => {
        if (linksData && linksData.content && invitationsData && invitationsData.content) {
          // Create a map of link ID to participant info from invitations
          const linkToParticipant = new Map();
          invitationsData.content.forEach((inv: any) => {
            if (inv.link?.id) {
              linkToParticipant.set(inv.link.id, {
                phone: inv.participant?.phone || null,
                email: inv.participant?.email || null
              });
            }
          });
          
          // Convert backend format to frontend format
          const convertedLinks = linksData.content.map((link: any) => {
            const participant = linkToParticipant.get(link.id);
            return {
              id: link.id,
              link: link.linkUrl, // Map linkUrl to link
              used: !!participant, // Only truly assigned links are used
              assigned_phone: participant?.phone || null,
              assigned_email: participant?.email || null
            };
          });
          setLinks(convertedLinks);
          setLoading(false);
          // On first load, initialize lastSeenCount
          if (lastSeenCount === 0) setLastSeenCount(convertedLinks.length);
        }
      })
      .catch((err) => {
        console.error('Error fetching links:', err);
        setLoading(false);
      });
  };

  // Handle logout (like in AdminDashboard)
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

  // Handle search changes from Navbar
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const getFilteredLinks = (): LinkRecord[] => {
    let filtered = [...links];
    if (filter === 'used') {
      filtered = filtered.filter((l) => l.used);
    } else if (filter === 'unused') {
      filtered = filtered.filter((l) => !l.used);
    }
    filtered.sort((a, b) => a.id.localeCompare(b.id));
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.link.toLowerCase().includes(q) ||
          (l.assigned_phone && l.assigned_phone.toLowerCase().includes(q)) ||
          (l.assigned_email && l.assigned_email.toLowerCase().includes(q))
      );
    }
    return filtered;
  };

  const handleEditClick = (l: LinkRecord) => {
    setEditLink({ ...l });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditLink(null);
    setShowEditModal(false);
  };

  const handleSaveLink = () => {
    if (!editLink) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    fetch(`/api/admin/update-link/${editLink.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ link: editLink.link }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLinks((prev) =>
            prev.map((ln) => (ln.id === editLink.id ? { ...ln, link: editLink.link } : ln))
          );
          closeEditModal();
        } else {
          alert(data.error || 'Could not update link');
        }
      })
      .catch((err) => console.error(err));
  };

  const handleDeleteClick = (ln: LinkRecord) => {
    setDeleteTarget(ln);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setShowDeleteModal(false);
  };

  // Custom function to confirm deletion (used in Edit Modal)
  const confirmDeleteUser = (record: LinkRecord) => {
    setDeleteTarget(record);
    setShowDeleteModal(true);
  };

  const confirmDeleteLink = () => {
    if (!deleteTarget) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    fetch(`/api/admin/delete-link/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setLinks((prev) => prev.filter((l) => l.id !== deleteTarget.id));
        } else {
          alert(data.error || 'Cannot delete link');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        closeDeleteModal();
      });
  };

  const handleCSVUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Starting CSV upload...');
    const token = localStorage.getItem('adminToken');
    if (!token) {
      console.error('No admin token found');
      return;
    }

    const fileInput = e.currentTarget.elements.namedItem('csvFile') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('No file selected');
      return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('batchLabel', csvBatchLabel);
    formData.append('uploadedBy', csvUploadedBy);
    formData.append('notes', csvNotes);

    fetch('/api/admin/upload-links', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('CSV upload response:', data);
        if (data.success) {
          setCsvSuccessCount(data.inserted || 0);
          setShowCsvSuccessModal(true);
          setShowCsvUploadModal(false); // Close upload modal
          // Reset form
          setCsvBatchLabel('');
          setCsvUploadedBy('');
          setCsvNotes('');
          setSelectedFilename('');
          // Refresh the links data using the existing function
          fetchLinks(token);
          return null;
        } else {
          alert(data.error || 'Could not upload links');
          return null;
        }
      })
      .catch((err) => {
        console.error('CSV upload error:', err);
        alert('Error uploading CSV: ' + err.message);
      });
  };

  const closeCsvSuccessModal = () => {
    setCsvSuccessCount(null);
    setShowCsvSuccessModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFilename(e.target.files[0].name);
    } else {
      setSelectedFilename('');
    }
  };

  // Toggle Navbar user dropdown
  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  // Calculate new notifications: new links added since last seen
  const markNotificationsAsSeen = () => {
    setLastSeenCount(links.length);
  };

  // Clear action messages after 3s
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => {
        setActionMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
        setDropdownPosition(null);
      }
    };

    if (activeDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdownId]);

  // Handle dropdown toggle
  const toggleDropdown = (linkId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (activeDropdownId === linkId) {
      setActiveDropdownId(null);
      setDropdownPosition(null);
    } else {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right - 192 + window.scrollX // 192px is the dropdown width
      });
      setActiveDropdownId(linkId);
    }
  };

  // Selection functions
  const toggleSelectLink = (id: string) => {
    if (selectedLinkIds.includes(id)) {
      setSelectedLinkIds(selectedLinkIds.filter(x => x !== id));
    } else {
      setSelectedLinkIds([...selectedLinkIds, id]);
    }
  };

  const toggleSelectAll = () => {
    const currentPageLinks = paginatedLinks.map(l => l.id);
    const allSelected = currentPageLinks.every(id => selectedLinkIds.includes(id));
    
    if (allSelected) {
      setSelectedLinkIds(selectedLinkIds.filter(id => !currentPageLinks.includes(id)));
    } else {
      setSelectedLinkIds([...new Set([...selectedLinkIds, ...currentPageLinks])]);
    }
  };

  // Bulk delete function
  const handleBulkDelete = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || selectedLinkIds.length === 0) return;

    Promise.all(
      selectedLinkIds.map(id =>
        fetch(`/api/admin/delete-link/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json())
      )
    )
      .then(() => {
        setLinks(prev => prev.filter(l => !selectedLinkIds.includes(l.id)));
        setSelectedLinkIds([]);
        setShowBulkDeleteModal(false);
        setActionMessage('Selected links deleted successfully');
      })
      .catch(err => {
        console.error('Bulk delete error:', err);
        setActionMessage('Failed to delete some links');
      });
  };

  // Pagination functions
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleRecordsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const filteredLinks = getFilteredLinks();
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const paginatedLinks = filteredLinks.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredLinks.length / recordsPerPage);

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading links...</p>
      </div>
    );
  }

  // Custom left content for the Navbar on this page
  const leftContent = (
    <div className="flex items-center gap-3 md:gap-6">
      <button
        onClick={() => navigate('/admin-dashboard')}
        className="bg-gray-100 text-gray-800 border border-gray-300 px-3 py-1 rounded-md text-xs md:text-sm hover:bg-gray-200 transition"
      >
        Dashboard
      </button>
      <span className="text-sm md:text-base font-semibold">Database Operations</span>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen flex flex-col pt-16">
      {/* Fixed Navbar */}
      <Navbar
        searchQuery={searchQuery}
        handleSearchChange={handleSearchChange}
        handleLogout={handleLogout}
        toggleUserDropdown={toggleUserDropdown}
        showDropdown={showUserDropdown}
        setShowDropdown={setShowUserDropdown}
        newUsersCount={0}
        passedUsersCount={0}
        failedUsersCount={0}
        markNotificationsAsSeen={markNotificationsAsSeen}
        leftContent={leftContent}
      />

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {actionMessage && (
          <div className={`mb-4 p-4 rounded-md ${
            actionMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {actionMessage}
          </div>
        )}

        <div className="bg-white rounded-md shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Links Management</h2>
              <p className="text-sm text-gray-700">
                Below is a list of all links in the database.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                onClick={() => setShowCsvUploadModal(true)}
              >
                <i className="fas fa-upload mr-2"></i>
                Upload Links
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                  ${selectedLinkIds.length === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 text-white'}`}
                disabled={selectedLinkIds.length === 0}
                onClick={() => setShowBulkDeleteModal(true)}
              >
                <i className="fas fa-trash-alt mr-2"></i>
                Delete Selected ({selectedLinkIds.length})
              </button>
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
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="filterSelect" className="font-medium text-sm">
              Filter by:
            </label>
            <select
              id="filterSelect"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterOption)}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="used">Used Only</option>
              <option value="unused">Unused Only</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100 text-gray-700 text-left">
                <tr>
                  <th className="p-2 w-10">
                    <input
                      type="checkbox"
                      checked={
                        paginatedLinks.length > 0 &&
                        paginatedLinks.every((l) => selectedLinkIds.includes(l.id))
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-2">Link</th>
                  <th className="p-2 w-16">Used?</th>
                  <th className="p-2 w-32">Assigned Phone</th>
                  <th className="p-2 w-32">Assigned Email</th>
                  <th className="p-2 w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLinks.map((ln) => (
                  <tr key={ln.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedLinkIds.includes(ln.id)}
                        onChange={() => toggleSelectLink(ln.id)}
                        disabled={ln.used}
                      />
                    </td>
                    <td className="p-2 break-words">{ln.link}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        ln.used ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ln.used ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-2">{ln.assigned_phone || '—'}</td>
                    <td className="p-2">{ln.assigned_email || '—'}</td>
                    <td className="p-2">
                      {ln.used ? (
                        <em className="text-xs text-gray-500">
                          Used
                        </em>
                      ) : (
                        <div className="relative group">
                          <button
                            className="p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            onClick={(e) => toggleDropdown(ln.id, e)}
                          >
                            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredLinks.length)} of {filteredLinks.length} entries
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

      {/* EDIT MODAL */}
      {showEditModal && editLink && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-md w-full max-w-lg p-6 relative">
            <h2 className="text-xl font-bold mb-4 text-center">Edit Link</h2>
            <label className="block text-left font-medium mb-1 text-sm">
              Link Text
            </label>
            <input
              type="text"
              value={editLink.link}
              onChange={(e) => setEditLink({ ...editLink, link: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
            />
            <div className="flex justify-evenly mt-6">
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
                onClick={closeEditModal}
              >
                Cancel
              </button>
              <button
                className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-md text-sm"
                onClick={handleSaveLink}
              >
                Save
              </button>
              <button
                className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md text-sm"
                onClick={() => confirmDeleteUser(editLink)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE MODAL */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-md w-full max-w-md p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
            <p className="text-sm text-gray-700 mb-3">
              Are you sure you want to delete this link?
            </p>
            <p className="italic text-gray-600 mb-4">
              Assigned Phone: {deleteTarget.assigned_phone || '—'} <br />
              Assigned Email: {deleteTarget.assigned_email || '—'}
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
                onClick={confirmDeleteLink}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV SUCCESS MODAL */}
      {showCsvSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-md w-full max-w-md p-6 text-center">
            <h3 className="text-lg font-semibold mb-3">CSV Upload Result</h3>
            <p className="text-sm text-gray-700 mb-4">
              {csvSuccessCount !== null
                ? `Successfully inserted ${csvSuccessCount} new links.`
                : 'Success!'}
            </p>
            <button
              className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-md text-sm"
              onClick={closeCsvSuccessModal}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* New Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-md w-full max-w-md p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Confirm Bulk Deletion</h3>
            <p className="text-sm text-gray-700 mb-3">
              Are you sure you want to delete {selectedLinkIds.length} selected link{selectedLinkIds.length > 1 ? 's' : ''}?
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
                onClick={handleBulkDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add new CSV Upload Modal */}
      {showCsvUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-md shadow-md w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Upload Links via CSV</h3>
            <div className="text-sm text-gray-700 mb-4">
              <p className="mb-2">Upload a CSV file with survey links. Each line should contain one link URL.</p>
              <p className="mb-2"><strong>Format:</strong></p>
              <code className="block bg-gray-50 p-2 rounded text-xs mb-2">
                https://example.com/survey/10<br/>
                https://example.com/survey/11<br/>
                https://example.com/survey/12
              </code>
              <p className="text-xs text-gray-600">
                • Empty lines and lines starting with # are ignored<br/>
                • Duplicate URLs will be skipped<br/>
                • All links will be marked as AVAILABLE
              </p>
            </div>
            <form onSubmit={handleCSVUpload} className="flex flex-col gap-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="csvFileInput"
                    className="bg-gray-200 text-gray-800 border border-gray-300 px-4 py-2 rounded-md text-sm cursor-pointer hover:bg-gray-300 flex-grow text-center"
                  >
                    {selectedFilename ? selectedFilename : 'Choose CSV File'}
                  </label>
                  <input
                    id="csvFileInput"
                    name="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                </div>
              </div>

              {/* Batch Label */}
              <div>
                <label htmlFor="batchLabel" className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Label (optional)
                </label>
                <input
                  id="batchLabel"
                  type="text"
                  value={csvBatchLabel}
                  onChange={(e) => setCsvBatchLabel(e.target.value)}
                  placeholder="e.g., Pilot_2025_09"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* Uploaded By */}
              <div>
                <label htmlFor="uploadedBy" className="block text-sm font-medium text-gray-700 mb-1">
                  Uploaded By (optional)
                </label>
                <input
                  id="uploadedBy"
                  type="text"
                  value={csvUploadedBy}
                  onChange={(e) => setCsvUploadedBy(e.target.value)}
                  placeholder="e.g., admin@test.com"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={csvNotes}
                  onChange={(e) => setCsvNotes(e.target.value)}
                  placeholder="e.g., Initial upload for pilot study"
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCsvUploadModal(false);
                    setCsvBatchLabel('');
                    setCsvUploadedBy('');
                    setCsvNotes('');
                    setSelectedFilename('');
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Upload Links
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Actions Dropdown Portal */}
      {activeDropdownId && dropdownPosition && (
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
            <div className="py-1" role="menu">
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                onClick={() => {
                  const link = links.find(l => l.id === activeDropdownId);
                  if (link) handleEditClick(link);
                  setActiveDropdownId(null);
                  setDropdownPosition(null);
                }}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                onClick={() => {
                  const link = links.find(l => l.id === activeDropdownId);
                  if (link) handleDeleteClick(link);
                  setActiveDropdownId(null);
                  setDropdownPosition(null);
                }}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete
              </button>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 w-full">
        <Footer />
      </div>
    </div>
  );
};

export default AdminDBOps;
