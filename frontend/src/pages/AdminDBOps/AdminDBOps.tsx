import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../utils/api';

interface LinkRecord {
  id: string; // Changed from number to string for UUIDs
  link: string;
  shortLink: string | null;
  used: boolean;
  assigned_phone: string | null;
  assigned_email: string | null;
}

type FilterOption = 'all' | 'used' | 'unused';

const AdminDBOps: React.FC = () => {
  const navigate = useNavigate();

  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  // Dummy notifications: track the number of links when last seen
  const [lastSeenCount, setLastSeenCount] = useState<number>(0);
  // Safety timeout to avoid indefinite spinner if a request fails silently
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    setLoading(true);
    setIsInitialLoad(true);
    fetchLinks(token);
  }, [navigate]);

  // Fallback: if still loading on initial load after 6s, stop spinner and show empty state
  useEffect(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (loading && isInitialLoad) {
      loadTimeoutRef.current = setTimeout(() => {
        setLoading(false);
        setIsInitialLoad(false);
      }, 6000);
    }
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [loading, isInitialLoad]);

  // Helper function to fetch all pages of data
  const fetchAllPages = async (endpoint: string, token: string, pageSize: number = 200): Promise<any[]> => {
    // Fetch first page to get total count
    const firstPage: any = await api.get(`${endpoint}?page=0&size=${pageSize}`, { headers: { Authorization: `Bearer ${token}` } });
    const allItems = [...(firstPage.content || [])];
    
    // If there are more pages, fetch them all
    const totalPages = firstPage.totalPages || 1;
    if (totalPages > 1) {
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
      const pagePromises = remainingPages.map(pageNum =>
        api.get(`${endpoint}?page=${pageNum}&size=${pageSize}`, { headers: { Authorization: `Bearer ${token}` } })
      );
      const remainingPagesData = await Promise.all(pagePromises);
      remainingPagesData.forEach((pageData: any) => {
        if (pageData.content) {
          allItems.push(...pageData.content);
        }
      });
    }
    
    return allItems;
  };

  const fetchLinks = (token: string) => {
    setLoading(true);
    // Fetch both links and invitations to determine actual usage
    // Fetch all pages to ensure we get all data, even if there are more than 200 items
    Promise.all([
      fetchAllPages('/api/admin/links', token),
      fetchAllPages('/api/admin/invitations', token)
    ])
      .then(([allLinks, allInvitations]: [any[], any[]]) => {
        // Handle case where we have links but no invitations (or vice versa)
        const links = allLinks || [];
        const invitations = allInvitations || [];
        
        if (links.length > 0) {
          console.log(`Fetched ${links.length} links and ${invitations.length} invitations`);
          console.log('Raw invitations data (first 3):', JSON.stringify(invitations.slice(0, 3), null, 2));
          console.log('Raw links data (first 3):', JSON.stringify(links.slice(0, 3), null, 2));
          
          // Create a map of link ID to participant info from invitations
          // Try to match by link.id first, then fallback to linkUrl matching
          const linkToParticipant = new Map();
          invitations.forEach((inv: any) => {
            // First try to use link.id if available (could be inv.link.id or inv.linkId)
            const linkId = inv.link?.id || inv.linkId;
            if (linkId) {
              linkToParticipant.set(linkId, {
                phone: inv.participant?.phone || null,
                email: inv.participant?.email || null
              });
              console.log(`Mapped invitation to link ID: ${linkId}`);
            }
            // Also create a map by linkUrl as fallback (denormalized field)
            if (inv.linkUrl) {
              linkToParticipant.set(`url:${inv.linkUrl}`, {
                phone: inv.participant?.phone || null,
                email: inv.participant?.email || null
              });
              console.log(`Mapped invitation to link URL: ${inv.linkUrl}`);
            }
          });
          
          // Convert backend format to frontend format
          const convertedLinks = links.map((link: any) => {
            // Try to find participant by link ID first
            let participant = linkToParticipant.get(link.id);
            // If not found, try matching by linkUrl
            if (!participant && link.linkUrl) {
              participant = linkToParticipant.get(`url:${link.linkUrl}`);
            }
            const isUsed = !!participant;
            // Debug logging for used links
            if (isUsed) {
              console.log('Found used link:', {
                linkId: link.id,
                linkUrl: link.linkUrl,
                participant: participant
              });
            }
            return {
              id: link.id,
              link: link.linkUrl, // Map linkUrl to link
              shortLink: link.shortLinkUrl || null, // Map shortLinkUrl
              used: isUsed, // Only truly assigned links are used
              assigned_phone: participant?.phone || null,
              assigned_email: participant?.email || null
            };
          });
          
          // Debug: Log how many links are marked as used
          const usedCount = convertedLinks.filter((l: LinkRecord) => l.used).length;
          console.log(`Total links: ${convertedLinks.length}, Used links: ${usedCount}`);
          console.log('Used links details:', convertedLinks.filter((l: LinkRecord) => l.used));
          setLinks(convertedLinks);
          
          // On first load, initialize lastSeenCount
          if (lastSeenCount === 0) setLastSeenCount(convertedLinks.length);
        } else {
          setLinks([]);
        }
        
        setLoading(false);
        setIsInitialLoad(false);
      })
      .catch((err) => {
        console.error('Error fetching links:', err);
        setActionMessage(err?.message || 'Failed to load links.');
        setLoading(false);
        setIsInitialLoad(false);
      });
  };


  // Handle search changes from Navbar
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Reset to first page when searching
    setCurrentPage(1);
  };

  const getFilteredLinks = (): LinkRecord[] => {
    let filtered = [...links];
    if (filter === 'used') {
      filtered = filtered.filter((l) => l.used);
    } else if (filter === 'unused') {
      filtered = filtered.filter((l) => !l.used);
    }
    // Sort with used links at the top, then by ID
    filtered.sort((a, b) => {
      if (a.used && !b.used) return -1; // a (used) comes before b (unused)
      if (!a.used && b.used) return 1;  // b (used) comes before a (unused)
      return a.id.localeCompare(b.id);  // If both have same usage status, sort by ID
    });
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.link.toLowerCase().includes(q) ||
          (l.shortLink && l.shortLink.toLowerCase().includes(q)) ||
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

    // Show loading state
    setActionMessage('Updating link...');

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
          closeEditModal();
          setActionMessage('Link updated successfully');
          fetchLinks(token);
        } else {
          setActionMessage(data.error || 'Could not update link');
        }
      })
      .catch((err) => {
        console.error('Update link error:', err);
        setActionMessage('Failed to update link: ' + err.message);
      });
  };

  const handleDeleteClick = (ln: LinkRecord) => {
    setDeleteTarget(ln);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setShowDeleteModal(false);
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
          fetchLinks(token);
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

  // Bulk delete function with per-link error handling
  const handleBulkDelete = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token || selectedLinkIds.length === 0) return;

    try {
      const results = await Promise.all(
        selectedLinkIds.map(async (id) => {
          try {
            const res = await fetch(`/api/admin/delete-link/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json().catch(() => ({}));
            const ok = res.ok && (data.success !== false) && !data.error;

            return {
              id,
              ok,
              status: res.status,
              error: data.error || data.message || (!res.ok ? res.statusText : '')
            };
          } catch (err: any) {
            return { id, ok: false, status: 0, error: err?.message || 'Network error' };
          }
        })
      );

      const successfulIds = results.filter(r => r.ok).map(r => r.id);
      const failed = results.filter(r => !r.ok);

      if (successfulIds.length > 0) {
        setLinks(prev => prev.filter(l => !successfulIds.includes(l.id)));
      }

      setSelectedLinkIds([]);
      setShowBulkDeleteModal(false);

      // Always refresh from server after bulk delete to stay in sync
      await fetchLinks(token);

      if (failed.length === 0) {
        setActionMessage(`Deleted ${successfulIds.length} link${successfulIds.length !== 1 ? 's' : ''} successfully.`);
      } else {
        const first = failed[0];
        const notFound = failed.some(f => f.status === 404);
        const sampleError = first.error || 'Failed to delete some links.';
        const suffix = notFound ? ' Some selected links no longer exist. The list has been refreshed.' : '';
        setActionMessage(`Deleted ${successfulIds.length}, failed ${failed.length}. ${sampleError}${suffix}`);
      }
    } catch (err) {
      console.error('Bulk delete error:', err);
      setActionMessage('Failed to delete links. Please try again.');
    }
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

  // Only show full loading screen on initial load
  if (loading && isInitialLoad && links.length === 0) {
    return (
      <AdminLayout title="Database Operations" searchQuery={searchQuery} onSearchChange={handleSearchChange}>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading links...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }



  return (
    <AdminLayout title="Database Operations" searchQuery={searchQuery} onSearchChange={handleSearchChange}>
      <div className="container mx-auto px-6 py-6 flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading && !isInitialLoad && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md flex-shrink-0">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Refreshing data...</span>
            </div>
          </div>
        )}
        {actionMessage && (
          <div className={`mb-4 p-4 rounded-md flex-shrink-0 ${
            actionMessage.includes('success') || actionMessage.includes('copied') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {actionMessage}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="p-4 flex-shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold">Links Management</h2>
                <p className="text-sm text-gray-700">
                  Below is a list of all links in the database.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center"
                  onClick={() => setShowCsvUploadModal(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Links
                </button>
                <button
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center shadow-sm
                    ${selectedLinkIds.length === 0 
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200' 
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md'}`}
                  disabled={selectedLinkIds.length === 0}
                  onClick={() => setShowBulkDeleteModal(true)}
                >
                  <svg className={`w-4 h-4 mr-2 ${selectedLinkIds.length === 0 ? 'text-gray-400' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Selected ({selectedLinkIds.length})
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <div className="relative">
                    <select
                      value={recordsPerPage}
                      onChange={handleRecordsPerPageChange}
                      className="h-9 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <svg className="pointer-events-none w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-600">entries</span>
                </div>
              </div>
            </div>

            {/* Filter row */}
            <div className="flex items-center gap-2">
              <label htmlFor="filterSelect" className="font-medium text-sm">
                Filter by:
              </label>
              <div className="relative">
                <select
                  id="filterSelect"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value as FilterOption);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                  className="h-9 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="all">All</option>
                  <option value="used">Used Only</option>
                  <option value="unused">Unused Only</option>
                </select>
                <svg className="pointer-events-none w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Table */}
          {paginatedLinks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-gray-600 text-lg font-medium">No links found</p>
                <p className="text-gray-500 text-sm mt-1">
                  {filter === 'used' 
                    ? 'No used links match your filter.' 
                    : filter === 'unused'
                    ? 'No unused links match your filter.'
                    : 'Upload links via CSV to get started.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col border-t border-gray-200">
              <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
                    <tr>
                      <th className="p-2 w-10 bg-gray-100">
                        <input
                          type="checkbox"
                          checked={
                            paginatedLinks.length > 0 &&
                            paginatedLinks.every((l) => selectedLinkIds.includes(l.id))
                          }
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="p-2 bg-gray-100">Short Link</th>
                      <th className="p-2 bg-gray-100">Long Link</th>
                      <th className="p-2 w-16 bg-gray-100">Used?</th>
                      <th className="p-2 w-32 bg-gray-100">Assigned Phone</th>
                      <th className="p-2 w-32 bg-gray-100">Assigned Email</th>
                      <th className="p-2 w-16 bg-gray-100">Actions</th>
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
                    <td className="p-2 break-words">
                      {ln.shortLink ? (
                        <a 
                          href={ln.shortLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {ln.shortLink}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">Not shortened</span>
                      )}
                    </td>
                    <td className="p-2 break-words">
                      <div className="group relative">
                        <a 
                          href={ln.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {ln.link.length > 50 ? `${ln.link.substring(0, 50)}...` : ln.link}
                        </a>
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap max-w-md break-all">
                          {ln.link}
                        </div>
                      </div>
                    </td>
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
            </div>
          )}

          {/* Pagination */}
          {paginatedLinks.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
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
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && editLink && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeEditModal();
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Edit Link</h2>
                  <p className="text-blue-100 text-xs mt-0.5">Update link details</p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="text-white hover:text-blue-200 transition-colors p-1 rounded-lg hover:bg-blue-700"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Link URL
                </label>
                <input
                  type="text"
                  value={editLink.link}
                  onChange={(e) => setEditLink({ ...editLink, link: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter link URL"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-5 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  onClick={handleSaveLink}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE MODAL */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Link</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete this link? This action cannot be undone.
                    {(deleteTarget.assigned_phone || deleteTarget.assigned_email) && (
                      <span className="block mt-1 text-gray-700">
                        {deleteTarget.assigned_phone && (
                          <> <span className="font-medium">Phone:</span> {deleteTarget.assigned_phone}</>
                        )}
                        {deleteTarget.assigned_email && (
                          <> • <span className="font-medium">Email:</span> {deleteTarget.assigned_email}</>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md text-sm font-medium"
                  onClick={closeDeleteModal}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-all"
                  onClick={confirmDeleteLink}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV SUCCESS MODAL */}
      {showCsvSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">CSV Upload Result</h3>
                  <p className="text-sm text-gray-600">
                    {csvSuccessCount !== null
                      ? `Successfully inserted ${csvSuccessCount} new link${csvSuccessCount !== 1 ? 's' : ''}.`
                      : 'Success!'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                  onClick={closeCsvSuccessModal}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Links</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete {selectedLinkIds.length} selected link{selectedLinkIds.length > 1 ? 's' : ''}? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md text-sm font-medium"
                  onClick={() => setShowBulkDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-all"
                  onClick={handleBulkDelete}
                >
                  Delete
                </button>
              </div>
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

              {/* Batch Label - Disabled */}
              <div>
                <label htmlFor="batchLabel" className="block text-sm font-medium text-gray-500 mb-1">
                  Batch Label (disabled)
                </label>
                <input
                  id="batchLabel"
                  type="text"
                  value={csvBatchLabel}
                  onChange={(e) => setCsvBatchLabel(e.target.value)}
                  placeholder="e.g., Pilot_2025_09"
                  disabled
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
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
              {(() => {
                const link = links.find(l => l.id === activeDropdownId);
                return (
                  <>
                    {link?.shortLink && (
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        onClick={() => {
                          if (link.shortLink) {
                            navigator.clipboard.writeText(link.shortLink);
                            setActionMessage('Short link copied to clipboard!');
                            setTimeout(() => setActionMessage(''), 3000);
                          }
                          setActiveDropdownId(null);
                          setDropdownPosition(null);
                        }}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        Copy Short Link
                      </button>
                    )}
                    {link?.link && (
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        onClick={() => {
                          if (link.link) {
                            navigator.clipboard.writeText(link.link);
                            setActionMessage('Long link copied to clipboard!');
                            setTimeout(() => setActionMessage(''), 3000);
                          }
                          setActiveDropdownId(null);
                          setDropdownPosition(null);
                        }}
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        Copy Long Link
                      </button>
                    )}
                  </>
                );
              })()}
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
    </AdminLayout>
  );
};

export default AdminDBOps;
