import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../Footer/Footer';
import Navbar from '../NavBar/Navbar';
import AdminNavigation from '../../components/AdminNavigation';
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

const GiftCardManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pool' | 'eligible' | 'sent'>('pool');
  
  // Pool status and cards
  const [poolStatus, setPoolStatus] = useState<GiftCardPoolStatus | null>(null);
  const [poolCards, setPoolCards] = useState<GiftCardPool[]>([]);
  const [poolPage, setPoolPage] = useState(0);
  const [poolTotalPages, setPoolTotalPages] = useState(0);
  
  // Eligible participants
  const [eligibleParticipants, setEligibleParticipants] = useState<EligibleParticipant[]>([]);
  
  // Sent gift cards
  const [sentGiftCards, setSentGiftCards] = useState<GiftCard[]>([]);
  const [sentPage, setSentPage] = useState(0);
  const [sentTotalPages, setSentTotalPages] = useState(0);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
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

  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (message && message.type === 'success') {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      
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
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin-login');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
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
    if (activeTab === 'pool') {
      fetchPoolData();
    } else if (activeTab === 'eligible') {
      fetchEligibleParticipants();
    } else if (activeTab === 'sent') {
      fetchSentGiftCards();
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
      const response = await api.getAvailableGiftCards(poolPage, 20);
      setPoolCards(response.content || []);
      setPoolTotalPages(response.totalPages || 0);
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
      const response = await api.getGiftCards({ page: sentPage, size: 20 });
      setSentGiftCards(response.content || []);
      setSentTotalPages(response.totalPages || 0);
    } catch (error) {
      console.error('Error fetching sent gift cards:', error);
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
      setMessage({ 
        type: 'success', 
        text: `Upload completed! ${result.successfulUploads} cards added, ${result.failedUploads} failed` 
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

  const handleSendGiftCard = async () => {
    if (!sendData.participantId || !sendData.cardCode || !sendData.redemptionUrl) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    try {
      await api.sendGiftCard(sendData.participantId, sendData);
      setMessage({ type: 'success', text: 'Gift card sent successfully!' });
      setShowSendModal(false);
      setSendData({
        participantId: '',
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
      await fetchEligibleParticipants();
      await fetchSentGiftCards();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send gift card' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePoolCard = async () => {
    if (!selectedItem) return;

    setLoading(true);
    try {
      await api.deleteGiftCardFromPool(selectedItem.id);
      setMessage({ type: 'success', text: 'Gift card deleted successfully!' });
      setShowDeleteModal(false);
      setSelectedItem(null);
      await fetchPoolStatus();
      await fetchPoolData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete gift card' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSentCard = async () => {
    if (!selectedItem) return;

    setLoading(true);
    try {
      await api.deleteGiftCard(selectedItem.id);
      setMessage({ type: 'success', text: 'Gift card deleted successfully!' });
      setShowDeleteModal(false);
      setSelectedItem(null);
      await fetchSentGiftCards();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete gift card' });
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
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar
        searchQuery={searchQuery}
        handleSearchChange={handleSearchChange}
        handleLogout={handleLogout}
        toggleUserDropdown={toggleUserDropdown}
        showDropdown={showUserDropdown}
        setShowDropdown={setShowUserDropdown}
        newUsersCount={0}
        markNotificationsAsSeen={() => {}}
        leftContent={<AdminNavigation currentPage="gift-cards" />}
        passedUsersCount={0}
        failedUsersCount={0}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
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
            </nav>
          </div>

          <div className="p-6">
            {/* Message */}
            {message && (
              <div className={`mb-4 p-4 rounded-md border ${
                message.type === 'success' 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-red-100 text-red-800 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {message.type === 'success' ? (
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className="font-medium">{message.text}</span>
                  </div>
                  <button
                    onClick={() => setMessage(null)}
                    className={`ml-4 text-sm hover:underline ${
                      message.type === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Gift Card Pool Tab */}
            {activeTab === 'pool' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Gift Card Pool</h2>
                  <div className="space-x-3">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Add Gift Card
                    </button>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Upload CSV
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
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
                          Batch
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
                        <tr key={card.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {card.cardCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {card.cardType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(card.cardValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {card.batchLabel}
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
                              className="text-red-600 hover:text-red-900"
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

            {/* Eligible Participants Tab */}
            {activeTab === 'eligible' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Eligible Participants</h2>
                  <p className="text-sm text-gray-600">
                    Participants who completed surveys and are eligible for gift cards
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
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
                        <tr key={participant.participantId}>
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
                                  participantId: participant.participantId
                                });
                                setShowSendModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
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

            {/* Sent Gift Cards Tab */}
            {activeTab === 'sent' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Sent Gift Cards</h2>
                  <p className="text-sm text-gray-600">
                    Gift cards that have been sent to participants
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
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
                        <tr key={card.id}>
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
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
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
        </div>
      </div>

      {/* Add Gift Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
                      <div className="bg-white border border-blue-200 rounded p-2">
                        <code className="text-xs text-gray-800 font-mono">
                          card_code, card_type, card_value, redemption_url, expires_at, notes
                        </code>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        <strong>Note:</strong> card_code, card_type, card_value, and redemption_url are required.
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Gift Card</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Card Code *</label>
                  <input
                    type="text"
                    value={sendData.cardCode}
                    onChange={(e) => setSendData({ ...sendData, cardCode: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="AMAZON-ABC123-XYZ789"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Card Type</label>
                  <select
                    value={sendData.cardType}
                    onChange={(e) => setSendData({ ...sendData, cardType: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700">Card Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sendData.cardValue}
                    onChange={(e) => setSendData({ ...sendData, cardValue: parseFloat(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Redemption URL *</label>
                  <input
                    type="text"
                    value={sendData.redemptionUrl}
                    onChange={(e) => setSendData({ ...sendData, redemptionUrl: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://amazon.com/gc/redeem?code=ABC123"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Method</label>
                  <select
                    value={sendData.deliveryMethod}
                    onChange={(e) => setSendData({ ...sendData, deliveryMethod: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="EMAIL">Email Only</option>
                    <option value="SMS">SMS Only</option>
                    <option value="BOTH">Both Email & SMS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={sendData.notes}
                    onChange={(e) => setSendData({ ...sendData, notes: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendGiftCard}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Gift Card'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this gift card? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={activeTab === 'pool' ? handleDeletePoolCard : handleDeleteSentCard}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default GiftCardManagement;
