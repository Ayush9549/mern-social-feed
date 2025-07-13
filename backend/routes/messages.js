import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get all conversations for the current user
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.query.id;
    
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
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          user: {
            _id: '$user._id',
            name: '$user.fullName',
            avatar: '$user.profilePicture'
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

// Get messages between current user and another user - CORRECTED ROUTE
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
    const currentUserId = req.query.id; 
    const otherUserId = req.params.userId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
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
      
      io.to(`user_${otherUserId}`).emit('newMessage', populatedMessage);
      // Also emit back to sender for UI update in their own chat window
      io.to(`user_${currentUserId}`).emit('newMessage', populatedMessage);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

export default router;
