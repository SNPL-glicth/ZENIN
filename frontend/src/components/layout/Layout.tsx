import { useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X,
  User,
  Settings,
  MessageSquare,
  Brain,
  AlertTriangle,
  Network,
  LucideIcon
} from 'lucide-react';

interface MenuItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps): React.ReactElement => {
  // Desktop: sidebar abierto por defecto. Móvil: cerrado.
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef<number>(0);
  const sidebarRef = useRef<HTMLElement>(null);

  // Detectar móvil al montar (solo para estado inicial de mobileOpen)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setSidebarOpen(false);
      setMobileOpen(false);
    }
  }, []);

  // Cerrar drawer móvil al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  // Swipe handlers para cerrar drawer en móvil
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    // Swipe left > 50px cierra el drawer
    if (diff > 50) {
      setMobileOpen(false);
    }
  }, []);

  const menuItems: MenuItem[] = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
    { path: '/cognitive-trace', icon: Network, label: 'Cognitive Trace' },
    { path: '/predictions', icon: Brain, label: 'ML Predictions' },
    { path: '/anomalies', icon: AlertTriangle, label: 'Anomalías' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path: string): boolean => location.pathname === path;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Overlay móvil - solo visible cuando drawer abierto */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Hamburger button - solo móvil */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-black text-white rounded-lg shadow-lg md:hidden"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Desktop - siempre visible, ancho variable */}
      <aside
        className={`hidden md:flex bg-black text-white transition-all duration-300 flex-col ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          {sidebarOpen && <h1 className="text-2xl font-bold tracking-tight">ZENIN</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path) ? 'bg-white text-black' : 'hover:bg-gray-800'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {sidebarOpen && user && (
            <div className="mb-4 px-4 py-2">
              <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-gray-800 transition-colors"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar Móvil - drawer offcanvas con swipe */}
      <aside
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-black text-white transition-transform duration-300 flex flex-col shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight">ZENIN</h1>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path) ? 'bg-white text-black' : 'hover:bg-gray-800'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {user && (
            <div className="mb-4 px-4 py-2">
              <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-gray-800 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content - padding diferente para móvil/desktop */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
