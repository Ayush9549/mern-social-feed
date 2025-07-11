import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post', // Reference to the Post model
        required: true,
    },
    sender: { // This is the correct field for the user who made the comment
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Removed the redundant 'userId' field
    text: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('Comment', commentSchema);