import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
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
  short_link: string | null;
  status: string; // "passed", "failed", or ""
  sms_sent_at: string | null; // SMS timestamp
  email_status: string; // Email status (placeholder for future)
  email_sent_at: string | null; // Email timestamp (placeholder for future)
  completed_at: string | null; // Survey completion timestamp
}

// LinkRecord interface removed - no longer used

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
  const [verifiedWithoutInvitations, setVerifiedWithoutInvitations] = useState<any[]>([]);
  const [availableLinks, setAvailableLinks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'invitations' | 'waiting'>('invitations');
  const [showLinkSelectionModal, setShowLinkSelectionModal] = useState(false);
  const [selectedParticipantForLink, setSelectedParticipantForLink] = useState<any>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [isAssigningLink, setIsAssigningLink] = useState(false);


  // For multiple select
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Edit user
  const [editRecord, setEditRecord] = useState<VerificationRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Link override (removed - no longer used)


  // For custom delete modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<VerificationRecord | null>(null);
  const [deleteGiftCardInfo, setDeleteGiftCardInfo] = useState<any>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkResendModal, setShowBulkResendModal] = useState(false);
  const [showBulkSurveyModal, setShowBulkSurveyModal] = useState(false);
  
  // For individual action confirmations
  const [showRemindConfirmModal, setShowRemindConfirmModal] = useState(false);
  const [remindRecord, setRemindRecord] = useState<VerificationRecord | null>(null);
  const [showMarkCompletedConfirmModal, setShowMarkCompletedConfirmModal] = useState(false);
  const [markCompletedRecord, setMarkCompletedRecord] = useState<VerificationRecord | null>(null);
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(true); // true = mark completed, false = mark uncompleted
  const [hasGiftCardWarning, setHasGiftCardWarning] = useState(false);

  // For success/failure messages
  const [bulkActionMessage, setBulkActionMessage] = useState<string>('');

  // Helper function to determine if a message is a success message
  const isSuccessMessage = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('successfully') || 
           lowerMessage.includes('success') ||
           lowerMessage.includes('copied') ||
           lowerMessage.includes('reminder sent') ||
           lowerMessage.includes('reminders sent') ||
           (lowerMessage.includes('completed') && !lowerMessage.includes('error')) ||
           (lowerMessage.includes('deleted') && !lowerMessage.includes('error')) ||
           (lowerMessage.includes('updated') && !lowerMessage.includes('error'));
  };

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

  // Refresh available links when the link selection modal opens
  useEffect(() => {
    if (showLinkSelectionModal) {
      api.get('/api/admin/links?status=AVAILABLE&page=0&size=100')
        .then((data: any) => {
          console.log('Refreshed available links data:', data);
          if (data && data.content) {
            setAvailableLinks(data.content);
          } else {
            setAvailableLinks([]);
          }
        })
        .catch((err) => {
          console.error('Available links refresh error:', err);
          setAvailableLinks([]);
        });
    }
  }, [showLinkSelectionModal]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin-login');
      return;
    }
    
    // Check if token is expired
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          // Token expired
          localStorage.removeItem('adminToken');
          navigate('/admin-login?expired=true');
          return;
        }
      } else {
        // Invalid token format
        localStorage.removeItem('adminToken');
        navigate('/admin-login?expired=true');
        return;
      }
    } catch (error) {
      // Token is malformed
      localStorage.removeItem('adminToken');
      navigate('/admin-login?expired=true');
      return;
    }
    
    fetchStatsAndRecords();
    
    // Set up periodic token expiration check (every 30 seconds)
    const tokenCheckInterval = setInterval(() => {
      const currentToken = localStorage.getItem('adminToken');
      if (!currentToken) {
        navigate('/admin-login');
        return;
      }
      
      try {
        const tokenParts = currentToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.exp && Date.now() >= payload.exp * 1000) {
            // Token expired
            localStorage.removeItem('adminToken');
            navigate('/admin-login?expired=true');
          }
        } else {
          // Invalid token format
          localStorage.removeItem('adminToken');
          navigate('/admin-login?expired=true');
        }
      } catch (error) {
        // Token is malformed
        localStorage.removeItem('adminToken');
        navigate('/admin-login?expired=true');
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(tokenCheckInterval);
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
            short_link: invitation.shortLinkUrl || null, // Short link URL
            status: invitation.messageStatus || 'pending', // SMS status
            sms_sent_at: invitation.sentAt || invitation.queuedAt || '',
            // Email fields - show actual data
            email_status: invitation.participant?.email || 'N/A', // Show actual email address
            email_sent_at: invitation.sentAt || invitation.queuedAt || 'N/A',  // Show actual timestamp
            completed_at: invitation.completedAt || null // Survey completion timestamp
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

    // 3) Fetch verified participants without invitations
    api.get('/api/admin/participants/verified-without-invitations?page=0&size=100')
      .then((data: any) => {
        console.log('Verified without invitations data:', data);
        if (data && data.content) {
          setVerifiedWithoutInvitations(data.content);
        } else {
          setVerifiedWithoutInvitations([]);
        }
      })
      .catch((err) => {
        console.error('Verified without invitations error:', err);
        setVerifiedWithoutInvitations([]);
      });

    // 4) Fetch available links for selection
    api.get('/api/admin/links?status=AVAILABLE&page=0&size=100')
      .then((data: any) => {
        console.log('Available links data:', data);
        if (data && data.content) {
          setAvailableLinks(data.content);
        } else {
          setAvailableLinks([]);
        }
      })
      .catch((err) => {
        console.error('Available links error:', err);
        setAvailableLinks([]);
      });
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
      (r.short_link && r.short_link.toLowerCase().includes(q)) ||
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


  // Open edit modal
  const handleEdit = (rec: VerificationRecord) => {
    setEditRecord({ ...rec });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditRecord(null);
    setShowEditModal(false);
  };

  // Show confirmation modal for marking survey completed/uncompleted
  const confirmMarkSurveyStatus = async (rec: VerificationRecord) => {
    setMarkCompletedRecord(rec);
    const isCompleting = !rec.completed_at;
    setIsMarkingCompleted(isCompleting);
    
    // If marking as uncompleted, check if there's a gift card
    if (!isCompleting) {
      try {
        const response = await api.checkGiftCardForInvitation(rec.id);
        if (response.hasGiftCard) {
          // Show warning that gift card exists
          setShowMarkCompletedConfirmModal(true);
          setHasGiftCardWarning(true);
          return;
        }
      } catch (error) {
        console.error('Error checking for gift card:', error);
        // Continue anyway if check fails
      }
    }
    
    setHasGiftCardWarning(false);
    setShowMarkCompletedConfirmModal(true);
  };

  // Mark survey as completed (after confirmation)
  const proceedMarkSurveyCompleted = async () => {
    if (!markCompletedRecord) return;
    try {
      await api.markSurveyCompleted(markCompletedRecord.id);
      // Refresh the data to show updated status
      fetchStatsAndRecords();
      setBulkActionMessage('Survey marked as completed successfully!');
      setShowMarkCompletedConfirmModal(false);
      setMarkCompletedRecord(null);
    } catch (error) {
      console.error('Error marking survey as completed:', error);
      setBulkActionMessage('Failed to mark survey as completed. Please try again.');
      setShowMarkCompletedConfirmModal(false);
      setMarkCompletedRecord(null);
    }
  };

  // Mark survey as not completed (after confirmation)
  const proceedMarkSurveyUncompleted = async () => {
    if (!markCompletedRecord) return;
    try {
      await api.markSurveyUncompleted(markCompletedRecord.id);
      // Refresh the data to show updated status
      fetchStatsAndRecords();
      setBulkActionMessage('Survey marked as not completed successfully!');
      setShowMarkCompletedConfirmModal(false);
      setMarkCompletedRecord(null);
    } catch (error) {
      console.error('Error marking survey as not completed:', error);
      setBulkActionMessage('Failed to mark survey as not completed. Please try again.');
      setShowMarkCompletedConfirmModal(false);
      setMarkCompletedRecord(null);
    }
  };

  // Status editing removed - admins can no longer edit status

  // handleOverrideChange removed - no longer used

  const handleSaveChanges = () => {
    if (!editRecord) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    const data = {
      // phone_number removed - no longer editable
      email: editRecord.email_status, // Use email_status for actual email
      // assigned_link removed - not supported by backend
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
        setBulkActionMessage('Email updated successfully');
      })
      .catch((err) => {
        console.error('Update error:', err);
        setBulkActionMessage('Failed to save changes');
      });
  };

  // Show confirmation modal for remind
  const confirmRemind = (rec: VerificationRecord) => {
    setRemindRecord(rec);
    setShowRemindConfirmModal(true);
  };

  // Send reminder (after confirmation)
  const proceedRemind = () => {
    if (!remindRecord) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;

    api.post('/api/participants/resend-survey-link', { phone: remindRecord.phone_number, body: 'resend' }, { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        if (data.ok) {
          // Refresh data immediately
          fetchStatsAndRecords();
          // Close modal and clear edit record
          setShowEditModal(false);
          setEditRecord(null);
          // Show success message
          const participantName = remindRecord.email?.split('@')[0] || remindRecord.phone_number || 'participant';
          setBulkActionMessage(`Reminder sent successfully to ${participantName}`);
        } else {
          setBulkActionMessage(data.error || 'Failed to send reminder');
        }
        setShowRemindConfirmModal(false);
        setRemindRecord(null);
      })
      .catch((err) => {
        console.error('Resend error:', err);
        setBulkActionMessage('Failed to send reminder');
        setShowRemindConfirmModal(false);
        setRemindRecord(null);
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
        const participantName = selectedRecordIds.length === 1 
          ? records.find(r => r.id === selectedRecordIds[0])?.email?.split('@')[0] || 'participant'
          : 'participants';
        setBulkActionMessage(
          `Reminder${selectedRecordIds.length > 1 ? 's' : ''} sent successfully to ${selectedRecordIds.length} ${selectedRecordIds.length > 1 ? 'participants' : participantName}.`
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

  // Bulk mark surveys as completed
  const handleBulkMarkSurveysCompleted = async () => {
    try {
      console.log('Attempting to mark surveys as completed:', selectedRecordIds);
      
      if (selectedRecordIds.length === 0) {
        setBulkActionMessage('No surveys selected');
        return;
      }
      
      const response = await api.bulkMarkSurveysCompleted(selectedRecordIds);
      console.log('Bulk complete response:', response);
      
      if (response && response.success) {
        setBulkActionMessage(`Successfully marked ${response.completedCount} surveys as completed`);
        setSelectedRecordIds([]);
        fetchStatsAndRecords(); // Refresh the data
      } else {
        setBulkActionMessage(`Error: ${response?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Bulk mark completed error:', error);
      setBulkActionMessage(`Error marking surveys as completed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Bulk mark surveys as not completed
  const handleBulkMarkSurveysUncompleted = async () => {
    try {
      console.log('Attempting to mark surveys as not completed:', selectedRecordIds);
      
      if (selectedRecordIds.length === 0) {
        setBulkActionMessage('No surveys selected');
        return;
      }
      
      const response = await api.bulkMarkSurveysUncompleted(selectedRecordIds);
      console.log('Bulk uncomplete response:', response);
      
      if (response && response.success) {
        setBulkActionMessage(`Successfully marked ${response.uncompletedCount} surveys as not completed`);
        setSelectedRecordIds([]);
        fetchStatsAndRecords(); // Refresh the data
      } else {
        setBulkActionMessage(`Error: ${response?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Bulk mark uncompleted error:', error);
      setBulkActionMessage(`Error marking surveys as not completed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Single delete user
  const confirmDeleteUser = async (rec: VerificationRecord) => {
    setDeleteRecord(rec);
    
    // Check for gift cards first
    try {
      const giftCardInfo = await api.getUserDeletionInfo(rec.id);
      setDeleteGiftCardInfo(giftCardInfo);
    } catch (error) {
      console.error('Error checking gift cards:', error);
      setDeleteGiftCardInfo({ hasGiftCards: false, giftCardCount: 0 });
    }
    
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setDeleteRecord(null);
    setDeleteGiftCardInfo(null);
    setShowDeleteModal(false);
  };

  const proceedDelete = () => {
    if (!deleteRecord) return;

    api.deleteUser(deleteRecord.id)
      .then((response) => {
        // Refresh data immediately
        fetchStatsAndRecords();
        // Close both modals and clear records
        setShowDeleteModal(false);
        setShowEditModal(false);
        setDeleteRecord(null);
        setDeleteGiftCardInfo(null);
        setEditRecord(null);
        
        // Show success message with gift card info if applicable
        let message = 'User deleted successfully';
        if (response && response.giftCardsDeleted && response.giftCardsDeleted > 0) {
          message += `. ${response.giftCardsDeleted} gift card(s) have been made available again and will appear in the unsent history.`;
        }
        setBulkActionMessage(message);
      })
      .catch((err: any) => {
        console.error('Delete error:', err);
        console.error('Error details:', {
          message: err.message,
          status: err.status,
          stack: err.stack
        });
        // Show the actual error message from the backend
        const errorMessage = err.message || 'Failed to delete user. Please try again.';
        setBulkActionMessage(errorMessage);
        // Keep modal open so user can see the error
        // Don't close the modal on error
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
      const target = event.target as Element;
      if (activeActionMenu !== null) {
        // Check if click is outside the menu and the button
        const isClickInsideMenu = target.closest('[role="menu"]');
        const isClickOnButton = target.closest('button[aria-label="Actions"]');
        if (!isClickInsideMenu && !isClickOnButton) {
        setActiveActionMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeActionMenu]);

  console.log('AdminDashboard rendering, records:', records.length, 'stats:', stats);
  
  return (
    <AdminLayout 
      title="Dashboard" 
        searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
    >
      <div className="container mx-auto px-6 py-6 flex-1 flex flex-col overflow-hidden">
          {/* Notification Banner */}
          {bulkActionMessage && (
            <div className={`mb-4 p-4 rounded-md flex-shrink-0 ${
              isSuccessMessage(bulkActionMessage)
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center">
                {isSuccessMessage(bulkActionMessage) ? (
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className="font-medium">{bulkActionMessage}</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-4 flex-shrink-0">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('invitations')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'invitations'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Invitations
                  <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                    {records.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('waiting')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'waiting'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Verified Without Links
                  {verifiedWithoutInvitations.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                      {verifiedWithoutInvitations.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* Records Table - Invitations Tab */}
          {activeTab === 'invitations' && (
          <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0">
            {/* Bulk Actions Bar */}
            {currentRecords.length > 0 && (
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
              <div className="flex flex-wrap gap-3">
                <button
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center shadow-sm
                    ${selectedRecordIds.length === 0 
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200' 
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md'}`}
                  disabled={selectedRecordIds.length === 0}
                  onClick={() => setShowBulkDeleteModal(true)}
                >
                  <svg className={`w-4 h-4 mr-2 ${selectedRecordIds.length === 0 ? 'text-gray-400' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Selected ({selectedRecordIds.length})
                </button>
                <button
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center shadow-sm
                    ${selectedRecordIds.length === 0 
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200' 
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md'}`}
                  disabled={selectedRecordIds.length === 0}
                  onClick={() => setShowBulkResendModal(true)}
                >
                  <svg className={`w-4 h-4 mr-2 ${selectedRecordIds.length === 0 ? 'text-gray-400' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Remind ({selectedRecordIds.length})
                </button>
                <button
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center shadow-sm
                    ${selectedRecordIds.length === 0 
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200' 
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md'}`}
                  disabled={selectedRecordIds.length === 0}
                  onClick={() => setShowBulkSurveyModal(true)}
                >
                  <svg className={`w-4 h-4 mr-2 ${selectedRecordIds.length === 0 ? 'text-gray-400' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Survey Actions ({selectedRecordIds.length})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={recordsPerPage}
                  onChange={handleRecordsPerPageChange}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
            </div>
            )}

            {currentRecords.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-600 text-lg font-medium">No invitations found</p>
                  <p className="text-gray-500 text-sm mt-1">Invitations will appear here once participants are verified and receive survey links.</p>
                </div>
              </div>
            ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-gray-200 z-10">
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
                    <th className="p-2 w-32">Phone #</th>
                    <th className="p-2 w-32">SMS Status</th>
                    <th className="p-2 w-32">Survey Status</th>
                    <th className="p-2 w-36">Email Address</th>
                    <th className="p-2 w-48">Assigned Link</th>
                    <th className="p-2 w-36">SMS Sent At</th>
                    <th className="p-2 w-36">Email Sent At</th>
                    <th className="p-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {
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
                              r.status === 'queued' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {r.status || 'pending'}
                            </span>
                          </td>
                          <td className="p-2 break-words">
                            {r.completed_at ? (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                Completed
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-2 break-words">
                            {r.email_status && r.email_status !== 'N/A' ? (
                              <span className="text-blue-600 font-medium">{r.email_status}</span>
                            ) : (
                              <span className="text-gray-500">No email</span>
                            )}
                          </td>
                          <td className="p-2 break-words">
                            {r.short_link ? (
                              <div>
                                <div className="mb-1">
                                  <a 
                                    href={r.short_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                                  >
                                    {r.short_link}
                                  </a>
                                </div>
                                {r.assigned_link && (
                                  <div className="text-xs text-gray-500 truncate max-w-xs" title={r.assigned_link}>
                                    Long: {r.assigned_link.length > 40 ? `${r.assigned_link.substring(0, 40)}...` : r.assigned_link}
                                  </div>
                                )}
                              </div>
                            ) : r.assigned_link ? (
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const button = e.currentTarget;
                                  const rect = button.getBoundingClientRect();
                                  const menuHeight = 100; // Approximate menu height
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  
                                  // Position menu below button if there's enough space, otherwise above
                                  let top: number;
                                  if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
                                    top = rect.bottom + 4;
                                  } else {
                                    top = rect.top - menuHeight - 4;
                                  }
                                  
                                  setMenuPosition({
                                    top: top + window.scrollY,
                                    right: window.innerWidth - rect.right
                                  });
                                  toggleActionMenu(r.id);
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                                aria-label="Actions"
                                type="button"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              {activeActionMenu === r.id && (
                                <div 
                                  className="fixed w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[100]"
                                  style={{
                                    top: `${menuPosition.top}px`,
                                    right: `${menuPosition.right}px`
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="py-1" role="menu">
                                    <button
                                      onClick={() => {
                                        handleEdit(r);
                                        setActiveActionMenu(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                      role="menuitem"
                                    >
                                      <svg className="mr-3 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit Details
                                    </button>
                                    {r.short_link && (
                                    <button
                                      onClick={() => {
                                          navigator.clipboard.writeText(r.short_link!);
                                          setBulkActionMessage('Short link copied to clipboard!');
                                          setTimeout(() => setBulkActionMessage(''), 3000);
                                        setActiveActionMenu(null);
                                      }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                      role="menuitem"
                                    >
                                        <svg className="mr-3 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                        Copy Short Link
                                    </button>
                                    )}
                                    {r.assigned_link && (
                                    <button
                                      onClick={() => {
                                          navigator.clipboard.writeText(r.assigned_link!);
                                          setBulkActionMessage('Long link copied to clipboard!');
                                          setTimeout(() => setBulkActionMessage(''), 3000);
                                          setActiveActionMenu(null);
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                        role="menuitem"
                                      >
                                        <svg className="mr-3 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy Long Link
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        confirmRemind(r);
                                        setActiveActionMenu(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                                      role="menuitem"
                                    >
                                      <svg className="mr-3 h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                      </svg>
                                      Remind
                                    </button>
                                    <button
                                      onClick={() => {
                                        confirmMarkSurveyStatus(r);
                                        setActiveActionMenu(null);
                                      }}
                                      className={`flex items-center w-full px-4 py-2 text-sm text-left ${
                                        r.completed_at 
                                          ? 'text-slate-700 hover:bg-slate-50' 
                                          : 'text-emerald-700 hover:bg-emerald-50'
                                      }`}
                                      role="menuitem"
                                    >
                                      <svg className={`mr-3 h-4 w-4 flex-shrink-0 ${
                                        r.completed_at ? 'text-slate-500' : 'text-emerald-600'
                                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {r.completed_at ? (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        ) : (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        )}
                                      </svg>
                                      <span className="text-left">{r.completed_at ? 'Mark as Not Completed' : 'Mark Survey Completed'}</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        confirmDeleteUser(r);
                                        setActiveActionMenu(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
                                      role="menuitem"
                                    >
                                      <svg className="mr-3 h-4 w-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  }
                </tbody>
              </table>
            </div>
            </div>
            )}

            {/* Pagination */}
            {currentRecords.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
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
            )}
          </div>
          )}

          {/* Verified Without Links Tab */}
          {activeTab === 'waiting' && (
            <div className="bg-white rounded-lg shadow overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Verified Participants Without Survey Links
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    These participants have verified their phone numbers but did not receive survey links (no links were available at the time).
                  </p>
        </div>
                {verifiedWithoutInvitations.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {verifiedWithoutInvitations.length} participant{verifiedWithoutInvitations.length !== 1 ? 's' : ''}
                  </span>
                )}
      </div>
            </div>

            {verifiedWithoutInvitations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-600 text-lg font-medium">No participants waiting</p>
                  <p className="text-gray-500 text-sm mt-1">All verified participants have received survey links.</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 bg-gray-50 z-10">
                        <tr className="bg-gray-50 text-gray-700 text-left border-b">
                          <th className="p-3 font-semibold">Phone Number</th>
                          <th className="p-3 font-semibold">Email</th>
                          <th className="p-3 font-semibold">Verified At</th>
                          <th className="p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                      {verifiedWithoutInvitations.map((participant: any) => (
                        <tr key={participant.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{participant.phone}</td>
                          <td className="p-3">{participant.email || <span className="text-gray-400">No email</span>}</td>
                          <td className="p-3">
                            {participant.verifiedAt 
                              ? formatSmsSentAt(participant.verifiedAt)
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="p-3">
                            <div className="relative z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const button = e.currentTarget;
                                  const rect = button.getBoundingClientRect();
                                  const menuHeight = 100; // Approximate menu height
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  
                                  // Position menu below button if there's enough space, otherwise above
                                  let top: number;
                                  if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
                                    top = rect.bottom + 4;
                                  } else {
                                    top = rect.top - menuHeight - 4;
                                  }
                                  
                                  setMenuPosition({
                                    top: top + window.scrollY,
                                    right: window.innerWidth - rect.right
                                  });
                                  toggleActionMenu(participant.id);
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                                aria-label="Actions"
                                type="button"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              {activeActionMenu === participant.id && (
                                <div 
                                  className="fixed w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[100]"
                                  style={{
                                    top: `${menuPosition.top}px`,
                                    right: `${menuPosition.right}px`
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="py-1" role="menu">
                                    <button
                                      onClick={() => {
                                        setSelectedParticipantForLink(participant);
                                        setSelectedLinkId('');
                                        setShowLinkSelectionModal(true);
                                        setActiveActionMenu(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                                      role="menuitem"
                                    >
                                      <svg className="mr-3 h-4 w-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                      </svg>
                                      <span>Assign and Send Link</span>
                                    </button>
                                    <button
                                      onClick={async () => {
                                        setActiveActionMenu(null);
                                        if (window.confirm(`Are you sure you want to delete participant ${participant.phone}? This action cannot be undone.`)) {
                                          try {
                                            await api.deleteUser(participant.id);
                                            setBulkActionMessage('Participant deleted successfully');
                                            fetchStatsAndRecords(); // Refresh both lists
                                          } catch (error: any) {
                                            setBulkActionMessage(`Error deleting participant: ${error.message || 'Unknown error'}`);
                                          }
                                        }
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 whitespace-nowrap"
                                      role="menuitem"
                                    >
                                      <svg className="mr-3 h-4 w-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
              </div>
            )}
          </div>
          )}
      </div>

      {/* Modals */}
      {showEditModal && editRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={closeEditModal}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-blue-600 px-6 py-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Edit User Details</h2>
                  <p className="text-blue-100 text-xs mt-0.5">ID: {editRecord.id.substring(0, 8)}...</p>
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

            <div className="p-6">
              {/* Form Fields */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={editRecord.phone_number}
                    disabled
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-600 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Phone number cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMS Status</label>
                  <input
                    type="text"
                    value={editRecord.status || 'pending'}
                    disabled
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-600 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">SMS status is managed automatically by Twilio</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={editRecord.email_status || ''}
                    onChange={(e) => setEditRecord({ ...editRecord, email_status: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Email will be sent automatically when survey link is assigned</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assigned Link</label>
                  <input
                    type="text"
                    value={editRecord.assigned_link || 'None assigned'}
                    disabled
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-600 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Link assignment is managed automatically</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={closeEditModal}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all shadow-sm hover:shadow-md font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Record</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete this participant? This action cannot be undone.
                    {deleteRecord.phone_number && (
                      <span className="block mt-1 text-gray-700">
                        <span className="font-medium">Phone:</span> {deleteRecord.phone_number}
                        {deleteRecord.email && (
                          <> • <span className="font-medium">Email:</span> {deleteRecord.email}</>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            
            {/* Gift Card Warning */}
            {deleteGiftCardInfo && deleteGiftCardInfo.hasGiftCards && (
                <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-4 rounded-r-lg border border-gray-200">
                  <div className="flex items-start">
                  <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        Notice: User has {deleteGiftCardInfo.giftCardCount} gift card{deleteGiftCardInfo.giftCardCount > 1 ? 's' : ''}
                    </h3>
                      <div className="text-sm text-gray-700">
                        <p className="mb-2 font-medium">
                        This user has been assigned gift card(s). Deleting them will:
                      </p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>Make the gift card(s) available again in the pool</li>
                        <li>Add the gift card(s) to the unsent history for tracking</li>
                        <li>Remove the user's access to the gift card(s)</li>
                      </ul>
                      {deleteGiftCardInfo.giftCards && deleteGiftCardInfo.giftCards.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="font-semibold text-gray-900 mb-2">Gift Card Details:</p>
                            <div className="space-y-2">
                            {deleteGiftCardInfo.giftCards.map((gc: any, index: number) => (
                                <div key={index} className="bg-white p-2.5 rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-900">{gc.cardCode}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600">{gc.cardType}</span>
                                      <span className="text-xs font-bold text-gray-900">${gc.cardValue}</span>
                                      {gc.status === 'SENT' && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">Sent</span>
                                      )}
                                      {gc.status === 'UNSENT' && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">Unsent</span>
                                      )}
                                    </div>
                                  </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
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
                onClick={proceedDelete}
              >
                {deleteGiftCardInfo && deleteGiftCardInfo.hasGiftCards ? 'Delete & Make Gift Cards Available' : 'Delete'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remind Confirmation Modal */}
      {showRemindConfirmModal && remindRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Send Reminder</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to send a reminder to this participant?
                    {remindRecord.phone_number && (
                      <span className="block mt-1 text-gray-700">
                        <span className="font-medium">Phone:</span> {remindRecord.phone_number}
                        {remindRecord.email && (
                          <> • <span className="font-medium">Email:</span> {remindRecord.email}</>
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
                  onClick={() => { setShowRemindConfirmModal(false); setRemindRecord(null); }}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                  onClick={proceedRemind}
                >
                  Send Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Survey Completed/Uncompleted Confirmation Modal */}
      {showMarkCompletedConfirmModal && markCompletedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className={`w-6 h-6 ${isMarkingCompleted ? 'text-emerald-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMarkingCompleted ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {isMarkingCompleted ? 'Mark Survey Completed' : 'Mark Survey Not Completed'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to {isMarkingCompleted ? 'mark this survey as completed' : 'mark this survey as not completed'}?
                    {markCompletedRecord.phone_number && (
                      <span className="block mt-1 text-gray-700">
                        <span className="font-medium">Phone:</span> {markCompletedRecord.phone_number}
                        {markCompletedRecord.email && (
                          <> • <span className="font-medium">Email:</span> {markCompletedRecord.email}</>
                        )}
                      </span>
                    )}
                  </p>
                  {hasGiftCardWarning && !isMarkingCompleted && (
                    <div className="mt-3 p-3 bg-gray-50 border-l-4 border-gray-400 rounded-lg border border-gray-200">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-gray-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">Warning: Gift Card Already Sent</p>
                          <p className="text-sm text-gray-700 mt-1">
                            This participant has already received a gift card. Marking the survey as not completed will not revoke the gift card. If you need to revoke it, please do so from the Gift Card Management page.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 
                    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md text-sm font-medium"
                  onClick={() => { setShowMarkCompletedConfirmModal(false); setMarkCompletedRecord(null); setHasGiftCardWarning(false); }}
                >
                  Cancel
                </button>
                <button
                  className={`px-5 py-2.5 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
                    isMarkingCompleted 
                      ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' 
                      : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                  }`}
                  onClick={isMarkingCompleted ? proceedMarkSurveyCompleted : proceedMarkSurveyUncompleted}
                >
                  {isMarkingCompleted ? 'Mark as Completed' : 'Mark as Not Completed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Records</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete {selectedRecordIds.length}{' '}
                    {selectedRecordIds.length > 1 ? 'participants' : 'participant'}? This action cannot be undone.
            </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
                onClick={() => setShowBulkDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-all"
                onClick={proceedBulkDelete}
              >
                Delete
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkResendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Send Reminders</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to send reminders to {selectedRecordIds.length}{' '}
                    {selectedRecordIds.length > 1 ? 'participants' : 'participant'}?
            </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
                onClick={() => setShowBulkResendModal(false)}
              >
                Cancel
              </button>
              <button
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                onClick={proceedBulkResendEmail}
              >
                  Send Reminders
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkSurveyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Survey Actions</h3>
                  <p className="text-sm text-gray-600">
                    Update survey status for {selectedRecordIds.length}{' '}
                    {selectedRecordIds.length > 1 ? 'participants' : 'participant'}
            </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                  className="group relative bg-white border-2 border-emerald-200 hover:border-emerald-400 rounded-xl p-4 text-left transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                onClick={async () => {
                  await handleBulkMarkSurveysCompleted();
                  setShowBulkSurveyModal(false);
                }}
              >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                Mark as Completed
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Mark surveys as finished
                      </p>
                    </div>
                  </div>
              </button>
                
              <button
                  className="group relative bg-white border-2 border-slate-200 hover:border-slate-400 rounded-xl p-4 text-left transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                onClick={async () => {
                  await handleBulkMarkSurveysUncompleted();
                  setShowBulkSurveyModal(false);
                }}
              >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-slate-700 transition-colors">
                Mark as Not Completed
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Revert to pending status
                      </p>
                    </div>
                  </div>
              </button>
            </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
                onClick={() => setShowBulkSurveyModal(false)}
              >
                Cancel
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Selection Modal */}
      {showLinkSelectionModal && selectedParticipantForLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden" style={{ borderRadius: '8px' }}>
            {/* Header */}
            <div className="bg-blue-600 px-6 py-4 relative" style={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <h3 className="text-xl font-bold text-white">
                    Assign and Send Survey Link
                  </h3>
    </div>
                <button
                  onClick={() => {
                    setShowLinkSelectionModal(false);
                    setSelectedParticipantForLink(null);
                    setSelectedLinkId('');
                    setIsAssigningLink(false);
                  }}
                  className="text-white hover:bg-blue-700 rounded-md p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Participant Information */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Participant</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedParticipantForLink.phone}</p>
                    </div>
                  </div>
                  {selectedParticipantForLink.email && (
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedParticipantForLink.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Link Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Survey Link
                </label>
                <div className="relative">
                  <select
                    value={selectedLinkId}
                    onChange={(e) => setSelectedLinkId(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer hover:border-gray-400"
                  >
                    <option value="">Choose a survey link...</option>
                    {availableLinks.map((link: any) => (
                      <option key={link.id} value={link.id}>
                        {link.shortLinkUrl || link.linkUrl?.substring(0, 60) || 'Link ' + link.id.substring(0, 8)}
                        {link.batchLabel ? ` (${link.batchLabel})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {availableLinks.length === 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      No available links in the database.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowLinkSelectionModal(false);
                    setSelectedParticipantForLink(null);
                    setSelectedLinkId('');
                    setIsAssigningLink(false);
                  }}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedLinkId || isAssigningLink) {
                      if (!selectedLinkId) {
                        setBulkActionMessage('Please select a link first');
                      }
                      return;
                    }
                    setIsAssigningLink(true);
                    try {
                      const response = await api.post('/api/admin/invitations/send-with-link', {
                        phone: selectedParticipantForLink.phone,
                        linkId: selectedLinkId
                      });
                      if (response && response.ok) {
                        setBulkActionMessage(`Survey link sent successfully to ${selectedParticipantForLink.phone}`);
                        // Immediately remove the assigned link from available links
                        setAvailableLinks(prevLinks => prevLinks.filter(link => link.id !== selectedLinkId));
                        setShowLinkSelectionModal(false);
                        setSelectedParticipantForLink(null);
                        setSelectedLinkId('');
                        fetchStatsAndRecords(); // Refresh to move them to main table
                        setActiveTab('invitations'); // Switch to invitations tab
                      } else {
                        const errorMsg = response?.message || response?.error || 'Failed to send survey link';
                        setBulkActionMessage(`Failed to send link: ${errorMsg}`);
                      }
                    } catch (error: any) {
                      const errorMsg = error?.message || error?.response?.data?.message || error?.response?.data?.error || 'Failed to send survey link';
                      setBulkActionMessage(`Error: ${errorMsg}`);
                    } finally {
                      setIsAssigningLink(false);
                    }
                  }}
                  disabled={!selectedLinkId || isAssigningLink}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    selectedLinkId && !isAssigningLink
                      ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md focus:ring-blue-400'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isAssigningLink ? 'Assigning...' : 'Assign and Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;

