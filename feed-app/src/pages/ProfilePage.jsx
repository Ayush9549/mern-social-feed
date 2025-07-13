import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const ProfilePage = () => {
  const { userId: currentUserId, logout } = useAuth(); // Get current user ID and logout function
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch the current user's name when the component mounts or currentUserId changes
  useEffect(() => {
    const fetchUserName = async () => {
      if (!currentUserId) {
        navigate('/login'); // Redirect to login if no user is logged in
        return;
      }
      setIsLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/user/get-user/${currentUserId}`);
        setUserName(response.data.fullName);
      } catch (error) {
        console.error('Error fetching user name:', error);
        setErrorMessage('Failed to load user profile.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserName();
  }, [currentUserId, navigate]);

  // Handle saving the updated name
  const handleSaveName = async () => {
    if (!userName.trim()) {
      setErrorMessage('Name cannot be empty.');
      return;
    }
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      // Assuming a PUT endpoint to update user profile
      console.log('Attempting to save name:', userName.trim(), 'for user ID:', currentUserId);
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/users/${currentUserId}`, {
        fullName: userName.trim()
      });
      setSuccessMessage('Name updated successfully!');
    } catch (error) {
      console.error('Error updating name:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to update name.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading profile...</div>;
  }

  if (!currentUserId) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-red-600">Please log in to view this page.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Your Profile
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {successMessage && (
            <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              {errorMessage}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 flex">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  // Input is disabled if not in editing mode OR if loading
                  disabled={isLoading} 
                  className="flex-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                
                <button
                  onClick={handleSaveName}
                  disabled={isLoading || !userName.trim()}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
