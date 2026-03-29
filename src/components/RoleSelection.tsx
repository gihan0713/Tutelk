import { useAuth } from '../lib/AuthContext';
import { GraduationCap, BookOpen } from 'lucide-react';

export function RoleSelection() {
  const { setRole } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to SriLanka Tutors</h2>
        <p className="text-slate-600 mb-8">Please select how you want to use the platform.</p>
        
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => setRole('student')}
            className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">I am a Student</h3>
              <p className="text-sm text-slate-500">I want to find a tutor</p>
            </div>
          </button>

          <button
            onClick={() => setRole('tutor')}
            className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">I am a Tutor</h3>
              <p className="text-sm text-slate-500">I want to teach students</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
