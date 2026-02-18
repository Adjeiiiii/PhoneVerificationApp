import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../utils/api';

interface GiftCardPoolStatus {
  totalCards: number;
  availableCards: number;
  assignedCards: number;
  expiredCards: number;
  invalidCards: number;
  cardsByType: Record<string, number>;
  cardsByBatch: Record<string, number>;
}

interface GiftCardPool {
  id: string;
  cardCode: string;
  cardType: string;
  cardValue: number;
  redemptionUrl: string;
  redemptionInstructions: string;
  status: string;
  batchLabel: string;
  uploadedBy: string;
  uploadedAt: string;
  expiresAt: string;
  assignedAt: string | null;
  assignedToGiftCardId: string | null;
  notes?: string;
}

interface EligibleParticipant {
  participantId: string;
  participantPhone: string;
  participantEmail: string;
  invitationId: string;
  surveyLinkUrl: string;
  surveyCompletedAt: string;
  participantVerifiedAt: string;
}

interface GiftCard {
  id: string;
  participantId: string;
  participantPhone: string;
  participantEmail: string;
  invitationId: string;
  surveyLinkUrl: string;
  cardCode: string;
  cardType: string;
  cardValue: number;
  redemptionUrl: string;
  redemptionInstructions: string;
  status: string;
  sentBy: string;
  sentAt: string;
  deliveredAt: string;
  redeemedAt: string;
  expiresAt: string;
  notes: string;
  source: string;
  poolId: string;
  createdAt: string;
  updatedAt: string;
}

interface UnsentGiftCard {
  cardCode: string;
  cardType: string;
  cardValue: number;
  status: string;
  participantPhone: string;
  participantEmail: string;
  participantName: string;
  sentAt: string;
  sentBy: string;
  source: string;
  poolId: string;
  unsentBy: string;
  unsentAt: string;
  details: any;
}

const GiftCardManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pool' | 'eligible' | 'sent' | 'unsent'>('pool');
  
  // Pool status and cards
  const [poolStatus, setPoolStatus] = useState<GiftCardPoolStatus | null>(null);
  const [poolCards, setPoolCards] = useState<GiftCardPool[]>([]);
  const [poolSearch, setPoolSearch] = useState<string>('');
  const [poolPage, setPoolPage] = useState<number>(0);
  const [poolPageSize, setPoolPageSize] = useState<number>(20);
  const [poolTotalPages, setPoolTotalPages] = useState<number>(0);
  const [poolStatusFilter, setPoolStatusFilter] = useState<string>('ALL'); // 'ALL', 'AVAILABLE', 'ASSIGNED', 'EXPIRED', 'INVALID'
  
  // Eligible participants
  const [eligibleParticipants, setEligibleParticipants] = useState<EligibleParticipant[]>([]);
  
  // Bulk selection for eligible participants
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  
  // Bulk selection for pool cards
  const [selectedPoolCardIds, setSelectedPoolCardIds] = useState<string[]>([]);
  const [showBulkDeletePoolModal, setShowBulkDeletePoolModal] = useState(false);
  
  // Actions menu for pool cards
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCard, setEditingCard] = useState<GiftCardPool | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  
  // Actions menu for sent gift cards
  const [openSentActionMenuId, setOpenSentActionMenuId] = useState<string | null>(null);
  const [sentMenuPosition, setSentMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const sentButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  
  // Next available card to be sent
  const [nextAvailableCard, setNextAvailableCard] = useState<GiftCardPool | null>(null);
  
  // Sent gift cards (paginated)
  const [sentGiftCards, setSentGiftCards] = useState<GiftCard[]>([]);
  const [sentPage, setSentPage] = useState<number>(0);
  const [sentPageSize, setSentPageSize] = useState<number>(20);
  const [sentTotalPages, setSentTotalPages] = useState<number>(0);
  const [sentTotalElements, setSentTotalElements] = useState<number>(0);
  
  // Unsent gift cards
  const [unsentGiftCards, setUnsentGiftCards] = useState<UnsentGiftCard[]>([]);
  
  // Track which gift card codes are revealed
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  // Fetch next available card when send modal opens
  useEffect(() => {
    const fetchNextAvailableCard = async () => {
      if (showSendModal) {
        try {
          const response = await api.getAvailableGiftCards(0, 1);
          if (response.content && response.content.length > 0) {
            setNextAvailableCard(response.content[0]);
          } else {
            setNextAvailableCard(null);
          }
        } catch (error) {
          console.error('Error fetching next available card:', error);
          setNextAvailableCard(null);
        }
      } else {
        setNextAvailableCard(null);
      }
    };
    fetchNextAvailableCard();
  }, [showSendModal]);
  const [showBulkSendModal, setShowBulkSendModal] = useState(false);
  const [showBulkSendResults, setShowBulkSendResults] = useState(false);
  const [bulkSendResults, setBulkSendResults] = useState<any>(null);
  const [showUploadResults, setShowUploadResults] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  
  // Form data
  const [newGiftCard, setNewGiftCard] = useState({
    cardCode: '',
    cardType: 'AMAZON',
    cardValue: 25.00,
    redemptionUrl: '',
    redemptionInstructions: '',
    batchLabel: 'Howard Research 25',
    expiresAt: '',
    notes: ''
  });
  
  const [uploadData, setUploadData] = useState({
    file: null as File | null
  });
  
  const [sendData, setSendData] = useState({
    participantId: '',
    invitationId: '',
    cardType: 'AMAZON',
    cardValue: 25.00,
    cardCode: '',
    redemptionUrl: '',
    redemptionInstructions: '',
    expiresAt: '',
    notes: '',
    deliveryMethod: 'EMAIL',
    source: 'MANUAL',
    poolId: ''
  });
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showGiftCardDetailsModal, setShowGiftCardDetailsModal] = useState(false);
  const [selectedGiftCardDetails, setSelectedGiftCardDetails] = useState<GiftCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000); // 5 seconds for better UX
      return () => clearTimeout(timer);
    }
  }, [message]);


  // Reset form to default values
  const resetGiftCardForm = () => {
    setNewGiftCard({
      cardCode: '',
      cardType: 'AMAZON',
      cardValue: 25.00,
      redemptionUrl: '',
      redemptionInstructions: '',
      batchLabel: 'Howard Research 25',
      expiresAt: '',
      notes: ''
    });
    setModalError(null);
  };

  // For Navbar functionality
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin-login');
      return;
    }
    fetchData();
  }, [navigate]);

  useEffect(() => {
    // Clear selections when switching tabs
    setSelectedParticipantIds([]);
    setSelectedPoolCardIds([]);
    
    if (activeTab === 'pool') {
      fetchPoolData();
    } else if (activeTab === 'eligible') {
      fetchEligibleParticipants();
    } else if (activeTab === 'unsent') {
      fetchUnsentGiftCards();
    }
    // Sent tab is handled by the effect below (so pagination refetches work)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, poolStatusFilter]);

  // Refetch pool data when filters/pagination change while on pool tab
  useEffect(() => {
    if (activeTab === 'pool') {
      fetchPoolData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolStatusFilter, poolPage, poolPageSize, poolSearch]);

  // Refetch sent gift cards when on sent tab and page/size change
  useEffect(() => {
    if (activeTab === 'sent') {
      fetchSentGiftCards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sentPage, sentPageSize]);

  const fetchData = async () => {
    await Promise.all([
      fetchPoolStatus(),
      fetchPoolData(),
      fetchEligibleParticipants(),
      fetchSentGiftCards()
    ]);
  };

  const fetchPoolStatus = async () => {
    try {
      const status = await api.getGiftCardPoolStatus();
      setPoolStatus(status);
    } catch (error) {
      console.error('Error fetching pool status:', error);
    }
  };

  const fetchPoolData = async () => {
    try {
      const status = poolStatusFilter === 'ALL' ? null : poolStatusFilter;
      console.log('Fetching pool data:', { status, poolPage, poolPageSize, poolSearch });
      const response = await api.getGiftCardsFromPool(status, poolPage, poolPageSize, poolSearch.trim() || undefined);
      console.log('Pool data response:', response);
      console.log('Response content:', response.content);
      console.log('Response totalPages:', response.totalPages);
      console.log('Response totalElements:', response.totalElements);
      setPoolCards(response.content || []);
      setPoolTotalPages(response.totalPages ?? 0);
    } catch (error) {
      console.error('Error fetching pool cards:', error);
      setMessage({ type: 'error', text: `Failed to fetch pool cards: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const fetchEligibleParticipants = async () => {
    try {
      const participants = await api.getEligibleParticipants();
      setEligibleParticipants(participants || []);
    } catch (error) {
      console.error('Error fetching eligible participants:', error);
    }
  };

  const fetchSentGiftCards = async (pageOverride?: number, sizeOverride?: number) => {
    try {
      const page = pageOverride ?? sentPage;
      const size = sizeOverride ?? sentPageSize;
      const response = await api.getSentGiftCards(page, size);
      setSentGiftCards(response.content || []);
      setSentTotalPages(response.totalPages ?? 0);
      setSentTotalElements(response.totalElements ?? 0);
      if (pageOverride !== undefined) setSentPage(pageOverride);
      if (sizeOverride !== undefined) setSentPageSize(sizeOverride);
    } catch (error) {
      console.error('Error fetching sent gift cards:', error);
    }
  };

  const fetchUnsentGiftCards = async () => {
    try {
      const response = await api.getUnsentGiftCards(0, 20);
      setUnsentGiftCards(response.content || []);
    } catch (error) {
      console.error('Error fetching unsent gift cards:', error);
    }
  };

  const handleAddGiftCard = async () => {
    // Clear any previous modal errors
    setModalError(null);
    
    // Validate required fields
    if (!newGiftCard.cardCode.trim()) {
      setModalError('Card code is required');
      return;
    }
    
    if (!newGiftCard.redemptionUrl.trim()) {
      setModalError('Redemption URL is required');
      return;
    }
    
    // Card value is optional, no validation needed
    
    // Basic URL validation
    try {
      new URL(newGiftCard.redemptionUrl);
    } catch {
      setModalError('Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    setLoading(true);
    try {
      // Convert date to ISO format if provided
      const giftCardData = {
        ...newGiftCard,
        expiresAt: newGiftCard.expiresAt ? `${newGiftCard.expiresAt}T00:00:00Z` : null
      };
      
      await api.addGiftCardToPool(giftCardData);
      setMessage({ type: 'success', text: 'Gift card added successfully!' });
      setShowAddModal(false);
      resetGiftCardForm();
      await fetchPoolStatus();
      await fetchPoolData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add gift card' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadGiftCards = async () => {
    if (!uploadData.file) {
      setMessage({ type: 'error', text: 'Please select a file to upload' });
      return;
    }

    setLoading(true);
    try {
      const result = await api.uploadGiftCards(uploadData.file);
      
      // Store results and show modal if there are duplicates or failures
      if (result.failedUploads > 0 || result.successfulUploads > 0) {
        setUploadResults(result);
        setShowUploadResults(true);
      }
      
      // Check if all failures are duplicates (not actual errors)
      const allFailuresAreDuplicates = result.errors && result.errors.length > 0 && 
        result.errors.every((error: string) => error.includes('Duplicate code:'));
      
      // Show summary message
      if (result.failedUploads === 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully uploaded ${result.successfulUploads} gift card code${result.successfulUploads !== 1 ? 's' : ''}!`
        });
      } else if (result.successfulUploads === 0) {
        // If all failures are duplicates, it's informational, not an error
        if (allFailuresAreDuplicates) {
          setMessage({ 
            type: 'success', 
            text: `All ${result.failedUploads} code${result.failedUploads !== 1 ? 's' : ''} already exist in the pool. See details below.`
          });
        } else {
          setMessage({ 
            type: 'error', 
            text: `Upload failed: ${result.failedUploads} code${result.failedUploads !== 1 ? 's' : ''} could not be added. See details below.`
          });
        }
      } else {
        // Mixed results - some successful, some failed
        if (allFailuresAreDuplicates) {
          setMessage({ 
            type: 'success', 
            text: `Successfully added ${result.successfulUploads} code${result.successfulUploads !== 1 ? 's' : ''}. ${result.failedUploads} duplicate${result.failedUploads !== 1 ? 's' : ''} skipped. See details below.`
          });
        } else {
          setMessage({ 
            type: 'error', 
            text: `Upload completed: ${result.successfulUploads} added, ${result.failedUploads} failed. See details below.`
          });
        }
      }
      
      setShowUploadModal(false);
      setUploadData({ file: null });
      // Reset filters and pagination to show all cards
      setPoolStatusFilter('ALL');
      setPoolPage(0);
      setPoolSearch('');
      await fetchPoolStatus();
      await fetchPoolData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload gift card codes' });
    } finally {
      setLoading(false);
    }
  };

  // Copy code to clipboard
  const copyCodeToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage({ type: 'success', text: 'Code copied to clipboard!' });
      setOpenActionMenuId(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to copy code' });
    }
  };

  // Handle edit card
  const handleEditCard = (card: GiftCardPool) => {
    setEditingCard({ ...card }); // Create a copy for editing
    setShowEditModal(true);
    setOpenActionMenuId(null);
  };

  // Handle save edited card
  const handleSaveEdit = async () => {
    if (!editingCard) return;

    // Validate code format
    const codePattern = /^[A-Z0-9]{4}-[A-Z0-9]{6}-[A-Z0-9]{4}$/i;
    if (!codePattern.test(editingCard.cardCode)) {
      setMessage({ type: 'error', text: 'Invalid code format. Expected: XXXX-XXXXXX-XXXX' });
      return;
    }

    setLoading(true);
    try {
      await api.updateGiftCardInPool(editingCard.id, editingCard.cardCode.toUpperCase());
      setMessage({ type: 'success', text: 'Gift card updated successfully!' });
      setShowEditModal(false);
      setEditingCard(null);
      await fetchPoolData(); // Refresh the list
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update gift card' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate menu position and handle outside clicks
  useEffect(() => {
    if (openActionMenuId) {
      const button = buttonRefs.current[openActionMenuId];
      if (button) {
        const rect = button.getBoundingClientRect();
        const menuHeight = 120; // Approximate height of the menu
        const menuWidth = 192; // w-48 = 192px
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Check if there's enough space below
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Position vertically: prefer below, but use above if not enough space
        let top: number;
        if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
          // Position below
          top = rect.bottom + window.scrollY + 4;
        } else {
          // Position above
          top = rect.top + window.scrollY - menuHeight - 4;
        }
        
        // Position horizontally: align to right edge, but adjust if it goes off-screen
        let left: number;
        if (rect.right - menuWidth >= 0) {
          // Enough space to align to right
          left = rect.right + window.scrollX - menuWidth;
        } else {
          // Not enough space, align to left edge of button
          left = rect.left + window.scrollX;
        }
        
        // Ensure menu doesn't go off the right edge
        if (left + menuWidth > viewportWidth + window.scrollX) {
          left = viewportWidth + window.scrollX - menuWidth - 8; // 8px padding from edge
        }
        
        // Ensure menu doesn't go off the left edge
        if (left < window.scrollX) {
          left = window.scrollX + 8; // 8px padding from edge
        }
        
        setMenuPosition({ top, left });
      }
      
      const handleClickOutside = () => {
        setOpenActionMenuId(null);
        setMenuPosition(null);
      };
      // Small delay to avoid immediate close
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('click', handleClickOutside);
    } else {
      setMenuPosition(null);
    }
  }, [openActionMenuId]);

  // Calculate menu position for sent gift cards and handle outside clicks
  useEffect(() => {
    if (openSentActionMenuId) {
      const button = sentButtonRefs.current[openSentActionMenuId];
      if (button) {
        const rect = button.getBoundingClientRect();
        const menuHeight = 200; // Approximate height of the menu (4 items)
        const menuWidth = 192; // w-48 = 192px
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Check if there's enough space below
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Position vertically: prefer below, but use above if not enough space
        let top: number;
        if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
          // Position below
          top = rect.bottom + window.scrollY + 4;
        } else {
          // Position above
          top = rect.top + window.scrollY - menuHeight - 4;
        }
        
        // Position horizontally: align to right edge, but adjust if it goes off-screen
        let left: number;
        if (rect.right - menuWidth >= 0) {
          // Enough space to align to right
          left = rect.right + window.scrollX - menuWidth;
        } else {
          // Not enough space, align to left edge of button
          left = rect.left + window.scrollX;
        }
        
        // Ensure menu doesn't go off the right edge
        if (left + menuWidth > viewportWidth + window.scrollX) {
          left = viewportWidth + window.scrollX - menuWidth - 8; // 8px padding from edge
        }
        
        // Ensure menu doesn't go off the left edge
        if (left < window.scrollX) {
          left = window.scrollX + 8; // 8px padding from edge
        }
        
        setSentMenuPosition({ top, left });
      }
      
      const handleClickOutside = () => {
        setOpenSentActionMenuId(null);
        setSentMenuPosition(null);
      };
      // Small delay to avoid immediate close
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('click', handleClickOutside);
    } else {
      setSentMenuPosition(null);
    }
  }, [openSentActionMenuId]);

  // Bulk selection functions
  const toggleSelectParticipant = (participantId: string) => {
    if (selectedParticipantIds.includes(participantId)) {
      setSelectedParticipantIds(selectedParticipantIds.filter((id) => id !== participantId));
    } else {
      setSelectedParticipantIds([...selectedParticipantIds, participantId]);
    }
  };

  const toggleSelectAllParticipants = () => {
    const allSelected = eligibleParticipants.every((p) =>
      selectedParticipantIds.includes(p.participantId)
    );
    if (allSelected) {
      setSelectedParticipantIds([]);
    } else {
      setSelectedParticipantIds(eligibleParticipants.map((p) => p.participantId));
    }
  };

  const handleBulkSendClick = () => {
    if (selectedParticipantIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one participant' });
      return;
    }
    setShowBulkSendModal(true);
  };

  const handleBulkSendGiftCards = async (_cardType: string, _cardValue: number, deliveryMethod: string) => {
    if (selectedParticipantIds.length === 0) {
      setMessage({ type: 'error', text: 'No participants selected' });
      return;
    }

    // Check if we have enough cards in the pool
    const availableCards = poolStatus?.availableCards || 0;
    if (availableCards < selectedParticipantIds.length) {
      setMessage({ 
        type: 'error', 
        text: `Insufficient gift cards. You need ${selectedParticipantIds.length} cards but only ${availableCards} are available. Please add more cards or reduce your selection.` 
      });
      setShowBulkSendModal(false);
      return;
    }

    setLoading(true);
    setShowBulkSendModal(false);

    try {
      // Prepare participants for batch send
      const participants = selectedParticipantIds.map(participantId => {
        const participant = eligibleParticipants.find((p) => p.participantId === participantId);
        if (!participant) {
          throw new Error(`Participant ${participantId} not found`);
        }
        return {
          participantId: participant.participantId,
          invitationId: participant.invitationId
        };
      });

      // Use batch endpoint
      const result = await api.batchSendGiftCards(participants, deliveryMethod, '');

      // Store results and show modal
      setBulkSendResults(result);
      setShowBulkSendResults(true);

      // Show summary message
      if (result.failed === 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully sent ${result.successful} gift card${result.successful !== 1 ? 's' : ''}!` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Sent ${result.successful} gift card${result.successful !== 1 ? 's' : ''}, ${result.failed} failed. See details below.` 
        });
      }

      // Clear selection and refresh data
      setSelectedParticipantIds([]);
      await fetchPoolStatus();
      await fetchEligibleParticipants();
      await fetchPoolData();
      if (activeTab === 'sent') await fetchSentGiftCards(0);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send gift cards' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendGiftCard = async () => {
    console.log('Send gift card data:', sendData);
    
    if (!sendData.participantId || !sendData.invitationId) {
      setMessage({ type: 'error', text: 'No participant selected' });
      return;
    }
    
    // Check if there are available cards in the pool
    if (poolStatus && poolStatus.availableCards === 0) {
      setMessage({ type: 'error', text: 'No available gift cards in the pool. Please add gift cards first.' });
      return;
    }

    setLoading(true);
    try {
      console.log('Sending gift card to participant:', sendData.participantId);
      console.log('Gift card data:', sendData);
      console.log('Invitation ID being sent:', sendData.invitationId);
      
      // Only send required fields - backend will auto-select from pool
      const requestData = {
        invitationId: sendData.invitationId,
        deliveryMethod: sendData.deliveryMethod,
        notes: sendData.notes || undefined
      };
      
      const result = await api.sendGiftCard(sendData.participantId, requestData);
      console.log('API call result:', result);
      
      setMessage({ type: 'success', text: 'Gift card sent successfully!' });
      setShowSendModal(false);
      setSendData({
        participantId: '',
        invitationId: '',
        cardType: 'AMAZON',
        cardValue: 25.00,
        cardCode: '',
        redemptionUrl: '',
        redemptionInstructions: '',
        expiresAt: '',
        notes: '',
        deliveryMethod: 'EMAIL',
        source: 'MANUAL',
        poolId: ''
      });
      
      // Refresh the data
      await fetchPoolStatus(); // Refresh stats/numbers
      await fetchEligibleParticipants();
      await fetchSentGiftCards();
      await fetchPoolData(); // Also refresh pool data since card status will change
    } catch (error: any) {
      console.error('Send gift card error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      
      let errorMessage = 'Failed to send gift card';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.status === 403) {
        errorMessage = 'Access denied. Please check your permissions.';
      } else if (error.status === 400) {
        errorMessage = 'Invalid request. Please check the gift card details.';
      } else if (error.status === 404) {
        errorMessage = 'Participant or gift card not found.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoolCard = async () => {
    if (!selectedItem) return;

    console.log('Selected item for deletion:', selectedItem);
    console.log('Selected item ID:', selectedItem.id, 'Type:', typeof selectedItem.id);

    // Validate that the ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectedItem.id)) {
      setMessage({ type: 'error', text: `Invalid gift card ID format: ${selectedItem.id}. Please refresh the page and try again.` });
      setShowDeleteModal(false);
      setSelectedItem(null);
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to delete gift card with ID:', selectedItem.id);
      await api.deleteGiftCardFromPool(selectedItem.id);
      
      setMessage({ type: 'success', text: 'Gift card deleted successfully!' });
      setShowDeleteModal(false);
      setSelectedItem(null);
      
      // Refresh the data
      await fetchPoolStatus();
      await fetchPoolData();
    } catch (error: any) {
      console.error('Delete error details:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete gift card' });
    } finally {
      setLoading(false);
    }
  };

  // Pool card selection functions
  const toggleSelectPoolCard = (cardId: string) => {
    if (selectedPoolCardIds.includes(cardId)) {
      setSelectedPoolCardIds(selectedPoolCardIds.filter(id => id !== cardId));
    } else {
      setSelectedPoolCardIds([...selectedPoolCardIds, cardId]);
    }
  };

  const toggleSelectAllPoolCards = () => {
    const allCardIds = poolCards.map(card => card.id);
    const allSelected = allCardIds.every(id => selectedPoolCardIds.includes(id));
    
    if (allSelected) {
      setSelectedPoolCardIds([]);
    } else {
      setSelectedPoolCardIds(allCardIds);
    }
  };

  // Bulk delete pool cards
  const handleBulkDeletePoolCards = async () => {
    if (selectedPoolCardIds.length === 0) return;

    setLoading(true);
    try {
      const results = await Promise.all(
        selectedPoolCardIds.map(async (id) => {
          try {
            await api.deleteGiftCardFromPool(id);
            return { id, ok: true };
          } catch (err: any) {
            return { id, ok: false, error: err?.message || 'Failed' };
          }
        })
      );

      const successCount = results.filter(r => r.ok).length;
      const failedCount = results.filter(r => !r.ok).length;

      if (failedCount === 0) {
        setMessage({ type: 'success', text: `Deleted ${successCount} gift card${successCount !== 1 ? 's' : ''} successfully!` });
      } else {
        setMessage({ type: 'error', text: `Deleted ${successCount}, failed ${failedCount}. Some cards may already be assigned.` });
      }

      setShowBulkDeletePoolModal(false);
      setSelectedPoolCardIds([]);
      
      // Refresh the data
      await fetchPoolStatus();
      await fetchPoolData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete gift cards' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSentCard = async () => {
    if (!selectedItem) return;

    console.log('Selected sent card for unsending:', selectedItem);
    console.log('Selected sent card ID:', selectedItem.id, 'Type:', typeof selectedItem.id);

    // Validate that the ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectedItem.id)) {
      setMessage({ type: 'error', text: `Invalid gift card ID format: ${selectedItem.id}. Please refresh the page and try again.` });
      setShowDeleteModal(false);
      setSelectedItem(null);
      setConfirmationText('');
      return;
    }

    // Check if confirmation text matches
    if (confirmationText !== 'MAKE AVAILABLE') {
      setMessage({ type: 'error', text: 'Please type MAKE AVAILABLE to confirm' });
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to unsend gift card with ID:', selectedItem.id);
      await api.unsendGiftCard(selectedItem.id);
      
      setMessage({ type: 'success', text: 'Gift card made available successfully!' });
      setShowDeleteModal(false);
      setSelectedItem(null);
      setConfirmationText('');
      
      // Refresh the data
      await fetchPoolStatus(); // Refresh stats/numbers
      await fetchSentGiftCards();
      await fetchUnsentGiftCards();
    } catch (error: any) {
      console.error('Unsend gift card error details:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to make gift card available' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendGiftCard = async (giftCardId: string) => {
    setLoading(true);
    try {
      await api.resendGiftCard(giftCardId);
      setMessage({ type: 'success', text: 'Gift card resent successfully!' });
      setOpenSentActionMenuId(null);
      setSentMenuPosition(null);
      
      // Refresh the data
      await fetchSentGiftCards();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to resend gift card' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateForCSV = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const exportSentGiftCardsToCSV = async () => {
    try {
      setLoading(true);
      
      // Fetch all sent gift cards by paginating through all pages
      const allCards: GiftCard[] = [];
      let page = 0;
      const pageSize = 1000; // Use a reasonable page size
      let hasMore = true;

      while (hasMore) {
        const response = await api.getSentGiftCards(page, pageSize);
        const cards: GiftCard[] = response.content || [];
        allCards.push(...cards);
        
        // Check if there are more pages
        hasMore = !response.last && cards.length === pageSize;
        page++;
      }

      if (allCards.length === 0) {
        setMessage({ type: 'error', text: 'No sent gift cards to export' });
        return;
      }

      // Define CSV headers
      const headers = [
        'Phone',
        'Email',
        'Card Code',
        'Card Type',
        'Status',
        'Sent By',
        'Sent Date',
        'Expires At',
        'Notes',
        'Created At'
      ];

      // Convert data to CSV rows
      const csvRows = [
        headers.join(','),
        ...allCards.map(card => {
          const escapeCSV = (value: any) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };

          return [
            escapeCSV(card.participantPhone || ''),
            escapeCSV(card.participantEmail || ''),
            escapeCSV(card.cardCode || ''),
            escapeCSV(card.cardType || ''),
            escapeCSV(card.status || ''),
            escapeCSV(card.sentBy || ''),
            escapeCSV(formatDateForCSV(card.sentAt)),
            escapeCSV(formatDateForCSV(card.expiresAt)),
            escapeCSV(card.notes || ''),
            escapeCSV(formatDateForCSV(card.createdAt))
          ].join(',');
        })
      ];

      // Create CSV content
      const csvContent = csvRows.join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sent-gift-cards-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `Exported ${allCards.length} gift card(s) to CSV` });
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to export CSV' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <AdminLayout title="Gift Card Management" searchQuery={searchQuery} onSearchChange={handleSearchChange}>
      <div className="container mx-auto px-6 py-6 flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gift Card Management</h1>
          <p className="mt-2 text-gray-600">Manage gift card distribution for research participants</p>
        </div>

        {/* Status Cards */}
        {poolStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-blue-600">{poolStatus.totalCards}</div>
              <div className="text-sm text-gray-600">Total Cards</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-green-600">{poolStatus.availableCards}</div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-yellow-600">{poolStatus.assignedCards}</div>
              <div className="text-sm text-gray-600">Assigned</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-2xl font-bold text-red-600">{poolStatus.expiredCards}</div>
              <div className="text-sm text-gray-600">Expired</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="border-b border-gray-200 flex-shrink-0">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('pool')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pool'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Gift Card Pool
              </button>
              <button
                onClick={() => setActiveTab('eligible')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'eligible'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Eligible Participants ({eligibleParticipants.length})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sent Gift Cards ({sentTotalElements})
              </button>
              <button
                onClick={() => setActiveTab('unsent')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'unsent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Unsent History
              </button>
            </nav>
          </div>

          <div className="p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Modern Slide-Down Notification */}
            {message && (
              <div className="fixed top-0 left-0 right-0 z-[70] transform transition-transform duration-300 ease-out">
                <div className={`mx-4 mt-4 rounded-lg shadow-lg border-l-4 ${
                  message.type === 'success' 
                    ? 'bg-green-50 border-l-green-500' 
                    : 'bg-red-50 border-l-red-500'
                }`}>
                  <div className="p-4">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {message.type === 'success' ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className={`text-sm font-medium ${
                          message.type === 'success' ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {message.type === 'success' ? 'Success!' : 'Error'}
                        </h3>
                        <p className={`mt-1 text-sm ${
                          message.type === 'success' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {message.text}
                        </p>
                      </div>
                      <button
                        onClick={() => setMessage(null)}
                        className={`ml-4 flex-shrink-0 rounded-md p-1.5 ${
                          message.type === 'success' 
                            ? 'text-green-500 hover:bg-green-100' 
                            : 'text-red-500 hover:bg-red-100'
                        } transition-colors`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gift Card Pool Tab */}
            {activeTab === 'pool' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                  <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-semibold text-gray-900">Gift Card Pool</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <select
                          value={poolStatusFilter}
                          onChange={(e) => { setPoolStatusFilter(e.target.value); setPoolPage(0); }}
                          className="h-10 pl-3 pr-10 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="AVAILABLE">Available</option>
                          <option value="ASSIGNED">Assigned</option>
                          <option value="EXPIRED">Expired</option>
                          <option value="INVALID">Invalid</option>
                        </select>
                        <svg className="pointer-events-none w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={poolSearch}
                        onChange={(e) => { setPoolSearch(e.target.value); setPoolPage(0); }}
                        placeholder="Search code"
                        className="h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48 sm:w-64"
                      />
                      <button
                        onClick={() => { setPoolPage(0); fetchPoolData(); }}
                        className="h-10 px-4 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        Search
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Gift Card
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-5 py-2.5 bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Codes
                    </button>
                    <button
                      onClick={() => setShowBulkDeletePoolModal(true)}
                      disabled={selectedPoolCardIds.length === 0}
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center shadow-sm
                        ${selectedPoolCardIds.length === 0 
                          ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200' 
                          : 'bg-white text-red-600 border border-red-300 hover:border-red-400 hover:bg-red-50 hover:shadow-md'}`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Selected ({selectedPoolCardIds.length})
                    </button>
                  </div>
                </div>

                {poolCards.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-16">
                    <div className="text-center">
                      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No gift cards</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Get started by adding a gift card or uploading a CSV file.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                              <input
                                type="checkbox"
                                checked={poolCards.length > 0 && poolCards.every(card => selectedPoolCardIds.includes(card.id))}
                                onChange={toggleSelectAllPoolCards}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Uploaded By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Uploaded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {poolCards.map((card) => (
                            <tr key={card.id} className="hover:bg-gray-50 transition">
                              <td className="px-3 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedPoolCardIds.includes(card.id)}
                                  onChange={() => toggleSelectPoolCard(card.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                          </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">
                                  {/* Mask middle part of code for security */}
                                  {card.cardCode.length > 10 
                                    ? `${card.cardCode.substring(0, 4)}-••••••-${card.cardCode.substring(card.cardCode.length - 4)}`
                                    : card.cardCode
                                  }
                                </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              card.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                              card.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-800' :
                              card.status === 'EXPIRED' ? 'bg-orange-100 text-orange-800' :
                              card.status === 'INVALID' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {card.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {card.uploadedBy || '—'}
                          </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {card.uploadedAt ? formatDate(card.uploadedAt) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                                <div className="relative inline-block">
                                  <button
                                    ref={(el) => {
                                      buttonRefs.current[card.id] = el;
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenuId(openActionMenuId === card.id ? null : card.id);
                                    }}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Dropdown Menu - Portal to body */}
                                  {openActionMenuId === card.id && menuPosition && createPortal(
                                    <div 
                                      className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999]"
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        top: `${menuPosition.top}px`,
                                        left: `${menuPosition.left}px`
                                      }}
                                    >
                                      <button
                                        onClick={() => copyCodeToClipboard(card.cardCode)}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                      >
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span>Copy Code</span>
                                      </button>
                            <button
                              onClick={() => {
                                          if (card.status !== 'ASSIGNED') {
                                            handleEditCard(card);
                                          }
                                        }}
                                        disabled={card.status === 'ASSIGNED'}
                                        className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${
                                          card.status === 'ASSIGNED'
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                        title={card.status === 'ASSIGNED' ? 'Cannot edit assigned gift cards' : ''}
                                      >
                                        <svg className={`w-4 h-4 ${card.status === 'ASSIGNED' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span>Edit</span>
                                      </button>
                                      <hr className="my-1 border-gray-200" />
                                      <button
                                        onClick={() => {
                                          if (card.status !== 'ASSIGNED') {
                                setSelectedItem(card);
                                setShowDeleteModal(true);
                                            setOpenActionMenuId(null);
                                          }
                                        }}
                                        disabled={card.status === 'ASSIGNED'}
                                        className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 ${
                                          card.status === 'ASSIGNED'
                                            ? 'text-gray-400 cursor-not-allowed'
                                            : 'text-red-600 hover:bg-red-50'
                                        }`}
                                        title={card.status === 'ASSIGNED' ? 'Cannot delete assigned gift cards' : ''}
                                      >
                                        <svg className={`w-4 h-4 ${card.status === 'ASSIGNED' ? 'text-gray-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Delete</span>
                            </button>
                                    </div>,
                                    document.body
                                  )}
                                </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Page {poolPage + 1} of {poolTotalPages || 1}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setPoolPage(Math.max(poolPage - 1, 0))}
                          disabled={poolPage === 0}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPoolPage(poolPage + 1)}
                          disabled={poolTotalPages ? poolPage + 1 >= poolTotalPages : false}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                        <div className="relative">
                          <select
                            value={poolPageSize}
                            onChange={(e) => { setPoolPageSize(parseInt(e.target.value, 10)); setPoolPage(0); }}
                            className="h-9 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                          <svg className="pointer-events-none w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Eligible Participants Tab */}
            {activeTab === 'eligible' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <div>
                  <h2 className="text-xl font-semibold text-gray-900">Eligible Participants</h2>
                    <p className="text-sm text-gray-600 mt-1">
                    Participants who completed surveys and are eligible for gift cards
                  </p>
                  </div>
                </div>

                {eligibleParticipants.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-16">
                    <div className="text-center">
                      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No eligible participants</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Participants who complete surveys will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Bulk Action Bar */}
                    {selectedParticipantIds.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-blue-900">
                            {selectedParticipantIds.length} participant{selectedParticipantIds.length !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                        <button
                          onClick={handleBulkSendClick}
                          disabled={loading}
                          className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm hover:shadow-md flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Send Gift Cards</span>
                        </button>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                              <input
                                type="checkbox"
                                checked={eligibleParticipants.length > 0 && eligibleParticipants.every((p) => selectedParticipantIds.includes(p.participantId))}
                                onChange={toggleSelectAllParticipants}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Survey Completed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {eligibleParticipants.map((participant) => (
                            <tr key={participant.participantId} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedParticipantIds.includes(participant.participantId)}
                                  onChange={() => toggleSelectParticipant(participant.participantId)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {participant.participantPhone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {participant.participantEmail || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(participant.surveyCompletedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSendData({
                                  ...sendData,
                                  participantId: participant.participantId,
                                  invitationId: participant.invitationId
                                });
                                setShowSendModal(true);
                              }}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              Send Gift Card
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                  </div>
                )}
              </div>
            )}

            {/* Sent Gift Cards Tab */}
            {activeTab === 'sent' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <div>
                  <h2 className="text-xl font-semibold text-gray-900">Sent Gift Cards</h2>
                    <p className="text-sm text-gray-600 mt-1">
                    Gift cards that have been sent to participants
                  </p>
                  </div>
                  {sentTotalElements > 0 && (
                    <button
                      onClick={exportSentGiftCardsToCSV}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>

                {sentGiftCards.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-16">
                    <div className="text-center">
                      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No sent gift cards</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Gift cards that have been sent to participants will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sent By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sent Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sentGiftCards.map((card: GiftCard) => (
                            <tr key={card.id} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {card.participantPhone || '—'}
                                </div>
                          </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700">
                                  {card.participantEmail || '—'}
                                </div>
                          </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">
                                  {revealedCodes.has(card.id) 
                                    ? (card.cardCode || '—')
                                    : (card.cardCode && card.cardCode.length > 10 
                                        ? `${card.cardCode.substring(0, 4)}-••••••-${card.cardCode.substring(card.cardCode.length - 4)}`
                                        : card.cardCode || '—'
                                      )
                                  }
                                </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              card.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                              card.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                              card.status === 'REDEEMED' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {card.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {card.sentBy || '—'}
                          </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {card.sentAt ? formatDate(card.sentAt) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                                <div className="relative inline-block">
                                  <button
                                    ref={(el) => {
                                      sentButtonRefs.current[card.id] = el;
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenSentActionMenuId(openSentActionMenuId === card.id ? null : card.id);
                                    }}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Dropdown Menu - Portal to body */}
                                  {openSentActionMenuId === card.id && sentMenuPosition && createPortal(
                                    <div 
                                      className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999]"
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        top: `${sentMenuPosition.top}px`,
                                        left: `${sentMenuPosition.left}px`
                                      }}
                                    >
                                      <button
                                        onClick={() => {
                                          setSelectedGiftCardDetails(card);
                                          setShowGiftCardDetailsModal(true);
                                          setOpenSentActionMenuId(null);
                                          setSentMenuPosition(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                      >
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>View Details</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          const newRevealed = new Set(revealedCodes);
                                          if (newRevealed.has(card.id)) {
                                            newRevealed.delete(card.id);
                                          } else {
                                            newRevealed.add(card.id);
                                          }
                                          setRevealedCodes(newRevealed);
                                          setOpenSentActionMenuId(null);
                                          setSentMenuPosition(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                      >
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        <span>{revealedCodes.has(card.id) ? 'Hide Code' : 'View Code'}</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (card.cardCode) {
                                            navigator.clipboard.writeText(card.cardCode);
                                            setMessage({
                                              type: 'success',
                                              text: 'Gift card code copied to clipboard'
                                            });
                                          }
                                          setOpenSentActionMenuId(null);
                                          setSentMenuPosition(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                      >
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span>Copy Code</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleResendGiftCard(card.id);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                                      >
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Resend</span>
                                      </button>
                                      <hr className="my-1 border-gray-200" />
                            <button
                              onClick={() => {
                                setSelectedItem(card);
                                setConfirmationText('');
                                setShowDeleteModal(true);
                                          setOpenSentActionMenuId(null);
                                          setSentMenuPosition(null);
                              }}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span>Make Available</span>
                            </button>
                                    </div>,
                                    document.body
                                  )}
                                </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 flex-shrink-0">
                      <div className="text-sm text-gray-600">
                        Showing {sentTotalElements === 0 ? 0 : sentPage * sentPageSize + 1}–{Math.min((sentPage + 1) * sentPageSize, sentTotalElements)} of {sentTotalElements}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSentPage(Math.max(sentPage - 1, 0))}
                          disabled={sentPage === 0}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {sentPage + 1} of {sentTotalPages || 1}
                        </span>
                        <button
                          onClick={() => setSentPage(sentPage + 1)}
                          disabled={sentTotalPages ? sentPage + 1 >= sentTotalPages : false}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                        <div className="relative">
                          <select
                            value={sentPageSize}
                            onChange={(e) => { setSentPageSize(parseInt(e.target.value, 10)); setSentPage(0); }}
                            className="h-9 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                          >
                            <option value={10}>10 per page</option>
                            <option value={20}>20 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                          </select>
                          <svg className="pointer-events-none w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Unsent Gift Cards Tab */}
            {activeTab === 'unsent' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <div>
                  <h2 className="text-xl font-semibold text-gray-900">Unsent Gift Cards History</h2>
                    <p className="text-sm text-gray-600 mt-1">
                    Gift cards that were sent to participants but then made available again by admins
                  </p>
                  </div>
                </div>

                {unsentGiftCards.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-16">
                    <div className="text-center">
                      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No unsent gift cards</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Gift cards that have been unsent will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Card Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Participant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Originally Sent By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Originally Sent At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unsent By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unsent At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {unsentGiftCards.map((card, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {card.cardCode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {card.cardType}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div className="flex flex-col">
                                {card.participantName && (
                                  <span className="font-medium text-gray-900">{card.participantName}</span>
                                )}
                                <span>{card.participantPhone}</span>
                                {card.participantEmail && (
                                  <span className="text-xs text-gray-400">{card.participantEmail}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {card.sentBy || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {card.sentAt ? formatDate(card.sentAt) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {card.unsentBy}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {card.unsentAt ? formatDate(card.unsentAt) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Gift Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Add Gift Card</h3>
                    <p className="text-sm text-gray-500">Add a single gift card to the pool</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetGiftCardForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Error Message */}
              {modalError && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm font-medium">{modalError}</span>
                  </div>
                </div>
              )}
              
              <form 
                noValidate 
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }}
              >
                <div className="space-y-4">
                {/* Card Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newGiftCard.cardCode}
                    onChange={(e) => setNewGiftCard({ ...newGiftCard, cardCode: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="AMAZON-ABC123-XYZ789"
                  />
                </div>

                {/* Card Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
                  <select
                    value={newGiftCard.cardType}
                    onChange={(e) => setNewGiftCard({ ...newGiftCard, cardType: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="AMAZON">Amazon</option>
                    <option value="VISA">Visa</option>
                    <option value="MASTERCARD">Mastercard</option>
                    <option value="APPLE">Apple</option>
                    <option value="GOOGLE_PLAY">Google Play</option>
                    <option value="STEAM">Steam</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Redemption URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Redemption URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newGiftCard.redemptionUrl}
                    onChange={(e) => setNewGiftCard({ ...newGiftCard, redemptionUrl: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="https://amazon.com/gc/redeem?code=ABC123"
                  />
                </div>

                {/* Batch Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Label</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newGiftCard.batchLabel}
                      readOnly
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    <span className="inline-flex items-center">
                      <svg className="w-3 h-3 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Default batch label to prevent duplicate gift cards
                    </span>
                  </p>
                </div>

                {/* Expires At */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                  <input
                    type="date"
                    value={newGiftCard.expiresAt}
                    onChange={(e) => setNewGiftCard({ ...newGiftCard, expiresAt: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave empty for no expiration</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newGiftCard.notes}
                    onChange={(e) => setNewGiftCard({ ...newGiftCard, notes: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    rows={2}
                    placeholder="Optional notes about this gift card..."
                  />
                </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 rounded-b-xl">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetGiftCardForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddGiftCard}
                  disabled={loading || !newGiftCard.cardCode || !newGiftCard.redemptionUrl}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Gift Card</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Codes Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Upload Gift Card Codes</h3>
                    <p className="text-sm text-gray-500">Bulk upload Amazon gift card codes</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Codes File <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                    >
                      {uploadData.file ? (
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">{uploadData.file.name}</p>
                            <p className="text-xs text-gray-500">{(uploadData.file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm font-medium text-gray-600">Drop your codes file here</p>
                          <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Format Info */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-900 mb-2">File Format</h4>
                      <p className="text-xs text-amber-700 mb-3">One Amazon gift card code per line:</p>
                      <div className="bg-white border border-amber-200 rounded-lg p-3 font-mono text-sm text-gray-800">
                        <div>ABCD-EFGHIJ-KLMN</div>
                        <div>WXYZ-123456-PQRS</div>
                        <div>MNOP-789012-QRST</div>
                      </div>
                      <p className="text-xs text-amber-600 mt-3 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Redemption link auto-set to amazon.com/gc/redeem
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadGiftCards}
                  disabled={loading || !uploadData.file}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Upload Codes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Gift Card Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Send Gift Card</h3>
                    <p className="text-sm text-gray-500">A gift card will be automatically selected from the pool</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Gift Card Preview */}
              {nextAvailableCard ? (
                <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
              </div>
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-semibold text-green-900 mb-2">Gift Card to be Sent</h4>
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Code:</span>
                            <code className="ml-2 font-mono text-gray-900 font-semibold">
                              {nextAvailableCard.cardCode.length > 10 
                                ? `${nextAvailableCard.cardCode.substring(0, 4)}-••••••-${nextAvailableCard.cardCode.substring(nextAvailableCard.cardCode.length - 4)}`
                                : nextAvailableCard.cardCode
                              }
                            </code>
              </div>
                          <div>
                            <span className="text-gray-500">Redemption URL:</span>
                            <a 
                              href={nextAvailableCard.redemptionUrl || 'https://www.amazon.com/gc/redeem'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-2 text-blue-600 hover:underline text-xs"
                            >
                              {nextAvailableCard.redemptionUrl || 'https://www.amazon.com/gc/redeem'}
                            </a>
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-green-700">
                        This is the next available card that will be automatically selected and sent.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-900">No Available Cards</h4>
                      <p className="mt-1 text-sm text-yellow-700">
                        There are no available gift cards in the pool. Please add gift cards before sending.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Method */}
              <div className="mt-8">
                <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Delivery Method
                </label>
                <div className="relative">
                  <select
                    value={sendData.deliveryMethod}
                    onChange={(e) => setSendData({ ...sendData, deliveryMethod: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 appearance-none cursor-pointer text-gray-700 font-medium shadow-sm hover:border-gray-300"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 1rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.25em 1.25em',
                      paddingRight: '3rem'
                    }}
                  >
                    <option value="EMAIL">Email Only</option>
                    <option value="SMS">SMS Only</option>
                    <option value="BOTH">Both Email & SMS</option>
                  </select>
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Choose how the participant will receive their gift card
                </p>
              </div>

              {/* Notes */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  <div className="flex items-center mb-1">
                    <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Notes
                    <span className="ml-2 text-xs font-normal text-gray-500">(Optional)</span>
                  </div>
                  <p className="text-sm text-gray-700 font-semibold ml-6 mt-1">
                    Notes are not sent to participants. They are saved in the system for internal references only by admins.
                  </p>
                </label>
                <div className="relative">
                  <textarea
                    value={sendData.notes}
                    onChange={(e) => setSendData({ ...sendData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 resize-none text-gray-700 placeholder-gray-400 shadow-sm hover:border-gray-300"
                    rows={3}
                    placeholder="Enter internal notes (e.g., 'Follow up needed', 'Special circumstances', etc.)"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {sendData.notes.length}/500
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 rounded-b-xl">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendGiftCard}
                  disabled={loading || (poolStatus ? poolStatus.availableCards === 0 : false)}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Send Gift Card</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Pool Cards Modal */}
      {showBulkDeletePoolModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-5">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Gift Cards</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete {selectedPoolCardIds.length} gift card{selectedPoolCardIds.length !== 1 ? 's' : ''} from the pool? This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowBulkDeletePoolModal(false);
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDeletePoolCards}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-sm hover:shadow-md"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Send Gift Cards Modal */}
      {showBulkSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="flex items-start mb-5">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Send Gift Cards to Multiple Participants</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    You are about to send gift cards to {selectedParticipantIds.length} participant{selectedParticipantIds.length !== 1 ? 's' : ''}.
                  </p>
                  
                  {/* Card Availability Check */}
                  {poolStatus && (
                    <div className={`mt-3 p-3 rounded-lg border ${
                      (poolStatus.availableCards || 0) >= selectedParticipantIds.length
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {(poolStatus.availableCards || 0) >= selectedParticipantIds.length ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${
                            (poolStatus.availableCards || 0) >= selectedParticipantIds.length
                              ? 'text-green-800'
                              : 'text-red-800'
                          }`}>
                            {(poolStatus.availableCards || 0) >= selectedParticipantIds.length
                              ? 'Sufficient cards available'
                              : 'Insufficient cards available'}
                          </p>
                          <p className={`text-xs mt-1 ${
                            (poolStatus.availableCards || 0) >= selectedParticipantIds.length
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}>
                            Available: {poolStatus.availableCards || 0} | Needed: {selectedParticipantIds.length}
                            {(poolStatus.availableCards || 0) < selectedParticipantIds.length && (
                              <span className="block mt-1 font-medium">
                                Please add more cards or reduce your selection.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery Method Selection */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Method
                    </label>
                    <select
                      id="bulkDeliveryMethod"
                      defaultValue="EMAIL"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                      <option value="BOTH">Both Email and SMS</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowBulkSendModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const deliveryMethod = (document.getElementById('bulkDeliveryMethod') as HTMLSelectElement)?.value || 'EMAIL';
                    handleBulkSendGiftCards('AMAZON', 25.00, deliveryMethod);
                  }}
                  disabled={loading || !poolStatus || (poolStatus.availableCards || 0) < selectedParticipantIds.length}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm hover:shadow-md"
                >
                  {loading ? 'Sending...' : `Send to ${selectedParticipantIds.length} Participant${selectedParticipantIds.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Send Results Modal */}
      {showBulkSendResults && bulkSendResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Bulk Send Results
                </h3>
                <button
                  onClick={() => setShowBulkSendResults(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Summary */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-900">Total Requested</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{bulkSendResults.totalRequested}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm font-medium text-green-900">Successful</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">{bulkSendResults.successful}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-sm font-medium text-red-900">Failed</div>
                  <div className="text-2xl font-bold text-red-600 mt-1">{bulkSendResults.failed}</div>
                </div>
              </div>

              {/* Failures List */}
              {bulkSendResults.failures && bulkSendResults.failures.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Failed Sends ({bulkSendResults.failures.length})</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {bulkSendResults.failures.map((failure: any, index: number) => (
                        <div key={index} className="bg-white p-3 rounded border border-red-100">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {failure.participantPhone || failure.participantEmail || `Participant ${failure.participantId}`}
                              </div>
                              {failure.participantEmail && failure.participantPhone && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {failure.participantEmail} • {failure.participantPhone}
                                </div>
                              )}
                              <div className="text-sm text-red-600 mt-1 font-medium">
                                {failure.errorMessage}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Successes List (collapsible) */}
              {bulkSendResults.successes && bulkSendResults.successes.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Successful Sends ({bulkSendResults.successes.length})</h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {bulkSendResults.successes.map((success: any, index: number) => (
                        <div key={index} className="bg-white p-3 rounded border border-green-100">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {success.participantPhone || success.participantEmail || `Participant ${success.participantId}`}
                              </div>
                              {success.participantEmail && success.participantPhone && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {success.participantEmail} • {success.participantPhone}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Gift Card ID: {success.giftCardId}
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex-shrink-0 flex justify-end">
              <button
                onClick={() => setShowBulkSendResults(false)}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Results Modal */}
      {showUploadResults && uploadResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Upload Results
                </h3>
                <button
                  onClick={() => setShowUploadResults(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Summary */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-900">Total Processed</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{uploadResults.totalRows || 0}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm font-medium text-green-900">Successfully Added</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">{uploadResults.successfulUploads || 0}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-medium text-gray-900">Failed/Duplicates</div>
                  <div className="text-2xl font-bold text-gray-700 mt-1">{uploadResults.failedUploads || 0}</div>
                </div>
              </div>

              {/* Duplicates/Failures List */}
              {uploadResults.errors && uploadResults.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {uploadResults.failedUploads === uploadResults.errors.length 
                      ? `Duplicate Codes (${uploadResults.errors.length})` 
                      : `Errors (${uploadResults.errors.length})`}
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {uploadResults.errors.map((error: string, index: number) => {
                        // Parse error message to extract code and status
                        const duplicateMatch = error.match(/Duplicate code: ([^(]+) \(Status: ([^)]+)\)/);
                        const codeMatch = error.match(/code: ([^(]+)/);
                        const statusMatch = error.match(/Status: ([^)]+)/);
                        
                        const code = duplicateMatch ? duplicateMatch[1].trim() : (codeMatch ? codeMatch[1].trim() : error);
                        const status = duplicateMatch ? duplicateMatch[2] : (statusMatch ? statusMatch[1] : null);
                        
                        return (
                          <div key={index} className="bg-white p-3 rounded border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 font-mono">
                                  {code}
                                </div>
                                {status && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Status: <span className="font-medium text-gray-700">{status}</span>
                                  </div>
                                )}
                                {!duplicateMatch && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    {error}
                                  </div>
                                )}
                              </div>
                              {status && (
                                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
                                  status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                  status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-800' :
                                  status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {status}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {uploadResults.failedUploads === uploadResults.errors.length && (
                    <p className="text-sm text-gray-600 mt-3">
                      💡 These codes already exist in the pool. You can search for them in the pool table above.
                    </p>
                  )}
                </div>
              )}

              {/* Success Summary */}
              {uploadResults.successfulUploads > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-green-800">
                      <strong>{uploadResults.successfulUploads}</strong> gift card code{uploadResults.successfulUploads !== 1 ? 's' : ''} {uploadResults.successfulUploads === 1 ? 'was' : 'were'} successfully added to the pool.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex-shrink-0 flex justify-end">
              <button
                onClick={() => setShowUploadResults(false)}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete/Unsend Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              {activeTab === 'pool' ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to delete this gift card from the pool? This action cannot be undone.
                  </p>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setSelectedItem(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeletePoolCard}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start mb-5">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Make Gift Card Available</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        This action will mark the gift card as unsent and make it available again in the pool for sending to other participants. The participant may have already viewed, saved, or redeemed it. Making it available does NOT prevent redemption if they already have the code.
                      </p>
                      {selectedItem && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Gift Card Code</p>
                          <p className="text-sm font-medium text-gray-900">{selectedItem.cardCode}</p>
                          {selectedItem.participantPhone && (
                            <>
                              <p className="text-xs text-gray-500 mt-2 mb-1">Participant</p>
                              <p className="text-sm text-gray-700">
                                {selectedItem.participantPhone}
                                {selectedItem.participantEmail && ` • ${selectedItem.participantEmail}`}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type <span className="font-semibold text-gray-900">MAKE AVAILABLE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Type MAKE AVAILABLE here"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setSelectedItem(null);
                        setConfirmationText('');
                      }}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteSentCard}
                      disabled={loading || confirmationText !== 'MAKE AVAILABLE'}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm hover:shadow-md"
                    >
                      {loading ? 'Making Available...' : 'Make Available'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gift Card Details Modal */}
      {showGiftCardDetailsModal && selectedGiftCardDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Gift Card Details</h2>
                </div>
                <button
                  onClick={() => {
                    setShowGiftCardDetailsModal(false);
                    setSelectedGiftCardDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              {/* Participant Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Participant Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedGiftCardDetails.participantPhone && (
                    <div>
                      <span className="text-xs text-gray-500">Phone:</span>
                      <p className="text-sm font-medium text-gray-900">{selectedGiftCardDetails.participantPhone}</p>
                    </div>
                  )}
                  {selectedGiftCardDetails.participantEmail && (
                    <div>
                      <span className="text-xs text-gray-500">Email:</span>
                      <p className="text-sm font-medium text-gray-900">{selectedGiftCardDetails.participantEmail}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gift Card Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Gift Card Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Card Code:</span>
                      <p className="text-sm font-mono font-medium text-gray-900 mt-1">{selectedGiftCardDetails.cardCode || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Card Type:</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedGiftCardDetails.cardType || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Status:</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm ${
                          selectedGiftCardDetails.status === 'SENT' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          selectedGiftCardDetails.status === 'DELIVERED' 
                            ? 'bg-green-50 text-green-700 border border-green-200' :
                          selectedGiftCardDetails.status === 'REDEEMED' 
                            ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {selectedGiftCardDetails.status === 'SENT' && (
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                          )}
                          {selectedGiftCardDetails.status === 'DELIVERED' && (
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {selectedGiftCardDetails.status === 'REDEEMED' && (
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {selectedGiftCardDetails.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Sent By:</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedGiftCardDetails.sentBy || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Timeline</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedGiftCardDetails.sentAt && (
                    <div>
                      <span className="text-xs text-gray-500">Sent Date:</span>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedGiftCardDetails.sentAt)}</p>
                    </div>
                  )}
                  {selectedGiftCardDetails.deliveredAt && (
                    <div>
                      <span className="text-xs text-gray-500">Delivered Date:</span>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedGiftCardDetails.deliveredAt)}</p>
                    </div>
                  )}
                  {selectedGiftCardDetails.redeemedAt && (
                    <div>
                      <span className="text-xs text-gray-500">Redeemed Date:</span>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedGiftCardDetails.redeemedAt)}</p>
                    </div>
                  )}
                  {selectedGiftCardDetails.expiresAt && (
                    <div>
                      <span className="text-xs text-gray-500">Expires At:</span>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedGiftCardDetails.expiresAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedGiftCardDetails.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Admin Notes</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedGiftCardDetails.notes}</p>
                  </div>
                </div>
              )}

              {!selectedGiftCardDetails.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Admin Notes</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-500 italic">No notes added</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowGiftCardDetailsModal(false);
                    setSelectedGiftCardDetails(null);
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Gift Card Modal */}
      {showEditModal && editingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[55]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
    </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Edit Gift Card</h3>
                    <p className="text-sm text-gray-500">Update gift card details</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCard(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="space-y-4">
                {/* Card Code (Editable) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingCard.cardCode}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setEditingCard({ ...editingCard, cardCode: value });
                      }}
                      placeholder="XXXX-XXXXXX-XXXX"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      maxLength={16}
                    />
                    <button
                      onClick={() => copyCodeToClipboard(editingCard.cardCode)}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy code"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Format: XXXX-XXXXXX-XXXX (e.g., ABCD-EFGHIJ-KLMN)
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <span className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-full ${
                    editingCard.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                    editingCard.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {editingCard.status}
                  </span>
                </div>

                {/* Redemption URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Redemption URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingCard.redemptionUrl || 'https://www.amazon.com/gc/redeem'}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600"
                    />
                    <a
                      href={editingCard.redemptionUrl || 'https://www.amazon.com/gc/redeem'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Open redemption URL"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Upload Info */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Uploaded By</span>
                      <p className="font-medium text-gray-900">{editingCard.uploadedBy || '—'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Uploaded At</span>
                      <p className="font-medium text-gray-900">
                        {editingCard.uploadedAt ? formatDate(editingCard.uploadedAt) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => copyCodeToClipboard(editingCard.cardCode)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Code</span>
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingCard(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading || !editingCard.cardCode}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default GiftCardManagement;
