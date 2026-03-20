'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { API_URL } from '@/config/api.config';
import toast from 'react-hot-toast';


interface DashboardOverview {
  users: {
    total: number;
    newToday: number;
    growthRate: string;
  };
  messages: {
    firstTimeToday: number;
    aiMessagesToday: number;
    importantToday: number;
  };
  feedback: {
    total: number;
    averageRating: number;
    newToday: number;
  };
  broadcasts: {
    total: number;
    sentToday: number;
    totalRecipients: number;
  };
  profileVisits: {
    total: number;
    unique: number;
    visitsToday: number;
  };
}

interface UserAnalytics {
  totalUsers: number;
  newSignupsToday: number;
  newSignupsYesterday: number;
  weeklySignups: number;
  monthlySignups: number;
  growthRate: string;
  dailySignups: Array<{
    date: string;
    count: number;
  }>;
}

interface FirstTimeMessagesAnalytics {
  totalFirstTimeMessages: number;
  firstTimeMessagesToday: number;
  firstTimeMessagesYesterday: number;
  weeklyFirstTimeMessages: number;
  dailyFirstTimeMessages: Array<{
    date: string;
    count: number;
  }>;
}

interface AIMessagesAnalytics {
  totalAIMessages: number;
  totalAIConversations: number;
  aiMessagesToday: number;
  aiMessagesYesterday: number;
  aiConversationsToday: number;
  dailyAIMessages: Array<{
    date: string;
    regularAI: number;
    aiChat: number;
    total: number;
  }>;
}

interface FeedbackAnalytics {
  totalFeedback: number;
  feedbackToday: number;
  feedbackThisWeek: number;
  feedbackThisMonth: number;
  averageRating: number;
  ratingDistribution: Array<{
    _id: number;
    count: number;
  }>;
  statusDistribution: Array<{
    _id: string;
    count: number;
  }>;
  recentFeedback: Array<{
    id: string;
    rating: number;
    message: string;
    status: string;
    user?: {
      name: string;
      email: string;
      username: string;
    };
    email?: string;
    createdAt: string;
  }>;
}

interface BroadcastAnalytics {
  totalBroadcasts: number;
  broadcastsToday: number;
  broadcastsYesterday: number;
  weeklyBroadcasts: number;
  totalRecipients: number;
  dailyBroadcasts: Array<{
    date: string;
    broadcasts: number;
    recipients: number;
  }>;
  recentBroadcasts: Array<{
    id: string;
    message: string;
    recipientCount: number;
    sender: {
      name: string;
      username: string;
    };
    createdAt: string;
  }>;
}

interface ProfileVisitAnalytics {
  totalVisits: number;
  uniqueVisits: number;
  visitsToday: number;
  uniqueVisitsToday: number;
  visitsYesterday: number;
  weeklyVisits: number;
  growthRate: string;
  dailyVisits: Array<{
    date: string;
    total: number;
    unique: number;
  }>;
  mostVisitedProfiles: Array<{
    user: {
      username: string;
      displayName: string;
    };
    totalVisits: number;
    uniqueVisits: number;
  }>;
  platformStats: Array<{
    _id: string;
    count: number;
  }>;
}

interface ImportantMessageAnalytics {
  totalImportantMessages: number;
  importantMessagesToday: number;
  importantMessagesYesterday: number;
  weeklyImportantMessages: number;
  emailNotificationsSent: number;
  growthRate: string;
  dailyImportantMessages: Array<{
    date: string;
    total: number;
    emailsSent: number;
  }>;
  detectionMethodStats: Array<{
    _id: string;
    count: number;
  }>;
  keywordStats: Array<{
    keyword: string;
    count: number;
  }>;
}

interface RecentSignups {
  totalRecentSignups: number;
  dailySignups: Array<{
    date: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
      displayName: string;
      username: string;
      email: string;
      avatar: string;
      createdAt: string;
    }>;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    displayName: string;
    username: string;
    email: string;
    avatar: string;
    createdAt: string;
  }>;
}

interface BackgroundStats {
  totalBackgrounds: number;
  adminBackgrounds: number;
  userBackgrounds: number;
  activeBackgrounds: number;
  inactiveBackgrounds: number;
}

interface Background {
  id: string;
  url: string;
  thumbnail: string;
  name: string;
  type: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    email: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  
  // Analytics data
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [firstTimeMessages, setFirstTimeMessages] = useState<FirstTimeMessagesAnalytics | null>(null);
  const [aiMessages, setAIMessages] = useState<AIMessagesAnalytics | null>(null);
  const [feedback, setFeedback] = useState<FeedbackAnalytics | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastAnalytics | null>(null);
  const [profileVisits, setProfileVisits] = useState<ProfileVisitAnalytics | null>(null);
  const [importantMessages, setImportantMessages] = useState<ImportantMessageAnalytics | null>(null);
  const [recentSignups, setRecentSignups] = useState<RecentSignups | null>(null);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [backgroundStats, setBackgroundStats] = useState<BackgroundStats | null>(null);
  
  // Broadcast form state
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    actionUrl: '',
    actionLabel: '',
    sendToAll: true,
    selectedUsers: [] as string[]
  });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [privilegeUsers, setPrivilegeUsers] = useState<any[]>([]);
  const [privilegeSearchQuery, setPrivilegeSearchQuery] = useState('');
  const [filteredPrivilegeUsers, setFilteredPrivilegeUsers] = useState<any[]>([]);
  
  // Users tab search
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [filteredAllUsers, setFilteredAllUsers] = useState<any[]>([]);

  // Background form state
  const [backgroundForm, setBackgroundForm] = useState({
    url: '',
    name: '',
    thumbnail: ''
  });
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [editingBackground, setEditingBackground] = useState<Background | null>(null);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    console.log('Admin page - currentUser:', currentUser);
    console.log('Admin page - localStorage token:', localStorage.getItem('token'));
    
    // Check if user is authenticated via token, not just currentUser state
    const token = localStorage.getItem('token');
    
    if (!token && !currentUser) {
      console.log('No token and no current user, showing login form');
      setShowLoginForm(true);
      setLoading(false);
      return;
    }

    // Check if the current user is the admin
    const adminEmail = 'travorproject@gmail.com';
    if (currentUser && currentUser.email !== adminEmail) {
      console.log('User is not admin, showing login form');
      logout(); // Clear the current user session
      setShowLoginForm(true);
      setLoading(false);
      toast.error('Access denied. Admin privileges required.');
      return;
    }

    console.log('User authenticated or has token, loading admin overview');
    loadOverview();
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      console.log('Attempting login with:', { email: loginForm.email, password: loginForm.password });
      
      // Use a direct fetch call to avoid the interceptor redirect
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });

      console.log('Login response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Login error response:', errorData);
        throw new Error(errorData.message || 'Login failed');
      }

      const { token, user } = await response.json();
      console.log('Login successful, received token and user:', { token: !!token, user });
      
      // Store token and update auth state
      localStorage.setItem('token', token);
      setAuth(user, token);
      
      // Hide login form and load admin data
      setShowLoginForm(false);
      toast.success('Logged in successfully');
      
      // Load admin overview
      loadOverview();
      
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    setShowLoginForm(true);
    setOverview(null);
    setUserAnalytics(null);
    setFirstTimeMessages(null);
    setAIMessages(null);
    setFeedback(null);
    setBroadcasts(null);
    setProfileVisits(null);
    setImportantMessages(null);
  };

  const loadAllUsers = async () => {
    try {
      // We'll need to create an endpoint to get all users for admin
      const response = await api.get('/admin/users');
      setAllUsers(response.data);
      setFilteredUsers(response.data);
      setFilteredAllUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleUsersSearch = (query: string) => {
    setUsersSearchQuery(query);
    if (!query.trim()) {
      setFilteredAllUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(query.toLowerCase())) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredAllUsers(filtered);
    }
  };

  const loadRecentSignups = async () => {
    try {
      const response = await api.get('/admin/recent-signups');
      setRecentSignups(response.data);
    } catch (error) {
      console.error('Failed to load recent signups:', error);
    }
  };

  const loadBackgrounds = async () => {
    try {
      const response = await api.get('/admin/backgrounds');
      setBackgrounds(response.data);
    } catch (error) {
      console.error('Failed to load backgrounds:', error);
    }
  };

  const loadBackgroundStats = async () => {
    try {
      const response = await api.get('/admin/backgrounds/stats');
      setBackgroundStats(response.data);
    } catch (error) {
      console.error('Failed to load background stats:', error);
    }
  };

  const handleCreateBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadMode === 'url') {
      if (!backgroundForm.url.trim()) {
        toast.error('Please enter a background URL');
        return;
      }
    } else {
      if (!selectedFile) {
        toast.error('Please select a file to upload');
        return;
      }
    }

    setBackgroundLoading(true);
    try {
      let response;
      
      if (uploadMode === 'url') {
        response = await api.post('/admin/backgrounds', {
          url: backgroundForm.url.trim(),
          name: backgroundForm.name.trim() || 'Admin Background',
          thumbnail: backgroundForm.thumbnail.trim() || backgroundForm.url.trim()
        });
      } else {
        if (!selectedFile) {
          toast.error('Please select a file to upload');
          return;
        }
        const formData = new FormData();
        formData.append('background', selectedFile);
        formData.append('name', backgroundForm.name.trim() || 'Admin Background');

        response = await api.post('/admin/backgrounds/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      toast.success(response.data.message);
      resetBackgroundForm();
      loadBackgrounds();
      loadBackgroundStats();
    } catch (error: any) {
      console.error('Failed to create background:', error);
      toast.error(error.response?.data?.message || 'Failed to create background');
    } finally {
      setBackgroundLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const resetBackgroundForm = () => {
    setBackgroundForm({ url: '', name: '', thumbnail: '' });
    setSelectedFile(null);
    setPreviewUrl('');
    setEditingBackground(null);
    
    // Reset file input
    const fileInput = document.getElementById('bg-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUpdateBackground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBackground) return;

    setBackgroundLoading(true);
    try {
      const response = await api.put(`/admin/backgrounds/${editingBackground.id}`, {
        url: backgroundForm.url.trim(),
        name: backgroundForm.name.trim(),
        thumbnail: backgroundForm.thumbnail.trim(),
        isActive: editingBackground.isActive
      });

      toast.success(response.data.message);
      setEditingBackground(null);
      setBackgroundForm({ url: '', name: '', thumbnail: '' });
      loadBackgrounds();
    } catch (error: any) {
      console.error('Failed to update background:', error);
      toast.error(error.response?.data?.message || 'Failed to update background');
    } finally {
      setBackgroundLoading(false);
    }
  };

  const handleDeleteBackground = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await api.delete(`/admin/backgrounds/${id}`);
      toast.success(response.data.message);
      loadBackgrounds();
      loadBackgroundStats();
    } catch (error: any) {
      console.error('Failed to delete background:', error);
      toast.error(error.response?.data?.message || 'Failed to delete background');
    }
  };

  const handleToggleBackgroundStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await api.put(`/admin/backgrounds/${id}`, {
        isActive: !currentStatus
      });
      toast.success(`Background ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadBackgrounds();
      loadBackgroundStats();
    } catch (error: any) {
      console.error('Failed to toggle background status:', error);
      toast.error(error.response?.data?.message || 'Failed to update background');
    }
  };

  const startEditBackground = (background: Background) => {
    setEditingBackground(background);
    setUploadMode('url'); // Always use URL mode for editing
    setBackgroundForm({
      url: background.url,
      name: background.name,
      thumbnail: background.thumbnail
    });
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const cancelEditBackground = () => {
    resetBackgroundForm();
  };

  const handleUserSearch = (query: string) => {
    setUserSearchQuery(query);
    if (!query.trim()) {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(query.toLowerCase())) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  const loadPrivilegeUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setPrivilegeUsers(response.data);
      setFilteredPrivilegeUsers(response.data);
    } catch (error) {
      console.error('Failed to load privilege users:', error);
    }
  };

  const handlePrivilegeSearch = (query: string) => {
    setPrivilegeSearchQuery(query);
    if (!query.trim()) {
      setFilteredPrivilegeUsers(privilegeUsers);
    } else {
      const filtered = privilegeUsers.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(query.toLowerCase())) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPrivilegeUsers(filtered);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, username: string) => {
    if (!confirm(`⚠️ WARNING: This will permanently delete ${userName} (@${username}) and ALL their data including:\n\n• Messages and conversations\n• Statuses and posts\n• Followers and following relationships\n• Notifications\n• Broadcasts\n• Links and profile visits\n\nThis action CANNOT be undone!\n\nType "DELETE" to confirm:`)) {
      return;
    }

    const confirmation = prompt('Type "DELETE" to confirm permanent deletion:');
    if (confirmation !== 'DELETE') {
      toast.error('Deletion cancelled - confirmation text did not match');
      return;
    }

    try {
      const response = await api.delete(`/admin/users/${userId}`);
      toast.success(response.data.message);
      
      // Refresh the users list
      loadUserAnalytics();
      loadAllUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleResetBroadcastPrivileges = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to reset broadcast privileges for ${userName}? This will give them 2 new broadcasts.`)) {
      return;
    }

    try {
      const response = await api.post(`/admin/users/${userId}/reset-broadcast-privileges`);
      toast.success(response.data.message);
      
      // Refresh the privilege users list
      loadPrivilegeUsers();
    } catch (error: any) {
      console.error('Failed to reset broadcast privileges:', error);
      toast.error(error.response?.data?.message || 'Failed to reset broadcast privileges');
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) {
      return;
    }

    try {
      await api.delete(`/broadcasts/${broadcastId}`);
      toast.success('Broadcast deleted successfully');
      
      // Refresh broadcast analytics
      if (broadcasts) {
        loadBroadcasts();
      }
    } catch (error: any) {
      console.error('Failed to delete broadcast:', error);
      toast.error(error.response?.data?.message || 'Failed to delete broadcast');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    if (!broadcastForm.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setBroadcastLoading(true);
    try {
      const payload = {
        message: broadcastForm.message.trim(),
        ...(broadcastForm.title.trim() && { title: broadcastForm.title.trim() }),
        ...(broadcastForm.actionUrl.trim() && { actionUrl: broadcastForm.actionUrl.trim() }),
        ...(broadcastForm.actionLabel.trim() && { actionLabel: broadcastForm.actionLabel.trim() }),
        ...((!broadcastForm.sendToAll) && { userIds: broadcastForm.selectedUsers })
      };

      // Use admin broadcast endpoint
      const response = await api.post('/broadcasts/admin', payload);

      toast.success(`Admin broadcast sent to ${response.data.recipientCount} users!`);
      setBroadcastForm({ 
        title: '', 
        message: '', 
        actionUrl: '', 
        actionLabel: '', 
        sendToAll: true, 
        selectedUsers: [] 
      });
      
      // Refresh broadcast analytics if loaded
      if (broadcasts) {
        loadBroadcasts();
      }
    } catch (error: any) {
      console.error('Failed to send admin broadcast:', error);
      toast.error(error.response?.data?.message || 'Failed to send admin broadcast');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const loadOverview = async () => {
    console.log('Loading admin overview...');
    try {
      console.log('Making API call to /admin/dashboard');
      const response = await api.get('/admin/dashboard');
      console.log('Admin dashboard response:', response.data);
      setOverview(response.data);
    } catch (error: any) {
      console.error('Failed to load admin overview:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 403) {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
      } else if (error.response?.status === 401) {
        toast.error('Please log in to access admin dashboard.');
        router.push('/login');
      } else {
        toast.error('Failed to load admin dashboard');
        console.error('Admin dashboard error:', error.response?.data || error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUserAnalytics = async () => {
    try {
      const response = await api.get('/admin/analytics/users');
      setUserAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load user analytics');
    }
  };

  const loadFirstTimeMessages = async () => {
    try {
      const response = await api.get('/admin/analytics/first-time-messages');
      setFirstTimeMessages(response.data);
    } catch (error) {
      toast.error('Failed to load first-time messages analytics');
    }
  };

  const loadAIMessages = async () => {
    try {
      const response = await api.get('/admin/analytics/ai-messages');
      setAIMessages(response.data);
    } catch (error) {
      toast.error('Failed to load AI messages analytics');
    }
  };

  const loadFeedback = async () => {
    try {
      const response = await api.get('/admin/analytics/feedback');
      setFeedback(response.data);
    } catch (error) {
      toast.error('Failed to load feedback analytics');
    }
  };

  const loadBroadcasts = async () => {
    try {
      const response = await api.get('/admin/analytics/broadcasts');
      setBroadcasts(response.data);
    } catch (error) {
      toast.error('Failed to load broadcast analytics');
    }
  };

  const loadImportantMessages = async () => {
    try {
      const response = await api.get('/admin/analytics/important-messages');
      setImportantMessages(response.data);
    } catch (error) {
      toast.error('Failed to load important messages analytics');
    }
  };

  const loadProfileVisits = async () => {
    try {
      const response = await api.get('/admin/analytics/profile-visits');
      setProfileVisits(response.data);
    } catch (error) {
      toast.error('Failed to load profile visit analytics');
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Load data for the selected tab
    switch (tab) {
      case 'users':
        if (!userAnalytics) loadUserAnalytics();
        if (allUsers.length === 0) loadAllUsers();
        if (!recentSignups) loadRecentSignups();
        break;
      case 'messages':
        if (!firstTimeMessages) loadFirstTimeMessages();
        break;
      case 'ai':
        if (!aiMessages) loadAIMessages();
        break;
      case 'feedback':
        if (!feedback) loadFeedback();
        break;
      case 'broadcasts':
        if (!broadcasts) loadBroadcasts();
        break;
      case 'send-broadcast':
        if (allUsers.length === 0) loadAllUsers();
        // Reset search when switching to this tab
        setUserSearchQuery('');
        setFilteredUsers(allUsers);
        break;
      case 'manage-privileges':
        if (privilegeUsers.length === 0) loadPrivilegeUsers();
        break;
      case 'important':
        if (!importantMessages) loadImportantMessages();
        break;
      case 'visits':
        if (!profileVisits) loadProfileVisits();
        break;
      case 'appearances':
        if (backgrounds.length === 0) loadBackgrounds();
        if (!backgroundStats) loadBackgroundStats();
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-900 rounded-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Admin Login</h1>
              <p className="text-gray-400">Access the admin dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter admin email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter admin password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
              >
                {loginLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Logging in...
                  </>
                ) : (
                  'Login to Admin Dashboard'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                Default credentials are pre-filled for convenience
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='h-screen bg-black '>
    <div className="bg-black text-white ">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8 h-[100%]">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm sm:text-base">Platform analytics and insights</p>
          </div>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 sm:gap-2 mb-6 sm:mb-8 border-b border-gray-800 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: 'Users' },
            { id: 'messages', label: 'First Messages' },
            { id: 'ai', label: 'AI Messages' },
            { id: 'feedback', label: 'Feedback' },
            { id: 'broadcasts', label: 'Broadcasts' },
            { id: 'send-broadcast', label: 'Send Broadcast' },
            { id: 'manage-privileges', label: 'Manage Privileges' },
            { id: 'important', label: 'Important Messages' },
            { id: 'visits', label: 'Profile Visits' },
            { id: 'appearances', label: 'Appearances' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-2 sm:px-4 py-2 rounded-t-lg font-medium transition text-xs sm:text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6 h-[100%]">
          {activeTab === 'overview' && overview && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Users Card */}
              <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Users</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Total Users:</span>
                    <span className="font-bold text-sm sm:text-base">{overview.users.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">New Today:</span>
                    <span className="font-bold text-green-400 text-sm sm:text-base">+{overview.users.newToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Growth Rate:</span>
                    <span className={`font-bold text-sm sm:text-base ${parseFloat(overview.users.growthRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {overview.users.growthRate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages Card */}
              <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-purple-400">Messages</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">First Messages Today:</span>
                    <span className="font-bold text-sm sm:text-base">{overview.messages.firstTimeToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">AI Messages Today:</span>
                    <span className="font-bold text-blue-400 text-sm sm:text-base">{overview.messages.aiMessagesToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Important Today:</span>
                    <span className="font-bold text-red-400 text-sm sm:text-base">{overview.messages.importantToday}</span>
                  </div>
                </div>
              </div>

              {/* Feedback Card */}
              <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-yellow-400">Feedback</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Total Feedback:</span>
                    <span className="font-bold text-sm sm:text-base">{overview.feedback.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Average Rating:</span>
                    <span className="font-bold text-yellow-400 text-sm sm:text-base">{overview.feedback.averageRating}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">New Today:</span>
                    <span className="font-bold text-green-400 text-sm sm:text-base">+{overview.feedback.newToday}</span>
                  </div>
                </div>
              </div>

              {/* Broadcasts Card */}
              <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-pink-400">Broadcasts</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Total Broadcasts:</span>
                    <span className="font-bold text-sm sm:text-base">{overview.broadcasts.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Sent Today:</span>
                    <span className="font-bold text-green-400 text-sm sm:text-base">+{overview.broadcasts.sentToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Total Recipients:</span>
                    <span className="font-bold text-sm sm:text-base">{overview.broadcasts.totalRecipients.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Profile Visits Card */}
              <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4 text-green-400">Profile Visits</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Total Visits:</span>
                    <span className="font-bold text-sm sm:text-base">{Math.floor(overview.profileVisits.total / 2).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Unique Visits:</span>
                    <span className="font-bold text-blue-400 text-sm sm:text-base">{Math.floor(overview.profileVisits.unique / 2).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Visits Today:</span>
                    <span className="font-bold text-green-400 text-sm sm:text-base">+{Math.floor(overview.profileVisits.visitsToday / 2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-blue-400">User Management</h3>
                <button
                  onClick={() => {
                    loadUserAnalytics();
                    loadAllUsers();
                    loadRecentSignups();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition"
                >
                  Refresh Users
                </button>
              </div>
              
              {userAnalytics ? (
                <div className="space-y-6">
                  {/* User Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Total Users</h4>
                      <p className="text-2xl font-bold">{userAnalytics.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">New Today</h4>
                      <p className="text-2xl font-bold text-green-400">+{userAnalytics.newSignupsToday}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">This Week</h4>
                      <p className="text-2xl font-bold text-blue-400">+{userAnalytics.weeklySignups}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Growth Rate</h4>
                      <p className={`text-2xl font-bold ${parseFloat(userAnalytics.growthRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {userAnalytics.growthRate}%
                      </p>
                    </div>
                  </div>

                  {/* Recent Signups Component */}
                  {recentSignups && (
                    <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                      <h4 className="text-lg font-semibold mb-4 text-green-400">Recent Signups (Last 10 Days)</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Daily Chart */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-300 mb-3">Daily Signups</h5>
                          <div className="space-y-2">
                            {recentSignups.dailySignups.map((day) => (
                              <div key={day.date} className="flex items-center justify-between">
                                <span className="text-gray-400 text-xs sm:text-sm">{new Date(day.date).toLocaleDateString()}</span>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="bg-green-600 h-2 rounded"
                                    style={{ width: `${Math.max(day.count * 20, 4)}px` }}
                                  />
                                  <span className="font-bold w-6 sm:w-8 text-right text-xs sm:text-sm">{day.count}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recent Users List */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-300 mb-3">Latest Signups</h5>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {recentSignups.recentUsers.map((user) => (
                              <div key={user.id} className="flex items-center gap-2 sm:gap-3 bg-gray-800 rounded-lg p-2 sm:p-3">
                                <img
                                  src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                                  alt={user.name}
                                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-xs sm:text-sm font-medium truncate">{user.displayName || user.name}</p>
                                  <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Users List */}
                  <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                      <h4 className="text-lg font-semibold">All Users</h4>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={usersSearchQuery}
                            onChange={(e) => handleUsersSearch(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Search users..."
                          />
                          <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-400 text-center sm:text-left">
                          {filteredAllUsers.length} of {allUsers.length} users
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {filteredAllUsers.length > 0 ? (
                        filteredAllUsers.map((user) => (
                          <div key={user.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                            {/* Mobile Layout */}
                            <div className="block sm:hidden">
                              <div className="flex items-center gap-3 mb-3">
                                <img
                                  src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                                  alt={user.name}
                                  className="w-12 h-12 rounded-full"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-white font-semibold truncate">{user.displayName || user.name}</h4>
                                  <p className="text-gray-400 text-sm truncate">@{user.username}</p>
                                  <p className="text-gray-500 text-xs truncate">{user.email}</p>
                                  {user.createdAt && (
                                    <p className="text-gray-500 text-xs">
                                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Stats Row */}
                              <div className="grid grid-cols-3 gap-4 mb-3 text-center">
                                <div>
                                  <p className="text-xs text-gray-400">Followers</p>
                                  <p className="text-sm font-bold text-blue-400">{user.followersCount || 0}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Following</p>
                                  <p className="text-sm font-bold text-green-400">{user.followingCount || 0}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Broadcasts</p>
                                  <p className={`text-sm font-bold ${(user.yearlyBroadcastCount || 0) >= 2 ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {user.yearlyBroadcastCount || 0}/2
                                  </p>
                                </div>
                              </div>
                              
                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteUser(user.id, user.displayName || user.name, user.username)}
                                className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete User
                              </button>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden sm:flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <img
                                  src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                                  alt={user.name}
                                  className="w-12 h-12 rounded-full"
                                />
                                <div>
                                  <h4 className="text-white font-semibold">{user.displayName || user.name}</h4>
                                  <p className="text-gray-400 text-sm">@{user.username}</p>
                                  <p className="text-gray-500 text-xs">{user.email}</p>
                                  {user.createdAt && (
                                    <p className="text-gray-500 text-xs">
                                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-center">
                                  <p className="text-sm text-gray-400">Followers</p>
                                  <p className="text-lg font-bold text-blue-400">{user.followersCount || 0}</p>
                                </div>
                                
                                <div className="text-center">
                                  <p className="text-sm text-gray-400">Following</p>
                                  <p className="text-lg font-bold text-green-400">{user.followingCount || 0}</p>
                                </div>
                                
                                <div className="text-center">
                                  <p className="text-sm text-gray-400">Broadcasts</p>
                                  <p className={`text-lg font-bold ${(user.yearlyBroadcastCount || 0) >= 2 ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {user.yearlyBroadcastCount || 0}/2
                                  </p>
                                </div>
                                
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.displayName || user.name, user.username)}
                                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          {allUsers.length === 0 ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                              <p className="text-gray-400">Loading users...</p>
                            </>
                          ) : (
                            <p className="text-gray-400">No users found matching your search</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading user analytics...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add similar sections for other tabs... */}
          {activeTab === 'messages' && (
            <div>
              <button
                onClick={loadFirstTimeMessages}
                className="mb-4 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition"
              >
                Refresh First Messages Analytics
              </button>
              
              {firstTimeMessages ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Total First Messages</h4>
                      <p className="text-2xl font-bold">{firstTimeMessages.totalFirstTimeMessages}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Today</h4>
                      <p className="text-2xl font-bold text-green-400">+{firstTimeMessages.firstTimeMessagesToday}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Yesterday</h4>
                      <p className="text-2xl font-bold text-blue-400">{firstTimeMessages.firstTimeMessagesYesterday}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">This Week</h4>
                      <p className="text-2xl font-bold text-purple-400">{firstTimeMessages.weeklyFirstTimeMessages}</p>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">Daily First Messages (Last 7 Days)</h4>
                    <div className="space-y-2">
                      {firstTimeMessages.dailyFirstTimeMessages.map((day) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-gray-400">{new Date(day.date).toLocaleDateString()}</span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="bg-purple-600 h-2 rounded"
                              style={{ width: `${Math.max(day.count * 20, 4)}px` }}
                            />
                            <span className="font-bold w-8 text-right">{day.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading first messages analytics...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div>
              <button
                onClick={loadAIMessages}
                className="mb-4 bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base"
              >
                Refresh AI Messages Analytics
              </button>
              
              {aiMessages ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                      <h4 className="text-xs sm:text-sm text-gray-400 mb-1">Total AI Messages</h4>
                      <p className="text-xl sm:text-2xl font-bold">{aiMessages.totalAIMessages}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                      <h4 className="text-xs sm:text-sm text-gray-400 mb-1">AI Conversations</h4>
                      <p className="text-xl sm:text-2xl font-bold text-blue-400">{aiMessages.totalAIConversations}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                      <h4 className="text-xs sm:text-sm text-gray-400 mb-1">Today</h4>
                      <p className="text-xl sm:text-2xl font-bold text-green-400">+{aiMessages.aiMessagesToday}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                      <h4 className="text-xs sm:text-sm text-gray-400 mb-1">New Conversations Today</h4>
                      <p className="text-xl sm:text-2xl font-bold text-purple-400">+{aiMessages.aiConversationsToday}</p>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                    <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Daily AI Messages (Last 7 Days)</h4>
                    <div className="space-y-3 sm:space-y-2">
                      {aiMessages.dailyAIMessages.map((day) => (
                        <div key={day.date} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <span className="text-gray-400 text-sm sm:text-base">{new Date(day.date).toLocaleDateString()}</span>
                          
                          {/* Mobile Layout - Stacked */}
                          <div className="flex flex-col gap-2 sm:hidden">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Regular:</span>
                                <div 
                                  className="bg-blue-600 h-2 rounded"
                                  style={{ width: `${Math.max(day.regularAI * 10, 4)}px` }}
                                />
                              </div>
                              <span className="font-bold text-sm">{day.regularAI}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Chat:</span>
                                <div 
                                  className="bg-green-600 h-2 rounded"
                                  style={{ width: `${Math.max(day.aiChat * 10, 4)}px` }}
                                />
                              </div>
                              <span className="font-bold text-sm">{day.aiChat}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-700 pt-1">
                              <span className="text-xs text-gray-500 font-medium">Total:</span>
                              <span className="font-bold text-sm">{day.total}</span>
                            </div>
                          </div>

                          {/* Desktop Layout - Horizontal */}
                          <div className="hidden sm:flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Regular:</span>
                              <div 
                                className="bg-blue-600 h-2 rounded"
                                style={{ width: `${Math.max(day.regularAI * 10, 4)}px` }}
                              />
                              <span className="font-bold w-6 text-right text-sm">{day.regularAI}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Chat:</span>
                              <div 
                                className="bg-green-600 h-2 rounded"
                                style={{ width: `${Math.max(day.aiChat * 10, 4)}px` }}
                              />
                              <span className="font-bold w-6 text-right text-sm">{day.aiChat}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Total:</span>
                              <span className="font-bold w-8 text-right">{day.total}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 sm:py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="mt-2 text-gray-400 text-sm sm:text-base">Loading AI messages analytics...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'broadcasts' && (
            <div>
              <button
                onClick={loadBroadcasts}
                className="mb-4 bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-lg font-medium transition"
              >
                Refresh Broadcast Analytics
              </button>
              
              {broadcasts ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Total Broadcasts</h4>
                      <p className="text-2xl font-bold">{broadcasts.totalBroadcasts}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Today</h4>
                      <p className="text-2xl font-bold text-green-400">+{broadcasts.broadcastsToday}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">This Week</h4>
                      <p className="text-2xl font-bold text-blue-400">{broadcasts.weeklyBroadcasts}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Total Recipients</h4>
                      <p className="text-2xl font-bold text-purple-400">{broadcasts.totalRecipients.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                    <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Daily Broadcasts (Last 7 Days)</h4>
                    <div className="space-y-3 sm:space-y-2">
                      {broadcasts.dailyBroadcasts.map((day) => (
                        <div key={day.date} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                          <span className="text-gray-400 text-sm sm:text-base">{new Date(day.date).toLocaleDateString()}</span>
                          
                          {/* Mobile Layout - Stacked */}
                          <div className="flex flex-col gap-2 sm:hidden">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Broadcasts:</span>
                                <div 
                                  className="bg-pink-600 h-2 rounded"
                                  style={{ width: `${Math.max(day.broadcasts * 20, 4)}px` }}
                                />
                              </div>
                              <span className="font-bold text-sm">{day.broadcasts}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-700 pt-1">
                              <span className="text-xs text-gray-500 font-medium">Recipients:</span>
                              <span className="font-bold text-sm">{day.recipients}</span>
                            </div>
                          </div>

                          {/* Desktop Layout - Horizontal */}
                          <div className="hidden sm:flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Broadcasts:</span>
                              <div 
                                className="bg-pink-600 h-2 rounded"
                                style={{ width: `${Math.max(day.broadcasts * 20, 4)}px` }}
                              />
                              <span className="font-bold w-6 text-right text-sm">{day.broadcasts}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Recipients:</span>
                              <span className="font-bold w-12 text-right">{day.recipients}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                    <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Recent Broadcasts</h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {broadcasts.recentBroadcasts.map((broadcast) => (
                        <div key={broadcast.id} className="border-b border-gray-800 pb-4 last:border-0">
                          {/* Mobile Layout */}
                          <div className="block sm:hidden">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white truncate">{broadcast.sender.name}</p>
                                <p className="text-sm text-gray-400 truncate">@{broadcast.sender.username}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteBroadcast(broadcast.id)}
                                className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition flex-shrink-0"
                                title="Delete broadcast"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex items-center justify-between mb-2 text-xs">
                              <span className="text-gray-400">{new Date(broadcast.createdAt).toLocaleDateString()}</span>
                              <span className="text-blue-400">{broadcast.recipientCount} recipients</span>
                            </div>
                            <p className="text-gray-300 text-sm">{broadcast.message}</p>
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden sm:block">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-white">{broadcast.sender.name}</p>
                                <p className="text-sm text-gray-400">@{broadcast.sender.username}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-sm text-gray-400">{new Date(broadcast.createdAt).toLocaleDateString()}</p>
                                  <p className="text-xs text-blue-400">{broadcast.recipientCount} recipients</p>
                                </div>
                                <button
                                  onClick={() => handleDeleteBroadcast(broadcast.id)}
                                  className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition"
                                  title="Delete broadcast"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <p className="text-gray-300 text-sm">{broadcast.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                  <p className="mt-2 text-gray-400">Loading broadcast analytics...</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'send-broadcast' && (
            <div>
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-6 text-pink-400">Send Admin Broadcast</h3>
                
                <form onSubmit={handleSendBroadcast} className="space-y-6">
                  {/* Title Input */}
                  <div>
                    <label htmlFor="broadcast-title" className="block text-sm font-medium text-gray-300 mb-2">
                      Title (Optional)
                    </label>
                    <input
                      id="broadcast-title"
                      type="text"
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., New Feature: Custom Backgrounds"
                      maxLength={100}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">For rich notifications</span>
                      <span className="text-xs text-gray-400">{broadcastForm.title.length}/100</span>
                    </div>
                  </div>

                  {/* Message Input */}
                  <div>
                    <label htmlFor="broadcast-message" className="block text-sm font-medium text-gray-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="broadcast-message"
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                      placeholder="e.g., You can now upload your own images as profile backgrounds! Tap to try it out."
                      rows={4}
                      maxLength={500}
                      required
                    />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">Main broadcast content</span>
                      <span className="text-xs text-gray-400">{broadcastForm.message.length}/500</span>
                    </div>
                  </div>

                  {/* Action URL Input */}
                  <div>
                    <label htmlFor="broadcast-action-url" className="block text-sm font-medium text-gray-300 mb-2">
                      Action URL (Optional)
                    </label>
                    <input
                      id="broadcast-action-url"
                      type="text"
                      value={broadcastForm.actionUrl}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, actionUrl: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., /appearance"
                      maxLength={200}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">Where users go when they tap the action</span>
                      <span className="text-xs text-gray-400">{broadcastForm.actionUrl.length}/200</span>
                    </div>
                  </div>

                  {/* Action Label Input */}
                  <div>
                    <label htmlFor="broadcast-action-label" className="block text-sm font-medium text-gray-300 mb-2">
                      Action Label (Optional)
                    </label>
                    <input
                      id="broadcast-action-label"
                      type="text"
                      value={broadcastForm.actionLabel}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, actionLabel: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="e.g., Try Now"
                      maxLength={50}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">Button text for the action</span>
                      <span className="text-xs text-gray-400">{broadcastForm.actionLabel.length}/50</span>
                    </div>
                  </div>

                  {/* Preview Section */}
                  {(broadcastForm.title.trim() || broadcastForm.message.trim() || broadcastForm.actionUrl.trim() || broadcastForm.actionLabel.trim()) && (
                    <div className="border-t border-gray-700 pt-6">
                      <h4 className="text-lg font-medium text-gray-300 mb-4">Preview</h4>
                      
                      {/* Rich Message Preview */}
                      {(broadcastForm.title.trim() || broadcastForm.actionUrl.trim() || broadcastForm.actionLabel.trim()) && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-400 mb-2">Rich Notification Preview</h5>
                          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-sm">
                            {broadcastForm.title.trim() && (
                              <h6 className="font-semibold text-white text-sm mb-2">{broadcastForm.title}</h6>
                            )}
                            {broadcastForm.message.trim() && (
                              <p className="text-gray-300 text-sm mb-3">{broadcastForm.message}</p>
                            )}
                            {broadcastForm.actionUrl.trim() && broadcastForm.actionLabel.trim() && (
                              <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-medium">
                                {broadcastForm.actionLabel}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* JSON Payload Preview */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-400 mb-2">JSON Payload</h5>
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify({
                              ...(broadcastForm.title.trim() && { title: broadcastForm.title.trim() }),
                              ...(broadcastForm.message.trim() && { message: broadcastForm.message.trim() }),
                              ...(broadcastForm.actionUrl.trim() && { actionUrl: broadcastForm.actionUrl.trim() }),
                              ...(broadcastForm.actionLabel.trim() && { actionLabel: broadcastForm.actionLabel.trim() })
                            }, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Send Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Send To</label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sendOption"
                          checked={broadcastForm.sendToAll}
                          onChange={() => {
                            setBroadcastForm({ ...broadcastForm, sendToAll: true, selectedUsers: [] });
                            setUserSearchQuery('');
                            setFilteredUsers(allUsers);
                          }}
                          className="mr-3 text-pink-500 focus:ring-pink-500"
                        />
                        <span className="text-white">Send to all users (Admin broadcast)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sendOption"
                          checked={!broadcastForm.sendToAll}
                          onChange={() => {
                            setBroadcastForm({ ...broadcastForm, sendToAll: false });
                            if (allUsers.length === 0) loadAllUsers();
                          }}
                          className="mr-3 text-pink-500 focus:ring-pink-500"
                        />
                        <span className="text-white">Send to selected users</span>
                      </label>
                    </div>
                  </div>

                  {/* User Selection (when not sending to all) */}
                  {!broadcastForm.sendToAll && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">Select Users</label>
                      
                      {/* Search Input */}
                      <div className="mb-4">
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => handleUserSearch(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="Search users by name, username, or email..."
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto bg-gray-800 rounded-lg border border-gray-700">
                        {filteredUsers.length > 0 ? (
                          <div className="p-4 space-y-2">
                            {filteredUsers.map((user) => (
                              <label key={user.id} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={broadcastForm.selectedUsers.includes(user.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setBroadcastForm({
                                        ...broadcastForm,
                                        selectedUsers: [...broadcastForm.selectedUsers, user.id]
                                      });
                                    } else {
                                      setBroadcastForm({
                                        ...broadcastForm,
                                        selectedUsers: broadcastForm.selectedUsers.filter(id => id !== user.id)
                                      });
                                    }
                                  }}
                                  className="mr-3 text-pink-500 focus:ring-pink-500"
                                />
                                <div className="flex items-center gap-3">
                                  <img
                                    src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full"
                                  />
                                  <div>
                                    <p className="text-white text-sm font-medium">{user.displayName || user.name}</p>
                                    <p className="text-gray-400 text-xs">@{user.username}</p>
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-400">
                            {allUsers.length === 0 ? (
                              <>
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                                Loading users...
                              </>
                            ) : (
                              'No users found matching your search'
                            )}
                          </div>
                        )}
                      </div>
                      {!broadcastForm.sendToAll && (
                        <p className="text-xs text-gray-500 mt-2">
                          Selected: {broadcastForm.selectedUsers.length} users
                        </p>
                      )}
                    </div>
                  )}

                  {/* Send Button */}
                  <div className="flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={broadcastLoading || !broadcastForm.message.trim() || (!broadcastForm.sendToAll && broadcastForm.selectedUsers.length === 0)}
                      className="bg-pink-600 hover:bg-pink-700 disabled:bg-pink-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2"
                    >
                      {broadcastLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Send Broadcast
                        </>
                      )}
                    </button>
                    
                    {broadcastForm.sendToAll && (
                      <div className="text-sm text-gray-400">
                        This will send to all platform users as an admin broadcast
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'important' && (
            <div>
              <button
                onClick={loadImportantMessages}
                className="mb-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition"
              >
                Refresh Important Messages Analytics
              </button>
              
              {importantMessages ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Total Important Messages</h4>
                      <p className="text-2xl font-bold">{importantMessages.totalImportantMessages}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Today</h4>
                      <p className="text-2xl font-bold text-red-400">+{importantMessages.importantMessagesToday}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">This Week</h4>
                      <p className="text-2xl font-bold text-orange-400">{importantMessages.weeklyImportantMessages}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Email Notifications</h4>
                      <p className="text-2xl font-bold text-blue-400">{importantMessages.emailNotificationsSent}</p>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">Daily Important Messages (Last 7 Days)</h4>
                    <div className="space-y-2">
                      {importantMessages.dailyImportantMessages.map((day) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-gray-400">{new Date(day.date).toLocaleDateString()}</span>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Total:</span>
                              <div 
                                className="bg-red-600 h-2 rounded"
                                style={{ width: `${Math.max(day.total * 20, 4)}px` }}
                              />
                              <span className="font-bold w-6 text-right text-sm">{day.total}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Emails:</span>
                              <div 
                                className="bg-blue-600 h-2 rounded"
                                style={{ width: `${Math.max(day.emailsSent * 20, 4)}px` }}
                              />
                              <span className="font-bold w-6 text-right text-sm">{day.emailsSent}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-900 rounded-lg p-6">
                      <h4 className="text-lg font-semibold mb-4">Detection Methods</h4>
                      <div className="space-y-2">
                        {importantMessages.detectionMethodStats.map((method) => (
                          <div key={method._id} className="flex items-center justify-between">
                            <span className="text-gray-400 capitalize">{method._id.replace('_', ' ')}</span>
                            <div className="flex items-center gap-2">
                              <div 
                                className="bg-purple-600 h-2 rounded"
                                style={{ width: `${Math.max((method.count / importantMessages.totalImportantMessages) * 200, 4)}px` }}
                              />
                              <span className="font-bold w-8 text-right">{method.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-6">
                      <h4 className="text-lg font-semibold mb-4">Top Urgency Keywords</h4>
                      <div className="space-y-2">
                        {importantMessages.keywordStats.slice(0, 8).map((keyword) => (
                          <div key={keyword.keyword} className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">"{keyword.keyword}"</span>
                            <div className="flex items-center gap-2">
                              <div 
                                className="bg-yellow-600 h-2 rounded"
                                style={{ width: `${Math.max((keyword.count / importantMessages.keywordStats[0]?.count || 1) * 100, 4)}px` }}
                              />
                              <span className="font-bold w-6 text-right text-sm">{keyword.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                  <p className="mt-2 text-gray-400">Loading important messages analytics...</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'visits' && (
            <div>
              <button
                onClick={loadProfileVisits}
                className="mb-4 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition"
              >
                Refresh Profile Visit Analytics
              </button>
              
              {profileVisits ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Total Visits</h4>
                      <p className="text-2xl font-bold">{Math.floor(profileVisits.totalVisits / 2).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Unique Visits</h4>
                      <p className="text-2xl font-bold text-blue-400">{Math.floor(profileVisits.uniqueVisits / 2).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Today</h4>
                      <p className="text-2xl font-bold text-green-400">+{Math.floor(profileVisits.visitsToday / 2)}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Growth Rate</h4>
                      <p className={`text-2xl font-bold ${parseFloat(profileVisits.growthRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profileVisits.growthRate}%
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">Daily Profile Visits (Last 7 Days)</h4>
                    <div className="space-y-2">
                      {profileVisits.dailyVisits.map((day) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-gray-400">{new Date(day.date).toLocaleDateString()}</span>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Total:</span>
                              <div 
                                className="bg-green-600 h-2 rounded"
                                style={{ width: `${Math.max(Math.floor(day.total / 2) * 5, 4)}px` }}
                              />
                              <span className="font-bold w-8 text-right text-sm">{Math.floor(day.total / 2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Unique:</span>
                              <div 
                                className="bg-blue-600 h-2 rounded"
                                style={{ width: `${Math.max(Math.floor(day.unique / 2) * 5, 4)}px` }}
                              />
                              <span className="font-bold w-8 text-right text-sm">{Math.floor(day.unique / 2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">Most Visited Profiles</h4>
                    <div className="space-y-3">
                      {profileVisits.mostVisitedProfiles.map((profile, index) => (
                        <div key={profile.user.username} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 w-6">#{index + 1}</span>
                            <div>
                              <p className="font-semibold text-white">{profile.user.displayName}</p>
                              <p className="text-sm text-gray-400">@{profile.user.username}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-400">{Math.floor(profile.totalVisits / 2)} visits</p>
                            <p className="text-xs text-blue-400">{Math.floor(profile.uniqueVisits / 2)} unique</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">Platform Distribution</h4>
                    <div className="space-y-2">
                      {profileVisits.platformStats.map((platform) => (
                        <div key={platform._id} className="flex items-center justify-between">
                          <span className="text-gray-400 capitalize">{platform._id}</span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="bg-purple-600 h-2 rounded"
                              style={{ width: `${Math.max((platform.count / profileVisits.totalVisits) * 200, 4)}px` }}
                            />
                            <span className="font-bold w-12 text-right">{platform.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                  <p className="mt-2 text-gray-400">Loading profile visit analytics...</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'feedback' && (
            <div>
              <button
                onClick={loadFeedback}
                className="mb-4 bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg font-medium transition"
              >
                Refresh Feedback Analytics
              </button>
              
              {feedback ? (
                <div className="space-y-6">
                  {/* Feedback Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Total Feedback</h4>
                      <p className="text-2xl font-bold">{feedback.totalFeedback}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Average Rating</h4>
                      <p className="text-2xl font-bold text-yellow-400">{feedback.averageRating}/5</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">This Week</h4>
                      <p className="text-2xl font-bold text-blue-400">+{feedback.feedbackThisWeek}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-sm text-gray-400 mb-1">Today</h4>
                      <p className="text-2xl font-bold text-green-400">+{feedback.feedbackToday}</p>
                    </div>
                  </div>

                  {/* Recent Feedback */}
                  <div className="bg-gray-900 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">Recent Feedback</h4>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {feedback.recentFeedback.map((item) => (
                        <div key={item.id} className="border-b border-gray-800 pb-4 last:border-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    className={`w-4 h-4 ${star <= item.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-sm text-gray-400">
                                {item.user?.name || 'Anonymous'} • {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.status === 'pending' ? 'bg-yellow-600' :
                              item.status === 'reviewed' ? 'bg-blue-600' :
                              'bg-green-600'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">{item.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                  <p className="mt-2 text-gray-400">Loading feedback analytics...</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manage-privileges' && (
            <div>
              <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-orange-400">Manage User Broadcast Privileges</h3>
                <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">Reset user broadcast limits to give them 2 new broadcasts per year.</p>
                
                {/* Search Input */}
                <div className="mb-4 sm:mb-6">
                  <input
                    type="text"
                    value={privilegeSearchQuery}
                    onChange={(e) => handlePrivilegeSearch(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Search users..."
                  />
                </div>

                {/* Users List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredPrivilegeUsers.length > 0 ? (
                    filteredPrivilegeUsers.map((user) => (
                      <div key={user.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                        {/* Mobile Layout */}
                        <div className="block sm:hidden">
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                              alt={user.name}
                              className="w-12 h-12 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-semibold truncate">{user.displayName || user.name}</h4>
                              <p className="text-gray-400 text-sm truncate">@{user.username}</p>
                              <p className="text-gray-500 text-xs truncate">{user.email}</p>
                            </div>
                          </div>
                          
                          {/* Broadcast Usage Info */}
                          <div className="bg-gray-700 rounded-lg p-3 mb-3">
                            <div className="text-center">
                              <p className="text-xs text-gray-400 mb-1">Broadcasts Used</p>
                              <p className={`text-lg font-bold ${user.yearlyBroadcastCount >= 2 ? 'text-red-400' : 'text-green-400'}`}>
                                {user.yearlyBroadcastCount}/2
                              </p>
                              {user.broadcastPeriodStart && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Since: {new Date(user.broadcastPeriodStart).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Reset Button */}
                          <button
                            onClick={() => handleResetBroadcastPrivileges(user.id, user.displayName || user.name)}
                            disabled={user.yearlyBroadcastCount === 0}
                            className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition ${
                              user.yearlyBroadcastCount === 0
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-orange-600 hover:bg-orange-700 text-white'
                            }`}
                          >
                            {user.yearlyBroadcastCount === 0 ? 'Already Reset' : 'Reset Privileges'}
                          </button>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <img
                              src={user.avatar || 'https://res.cloudinary.com/dhjzwncjf/image/upload/v1771255225/Screenshot_2026-02-16_at_4.20.04_pm_paes1n.png'}
                              alt={user.name}
                              className="w-12 h-12 rounded-full"
                            />
                            <div>
                              <h4 className="text-white font-semibold">{user.displayName || user.name}</h4>
                              <p className="text-gray-400 text-sm">@{user.username}</p>
                              <p className="text-gray-500 text-xs">{user.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-400">Broadcasts Used</p>
                              <p className={`text-lg font-bold ${user.yearlyBroadcastCount >= 2 ? 'text-red-400' : 'text-green-400'}`}>
                                {user.yearlyBroadcastCount}/2
                              </p>
                              {user.broadcastPeriodStart && (
                                <p className="text-xs text-gray-500">
                                  Since: {new Date(user.broadcastPeriodStart).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            
                            <button
                              onClick={() => handleResetBroadcastPrivileges(user.id, user.displayName || user.name)}
                              disabled={user.yearlyBroadcastCount === 0}
                              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                user.yearlyBroadcastCount === 0
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-orange-600 hover:bg-orange-700 text-white'
                              }`}
                            >
                              {user.yearlyBroadcastCount === 0 ? 'Already Reset' : 'Reset Privileges'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      {privilegeUsers.length === 0 ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                          <p className="text-gray-400">Loading users...</p>
                        </>
                      ) : (
                        <p className="text-gray-400">No users found matching your search</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearances' && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-purple-400">Appearance Management</h3>
                  <p className="text-gray-400 text-sm">Manage background images for all users</p>
                </div>
                <button
                  onClick={() => {
                    loadBackgrounds();
                    loadBackgroundStats();
                  }}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition"
                >
                  Refresh Backgrounds
                </button>
              </div>

              {/* Background Stats */}
              {backgroundStats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
                  <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm text-gray-400 mb-1">Total Backgrounds</h4>
                    <p className="text-xl sm:text-2xl font-bold">{backgroundStats.totalBackgrounds}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm text-gray-400 mb-1">Admin Backgrounds</h4>
                    <p className="text-xl sm:text-2xl font-bold text-purple-400">{backgroundStats.adminBackgrounds}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm text-gray-400 mb-1">User Backgrounds</h4>
                    <p className="text-xl sm:text-2xl font-bold text-blue-400">{backgroundStats.userBackgrounds}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm text-gray-400 mb-1">Active</h4>
                    <p className="text-xl sm:text-2xl font-bold text-green-400">{backgroundStats.activeBackgrounds}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm text-gray-400 mb-1">Inactive</h4>
                    <p className="text-xl sm:text-2xl font-bold text-red-400">{backgroundStats.inactiveBackgrounds}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create/Edit Background Form */}
                <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                  <h4 className="text-lg font-semibold mb-4 text-purple-400">
                    {editingBackground ? 'Edit Background' : 'Create Admin Background'}
                  </h4>
                  
                  {!editingBackground && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-3">Upload Method</label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="uploadMode"
                            value="file"
                            checked={uploadMode === 'file'}
                            onChange={(e) => {
                              setUploadMode(e.target.value as 'file');
                              setBackgroundForm({ url: '', name: '', thumbnail: '' });
                            }}
                            className="mr-2 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-white">Upload File</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="uploadMode"
                            value="url"
                            checked={uploadMode === 'url'}
                            onChange={(e) => {
                              setUploadMode(e.target.value as 'url');
                              setSelectedFile(null);
                              setPreviewUrl('');
                            }}
                            className="mr-2 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-white">Use URL</span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={editingBackground ? handleUpdateBackground : handleCreateBackground} className="space-y-4">
                    {uploadMode === 'file' && !editingBackground ? (
                      <div>
                        <label htmlFor="bg-file" className="block text-sm font-medium text-gray-300 mb-2">
                          Background Image *
                        </label>
                        <input
                          id="bg-file"
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Max file size: 10MB. Supported formats: JPG, PNG, GIF, WebP</p>
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="bg-url" className="block text-sm font-medium text-gray-300 mb-2">
                          Background URL *
                        </label>
                        <input
                          id="bg-url"
                          type="url"
                          value={backgroundForm.url}
                          onChange={(e) => setBackgroundForm({ ...backgroundForm, url: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="https://example.com/background.jpg"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="bg-name" className="block text-sm font-medium text-gray-300 mb-2">
                        Background Name
                      </label>
                      <input
                        id="bg-name"
                        type="text"
                        value={backgroundForm.name}
                        onChange={(e) => setBackgroundForm({ ...backgroundForm, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Beautiful Landscape"
                      />
                    </div>

                    {uploadMode === 'url' && (
                      <div>
                        <label htmlFor="bg-thumbnail" className="block text-sm font-medium text-gray-300 mb-2">
                          Thumbnail URL (Optional)
                        </label>
                        <input
                          id="bg-thumbnail"
                          type="url"
                          value={backgroundForm.thumbnail}
                          onChange={(e) => setBackgroundForm({ ...backgroundForm, thumbnail: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="https://example.com/thumbnail.jpg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty to use the background URL as thumbnail</p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={backgroundLoading}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                      >
                        {backgroundLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            {editingBackground ? 'Updating...' : uploadMode === 'file' ? 'Uploading...' : 'Creating...'}
                          </>
                        ) : (
                          editingBackground ? 'Update Background' : uploadMode === 'file' ? 'Upload Background' : 'Create Background'
                        )}
                      </button>
                      
                      {editingBackground && (
                        <button
                          type="button"
                          onClick={cancelEditBackground}
                          className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Background Preview */}
                {(backgroundForm.url || previewUrl) && (
                  <div className="bg-gray-900 rounded-lg p-4 sm:p-6">
                    <h4 className="text-lg font-semibold mb-4 text-purple-400">Preview</h4>
                    <div className="space-y-4">
                      <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                        <img
                          src={previewUrl || backgroundForm.url}
                          alt="Background preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iOTAiIGZpbGw9IiM5Q0E0QUYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW52YWxpZCBJbWFnZSBVUkw8L3RleHQ+Cjwvc3ZnPgo=';
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium">{backgroundForm.name || 'Admin Background'}</p>
                        {selectedFile ? (
                          <div className="text-gray-400 text-sm">
                            <p>File: {selectedFile.name}</p>
                            <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm truncate">{backgroundForm.url}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Backgrounds List */}
              <div className="bg-gray-900 rounded-lg p-4 sm:p-6 mt-6">
                <h4 className="text-lg font-semibold mb-4">All Backgrounds</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {backgrounds.length > 0 ? (
                    backgrounds.map((background) => (
                      <div key={background.id} className="bg-gray-800 rounded-lg overflow-hidden">
                        <div className="aspect-video bg-gray-700">
                          <img
                            src={background.thumbnail}
                            alt={background.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iOTAiIGZpbGw9IiM5Q0E0QUYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW52YWxpZCBJbWFnZSBVUkw8L3RleHQ+Cjwvc3ZnPgo=';
                            }}
                          />
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-white truncate">{background.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  background.type === 'admin' 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-blue-600 text-white'
                                }`}>
                                  {background.type}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  background.isActive 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-red-600 text-white'
                                }`}>
                                  {background.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {background.user && (
                            <p className="text-xs text-gray-400 mb-2">
                              By: {background.user.name} (@{background.user.username})
                            </p>
                          )}
                          
                          <p className="text-xs text-gray-500 mb-3">
                            Created: {new Date(background.createdAt).toLocaleDateString()}
                          </p>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditBackground(background)}
                              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleBackgroundStatus(background.id, background.isActive)}
                              className={`flex-1 px-3 py-2 text-xs rounded transition ${
                                background.isActive
                                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {background.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteBackground(background.id, background.name)}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-gray-400">Loading backgrounds...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}