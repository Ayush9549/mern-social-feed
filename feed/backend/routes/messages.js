import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get all conversations for the current user - NOW EXPECTS userId AS QUERY PARAMETER
router.get('/conversations', async (req, res) => { // Changed route path back to no path parameter
  try {
    const userId = req.query.id; // Get userId from query parameters (e.g., ?id=...)

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Find all unique users the current user has messaged with
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userId) },
            { receiver: new mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', new mongoose.Types.ObjectId(userId)] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', new mongoose.Types.ObjectId(userId)] },
                    { $ne: ['$read', true] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users', // The collection name for User model
          localField: '_id',
          foreignField: '_id',
          as: 'user' // Change 'participant' to 'user' to match frontend expectation
        }
      },
      {
        $unwind: '$user' // Unwind 'user'
      },
      {
        $project: {
          _id: 1, // Keep _id for key prop in React
          user: {
            _id: '$user._id',
            fullName: '$user.fullName', // Ensure fullName is returned
            // Add other user fields if needed, e.g., profilePicture
          },
          lastMessage: {
            content: '$lastMessage.content',
            timestamp: '$lastMessage.createdAt',
            sentByMe: {
              $eq: ['$lastMessage.sender', new mongoose.Types.ObjectId(userId)]
            },
            read: '$lastMessage.read'
          },
          unreadCount: 1
        }
      },
      { $sort: { 'lastMessage.timestamp': -1 } }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Error fetching conversations' });
  }
});

// Get messages between current user and another user
// This route is for fetching specific chat messages, not conversations list
// This route will still use path parameters as it's for a specific chat
router.get('/:user1Id/:user2Id', async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params; // Extract both user IDs from path parameters

    if (!mongoose.Types.ObjectId.isValid(user1Id) || !mongoose.Types.ObjectId.isValid(user2Id)) {
      return res.status(400).json({ message: 'Invalid user ID(s)' });
    }

    // Mark messages as read when fetching (messages sent by user2Id to user1Id)
    await Message.updateMany(
      {
        sender: user2Id, // messages sent by the other user
        receiver: user1Id, // received by the current user
        read: false
      },
      { $set: { read: true } }
    );

    // Get messages between the two users
    const messages = await Message.find({
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'fullName profilePicture') // Populate sender info
      .populate('receiver', 'fullName profilePicture'); // Populate receiver info

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a new message
router.post('/:userId', async (req, res) => {
  try {
    const currentUserId = req.query.id; // Sender's ID from query
    const otherUserId = req.params.userId; // Receiver's ID from path
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(currentUserId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Check if the other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create and save the message
    const message = new Message({
      sender: currentUserId,
      receiver: otherUserId,
      content: content.trim(),
      read: false
    });

    await message.save();

    // Emit the new message via WebSocket
    const io = req.app.get('socketio');
    if (io) {
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'fullName profilePicture')
        .populate('receiver', 'fullName profilePicture');
      
      // Emit to sender and receiver
      io.to(`user_${currentUserId}`).emit('newMessage', populatedMessage);
      if (currentUserId !== otherUserId) { // Avoid double-emitting if chatting with self
        io.to(`user_${otherUserId}`).emit('newMessage', populatedMessage);
      }
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

export default router;
