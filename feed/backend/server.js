// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import User from "./models/User.js";
import Post from "./models/Post.js";
import Comment from "./models/Comment.js";
import Message from "./models/Message.js";
import bcrypt from "bcrypt";
import messageRoutes from "./routes/messages.js";
import userRoutes from "./routes/users.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Your Vite frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

// Store connected users with their socket IDs
const connectedUsers = {};

// Middleware
app.use(cors({
  origin: "http://localhost:5173", // Your Vite frontend URL
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Make io accessible to routes
app.set('socketio', io);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('register', (userId) => {
    if (userId) {
      connectedUsers[userId] = socket.id;
      console.log(`User ${userId} connected with socket ${socket.id}`);
      socket.join(`user_${userId}`);
    }
  });

  socket.on('privateMessage', async ({ to, from, content }) => {
    try {
      const message = new Message({
        sender: from,
        receiver: to,
        content,
        read: false
      });
      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'fullName profilePicture')
        .populate('receiver', 'fullName profilePicture');

      const targetSocketId = connectedUsers[to];
      if (targetSocketId) {
        io.to(targetSocketId).emit('newMessage', populatedMessage);
      }

      const senderSocketId = connectedUsers[from];
      if (senderSocketId && senderSocketId !== targetSocketId) {
        io.to(senderSocketId).emit('newMessage', populatedMessage);
      }

    } catch (error) {
      console.error('Error handling private message:', error);
    }
  });

  socket.on('typing', ({ to, from }) => {
    const targetSocketId = connectedUsers[to];
    if (targetSocketId) {
      io.to(targetSocketId).emit('userTyping', { from });
    }
  });

  socket.on('disconnect', () => {
    const userId = Object.keys(connectedUsers).find(
      key => connectedUsers[key] === socket.id
    );
    
    if (userId) {
      console.log(`User ${userId} disconnected`);
      delete connectedUsers[userId];
    }
  });
});

// User Authentication Routes
app.post("/api/signup", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ fullName, email, password: passwordHash });
    await newUser.save();
    res.status(201).json({ success: true, userId: newUser._id });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });
    res.json({ success: true, userId: user._id });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login error" });
  }
});

// User Management Routes
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, 'fullName _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

app.get("/api/user/get-user/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId, 'fullName _id bio postsCount followersCount followingCount');
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Failed to fetch user:", err);
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
});

app.put("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName } = req.body;

    if (!fullName || fullName.trim() === '') {
      return res.status(400).json({ success: false, message: "Full name cannot be empty." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fullName: fullName.trim() },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, message: "User name updated successfully.", user: updatedUser });
  } catch (err) {
    console.error("Error updating user name:", err);
    res.status(500).json({ success: false, message: "Failed to update user name." });
  }
});

// Post Routes
app.post("/api/posts", async (req, res) => {
  try {
    const { description, userId } = req.body;
    const post = await Post.create({ description, user: userId });
    io.emit("newPost", post);
    res.json(post);
  } catch (err) {
    res.status(400).json({ success: false, message: "Failed to create post" });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    // DIAGNOSTIC LOG: Print Post schema paths
    console.log("Post Schema Paths:", Object.keys(Post.schema.paths));

    const posts = await Post.find()
      .populate("user", "fullName") // Populate the post's author
      .populate({
        path: 'comments', // Populate the comments array
        populate: {
          path: 'sender', // Populate the user who made the comment (assuming 'sender' field in Comment model)
          select: 'fullName' // Select only fullName for the comment author
        }
      })
      .sort({ createdAt: -1 }); // Sort by latest post first

    res.json(posts);
  } catch (err) {
    console.error("Error fetching posts with comments:", err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/posts/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ user: userId })
      .populate("user", "fullName") // Populate the post's author
      .populate({
        path: 'comments', // Populate the comments array
        populate: {
          path: 'sender', // Populate the user who made the comment
          select: 'fullName'
        }
      })
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Error fetching posts by user:", err);
    res.status(500).json({ success: false, message: "Failed to fetch user posts" });
  }
});

app.post("/api/posts/:postId/like", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const alreadyLiked = post.likes.includes(userId);
    if (alreadyLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();
    res.json({ success: true, likesCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: "Like failed" });
  }
});

app.post("/api/posts/:postId/comments", async (req, res) => {
  const { postId } = req.params;
  const { userId, text } = req.body; // userId from frontend is the sender
  try {
    // Create the comment document, using 'sender' to store the user ID
    const comment = new Comment({ postId, sender: userId, text: text });
    await comment.save();

    // Find the post and push the new comment's ID to its comments array
    await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: comment._id } },
      { new: true }
    );

    res.status(201).json(comment);
  } catch (err) {
    console.error("Error adding comment to post:", err);
    res.status(500).json({ success: false, message: "Comment error" });
  }
});

// Message Routes (if you have a separate messages.js router, ensure it's used)
app.use('/api/messages', messageRoutes); // Uncomment if you have a separate messages router
app.use('/api/users', userRoutes); // Uncomment if you have a separate users router

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
