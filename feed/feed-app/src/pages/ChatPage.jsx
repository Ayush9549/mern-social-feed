import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";

// Ensure socket connection is memoized or managed to prevent multiple connections
const socket = io("http://localhost:5000", { transports: ["websocket"], reconnection: true });

export default function ChatPage() {
  const { userId: receiverId } = useParams(); // Rename userId to receiverId for clarity
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [receiverName, setReceiverName] = useState(); // Renamed for clarity
  // 'users' now stores conversation objects, including user details, lastMessage, and unreadCount
  const [conversations, setConversations] = useState([]);
  const messagesEndRef = useRef(null);
  const currentUserId = localStorage.getItem("userId"); // Get current user ID once

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      // Assuming your backend has an endpoint like /api/messages/conversations?id=<currentUserId>
      const res = await axios.get(`http://localhost:5000/api/messages/conversations?id=${currentUserId}`);
      // Sort conversations by the timestamp of the last message in descending order
      const sortedConversations = res.data.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return timeB - timeA; // Latest message first
      });
      setConversations(sortedConversations);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [currentUserId]);

  useEffect(() => {
    // Redirect if not logged in
    if (!currentUserId) {
      navigate("/login");
      return;
    }

    // Register the current user with the socket server
    socket.emit('register', currentUserId);

    // Fetch conversations on component mount
    fetchConversations();

    // Listen for new messages
    socket.on("newMessage", (message) => {
      // Add a small delay to ensure 'receiverId' is set from URL params
      setTimeout(() => {
        // If the new message is for the current active chat, add it to messages state
        if ((message.sender._id === currentUserId && message.receiver._id === receiverId) ||
            (message.sender._id === receiverId && message.receiver._id === currentUserId)) {
          setMessages((prev) => [...prev, message]);
        }
        // Re-fetch conversations to update unread counts and sorting
        fetchConversations();
      }, 50);
    });

    // Clean up on unmount
    return () => {
      socket.off("newMessage");
      // socket.disconnect(); // Only disconnect if this is the only component using socket
    };
  }, [currentUserId, navigate, receiverId, fetchConversations]); // Add fetchConversations to dependencies

  // Fetch messages between current user and receiver
  useEffect(() => {
    const fetchMessages = async () => {
      if (currentUserId && receiverId) {
        try {
          // Fetch messages between the current user and the selected receiver
          const res = await axios.get(`http://localhost:5000/api/messages/${currentUserId}/${receiverId}`);
          setMessages(res.data);
          scrollToBottom(); // Scroll to bottom after fetching initial messages
          // After fetching messages for a chat, mark them as read by re-fetching conversations
          // This will update the unreadCount for the active chat
          fetchConversations(); // This call is crucial to update the red dot
        } catch (err) {
          console.error("Failed to fetch messages:", err);
        }
      } else {
        // Clear messages if no receiver is selected
        setMessages([]);
      }
    };
    fetchMessages();
  }, [currentUserId, receiverId, fetchConversations]); // Re-fetch messages when currentUserId or receiverId changes

  // Fetch receiver's info
  useEffect(() => {
    const fetchReceiverInfo = async () => {
      if (receiverId) { // Only fetch if receiverId is defined
        try {
          const res = await axios.get(`http://localhost:5000/api/user/get-user/${receiverId}`);
          setReceiverName(res.data.fullName);
        } catch (err) {
          console.error("Failed to fetch receiver info:", err);
          setReceiverName("Unknown User");
        }
      }
    };
    fetchReceiverInfo();
  }, [receiverId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => { // Made sendMessage async
    if (input.trim() && currentUserId && receiverId) {
      socket.emit("privateMessage", {
        to: receiverId,
        from: currentUserId,
        content: input,
      });
      setInput("");
      // Re-fetch conversations after sending a message to update sorting and unread counts
      await fetchConversations(); 
    }
  };

  // Handler for clicking on a conversation in the sidebar
  const handleConversationClick = (convId) => {
    navigate(`/chat/${convId}`);
  };

  return (
    <div className="max-w-6xl mx-auto pt-6 flex" style={{ minHeight: '90vh' }}>
      {/* User List Column */}
      <div className="w-1/4 rounded rounded-e-none py-4 overflow-y-auto bg-primary text-white shadow-lg">
        <h2 className="text-xl ps-4 font-bold mb-4 text-white">Users</h2>
        {conversations.filter(conv => conv.user._id !== currentUserId).map((conv) => ( // Filter out the current user
          <div
            key={conv.user._id}
            className={`p-2 ps-4 cursor-pointer transition-colors hover:bg-gray-500 capitalize relative ${conv.user._id === receiverId ? 'bg-gray-500 text-white' : ''}`}
            onClick={() => handleConversationClick(conv.user._id)} // Use the new handler
          >
            {conv.user.name}
            {/* Red dot for unread messages */}
            {conv.unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                {/* You can display count here if desired, e.g., {conv.unreadCount} */}
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Chat Box Column */}
      <div className="w-3/4 rounded rounded-s-none p-0 flex flex-col bg-white shadow-lg">
        <h1 className="text-2xl font-bold text-primary ps-4 pt-4 h-16 shadow border-b">
          {receiverId ? receiverName : "Select a chat to begin"}
        </h1>
        {/* Chat messages display area */}
        <div className="p-4 mb-4 h-64 overflow-y-scroll flex-1 bg-white hide-scrollbar"> 
          {receiverId ? (
            messages.map((msg, idx) => (
              <div key={idx} className={`mb-2 ${msg.sender._id === currentUserId ? 'text-right ' : 'text-secondary'}`}>
                <span className="font-semibold px-2  me-2">
                  {/* Display 'Me' if current user is sender, otherwise display first letter of sender's full name */}
                  {msg.sender._id === currentUserId ? 'Me' : msg.sender.fullName ? msg.sender.fullName.charAt(0) : ''} 
                </span>
                <span className="border bg rounded-s px-2">{msg.content}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-lg">
              No chat selected. Please select a user from the left panel.
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Conditional rendering for the input and send button */}
        {receiverId && ( // Only render if receiverId exists
          <div className="flex">
            <input
              className="border p-2 py-4 w-full rounded border-none outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
            />
            <button
              className="text-white w-1/6 py-2 px-4 rounded transition-colors flex items-center justify-end disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={sendMessage}
              disabled={!input.trim()}
            >
              <img src="../images/paper-plan.png" alt="Send" className="w-8 h-8 rotate-45" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}