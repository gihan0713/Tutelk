import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Send, ArrowLeft, User } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

export function Chat() {
  const { tutorId } = useParams<{ tutorId: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [tutorName, setTutorName] = useState('Tutor');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !tutorId) return;

    // Fetch tutor details
    const fetchTutor = async () => {
      try {
        const tutorDoc = await getDoc(doc(db, 'tutors', tutorId));
        if (tutorDoc.exists()) {
          setTutorName(tutorDoc.data().name);
        }
      } catch (error) {
        console.error("Error fetching tutor:", error);
      }
    };
    fetchTutor();

    // Find or create chat session
    const setupChat = async () => {
      try {
        const chatsRef = collection(db, 'chats');
        const q = query(
          chatsRef, 
          where('studentId', '==', user.uid),
          where('tutorId', '==', tutorId)
        );
        const querySnapshot = await getDocs(q);
        
        let currentChatId = null;
        if (!querySnapshot.empty) {
          currentChatId = querySnapshot.docs[0].id;
        } else {
          // Create new chat
          const newChatRef = await addDoc(chatsRef, {
            studentId: user.uid,
            tutorId: tutorId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          currentChatId = newChatRef.id;
        }
        
        setChatId(currentChatId);

        // Listen for messages
        const messagesRef = collection(db, 'chats', currentChatId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));
        
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Message[];
          setMessages(msgs);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `chats/${currentChatId}/messages`);
        });

        return unsubscribe;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'chats');
      }
    };

    let unsubscribeFn: (() => void) | undefined;
    setupChat().then(unsub => {
      if (unsub) unsubscribeFn = unsub;
    });

    return () => {
      if (unsubscribeFn) unsubscribeFn();
    };
  }, [user, tutorId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !user) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: messageText,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}/messages`);
    }
  };

  if (!user) {
    return <div className="p-8 text-center">Please log in to chat.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{tutorName}</h2>
            <p className="text-xs text-slate-500">Tutor</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user.uid;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow rounded-full border-slate-300 bg-slate-50 px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent border"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12 h-12 shrink-0"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
