import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";

const socket = io("${import.meta.env.VITE_API_BASE_URL}", { transports: ["websocket"], reconnection: true });

export default function ChatPage() {
  const { userId: receiverId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [receiverName, setReceiverName] = useState();
  const [conversations, setConversations] = useState([]);
  const messagesEndRef = useRef(null);
  const currentUserId = localStorage.getItem("userId");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/messages/conversations?id=${currentUserId}`);
      const sortedConversations = res.data.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      setConversations(sortedConversations);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      navigate("/login");
      return;
    }

    socket.emit('register', currentUserId);
    fetchConversations();

    socket.on("newMessage", (message) => {
      setTimeout(() => {
        if (
          message?.sender?._id &&
          message?.receiver?._id &&
          ((message.sender._id === currentUserId && message.receiver._id === receiverId) ||
           (message.sender._id === receiverId && message.receiver._id === currentUserId))
        ) {
          setMessages((prev) => [...prev, message]);
        }
        fetchConversations();
      }, 50);
    });

    return () => {
      socket.off("newMessage");
    };
  }, [currentUserId, navigate, receiverId, fetchConversations]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (currentUserId && receiverId) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/messages/${currentUserId}/${receiverId}`);
          setMessages(res.data);
          scrollToBottom();
          fetchConversations();
        } catch (err) {
          console.error("Failed to fetch messages:", err);
        }
      } else {
        setMessages([]);
      }
    };
    fetchMessages();
  }, [currentUserId, receiverId, fetchConversations]);

  useEffect(() => {
    const fetchReceiverInfo = async () => {
      if (receiverId) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/user/get-user/${receiverId}`);
          setReceiverName(res.data.fullName);
        } catch (err) {
          console.error("Failed to fetch receiver info:", err);
          setReceiverName("Unknown User");
        }
      }
    };
    fetchReceiverInfo();
  }, [receiverId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (input.trim() && currentUserId && receiverId) {
      socket.emit("privateMessage", {
        to: receiverId,
        from: currentUserId,
        content: input,
      });
      setInput("");
      await fetchConversations();
    }
  };

  const handleConversationClick = (convId) => {
    navigate(`/chat/${convId}`);
  };

  return (
    <div className="max-w-6xl mx-auto pt-6 flex" style={{ minHeight: '90vh' }}>
      <div className="w-1/4 rounded rounded-e-none py-4 overflow-y-auto bg-primary text-white shadow-lg">
        <h2 className="text-xl ps-4 font-bold mb-4 text-white">Users</h2>
        {conversations.filter(conv => conv.user._id !== currentUserId).map((conv) => (
          <div
            key={conv.user._id}
            className={`p-2 ps-4 cursor-pointer transition-colors hover:bg-gray-500 capitalize relative ${conv.user._id === receiverId ? 'bg-gray-500 text-white' : ''}`}
            onClick={() => handleConversationClick(conv.user._id)}
          >
            {conv.user.name}
            {conv.unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center text-xs text-white"></span>
            )}
          </div>
        ))}
      </div>

      <div className="w-3/4 rounded rounded-s-none p-0 flex flex-col bg-white shadow-lg">
        <h1 className="text-2xl font-bold text-primary ps-4 pt-4 h-16 shadow border-b">
          {receiverId ? receiverName : "Select a chat to begin"}
        </h1>

        <div className="p-4 mb-4 h-64 overflow-y-scroll flex-1 bg-white hide-scrollbar">
          {receiverId ? (
            messages.map((msg, idx) => (
              <div key={idx} className={`mb-2 ${msg?.sender?._id === currentUserId ? 'text-right' : 'text-secondary'}`}>
                <span className="font-semibold px-2 me-2">
                  {msg?.sender?._id === currentUserId
                    ? 'Me'
                    : msg?.sender?.fullName?.charAt(0) || ''}
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

        {receiverId && (
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
