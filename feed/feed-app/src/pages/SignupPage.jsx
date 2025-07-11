import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({}); // New state to track touched fields
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false); // Renamed from isValid to avoid confusion
  const { login } = useAuth();
  const navigate = useNavigate();

  const { username, email, password, confirmPassword } = formData;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    // Mark the field as touched when it changes
    setTouched(prevTouched => ({
      ...prevTouched,
      [name]: true
    }));
  };

  // Validation function - now takes an optional fieldName to validate only a specific field
  const validateForm = (fieldName = null) => {
    let newErrors = { ...errors }; // Start with existing errors
    let formIsValid = true; // Assume valid unless errors are found

    // Helper to validate a single field
    const validateField = (name, value) => {
      let fieldError = '';
      switch (name) {
        case 'username':
          if (!value.trim()) {
            fieldError = 'Username is required.';
          }
          break;
        case 'email':
          if (!value.trim()) {
            fieldError = 'Email is required.';
          } else if (!/\S+@\S+\.\S+/.test(value)) {
            fieldError = 'Email address is invalid.';
          }
          break;
        case 'password':
          if (!value) {
            fieldError = 'Password is required.';
          } else if (value.length < 6) {
            fieldError = 'Password must be at least 6 characters long.';
          } else if (!/(?=.*[a-z])/.test(value)) {
            fieldError = 'Password must contain at least one lowercase letter.';
          } else if (!/(?=.*[A-Z])/.test(value)) {
            fieldError = 'Password must contain at least one uppercase letter.';
          } else if (!/(?=.*\d)/.test(value)) {
            fieldError = 'Password must contain at least one number.';
          } else if (!/(?=.*[!@#$%^&*])/.test(value)) {
            fieldError = 'Password must contain at least one special character (!@#$%^&*).';
          }
          break;
        case 'confirmPassword':
          if (!value) {
            fieldError = 'Confirm password is required.';
          } else if (formData.password !== value) {
            fieldError = 'Passwords do not match.';
          }
          break;
        default:
          break;
      }
      return fieldError;
    };

    if (fieldName) {
      // Validate only the specified field
      newErrors[fieldName] = validateField(fieldName, formData[fieldName]);
    } else {
      // Validate all fields
      for (const key in formData) {
        newErrors[key] = validateField(key, formData[key]);
      }
    }

    // Check overall form validity based on all current errors
    for (const key in newErrors) {
      if (newErrors[key]) {
        formIsValid = false;
        break;
      }
    }

    setErrors(newErrors); // Update errors state
    return formIsValid; // Return overall validity
  };

  // Effect to re-validate form and update overall validity whenever formData or touched state changes
  // This ensures the button's disabled state updates correctly
  useEffect(() => {
    // Only validate all fields if at least one field has been touched,
    // or if we are checking overall form validity for button state.
    // Otherwise, on initial render, no errors should show.
    const currentFormIsValid = validateForm(); // Validate all fields to determine overall form validity
    setIsFormValid(currentFormIsValid);
  }, [formData]); // Dependency array: run when formData changes

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prevTouched => ({
      ...prevTouched,
      [name]: true
    }));
    validateForm(name); // Validate the specific field on blur
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched on submit attempt
    const allFieldsTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allFieldsTouched);

    // Run full validation one last time before submission
    if (!validateForm()) {
      return; // Stop if validation fails
    }

    try {
      setIsLoading(true);
      setErrors({}); // Clear any previous API errors

      // Register the user
      await axios.post('http://localhost:5000/api/signup', {
        fullName: username,
        email,
        password
      });

      // Log the user in after successful registration
      const loginResponse = await axios.post('http://localhost:5000/api/login', {
        email,
        password
      });

      login(loginResponse.data.userId);
      navigate('/');
    } catch (err) {
      const apiErrorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setErrors(prevErrors => ({ ...prevErrors, apiError: apiErrorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errors.apiError && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{errors.apiError}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={handleChange}
                  onBlur={handleBlur} // Add onBlur event
                  className={`appearance-none block w-full px-3 py-2 border ${errors.username && touched.username ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
              </div>
              {errors.username && touched.username && <p className="mt-2 text-sm text-red-600">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={handleChange}
                  onBlur={handleBlur} // Add onBlur event
                  className={`appearance-none block w-full px-3 py-2 border ${errors.email && touched.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
              </div>
              {errors.email && touched.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={handleChange}
                  onBlur={handleBlur} // Add onBlur event
                  className={`appearance-none block w-full px-3 py-2 border ${errors.password && touched.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
              </div>
              {errors.password && touched.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur} // Add onBlur event
                  className={`appearance-none block w-full px-3 py-2 border ${errors.confirmPassword && touched.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
              </div>
              {errors.confirmPassword && touched.confirmPassword && <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !isFormValid} 
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading || !isFormValid ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
