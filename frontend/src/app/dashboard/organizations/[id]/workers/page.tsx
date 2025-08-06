'use client';

/**
 * WORKERS PAGE - BACKEND INTEGRATION GUIDE
 * 
 * This page currently uses MOCK DATA and needs proper backend integration.
 * 
 * CURRENT STATE:
 * ✅ Organization membership: Real blockchain data
 * ❌ Worker profiles: Mock data (skills, stats, availability)
 * ❌ Performance metrics: Random generated data
 * ❌ Contract assignments: Mock contract data
 * 
 * REQUIRED BACKEND INTEGRATION:
 * 
 * 1. USER PROFILE API
 *    - Endpoint: GET /api/users/profiles?addresses=addr1,addr2,addr3
 *    - Data: { skills: string[], availability: status, bio: string, hourlyRate: number }
 * 
 * 2. PERFORMANCE STATS API  
 *    - Endpoint: GET /api/users/stats?addresses=addr1,addr2,addr3
 *    - Data: Calculate from completed contracts in database
 *    - Metrics: totalContracts, completedContracts, totalEarned, averageRating, onTimeDelivery
 * 
 * 3. CONTRACT ASSIGNMENT API
 *    - Endpoint: GET /api/contracts?org_id=${orgId}&status=active
 *    - Data: Available contracts that can be assigned to workers
 *    - Actions: POST /api/contracts/${contractId}/assign { workerId, assignedBy }
 * 
 * 4. ACTIVITY TRACKING
 *    - Track when users are online/offline
 *    - Store last activity timestamps
 *    - Update availability status
 * 
 * DATA ARCHITECTURE SEPARATION:
 * 📦 BLOCKCHAIN (Smart Contracts):
 *    - Organization membership and roles
 *    - Escrow contract creation and payments
 *    - Milestone approvals and releases
 *    - Dispute resolution
 * 
 * 🗄️ DATABASE (Backend):
 *    - User profiles (name, bio, skills, contact info)
 *    - Performance statistics and ratings
 *    - Contract history and reviews
 *    - Availability status and activity logs
 *    - Search indexes and cached data
 */

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import { useOrganizations, Organization, OrganizationMember } from '@/hooks/useOrganizations';
import { 
  ArrowLeft,
  Users, 
  UserPlus,
  Building,
  Crown,
  Shield,
  Calendar,
  Search,
  Filter,
  MoreVertical,
  UserCheck,
  UserX,
  Briefcase,
  Star,
  TrendingUp,
  Award,
  Clock
} from 'lucide-react';

interface WorkerStats {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalEarned: number;
  averageRating: number;
  onTimeDelivery: number;
}

interface WorkerProfile extends OrganizationMember {
  stats: WorkerStats;
  skills: string[];
  availability: 'available' | 'busy' | 'unavailable';
  lastActive: number;
}

export default function WorkersPage() {
  const router = useRouter();
  const params = useParams();
  const { isSignedIn, loading } = useStacks();
  const { organizations, loadMembers } = useOrganizations();
  
  const orgId = parseInt(params.id as string);
  const organization = organizations.find(org => org.id === orgId);
  
  const [mounted, setMounted] = useState(false);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSkill, setFilterSkill] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<number | null>(null);
  const [workerToAssign, setWorkerToAssign] = useState<WorkerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Load actual contracts from blockchain/backend when implemented
  // These contracts will be fetched from the blockchain (active escrows) 
  // and matched with organization members for assignment
  const [availableContracts] = useState([
    // MOCK DATA - Remove when backend is implemented
    // Real implementation: GET /api/contracts?org_id=${orgId}&status=active
    {
      id: 1,
      title: "Mobile App Development",
      description: "React Native app for food delivery",
      budget: 5000,
      deadline: new Date('2025-02-15'),
      skills: ['React Native', 'TypeScript', 'API Integration'],
      priority: 'high' as const
    },
    {
      id: 2,
      title: "Website Redesign",
      description: "Modern UI/UX for corporate website",
      budget: 3000,
      deadline: new Date('2025-02-28'),
      skills: ['UI/UX Design', 'React', 'TailwindCSS'],
      priority: 'medium' as const
    }
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !isSignedIn) {
      router.push('/');
    }
  }, [isSignedIn, loading, router, mounted]);

  useEffect(() => {
    if (organization && mounted) {
      loadWorkersData();
    }
  }, [organization, mounted]);

  const loadWorkersData = async () => {
    setIsLoading(true);
    try {
      if (!organization) return;
      
      const members = await loadMembers(organization.id);
      
      // TODO: BACKEND INTEGRATION REQUIRED
      // This function will need to be replaced with proper backend API calls:
      // 
      // 1. GET /api/users/profiles - Get user profiles with skills, availability, etc.
      // 2. GET /api/users/stats - Calculate performance stats from completed contracts
      // 3. GET /api/contracts/history - Get user's contract history for ratings
      //
      // Data Architecture:
      // - Blockchain: Organization membership, contract escrows, payments
      // - Database: User profiles, skills, ratings, performance metrics, availability
      //
      // Real API call structure:
      // const profilesResponse = await fetch(`/api/users/profiles?addresses=${memberAddresses.join(',')}`);
      // const statsResponse = await fetch(`/api/users/stats?addresses=${memberAddresses.join(',')}`);
      
      const workerProfiles: WorkerProfile[] = members.map(member => ({
        ...member,
        // MOCK STATS - Replace with backend calculation
        stats: {
          totalContracts: Math.floor(Math.random() * 20) + 5,        // From contract history
          activeContracts: Math.floor(Math.random() * 5) + 1,        // From active escrows
          completedContracts: Math.floor(Math.random() * 15) + 3,    // From completed escrows
          totalEarned: Math.floor(Math.random() * 50000) + 10000,    // Sum of received payments
          averageRating: 4 + Math.random(),                          // Average from contract reviews
          onTimeDelivery: 85 + Math.random() * 10                    // % delivered on time
        },
        // MOCK SKILLS - Replace with user profile data
        skills: generateRandomSkills(),      // From user profile: skills[] array
        // MOCK AVAILABILITY - Replace with user status
        availability: generateRandomAvailability(),  // From user profile: current status
        lastActive: Date.now() - Math.floor(Math.random() * 86400000 * 7) // From user activity log
      }));
      
      setWorkers(workerProfiles);
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // MOCK DATA GENERATORS - Remove when backend is implemented
  // These simulate what will come from the backend database
  const generateRandomSkills = (): string[] => {
    // TODO: Replace with backend API call to user profile
    // Real implementation: user.profile.skills from database
    const allSkills = [
      'React', 'TypeScript', 'Node.js', 'Python', 'UI/UX Design', 
      'React Native', 'Smart Contracts', 'Blockchain', 'API Integration',
      'TailwindCSS', 'PostgreSQL', 'AWS', 'DevOps', 'Testing'
    ];
    
    const count = Math.floor(Math.random() * 5) + 2;
    return allSkills.sort(() => 0.5 - Math.random()).slice(0, count);
  };

  const generateRandomAvailability = (): 'available' | 'busy' | 'unavailable' => {
    // TODO: Replace with backend API call to user status
    // Real implementation: user.profile.availability from database
    const statuses = ['available', 'busy', 'unavailable'] as const;
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  // Handle contract assignment
  const handleAssignContract = async () => {
    if (!selectedContract || !workerToAssign) {
      alert('Please select both a contract and worker');
      return;
    }

    try {
      // TODO: Implement actual assignment logic
      // This would call the backend API to assign the contract
      console.log('Assigning contract', selectedContract, 'to worker', workerToAssign.address);
      
      // Mock assignment - In real implementation, this would be:
      // await fetch(`/api/contracts/${selectedContract}/assign`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     workerId: workerToAssign.address,
      //     assignedBy: userAddress,
      //     organizationId: orgId
      //   })
      // });

      alert(`Contract assigned successfully to ${workerToAssign.address.slice(0, 8)}...`);
      
      // Reset state
      setSelectedContract(null);
      setWorkerToAssign(null);
      setShowAssignModal(false);
      
    } catch (error) {
      console.error('Assignment failed:', error);
      alert('Failed to assign contract. Please try again.');
    }
  };

  // Open assignment modal with specific worker
  const openAssignModal = (worker?: WorkerProfile) => {
    setWorkerToAssign(worker || null);
    setSelectedContract(null);
    setShowAssignModal(true);
  };

  const filteredWorkers = workers.filter(worker => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!worker.address.toLowerCase().includes(searchLower) && 
          !worker.skills.some(skill => skill.toLowerCase().includes(searchLower))) {
        return false;
      }
    }
    
    if (filterSkill !== 'all' && !worker.skills.includes(filterSkill)) {
      return false;
    }
    
    if (filterAvailability !== 'all' && worker.availability !== filterAvailability) {
      return false;
    }
    
    return true;
  });

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUniqueSkills = () => {
    const allSkills = new Set<string>();
    workers.forEach(worker => {
      worker.skills.forEach(skill => allSkills.add(skill));
    });
    return Array.from(allSkills).sort();
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workers...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Organization Not Found</h2>
          <p className="text-gray-600 mb-6">The organization you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard/organizations')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Back to Organizations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/dashboard/organizations')}
              className="flex items-center text-orange-600 hover:text-orange-700 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Organizations
            </button>
          </div>
          
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
                  <p className="text-gray-600">Worker Management & Assignment</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => openAssignModal()}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              Assign Contract
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search workers or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-full"
              />
            </div>

            <select
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Skills</option>
              {getUniqueSkills().map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>

            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Availability</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        </div>

        {/* Workers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))
          ) : filteredWorkers.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Workers Found</h3>
              <p className="text-gray-600">
                {searchTerm ? `No workers match your search criteria` : `No workers in this organization yet`}
              </p>
            </div>
          ) : (
            filteredWorkers.map((worker) => (
              <motion.div
                key={worker.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedWorker(worker)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">
                        {formatAddress(worker.address)}
                      </span>
                      {getRoleIcon(worker.role)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(worker.availability)}`}>
                        {worker.availability}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {worker.role}
                      </span>
                    </div>
                  </div>
                  
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span>{worker.stats.averageRating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      <span>{worker.stats.activeContracts} active</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{worker.stats.onTimeDelivery.toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(worker.stats.totalEarned)} earned
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {worker.skills.slice(0, 3).map(skill => (
                      <span key={skill} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {skill}
                      </span>
                    ))}
                    {worker.skills.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                        +{worker.skills.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last active {formatDate(worker.lastActive)}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Worker Detail Modal */}
      <AnimatePresence>
        {selectedWorker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedWorker(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Worker Profile
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-600">
                      {selectedWorker.address}
                    </span>
                    {getRoleIcon(selectedWorker.role)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWorker(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Performance Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Contracts:</span>
                      <span className="font-medium">{selectedWorker.stats.totalContracts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">{selectedWorker.stats.completedContracts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Rating:</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="font-medium">{selectedWorker.stats.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">On-time Delivery:</span>
                      <span className="font-medium">{selectedWorker.stats.onTimeDelivery.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Earned:</span>
                      <span className="font-medium">{formatCurrency(selectedWorker.stats.totalEarned)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Skills & Availability</h4>
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getAvailabilityColor(selectedWorker.availability)}`}>
                      {selectedWorker.availability}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.skills.map(skill => (
                      <span key={skill} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedWorker(null)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const worker = selectedWorker;
                    setSelectedWorker(null);
                    openAssignModal(worker);
                  }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  Assign Contract
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contract Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Assign Contract to Worker
                  </h3>
                  {workerToAssign && (
                    <p className="text-sm text-gray-600">
                      Assigning to: <span className="font-mono">{workerToAssign.address.slice(0, 8)}...</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              {availableContracts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>No contracts available for assignment</p>
                  <p className="text-sm mt-2">Create some contracts first to assign them to workers</p>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {availableContracts.map(contract => (
                    <div 
                      key={contract.id} 
                      onClick={() => setSelectedContract(contract.id)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedContract === contract.id 
                          ? 'border-orange-500 bg-orange-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{contract.title}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        contract.priority === 'high' ? 'bg-red-100 text-red-800' :
                        contract.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {contract.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{contract.description}</p>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex gap-4">
                        <span className="font-medium">{formatCurrency(contract.budget)}</span>
                        <span className="text-gray-500">Due: {contract.deadline.toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {contract.skills.slice(0, 2).map(skill => (
                          <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignContract}
                  disabled={!selectedContract || !workerToAssign}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedContract && workerToAssign
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {selectedContract && workerToAssign 
                    ? 'Assign Selected Contract' 
                    : 'Select Contract & Worker'
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}