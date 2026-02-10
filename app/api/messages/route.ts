import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';
import { getIO } from '@/lib/socket';

// GET - Get messages for the authenticated user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationWith = searchParams.get('with'); // User ID to get conversation with

    if (conversationWith) {
      // Get conversation between two users
      const messages = await Message.find({
        $or: [
          { senderId: auth.userId, receiverId: conversationWith },
          { senderId: conversationWith, receiverId: auth.userId },
        ],
      })
        .populate('senderId', 'name email userType companyName')
        .populate('receiverId', 'name email userType companyName')
        .populate('jobId', 'title')
        .sort({ createdAt: 1 })
        .lean();

      return NextResponse.json({ messages }, { status: 200 });
    } else {
      // Get all conversations (last message from each conversation)
      const sentMessages = await Message.find({ senderId: auth.userId })
        .populate('receiverId', 'name email userType companyName')
        .sort({ createdAt: -1 })
        .lean();

      const receivedMessages = await Message.find({ receiverId: auth.userId })
        .populate('senderId', 'name email userType companyName')
        .sort({ createdAt: -1 })
        .lean();

      // Combine and deduplicate conversations
      const conversations = new Map();

      [...sentMessages, ...receivedMessages].forEach((msg: any) => {
        const otherUserId = msg.senderId._id.toString() === auth.userId
          ? msg.receiverId._id.toString()
          : msg.senderId._id.toString();
        const otherUser = msg.senderId._id.toString() === auth.userId
          ? msg.receiverId
          : msg.senderId;

        if (!conversations.has(otherUserId)) {
          conversations.set(otherUserId, {
            userId: otherUserId,
            user: otherUser,
            lastMessage: msg,
            unreadCount: 0,
          });
        }
      });

      // Count unread messages
      for (const [userId, conv] of conversations.entries()) {
        const unread = await Message.countDocuments({
          senderId: userId,
          receiverId: auth.userId,
          isRead: false,
        });
        conv.unreadCount = unread;
      }

      return NextResponse.json(
        { conversations: Array.from(conversations.values()) },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Send a message
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { receiverId, jobId, subject, content } = await request.json();

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Receiver ID and content are required' },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      );
    }

    const message = new Message({
      senderId: auth.userId,
      receiverId,
      jobId,
      subject,
      content,
      isRead: false,
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email userType companyName')
      .populate('receiverId', 'name email userType companyName')
      .populate('jobId', 'title')
      .lean();

    // Emit socket event if Socket.IO is available
    const io = getIO();
    if (io) {
      // Emit to receiver if online
      io.to(`user:${receiverId}`).emit('new_message', { message: populatedMessage });
      
      // Also emit to conversation room
      const conversationId = [auth.userId, receiverId].sort().join(':');
      io.to(`conversation:${conversationId}`).emit('new_message', { message: populatedMessage });
    }

    return NextResponse.json(
      { message: populatedMessage },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

