import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { BookOpen, MapPin, DollarSign, User as UserIcon, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Request {
  id: string;
  studentId: string;
  tutorId: string;
  studentName: string;
  studentEmail: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

export function Dashboard() {
  const { user, userRole } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  // Tutor Profile State
  const [profile, setProfile] = useState({
    name: user?.displayName || '',
    bio: '',
    subjects: '',
    locations: '',
    contactNumber: '',
    hourlyRate: 0,
    monthlyRate: '' as number | string,
    gallery: [] as string[],
    photoURL: user?.photoURL || ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        if (userRole === 'tutor') {
          // Fetch Tutor Profile
          const profileDoc = await getDoc(doc(db, 'tutors', user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            setProfile({
              name: data.name || user.displayName || '',
              bio: data.bio || '',
              subjects: data.subjects?.join(', ') || '',
              locations: data.locations?.join(', ') || '',
              contactNumber: data.contactNumber || '',
              hourlyRate: data.hourlyRate || 0,
              monthlyRate: data.monthlyRate || '',
              gallery: data.gallery || [],
              photoURL: data.photoURL || user.photoURL || ''
            });
          }

          // Fetch incoming requests
          const q = query(collection(db, 'requests'), where('tutorId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          setRequests(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Request)));
        } else if (userRole === 'student') {
          // Fetch outgoing requests
          const q = query(collection(db, 'requests'), where('studentId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          setRequests(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Request)));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'dashboard_data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userRole]);

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64String = canvas.toDataURL('image/jpeg', 0.8);
        setProfile(prev => ({ ...prev, photoURL: base64String }));
      };
    };
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (profile.gallery.length >= 10) {
      alert('You can only upload up to 10 images.');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64String = canvas.toDataURL('image/jpeg', 0.7);
        setProfile(prev => ({ ...prev, gallery: [...prev.gallery, base64String] }));
      };
    };
  };

  const removeImage = (index: number) => {
    setProfile(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const tutorData: any = {
        uid: user.uid,
        name: profile.name,
        photoURL: profile.photoURL,
        bio: profile.bio,
        subjects: profile.subjects.split(',').map(s => s.trim()).filter(Boolean),
        locations: profile.locations.split(',').map(l => l.trim()).filter(Boolean),
        contactNumber: profile.contactNumber,
        hourlyRate: Number(profile.hourlyRate),
        gallery: profile.gallery,
        updatedAt: serverTimestamp()
      };
      
      if (profile.monthlyRate !== '') {
        tutorData.monthlyRate = Number(profile.monthlyRate);
      } else {
        tutorData.monthlyRate = 0; // Or we can just omit it, but setting to 0 is safe
      }
      // Use setDoc with merge: true to create or update
      await setDoc(doc(db, 'tutors', user.uid), tutorData, { merge: true });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: profile.photoURL, name: profile.name });
      alert('Profile saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tutors/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      await updateDoc(doc(db, 'requests', requestId), { status });
      setRequests(requests.map(r => r.id === requestId ? { ...r, status } : r));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${requestId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>

        {userRole === 'tutor' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-blue-600" />
              Tutor Profile
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-6 mb-8">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 flex-shrink-0">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-slate-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  )}
                  <label className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                    <span className="text-white text-xs font-medium">Change</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
                  </label>
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Profile Picture</h3>
                  <p className="text-sm text-slate-500">Click the image to upload a new photo.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                <textarea
                  rows={4}
                  value={profile.bio}
                  onChange={e => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                  placeholder="Tell students about your experience..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Subjects (comma separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.subjects}
                    onChange={e => setProfile({ ...profile, subjects: e.target.value })}
                    className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                    placeholder="Math, Physics, Chemistry"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Locations (comma separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.locations}
                    onChange={e => setProfile({ ...profile, locations: e.target.value })}
                    className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                    placeholder="Colombo, Online, Kandy"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Hourly Rate (Rs.)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={profile.hourlyRate}
                    onChange={e => setProfile({ ...profile, hourlyRate: Number(e.target.value) })}
                    className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Monthly Rate (Rs.) <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profile.monthlyRate}
                    onChange={e => setProfile({ ...profile, monthlyRate: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                    placeholder="e.g. 10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    value={profile.contactNumber}
                    onChange={e => setProfile({ ...profile, contactNumber: e.target.value })}
                    className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border"
                    placeholder="e.g. 077 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Portfolio / Gallery (Max 10 images)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {profile.gallery.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {profile.gallery.length < 10 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors">
                      <span className="text-2xl mb-1">+</span>
                      <span className="text-sm font-medium">Add Image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white font-medium py-3 px-6 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {userRole === 'tutor' ? 'Incoming Requests' : 'My Requests'}
          </h2>
          
          {requests.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No requests found.</p>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <div key={request.id} className="border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-slate-900">
                        {userRole === 'tutor' ? request.studentName : 'Request to Tutor'}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1
                        ${request.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                          request.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {request.status === 'pending' && <Clock className="w-3 h-3" />}
                        {request.status === 'accepted' && <CheckCircle className="w-3 h-3" />}
                        {request.status === 'declined' && <XCircle className="w-3 h-3" />}
                        {request.status}
                      </span>
                    </div>
                    {userRole === 'tutor' && (
                      <p className="text-sm text-slate-500 mb-2 font-medium">{request.studentEmail}</p>
                    )}
                    <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-100 italic">"{request.message}"</p>
                  </div>
                  
                  {userRole === 'tutor' && request.status === 'pending' && (
                    <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      <button
                        onClick={() => handleUpdateRequestStatus(request.id, 'accepted')}
                        className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleUpdateRequestStatus(request.id, 'declined')}
                        className="flex-1 sm:flex-none bg-red-100 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
