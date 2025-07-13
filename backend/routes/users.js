import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation

const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body; // Assuming username is fullName
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullName: username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully", userId: newUser._id });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({ message: "Logged in successfully", userId: user._id, fullName: user.fullName });
  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
});


// Get all users (for chat list, etc.)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, 'fullName _id'); // Fetch only fullName and _id
    res.json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Get a single user's profile information
// This combined route now provides 'fullName', '_id', and 'email'.
// IMPORTANT: If your User model in User.js includes 'bio', 'postsCount', 'followersCount',
// 'followingCount', or 'profilePicture', you should add them to the .select() method below
// (e.g., .select('fullName _id email bio postsCount followersCount followingCount profilePicture')).
router.get('/get-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId as a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Fetch user by ID, selecting all relevant public profile fields
    const user = await User.findById(userId).select('fullName _id email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Server error fetching user data' });
  }
});

// Update user profile (e.g., fullName, bio)
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, bio } = req.body; // Allow updating fullName and bio

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const updateFields = {};
    if (fullName && fullName.trim() !== '') {
      updateFields.fullName = fullName.trim();
    }
    if (bio && bio.trim() !== '') {
      updateFields.bio = bio.trim();
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No fields provided for update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Follow a user
router.post('/:userId/follow', async (req, res) => {
  try {
    const { userId } = req.params; // User to be followed
    const { followerId } = req.body; // User who is following

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(followerId)) {
      return res.status(400).json({ message: 'Invalid user ID(s)' });
    }

    if (userId === followerId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Add followerId to userId's followers array
    await User.findByIdAndUpdate(userId, { $addToSet: { followers: followerId }, $inc: { followersCount: 1 } });
    // Add userId to followerId's following array
    await User.findByIdAndUpdate(followerId, { $addToSet: { following: userId }, $inc: { followingCount: 1 } });

    res.status(200).json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Server error following user' });
  }
});

// Unfollow a user
router.post('/:userId/unfollow', async (req, res) => {
  try {
    const { userId } = req.params; // User to be unfollowed
    const { followerId } = req.body; // User who is unfollowing

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(followerId)) {
      return res.status(400).json({ message: 'Invalid user ID(s)' });
    }

    // Remove followerId from userId's followers array
    await User.findByIdAndUpdate(userId, { $pull: { followers: followerId }, $inc: { followersCount: -1 } });
    // Remove userId from followerId's following array
    await User.findByIdAndUpdate(followerId, { $pull: { following: userId }, $inc: { followingCount: -1 } });

    res.status(200).json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Server error unfollowing user' });
  }
});

// Check if a user is following another user
router.get('/is-following/:userId', async (req, res) => {
  try {
    const { userId } = req.params; // User being checked if followed
    const { followerId } = req.query; // User who is checking (the potential follower)

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(followerId)) {
      return res.status(400).json({ message: 'Invalid user ID(s)' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure 'followers' is an array before calling .includes
    const isFollowing = user.followers && user.followers.includes(followerId);
    res.status(200).json({ isFollowing });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ message: 'Server error checking follow status' });
  }
});

export default router;