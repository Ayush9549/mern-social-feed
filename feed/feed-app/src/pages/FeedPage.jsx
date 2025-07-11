// FeedPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom"; // Ensure useNavigate is imported

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
  const navigate = useNavigate(); // Get the navigate function from react-router-dom

  const userId = localStorage.getItem("userId"); // Get current logged-in user's ID

  // Fetch all posts
  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // IMPORTANT: Ensure your backend populates the 'user' field in Post model
      // so post.user._id and post.user.fullName are available.
      // Example backend (in server.js or post routes):
      // const posts = await Post.find().populate('user', 'fullName').sort({ createdAt: -1 });
      const response = await axios.get("http://localhost:5000/api/posts");
      setPosts(response.data);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Failed to load posts.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePost = handleDeleteFactory(fetchPosts);

  const handleLike = async (postId) => {
    try {
      // Assuming your API expects userId in the body for liking
      await axios.post(`http://localhost:5000/api/posts/${postId}/like`, { userId });
      fetchPosts(); // Re-fetch posts to update like counts and status
    } catch (error) {
      console.error("Error liking post:", error);
      // You might want to set a specific error state for liking
    }
  };

  const addComment = async (postId) => {
    const text = commentInput[postId]?.trim();
    if (!text) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    setCommentError(null);
    try {
      await axios.post(`http://localhost:5000/api/posts/${postId}/comments`, {
        userId, // Current user is the sender
        text,
      });
      setCommentInput((prev) => ({ ...prev, [postId]: "" })); // Clear input
      fetchPosts(); // Re-fetch posts to show the new comment
    } catch (error) {
      console.error("Error adding comment:", error);
      setCommentError("Failed to add comment.");
    }
  };

  // NEW OR MODIFIED: handleProfileClick function
  const handleProfileClick = (profileUserId) => {
    // Check if the user clicked on their own avatar
    if (profileUserId === userId) {
      // If it's the current user, navigate to their own profile page
      navigate(`/profile/${profileUserId}`);
    } else {
      // If it's another user, navigate to the chat page with their ID
      navigate(`/chat/${profileUserId}`); // This navigates to ChatPage with the user's ID
    }
  };


  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setPostError("Post description cannot be empty.");
      return;
    }
    setPostError(null); // Clear previous errors
    try {
      await axios.post("http://localhost:5000/api/posts", {
        userId, // The ID of the currently logged-in user
        description: description.trim(),
      });
      setDescription(""); // Clear input
      fetchPosts(); // Re-fetch posts to show the new post
    } catch (error) {
      console.error("Error creating post:", error);
      setPostError("Failed to create post.");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      {/* Post Creation Section */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-3">Create New Post</h2>
        <form onSubmit={handlePostSubmit}>
          <textarea
            className="w-full p-2 border rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="What's on your mind?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
          {postError && <p className="text-red-500 text-sm mb-3">{postError}</p>}
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors duration-200"
            disabled={!description.trim()}
          >
            Post
          </button>
        </form>
      </div>

      {isLoading && <p className="text-center text-gray-500">Loading posts...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!isLoading && !error && posts.length === 0 && (
        <p className="text-center text-gray-500">No posts to display.</p>
      )}

      {/* Posts Display */}
      {!isLoading && !error && (
        posts.map((post) => (
          <div key={post._id} className="bg-white p-4 rounded-lg shadow-md mb-4">
            <div className="flex items-center mb-3">
              {/* Avatar/Initial clickable */}
              <div
                className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold text-white mr-3 cursor-pointer"
                onClick={() => handleProfileClick(post.user?._id)} // Pass post.user._id
              >
                {post.user?.fullName?.charAt(0)?.toUpperCase() || 'U'} {/* Added toUpperCase() */}
              </div>
              <div>
                {/* Link to user's profile, also clickable */}
                <Link to={`/profile/${post.user?._id}`} className="font-semibold hover:underline">
                  {post.user?.fullName || 'Unknown User'}
                </Link>
                <p className="text-gray-500 text-sm">
                  {new Date(post.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Delete button (only for current user's posts) */}
              {post.user?._id === userId && (
                <button
                  onClick={() => handleDeletePost(post._id)}
                  className="ml-auto text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              )}
            </div>

            <p className="text-gray-800 mb-3">{post.description}</p>

            <div className="flex items-center space-x-4 text-gray-600 mb-3">
              <button
                onClick={() => handleLike(post._id)}
                className={`flex items-center ${post.likes.includes(userId) ? 'text-blue-600' : ''}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                    clipRule="evenodd"
                  />
                </svg>
                {post.likes.length} Likes
              </button>
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.76-1.39A9.964 9.964 0 005 15V3a2 2 0 00-2 2v9.964c0 .341.05.674.145.991C3.398 15.22 3.53 15.45 3.684 15.677l-.684.684c-.38.38-.85.626-1.378.751A.5.5 0 011 16.732V16c0-4.418 3.582-8 8-8s8 3.582 8 8zm-8-2V5h2v3H8z"
                    clipRule="evenodd"
                  />
                </svg>
                {post.comments.length} Comments
              </span>
            </div>

            {/* Comments Section */}
            {post.comments && post.comments.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <h4 className="font-semibold text-gray-700 mb-2">Comments:</h4>
                {post.comments.map((comment) => (
                  <div key={comment._id} className="bg-gray-100 p-2 rounded-md mb-2 text-sm">
                    <span className="font-semibold mr-1">
                      {comment.sender?.fullName || 'Unknown User'}:
                    </span>
                    {comment.text}
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
        ))
      )}
    </div>
  );
}