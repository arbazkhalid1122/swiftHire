import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyJWT } from './utils';

let io: SocketIOServer | null = null;
const userSockets = new Map<string, string>(); // userId -> socketId

export function initializeSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyJWT(token);
      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected with socket ${socket.id}`);
    
    // Store user socket mapping
    userSockets.set(userId, socket.id);
    
    // Join user's personal room
    socket.join(`user:${userId}`);

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        // Dynamic import to avoid loading MongoDB at module level
        const { default: connectDB } = await import('./mongodb');
        const Message = (await import('@/models/Message')).default;
        
        await connectDB();
        
        const { receiverId, content, jobId, subject } = data;
        
        if (!receiverId || !content) {
          socket.emit('message_error', { error: 'Receiver ID and content are required' });
          return;
        }

        // Create message in database
        const message = new Message({
          senderId: userId,
          receiverId,
          jobId,
          subject,
          content,
          isRead: false,
        });

        await message.save();

        // Populate message
        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'name email userType companyName')
          .populate('receiverId', 'name email userType companyName')
          .populate('jobId', 'title')
          .lean();

        // Convert ObjectId to string for consistency
        if (populatedMessage) {
          const msg = populatedMessage as any;
          msg._id = msg._id.toString();
          if (msg.senderId && msg.senderId._id) {
            msg.senderId._id = msg.senderId._id.toString();
          }
          if (msg.receiverId && msg.receiverId._id) {
            msg.receiverId._id = msg.receiverId._id.toString();
          }
        }

        // Emit to sender (confirmation)
        socket.emit('message_sent', { message: populatedMessage });

        // Emit to receiver's user room (always emit, socket.io handles if user is offline)
          io?.to(`user:${receiverId}`).emit('new_message', { message: populatedMessage });

        // Also emit to conversation room for real-time updates
        const conversationId = [userId, receiverId].sort().join(':');
        io?.to(`conversation:${conversationId}`).emit('new_message', { message: populatedMessage });
      } catch (error: any) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle joining conversation room
    socket.on('join_conversation', (otherUserId: string) => {
      const conversationId = [userId, otherUserId].sort().join(':');
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation room
    socket.on('leave_conversation', (otherUserId: string) => {
      const conversationId = [userId, otherUserId].sort().join(':');
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });

    // Handle marking messages as read
    socket.on('mark_read', async (data) => {
      try {
        // Dynamic import to avoid loading MongoDB at module level
        const { default: connectDB } = await import('./mongodb');
        const Message = (await import('@/models/Message')).default;
        
        await connectDB();
        const { messageIds } = data;
        
        if (messageIds && Array.isArray(messageIds)) {
          await Message.updateMany(
            { _id: { $in: messageIds }, receiverId: userId },
            { isRead: true }
          );
          
          // Notify sender that messages were read
          const messages = await Message.find({ _id: { $in: messageIds } }).lean();
          const senderIds = [...new Set(messages.map((m: any) => {
            const senderId = m.senderId;
            return typeof senderId === 'object' && senderId._id ? senderId._id.toString() : senderId.toString();
          }))];
          
          senderIds.forEach((senderId) => {
            // Always emit to user room - socket.io handles if user is offline
              io?.to(`user:${senderId}`).emit('messages_read', { messageIds, readBy: userId });
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { receiverId } = data;
      // Always emit to user room - socket.io handles if user is offline
        io?.to(`user:${receiverId}`).emit('user_typing', { userId, isTyping: true });
      
      // Also emit to conversation room
      const conversationId = [userId, receiverId].sort().join(':');
      io?.to(`conversation:${conversationId}`).emit('user_typing', { userId, isTyping: true });
    });

    socket.on('typing_stop', (data) => {
      const { receiverId } = data;
      // Always emit to user room - socket.io handles if user is offline
        io?.to(`user:${receiverId}`).emit('user_typing', { userId, isTyping: false });
      
      // Also emit to conversation room
      const conversationId = [userId, receiverId].sort().join(':');
      io?.to(`conversation:${conversationId}`).emit('user_typing', { userId, isTyping: false });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      userSockets.delete(userId);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

