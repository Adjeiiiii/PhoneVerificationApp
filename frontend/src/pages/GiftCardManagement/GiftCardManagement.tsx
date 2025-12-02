import React, { useEffect, useState } from 'react';
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
  
  // Eligible participants
  const [eligibleParticipants, setEligibleParticipants] = useState<EligibleParticipant[]>([]);
  
  // Bulk selection for eligible participants
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  
  // Sent gift cards
  const [sentGiftCards, setSentGiftCards] = useState<GiftCard[]>([]);
  
  // Unsent gift cards
  const [unsentGiftCards, setUnsentGiftCards] = useState<UnsentGiftCard[]>([]);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showBulkSendModal, setShowBulkSendModal] = useState(false);
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
    file: null as File | null,
    batchLabel: 'Howard Research 25'
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
    // Clear selection when switching tabs
    setSelectedParticipantIds([]);
    
    if (activeTab === 'pool') {
      fetchPoolData();
    } else if (activeTab === 'eligible') {
      fetchEligibleParticipants();
    } else if (activeTab === 'sent') {
      fetchSentGiftCards();
    } else if (activeTab === 'unsent') {
      fetchUnsentGiftCards();
    }
  }, [activeTab]);

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
      const response = await api.getAvailableGiftCards(0, 20);
      setPoolCards(response.content || []);
    } catch (error) {
      console.error('Error fetching pool cards:', error);
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

  const fetchSentGiftCards = async () => {
    try {
      const response = await api.getSentGiftCards(0, 20);
      setSentGiftCards(response.content || []);
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
    
    if (newGiftCard.cardValue <= 0) {
      setModalError('Card value must be greater than 0');
      return;
    }
    
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
      setMessage({ type: 'error', text: 'Please select a CSV file to upload' });
      return;
    }

    setLoading(true);
    try {
      const result = await api.uploadGiftCards(uploadData.file, uploadData.batchLabel);
      let messageText = `Upload completed! ${result.successfulUploads} cards added`;
      if (result.failedUploads > 0) {
        messageText += `, ${result.failedUploads} failed`;
        if (result.errors && result.errors.length > 0) {
          // Show first 3 errors as examples
          const errorPreview = result.errors.slice(0, 3).join('; ');
          messageText += `. Errors: ${errorPreview}${result.errors.length > 3 ? '...' : ''}`;
        }
      }
      setMessage({ 
        type: result.failedUploads > 0 ? 'error' : 'success', 
        text: messageText
      });
      setShowUploadModal(false);
      setUploadData({ file: null, batchLabel: '' });
      await fetchPoolStatus();
      await fetchPoolData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload gift cards' });
    } finally {
      setLoading(false);
    }
  };

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

  const handleBulkSendGiftCards = async (cardType: string, cardValue: number, deliveryMethod: string) => {
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
    
    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: []
    };

    try {
      // Get available cards from pool
      const poolResponse = await api.getAvailableGiftCards(0, selectedParticipantIds.length);
      const availablePoolCards = poolResponse.content || [];

      if (availablePoolCards.length < selectedParticipantIds.length) {
        setMessage({ 
          type: 'error', 
          text: `Insufficient gift cards. Only ${availablePoolCards.length} cards available. Please add more cards or reduce your selection.` 
        });
        setLoading(false);
        return;
      }

      // Send gift cards to each selected participant
      for (let i = 0; i < selectedParticipantIds.length; i++) {
        const participantId = selectedParticipantIds[i];
        const participant = eligibleParticipants.find((p) => p.participantId === participantId);
        
        if (!participant) {
          results.failed++;
          results.errors.push(`Participant ${participantId} not found`);
          continue;
        }

        const poolCard = availablePoolCards[i];
        if (!poolCard) {
          results.failed++;
          results.errors.push(`No gift card available for ${participant.participantPhone}`);
          continue;
        }

        try {
          const sendData = {
            participantId: participant.participantId,
            invitationId: participant.invitationId,
            cardType: poolCard.cardType,
            cardValue: poolCard.cardValue,
            cardCode: poolCard.cardCode,
            redemptionUrl: poolCard.redemptionUrl,
            redemptionInstructions: poolCard.redemptionInstructions || '',
            expiresAt: poolCard.expiresAt || '',
            notes: '',
            deliveryMethod: deliveryMethod,
            source: 'POOL',
            poolId: poolCard.id
          };

          await api.sendGiftCard(participant.participantId, sendData);
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${participant.participantPhone}: ${error.message || 'Failed to send'}`);
        }
      }

      // Show results
      if (results.failed === 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully sent ${results.success} gift card${results.success !== 1 ? 's' : ''}!` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Sent ${results.success} gift card${results.success !== 1 ? 's' : ''}, ${results.failed} failed. ${results.errors.slice(0, 3).join('; ')}${results.errors.length > 3 ? '...' : ''}` 
        });
      }

      // Clear selection and refresh data
      setSelectedParticipantIds([]);
      await fetchPoolStatus();
      await fetchEligibleParticipants();
      await fetchSentGiftCards();
      await fetchPoolData();
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
    
    if (!sendData.poolId) {
      setMessage({ type: 'error', text: 'Please select a gift card from the pool' });
      return;
    }

    setLoading(true);
    try {
      console.log('Sending gift card to participant:', sendData.participantId);
      console.log('Gift card data:', sendData);
      console.log('Invitation ID being sent:', sendData.invitationId);
      console.log('Pool ID being sent:', sendData.poolId);
      
      const result = await api.sendGiftCard(sendData.participantId, sendData);
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
    if (confirmationText !== 'UNSEND') {
      setMessage({ type: 'error', text: 'Please type UNSEND to confirm' });
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to unsend gift card with ID:', selectedItem.id);
      await api.unsendGiftCard(selectedItem.id);
      
      setMessage({ type: 'success', text: 'Gift card unsent successfully!' });
      setShowDeleteModal(false);
      setSelectedItem(null);
      setConfirmationText('');
      
      // Refresh the data
      await fetchPoolStatus(); // Refresh stats/numbers
      await fetchSentGiftCards();
      await fetchUnsentGiftCards();
    } catch (error: any) {
      console.error('Unsend gift card error details:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to unsend gift card' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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
                Sent Gift Cards
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
                  <h2 className="text-xl font-semibold text-gray-900">Gift Card Pool</h2>
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
                      Upload CSV
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Card Code
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Value
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Redemption URL
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Batch
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Notes
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Expires
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {poolCards.map((card) => (
                            <tr key={card.id} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {card.cardCode}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {card.cardType}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(card.cardValue)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                <a 
                                  href={card.redemptionUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                  title={card.redemptionUrl}
                                >
                                  {card.redemptionUrl.length > 40 
                                    ? `${card.redemptionUrl.substring(0, 40)}...` 
                                    : card.redemptionUrl
                                  }
                                </a>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {card.batchLabel}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                <div 
                                  className="truncate"
                                  title={card.notes || 'No notes'}
                                >
                                  {card.notes || (
                                    <span className="text-gray-400 italic">No notes</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  card.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                  card.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {card.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {card.expiresAt ? formatDate(card.expiresAt) : 'Never'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => {
                                    setSelectedItem(card);
                                    setShowDeleteModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-900 font-medium"
                                >
                                  Delete
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
                              Participant
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gift Card
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Value
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
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
                          {sentGiftCards.map((card) => (
                            <tr key={card.id} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {card.participantPhone}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {card.cardCode}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(card.cardValue)}
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
                                {card.sentAt ? formatDate(card.sentAt) : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedItem(card);
                                    setConfirmationText('');
                                    setShowDeleteModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-900 font-medium"
                                >
                                  Unsend
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

            {/* Unsent Gift Cards Tab */}
            {activeTab === 'unsent' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Unsent Gift Cards History</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Gift cards that were sent to participants but then revoked/unsent by admins
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
                              Value
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(card.cardValue)}
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

                {/* Card Type and Value Row */}
                <div className="grid grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Value ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newGiftCard.cardValue}
                      onChange={(e) => setNewGiftCard({ ...newGiftCard, cardValue: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="25.00"
                    />
                  </div>
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

      {/* Upload CSV Modal */}
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
                    <h3 className="text-lg font-semibold text-gray-900">Upload Gift Cards</h3>
                    <p className="text-sm text-gray-500">Bulk upload gift cards from CSV file</p>
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
                {/* Batch Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Label
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={uploadData.batchLabel}
                      readOnly
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    <span className="inline-flex items-center">
                      <svg className="w-3 h-3 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Default batch label to prevent duplicate gift cards. This will be customizable in future updates.
                    </span>
                  </p>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV File <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                    >
                      {uploadData.file ? (
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-600">Click to upload CSV file</p>
                          <p className="text-xs text-gray-400">or drag and drop</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* CSV Format Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Required</h4>
                      <p className="text-xs text-blue-700 mb-2">Your CSV file should have these columns:</p>
                      <div className="bg-white border border-blue-200 rounded p-2 mb-2">
                        <code className="text-xs text-gray-800 font-mono">
                          card_code, card_type, card_value, redemption_url, expires_day, expires_month, expires_year
                        </code>
                      </div>
                      <p className="text-xs text-blue-600 mb-1">
                        <strong>Required:</strong> card_code, card_type, card_value, redemption_url
                      </p>
                      <p className="text-xs text-blue-600">
                        <strong>Optional:</strong> expires_day (1-31), expires_month (1-12), expires_year (e.g., 2026)
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
                      <span>Upload CSV</span>
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
                    <p className="text-sm text-gray-500">Select a gift card from the pool to send to participant</p>
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
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Available Gift Cards</h4>
                <p className="text-xs text-gray-500">Select a gift card from the pool to send to this participant</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Select
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Card Code
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {poolCards.filter(card => card.status === 'AVAILABLE').map((card) => (
                      <tr key={card.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap">
                          <input
                            type="radio"
                            name="selectedCard"
                            value={card.id}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSendData({
                                  ...sendData,
                                  cardCode: card.cardCode,
                                  cardType: card.cardType,
                                  cardValue: card.cardValue,
                                  redemptionUrl: card.redemptionUrl,
                                  redemptionInstructions: card.redemptionInstructions,
                                  poolId: card.id,
                                  source: 'POOL'
                                });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {card.cardCode}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {card.cardType}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(card.cardValue)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {card.batchLabel}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {card.expiresAt ? formatDate(card.expiresAt) : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {poolCards.filter(card => card.status === 'AVAILABLE').length === 0 && (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No available gift cards</h3>
                  <p className="mt-1 text-sm text-gray-500">Add some gift cards to the pool first.</p>
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
                <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notes
                  <span className="ml-2 text-xs font-normal text-gray-500">(Optional)</span>
                </label>
                <div className="relative">
                  <textarea
                    value={sendData.notes}
                    onChange={(e) => setSendData({ ...sendData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 resize-none text-gray-700 placeholder-gray-400 shadow-sm hover:border-gray-300"
                    rows={3}
                    placeholder="Add any special instructions or notes about this gift card delivery..."
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                    {sendData.notes.length}/500
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Include any special instructions or context for this delivery
                </p>
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
                  disabled={loading || !sendData.poolId}
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Unsend Gift Card</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        This action will mark the gift card as unsent. If it came from the pool, it will become available again for sending to other participants. The participant may have already viewed, saved, or redeemed it. Unsending does NOT prevent redemption if they already have the code.
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
                      Type <span className="font-semibold text-gray-900">UNSEND</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Type UNSEND here"
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
                      disabled={loading || confirmationText !== 'UNSEND'}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm hover:shadow-md"
                    >
                      {loading ? 'Unsending...' : 'Unsend Gift Card'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default GiftCardManagement;
