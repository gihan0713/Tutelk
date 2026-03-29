import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { BookOpen, LogOut, User as UserIcon } from 'lucide-react';

export function Navbar() {
  const { user, userRole, login, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl text-slate-900">SriLanka Tutors</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {userRole === 'admin' ? (
                  <Link to="/admin" className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Admin Panel</span>
                  </Link>
                ) : userRole !== 'deactivated' ? (
                  <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                ) : null}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 text-slate-600 hover:text-red-600 font-medium"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={login}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
