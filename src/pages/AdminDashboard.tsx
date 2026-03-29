import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Users, BookOpen, MessageSquare, Trash2, Power, PowerOff, CreditCard, Settings } from 'lucide-react';

interface UserData {
  uid: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt: any;
}

interface TutorData {
  uid: string;
  name: string;
  subjects: string[];
  hourlyRate: number;
  monthlyRate?: number;
}

interface RequestData {
  id: string;
  studentName: string;
  tutorId: string;
  status: string;
  message: string;
}

interface PaymentData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  slipUrl: string;
  status: string;
  createdAt: any;
}

export function AdminDashboard() {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'tutors' | 'requests' | 'payments' | 'settings'>('users');
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [tutors, setTutors] = useState<TutorData[]>([]);
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [bankDetails, setBankDetails] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

  useEffect(() => {
    if (userRole !== 'admin') return;

    const fetchAllData = async () => {
      try {
        // Fetch Users
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));

        // Fetch Tutors
        const tutorsSnap = await getDocs(collection(db, 'tutors'));
        setTutors(tutorsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as TutorData)));

        // Fetch Requests
        const requestsSnap = await getDocs(collection(db, 'requests'));
        setRequests(requestsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RequestData)));

        // Fetch Payments
        const paymentsSnap = await getDocs(collection(db, 'payments'));
        setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentData)));

        // Fetch Settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        if (settingsSnap.exists()) {
          setBankDetails(settingsSnap.data().bankDetails || '');
        }

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'admin_data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [userRole]);

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(users.filter(u => u.uid !== uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const handleToggleUserStatus = async (uid: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, 'users', uid), { isActive: newStatus });
      
      // Also update tutor profile if it exists to denormalize the status
      try {
        const tutorRef = doc(db, 'tutors', uid);
        const tutorSnap = await getDoc(tutorRef);
        if (tutorSnap.exists()) {
          await updateDoc(tutorRef, { isActive: newStatus });
        }
      } catch (e) {
        console.error("Error updating tutor status:", e);
      }

      setUsers(users.map(u => u.uid === uid ? { ...u, isActive: newStatus } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDeleteTutor = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this tutor profile?')) return;
    try {
      await deleteDoc(doc(db, 'tutors', uid));
      setTutors(tutors.filter(t => t.uid !== uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tutors/${uid}`);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    try {
      await deleteDoc(doc(db, 'requests', id));
      setRequests(requests.filter(r => r.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `requests/${id}`);
    }
  };

  const handleApprovePayment = async (payment: PaymentData) => {
    try {
      // Update payment status
      await updateDoc(doc(db, 'payments', payment.id), { status: 'approved' });
      setPayments(payments.map(p => p.id === payment.id ? { ...p, status: 'approved' } : p));
      
      // Activate user
      await updateDoc(doc(db, 'users', payment.userId), { isActive: true });
      
      // Also activate tutor profile
      try {
        const tutorRef = doc(db, 'tutors', payment.userId);
        const tutorSnap = await getDoc(tutorRef);
        if (tutorSnap.exists()) {
          await updateDoc(tutorRef, { isActive: true });
        }
      } catch (e) {
        console.error("Error updating tutor status:", e);
      }

      setUsers(users.map(u => u.uid === payment.userId ? { ...u, isActive: true } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payments/${payment.id}`);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to reject this payment?')) return;
    try {
      await updateDoc(doc(db, 'payments', paymentId), { status: 'rejected' });
      setPayments(payments.map(p => p.id === paymentId ? { ...p, status: 'rejected' } : p));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `payments/${paymentId}`);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        bankDetails,
        updatedAt: serverTimestamp()
      });
      alert('Settings saved successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    } finally {
      setSavingSettings(false);
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <div className="text-xl font-bold text-red-600">Access Denied</div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-xl">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">{users.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="bg-green-100 p-4 rounded-xl">
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Tutor Profiles</p>
              <p className="text-2xl font-bold text-slate-900">{tutors.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="bg-amber-100 p-4 rounded-xl">
              <MessageSquare className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Requests</p>
              <p className="text-2xl font-bold text-slate-900">{requests.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('tutors')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'tutors' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Tutor Profiles
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'requests' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'payments' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Settings
            </button>
          </div>

          <div className="p-6 overflow-x-auto">
            {activeTab === 'users' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.uid} className="border-b border-slate-100 last:border-0">
                      <td className="py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {u.name}
                          {u.role !== 'admin' && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {u.isActive !== false ? 'Active' : 'Deactivated'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-slate-600">{u.email}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'tutor' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 text-right flex justify-end gap-2">
                        {u.role !== 'admin' && (
                          <button 
                            onClick={() => handleToggleUserStatus(u.uid, u.isActive !== false)} 
                            className={`p-2 rounded-lg transition-colors ${u.isActive !== false ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={u.isActive !== false ? "Deactivate User" : "Activate User"}
                          >
                            {u.isActive !== false ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => handleDeleteUser(u.uid)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'tutors' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Subjects</th>
                    <th className="pb-3 font-medium">Rate</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tutors.map(t => (
                    <tr key={t.uid} className="border-b border-slate-100 last:border-0">
                      <td className="py-4 font-medium text-slate-900">{t.name}</td>
                      <td className="py-4 text-slate-600 max-w-xs truncate">{t.subjects?.join(', ')}</td>
                      <td className="py-4 text-slate-600">
                        <div>Rs. {t.hourlyRate}/hr</div>
                        {t.monthlyRate ? <div className="text-xs text-slate-400">Rs. {t.monthlyRate}/mo</div> : null}
                      </td>
                      <td className="py-4 text-right">
                        <button onClick={() => handleDeleteTutor(t.uid)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'requests' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Tutor ID</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-4 font-medium text-slate-900">{r.studentName}</td>
                      <td className="py-4 text-slate-600 font-mono text-xs">{r.tutorId}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'accepted' ? 'bg-green-100 text-green-700' : r.status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button onClick={() => handleDeleteRequest(r.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'payments' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Slip</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-4 font-medium text-slate-900">
                        <div>{p.userName}</div>
                        <div className="text-xs text-slate-500 font-normal">{p.userEmail}</div>
                      </td>
                      <td className="py-4">
                        <button 
                          onClick={() => setSelectedSlip(p.slipUrl)}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <CreditCard className="w-4 h-4" /> View Slip
                        </button>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.status === 'approved' ? 'bg-green-100 text-green-700' : 
                          p.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 text-right flex justify-end gap-2">
                        {p.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleApprovePayment(p)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRejectPayment(p.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">No payments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" /> Global Settings
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sri Lanka Bank Details (For Account Activation)
                    </label>
                    <textarea
                      rows={6}
                      value={bankDetails}
                      onChange={(e) => setBankDetails(e.target.value)}
                      placeholder="e.g. Bank: Commercial Bank&#10;Account Name: Tutor Finder&#10;Account Number: 1234567890&#10;Branch: Colombo"
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      These details will be shown to deactivated users so they can pay the Rs. 1000 monthly fee.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedSlip(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedSlip(null)}
              className="absolute -top-12 right-0 text-white hover:text-red-400 p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={selectedSlip} alt="Bank Slip" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
