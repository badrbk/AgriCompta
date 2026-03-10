import { NavLink, useParams } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, ArrowLeftRight, Building2, Beef, Sprout,
  Package, ShoppingCart, BarChart3, Lock, Settings, Leaf,
  ChevronDown, ChevronRight, Users, BookOpen, X, ShieldCheck
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  children?: { label: string; path: string }[];
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const currentProject = useProjectStore((s) => s.currentProject);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'ADMIN';
  const [expandedReports, setExpandedReports] = useState(false);
  const [expandedCrops, setExpandedCrops] = useState(false);

  const projectBase = `/projects/${projectId}`;

  const navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: `${projectBase}/dashboard` },
    { label: 'Transactions', icon: ArrowLeftRight, path: `${projectBase}/transactions` },
    { label: 'Immobilisations', icon: Building2, path: `${projectBase}/assets` },
    { label: 'Cheptel', icon: Beef, path: `${projectBase}/livestock` },
    { label: 'Stocks', icon: Package, path: `${projectBase}/stocks` },
    { label: 'Ventes', icon: ShoppingCart, path: `${projectBase}/sales` },
    { label: 'Clôtures', icon: Lock, path: `${projectBase}/closures` },
  ];

  const cropItems = [
    { label: 'Cultures', path: `${projectBase}/crops` },
    { label: 'Parcelles', path: `${projectBase}/plots` },
  ];

  const reportItems = [
    { label: 'Compte de résultat', path: `${projectBase}/reports/profit-loss` },
    { label: 'Bilan', path: `${projectBase}/reports/balance-sheet` },
    { label: 'Flux de trésorerie', path: `${projectBase}/reports/cash-flow` },
    { label: 'Analyse cultures', path: `${projectBase}/reports/crops` },
    { label: 'Analyse cheptel', path: `${projectBase}/reports/livestock` },
  ];

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-green-700">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-white" />
            <span className="text-white font-bold text-lg">Agri-Compta</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-white hover:text-green-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Projet actif */}
        {currentProject && (
          <div className="px-4 py-3 bg-green-50 border-b border-green-100">
            <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Projet actif</p>
            <p className="text-sm font-semibold text-green-900 truncate">{currentProject.name}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {/* Lien vers les projets */}
          <NavLink
            to="/projects"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Leaf className="h-4 w-4 flex-shrink-0" />
            Mes Projets
          </NavLink>

          {projectId && (
            <>
              <div className="mt-4 mb-2 px-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gestion</p>
              </div>

              {navItems.slice(0, 4).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </NavLink>
              ))}

              {/* Cultures avec sous-menu Parcelles */}
              <button
                onClick={() => setExpandedCrops(!expandedCrops)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <Sprout className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">Cultures</span>
                {expandedCrops ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {expandedCrops && (
                <div className="ml-6 space-y-1">
                  {cropItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => cn(
                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive ? 'bg-green-100 text-green-800 font-medium' : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}

              {navItems.slice(4).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </NavLink>
              ))}

              {/* Rapports avec sous-menu */}
              <div className="mt-4 mb-2 px-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rapports</p>
              </div>

              <button
                onClick={() => setExpandedReports(!expandedReports)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <BarChart3 className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">Rapports financiers</span>
                {expandedReports ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {expandedReports && (
                <div className="ml-6 space-y-1">
                  {reportItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => cn(
                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive ? 'bg-green-100 text-green-800 font-medium' : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}

              {/* Paramètres du projet */}
              <div className="mt-4 mb-2 px-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paramètres</p>
              </div>
              <NavLink
                to={`${projectBase}/settings/associates`}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                Associés
              </NavLink>
              <NavLink
                to={`${projectBase}/settings`}
                end
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                Paramètres projet
              </NavLink>
            </>
          )}

          {/* Plan comptable - global */}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
            <NavLink
              to="/accounts"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <BookOpen className="h-4 w-4 flex-shrink-0" />
              Plan comptable
            </NavLink>

            {/* Gestion utilisateurs — Admin uniquement */}
            {isAdmin && (
              <NavLink
                to="/admin/users"
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-red-100 text-red-800' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                Utilisateurs
              </NavLink>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
