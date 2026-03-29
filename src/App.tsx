import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { collection, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { RoleSelection } from './components/RoleSelection';
import { Home } from './pages/Home';
import { TutorProfile } from './pages/TutorProfile';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Chat } from './pages/Chat';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

function DeactivatedView() {
  const { user } = useAuth();
  const [bankDetails, setBankDetails] = useState('');
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBankDetails(docSnap.data().bankDetails);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setSlipImage(compressedBase64);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!slipImage || !user) return;
    setUploading(true);
    try {
      await addDoc(collection(db, 'payments'), {
        userId: user.uid,
        userName: user.displayName || 'Unknown',
        userEmail: user.email,
        slipUrl: slipImage,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'payments');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Deactivated</h2>
          <p className="text-slate-600 mb-6">
            Your account has been deactivated. To activate your account, please pay this month's fee of <strong>Rs. 1000</strong> and upload the bank slip.
          </p>

          {bankDetails && (
            <div className="bg-slate-50 p-4 rounded-lg text-left mb-6 border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-2">Sri Lanka Bank Details:</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{bankDetails}</p>
            </div>
          )}

          {success ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
              Bank slip uploaded successfully! An admin will review it shortly.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 text-left">Upload Bank Slip</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {slipImage && (
                <div className="mt-4">
                  <img src={slipImage} alt="Bank Slip Preview" className="w-full h-48 object-cover rounded-lg border border-slate-200" />
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={!slipImage || uploading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Submit Payment Slip'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!userRole) {
    return <RoleSelection />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If user is logged in but hasn't selected a role, force them to select one
  if (user && !userRole) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <RoleSelection />
      </div>
    );
  }

  if (userRole === 'deactivated') {
    return <DeactivatedView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tutor/:id" element={<TutorProfile />} />
          <Route 
            path="/chat/:tutorId" 
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
