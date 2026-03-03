import { Bell, Lock, Globe } from 'lucide-react';

const Settings = () => {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Settings</h1>

      <div className="max-w-2xl space-y-6">
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-4">
            <Bell size={24} />
            <h2 className="text-xl font-bold">Notifications</h2>
          </div>
          <div className="space-y-3">
            {['Email notifications', 'Push notifications', 'SMS alerts'].map((setting, index) => (
              <label key={index} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 border-2 border-black" defaultChecked />
                <span className="font-medium">{setting}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-4">
            <Lock size={24} />
            <h2 className="text-xl font-bold">Security</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium">
              Change Password
            </button>
            <button className="w-full text-left px-4 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium">
              Two-Factor Authentication
            </button>
            <button className="w-full text-left px-4 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium">
              Active Sessions
            </button>
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-4">
            <Globe size={24} />
            <h2 className="text-xl font-bold">Preferences</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Language</label>
              <select className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Timezone</label>
              <select className="w-full px-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black">
                <option>UTC-5 (Eastern Time)</option>
                <option>UTC-6 (Central Time)</option>
                <option>UTC-8 (Pacific Time)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
