import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

let socket;

export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const targetUserId = searchParams.get('userId');
  const itemId = searchParams.get('itemId');

  useEffect(() => {
   socket = io('https://borrow-on-rent-website.onrender.com', {
  transports: ['websocket', 'polling']
});
    socket.emit('join', user._id);
    socket.on('receiveMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    return () => socket.disconnect();
  }, [user._id]);

  useEffect(() => {
    API.get('/messages/conversations').then(res => {
      setConversations(res.data);
      if (targetUserId) {
        const existing = res.data.find(c => c.otherUser._id === targetUserId);
        if (existing) setActiveConv(existing);
        else setActiveConv({ otherUser: { _id: targetUserId }, conversationId: null, isNew: true });
      }
    }).finally(() => setLoading(false));
  }, [targetUserId]);

  useEffect(() => {
    if (activeConv?.conversationId) {
      API.get(`/messages/${activeConv.conversationId}`).then(res => setMessages(res.data));
    } else if (activeConv?.isNew) {
      setMessages([]);
    }
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeConv) return;
    try {
      const res = await API.post('/messages', {
        receiverId: activeConv.otherUser._id,
        message: newMsg.trim(),
        itemId: itemId || null
      });
      setMessages(prev => [...prev, res.data]);
      setNewMsg('');
      if (activeConv.isNew) {
        const ids = [user._id, activeConv.otherUser._id].sort();
        setActiveConv(prev => ({ ...prev, conversationId: `${ids[0]}_${ids[1]}`, isNew: false }));
        API.get('/messages/conversations').then(r => setConversations(r.data));
      }
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Messages</h1>
      <div className="card flex h-[600px] overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-500">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>}
            {conversations.length === 0 && !loading && (
              <div className="p-4 text-center text-gray-400 text-sm">No conversations yet</div>
            )}
            {conversations.map(conv => (
              <button key={conv.conversationId}
                onClick={() => setActiveConv(conv)}
                className={`w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${activeConv?.conversationId === conv.conversationId ? 'bg-primary-50' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                  {conv.otherUser?.avatar
                    ? <img src={conv.otherUser.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    : conv.otherUser?.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{conv.otherUser?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{conv.lastMessage?.message}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">{conv.unread}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {activeConv ? (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                  {activeConv.otherUser?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{activeConv.otherUser?.name || 'User'}</p>
                  {activeConv.item && <p className="text-xs text-gray-400">Re: {activeConv.item.title}</p>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => {
                  const isMine = (msg.sender?._id || msg.from) === user._id;
                  return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-3">
                <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  className="input-field flex-1 py-2.5" placeholder="Type a message..." />
                <button type="submit" className="btn-primary px-5 py-2.5 text-sm">Send</button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-5xl mb-3">💬</div>
                <p>Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
