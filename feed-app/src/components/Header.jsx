import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Header = () => {
  const { userId: currentUserId, logout } = useAuth();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Ref for the dropdown menu container
  const avatarRef = useRef(null);   // Ref for the clickable avatar element

  const [userFullName, setUserFullName] = useState('');
  const userInitial = userFullName ? userFullName.charAt(0).toUpperCase() : 'U';

  // Effect to fetch user's full name and handle outside clicks
  useEffect(() => {
    // 1. Fetch user's full name for the initial
    const fetchUserFullName = async () => {
      if (currentUserId) {
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/user/get-user/${currentUserId}`);
          setUserFullName(response.data.fullName);
        } catch (error) {
          console.error('Error fetching user full name for header:', error);
          setUserFullName('Unknown User'); // Fallback if name cannot be fetched
        }
      }
    };
    fetchUserFullName();

    // 2. Event listener for clicks outside the dropdown and avatar
    const handleClickOutside = (event) => {
      // If the click is outside both the dropdown AND the avatar, close the dropdown
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        avatarRef.current && !avatarRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside); // Use mousedown for better responsiveness
    return () => {
      document.removeEventListener('mousedown', handleClickOutside); // Clean up event listener
    };
  }, [currentUserId]); // Re-run if currentUserId changes (e.g., user logs in/out)

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false); // Close dropdown on logout
    navigate('/login');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev); // Toggle the dropdown state
  };

  return (
    <header className="bg-white shadow-sm py-4 fixed w-full z-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">
          MySocialApp
        </Link>
        <nav className="flex items-center space-x-4">
          {/* Example Nav Links, customize as needed for your application */}
          {currentUserId && (
            <>
              <Link to="/feed" className="text-gray-600 hover:text-indigo-600">Feed</Link>
              <Link to="/chat" className="text-gray-600 hover:text-indigo-600">Chat</Link>
            </>
          )}

          {currentUserId ? (
            <div className="relative">
              <div
                ref={avatarRef} // Attach ref to the avatar div
                className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium cursor-pointer"
                onClick={toggleDropdown} // Toggle dropdown on avatar click
              >
                {userInitial} {/* Display logged-in user's initial */}
              </div>

              {isDropdownOpen && (
                <div
                  ref={dropdownRef} // Attach ref to the dropdown menu
                  className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-10"
                >
                  <Link
                    to={`/profile/${currentUserId}`} // Link to the logged-in user's profile
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsDropdownOpen(false)} // Close dropdown after clicking a link
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-indigo-600">Login</Link>
              <Link to="/signup" className="text-gray-600 hover:text-indigo-600">Signup</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
