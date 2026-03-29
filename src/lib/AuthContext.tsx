import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestore-errors';

interface AuthContextType {
  user: User | null;
  userRole: 'student' | 'tutor' | 'admin' | 'deactivated' | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: 'student' | 'tutor') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'tutor' | 'admin' | 'deactivated' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Force admin role for the specific email
          if (currentUser.email === 'gihanproffetionalone@gmail.com') {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (!userDoc.exists() || userDoc.data().role !== 'admin') {
              const userData = {
                uid: currentUser.uid,
                role: 'admin',
                name: currentUser.displayName || 'Admin',
                email: currentUser.email || '',
                photoURL: currentUser.photoURL || '',
                isActive: true,
                createdAt: userDoc.exists() ? userDoc.data().createdAt : serverTimestamp()
              };
              await setDoc(doc(db, 'users', currentUser.uid), userData, { merge: true });
            }
            setUserRole('admin');
            setLoading(false);
          } else {
            // Listen to user document changes
            unsubscribeDoc = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.isActive === false) {
                  setUserRole('deactivated');
                } else {
                  setUserRole(data.role);
                }
              } else {
                setUserRole(null); // Needs to select role
              }
              setLoading(false);
            }, (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
              setLoading(false);
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        }
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = undefined;
        }
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const setRole = async (role: 'student' | 'tutor') => {
    if (!user) return;
    try {
      const userData = {
        uid: user.uid,
        role,
        name: user.displayName || 'Anonymous',
        email: user.email || '',
        photoURL: user.photoURL || '',
        isActive: true,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', user.uid), userData);
      setUserRole(role);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, login, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
