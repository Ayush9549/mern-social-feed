// FeedPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

// Move handleDelete above FeedPage so fetchPosts is in scope
const handleDeleteFactory = (fetchPosts) => async (postId) => {
  try {
    await axios.delete(`http://localhost:5000/api/posts/${postId}`);
    fetchPosts();
  } catch (error) {
    console.error("Delete post error:", error.message);
    // Replaced alert with console.error and will show a general error message below
  }
};

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [description, setDescription] = useState("");
  const [comments, setComments] = useState({}); // This state is not currently used for display, comments are fetched with posts
  const [commentInput, setCommentInput] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // General error for fetching posts
  const [commentError, setCommentError] = useState(null); // Specific error for comments
  const [postError, setPostError] = useState(null); // Specific error for new post upload
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");

  // Fetch all posts
  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get("http://localhost:5000/api/posts");
      const postsWithLikesCount = res.data.map((post) => ({
        ...post,
        likesCount: post.likes ? post.likes.length : 0,
        isLiked: post.likes ? post.likes.includes(userId) : false,
      }));
      setPosts(postsWithLikesCount);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Failed to load posts. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Create handleDelete with fetchPosts in scope
  const handleDelete = handleDeleteFactory(fetchPosts);

  // Handle profile click to go to user's profile
  const handleProfileClick = (profileUserId) => { // Added profileUserId parameter
    navigate(`/profile/${profileUserId}`);
  };

  // Check if userId exists on load, otherwise navigate to home
  useEffect(() => {
    if (!userId) {
      navigate("/");
    } else {
      fetchPosts();
    }
  }, [userId, navigate]);

  // Upload a new post
  const uploadPost = async () => {
    if (!description.trim()) {
      setPostError("Post description cannot be empty.");
      return;
    }
    setPostError(null); // Clear previous errors
    
    try {
      await axios.post("http://localhost:5000/api/posts", { 
        description, 
        userId 
      });
      setDescription("");
      fetchPosts(); // Refresh posts after upload
    } catch (error) {
      console.error("Upload post error:", error);
      setPostError("Failed to upload post. Please try again.");
    }
  };

  // Like a post
  const likePost = async (postId) => {
    try {
      await axios.post(`http://localhost:5000/api/posts/${postId}/like`, { userId });
      fetchPosts(); // Refresh posts to update like count/status
    } catch (error) {
      console.error("Like post error:", error);
      // Optionally set a general error message if needed
    }
  };

  // Add a comment to a post
  const addComment = async (postId) => {
    if (!commentInput[postId]?.trim()) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    setCommentError(null); // Clear previous comment errors

    if (!userId) { // NEW: Check if userId exists
      setCommentError("You must be logged in to comment.");
      navigate("/login"); // Redirect to login
      return; // Stop execution if userId is missing
    }
    
    try {
      await axios.post(`http://localhost:5000/api/posts/${postId}/comments`, {
        userId, // This is the userId from localStorage
        text: commentInput[postId]
      });
      
      setCommentInput(prev => ({
        ...prev,
        [postId]: "" // Clear the specific comment input field
      }));
      
      
      fetchPosts(); // Refresh posts to show new comment
    } catch (error) {
      console.error("Add comment error:", error);
      setCommentError("Failed to add comment. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={fetchPosts}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Create Post */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <textarea
          className="w-full p-3 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="What's on your mind?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            onClick={uploadPost}
            disabled={!description.trim()}
            className={`px-4 py-2 rounded-lg ${
              description.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            Post
          </button>
        </div>
        {postError && <p className="text-red-500 text-sm mt-2">{postError}</p>}
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">No posts yet. Be the first to post something!</p>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post._id} className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center mb-3">
              <div 
                className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold text-white mr-3 cursor-pointer"
                onClick={() => handleProfileClick(post.user?._id)}> {/* Pass post.user._id */}
                {post.user?.fullName?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="font-semibold">{post.user?.fullName || 'Unknown User'}</h3>
                <p className="text-xs text-gray-500">
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            <p className="mb-4">{post.description}</p>
            
            {/* Like and Comment Buttons */}
            <div className="flex border-t border-b border-gray-100 py-2 mb-3">
              <button
                onClick={() => likePost(post._id)}
                className={`flex-1 flex items-center justify-center py-2 rounded-lg mr-2 ${
                  post.isLiked ? 'text-blue-500' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">👍</span> {post.likesCount || 0}
              </button>
              <button className="flex-1 flex items-center justify-center py-2 rounded-lg text-gray-500 hover:bg-gray-50">
                <span className="mr-1">💬</span> Comment
              </button>
            </div>
            
            {/* Comments */}
            <div className="mt-3">
            {post.comments?.length > 0 && (
              <div className="space-y-3 mb-3">
                {post.comments.map((comment) => (
                  <div key={comment._id} className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 mr-2">
                      {comment.sender?.fullName?.charAt(0) || 'U'} {/* Change from comment.user to comment.sender */}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 flex-1">
                      <p className="font-medium text-sm">{comment.sender?.fullName || 'Unknown User'}</p> {/* Change from comment.user to comment.sender */}
                      <p className="text-sm">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
              
              {/* Add Comment */}
              <div className="flex mt-2">
                <input
                  type="text"
                  className="flex-1 border rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Write a comment..."
                  value={commentInput[post._id] || ''}
                  onChange={(e) => 
                    setCommentInput(prev => ({
                      ...prev,
                      [post._id]: e.target.value
                    }))
                  }
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addComment(post._id);
                    }
                  }}
                />
                <button
                  type="button" // Explicitly set type to "button" to prevent form submission
                  onClick={() => addComment(post._id)}
                  disabled={!commentInput[post._id]?.trim()}
                  className="bg-blue-500 text-white px-3 rounded-r-lg text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  Post
                </button>
              </div>
              {commentError && <p className="text-red-500 text-sm mt-2">{commentError}</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}