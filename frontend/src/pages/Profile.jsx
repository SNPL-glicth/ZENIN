import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Profile</h1>

      <div className="max-w-2xl">
        <div className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-black text-white flex items-center justify-center text-2xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h2>
              <p className="text-gray-600">{user?.role}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <User size={20} />
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <Mail size={20} />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield size={20} />
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="font-medium">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>

        <button className="w-full bg-black text-white py-3 px-4 font-bold hover:bg-gray-800 transition-colors">
          Edit Profile
        </button>
      </div>
    </div>
  );
};

export default Profile;
