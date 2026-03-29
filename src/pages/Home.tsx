import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, MapPin, BookOpen, Star } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Tutor {
  id: string;
  name: string;
  photoURL: string;
  subjects: string[];
  locations: string[];
  hourlyRate: number;
  monthlyRate?: number;
  rating?: number;
  reviewCount?: number;
  isActive?: boolean;
}

export function Home() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const q = query(collection(db, 'tutors'), orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedTutors: Tutor[] = [];
        
        for (const document of querySnapshot.docs) {
          const tutorData = { id: document.id, ...document.data() } as Tutor;
          // Check if tutor is active directly from the tutor document
          if (tutorData.isActive !== false) {
            fetchedTutors.push(tutorData);
          }
        }
        
        setTutors(fetchedTutors);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'tutors');
      } finally {
        setLoading(false);
      }
    };

    fetchTutors();
  }, []);

  // Extract unique subjects and locations for filter dropdowns
  const allSubjects = Array.from(new Set(tutors.flatMap(t => t.subjects))).sort();
  const allLocations = Array.from(new Set(tutors.flatMap(t => t.locations))).sort();

  const filteredTutors = tutors.filter(tutor => {
    const matchesSearch = tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutor.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tutor.locations.some(l => l.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSubject = selectedSubject ? tutor.subjects.includes(selectedSubject) : true;
    const matchesLocation = selectedLocation ? tutor.locations.includes(selectedLocation) : true;
    const matchesPrice = maxPrice ? tutor.hourlyRate <= parseInt(maxPrice) : true;

    return matchesSearch && matchesSubject && matchesLocation && matchesPrice;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Find Your Perfect Tutor in Sri Lanka
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Connect with expert tutors for any subject, anywhere in Sri Lanka. 
            Learn online or in-person.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-4 border border-transparent rounded-xl leading-5 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-white sm:text-lg shadow-lg"
              placeholder="Search by subject, location, or tutor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border bg-slate-50 text-slate-700"
            >
              <option value="">All Subjects</option>
              {allSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border bg-slate-50 text-slate-700"
            >
              <option value="">All Locations</option>
              {allLocations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Max Price (Rs/hr)</label>
            <select
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border bg-slate-50 text-slate-700"
            >
              <option value="">Any Price</option>
              <option value="500">Up to Rs. 500</option>
              <option value="1000">Up to Rs. 1000</option>
              <option value="1500">Up to Rs. 1500</option>
              <option value="2000">Up to Rs. 2000</option>
              <option value="3000">Up to Rs. 3000</option>
              <option value="5000">Up to Rs. 5000</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tutors Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">Featured Tutors</h2>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTutors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTutors.map((tutor) => (
              <Link key={tutor.id} to={`/tutor/${tutor.id}`} className="block group">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                  <div className="p-6 flex-grow">
                    <div className="flex items-center gap-4 mb-4">
                      {tutor.photoURL ? (
                        <img src={tutor.photoURL} alt={tutor.name} className="w-16 h-16 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                          {tutor.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {tutor.name}
                        </h3>
                        <div className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{tutor.rating?.toFixed(1) || 'New'}</span>
                          <span className="text-slate-400 font-normal">
                            ({tutor.reviewCount || 0} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <BookOpen className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{tutor.subjects.join(', ')}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{tutor.locations.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">Rs. {tutor.hourlyRate}/hr</span>
                      {tutor.monthlyRate ? <span className="text-xs text-slate-500 font-medium">Rs. {tutor.monthlyRate}/mo</span> : null}
                    </div>
                    <span className="text-blue-600 font-medium text-sm group-hover:underline">View Profile</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-2">No tutors found</h3>
            <p className="text-slate-500">Try adjusting your search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
}
