import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users, Activity, CheckCircle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Users', value: '1,234', icon: Users, trend: '+12%' },
    { label: 'Active Sessions', value: '856', icon: Activity, trend: '+8%' },
    { label: 'Completed Tasks', value: '2,847', icon: CheckCircle, trend: '+23%' },
    { label: 'Growth Rate', value: '34.5%', icon: TrendingUp, trend: '+5%' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.firstName}!</h1>
        <p className="text-gray-600">Here's what's happening with your projects today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon size={24} className="text-black" />
              <span className="text-sm font-bold bg-black text-white px-2 py-1">
                {stat.trend}
              </span>
            </div>
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-4 pb-4 border-b border-gray-200 last:border-0">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium">Activity item {item}</p>
                  <p className="text-sm text-gray-600">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {['Create New Project', 'Invite Team Member', 'Generate Report', 'View Analytics'].map((action, index) => (
              <button
                key={index}
                className="w-full text-left px-4 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
