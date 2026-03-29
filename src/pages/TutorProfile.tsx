import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../lib/AuthContext';
import { MapPin, BookOpen, Star, Mail, ArrowLeft, CheckCircle2, MessageSquare, Phone } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface TutorProfileData {
  uid: string;
  name: string;
  photoURL?: string;
  bio?: string;
  subjects: string[];
  locations: string[];
  contactNumber?: string;
  hourlyRate: number;
  monthlyRate?: number;
  rating?: number;
  reviewCount?: number;
  gallery?: string[];
  isActive?: boolean;
}

export function TutorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole, login } = useAuth();
  
  const [tutor, setTutor] = useState<TutorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchTutor = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'tutors', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as TutorProfileData;
          if (data.isActive === false) {
            setIsDeactivated(true);
          } else {
            setTutor(data);
          }
        } else {
          setTutor(null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `tutors/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTutor();
  }, [id]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      login();
      return;
    }
    if (userRole !== 'student') {
      alert('Only students can send requests.');
      return;
    }
    if (!id || !tutor) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'requests'), {
        studentId: user.uid,
        tutorId: id,
        studentName: user.displayName || 'Anonymous Student',
        studentEmail: user.email || '',
        message,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSent(true);
      setMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'requests');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isDeactivated) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 p-4 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Tutor Unavailable</h2>
        <p className="text-slate-600 mb-6">This tutor's profile has been deactivated.</p>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </button>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 p-4 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Tutor not found</h2>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="mb-6 text-slate-600 hover:text-blue-600 flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Search
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 p-8 sm:p-12 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {tutor.photoURL ? (
              <img src={tutor.photoURL} alt={tutor.name} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-4xl border-4 border-white shadow-lg">
                {tutor.name.charAt(0)}
              </div>
            )}
            <div className="text-center sm:text-left flex-grow">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{tutor.name}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-blue-100 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-white">{tutor.rating?.toFixed(1) || 'New'}</span>
                  <span>({tutor.reviewCount || 0} reviews)</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-5 h-5" />
                  <span>{tutor.locations.join(', ')}</span>
                </div>
              </div>
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full font-semibold">
                Rs. {tutor.hourlyRate} / hour
                {tutor.monthlyRate ? ` • Rs. ${tutor.monthlyRate} / month` : ''}
              </div>
              <div className="flex flex-wrap gap-4 mt-6">
                {userRole === 'student' && (
                  <button 
                    onClick={() => navigate(`/chat/${tutor.uid}`)}
                    className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-medium hover:bg-blue-50 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Message Tutor
                  </button>
                )}
                {tutor.contactNumber && (
                  <a 
                    href={`tel:${tutor.contactNumber}`}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-colors backdrop-blur-sm"
                  >
                    <Phone className="w-5 h-5" />
                    {tutor.contactNumber}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">About Me</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {tutor.bio || "This tutor hasn't added a bio yet."}
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Subjects Taught</h2>
                <div className="flex flex-wrap gap-2">
                  {tutor.subjects.map((subject, idx) => (
                    <span key={idx} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium border border-blue-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      {subject}
                    </span>
                  ))}
                </div>
              </section>

              {/* Gallery Section */}
              {tutor.gallery && tutor.gallery.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Portfolio & Gallery</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {tutor.gallery.map((img, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedImage(img)}
                        className="aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer group"
                      >
                        <img src={img} alt={`Gallery image ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar / Contact Form */}
            <div className="lg:col-span-1">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 sticky top-24">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Contact Tutor
                </h3>
                
                {sent ? (
                  <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex flex-col items-center text-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <p className="font-medium">Request sent successfully!</p>
                    <p className="text-sm text-green-700">The tutor will contact you soon.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSendRequest} className="space-y-4">
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white p-3 border"
                        placeholder="Hi, I'm interested in tutoring for..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sending || (user && userRole !== 'student')}
                      className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? 'Sending...' : !user ? 'Sign in to Contact' : userRole !== 'student' ? 'Students Only' : 'Send Request'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[1080px] max-h-[1080px] w-full aspect-square bg-black rounded-lg overflow-hidden shadow-2xl">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={selectedImage} 
              alt="Full size gallery image" 
              className="w-full h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
