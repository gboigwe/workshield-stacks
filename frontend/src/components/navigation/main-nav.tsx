'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import { 
  Home, 
  LayoutDashboard, 
  FileText, 
  Plus, 
  User, 
  Briefcase,
  LogOut,
  Wallet,
  ChevronDown,
  Menu,
  X,
  Building
} from 'lucide-react';
import { formatAddress } from '@/types';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  requiresAuth?: boolean;
  showBadge?: boolean;
  badgeCount?: number;
}

const MainNavigation: React.FC = () => {
  const { isSignedIn, userAddress, connectWallet, disconnectWallet, clientContracts, freelancerContracts } = useStacks();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Navigation items (fixed structure)
  const publicNavItems: NavItem[] = [
    {
      name: 'Home',
      href: '/',
      icon: <Home className="w-5 h-5" />,
      description: 'Platform overview'
    }
  ];

  const authenticatedNavItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard', // ✅ FIXED: Routes to proper dashboard
      icon: <LayoutDashboard className="w-5 h-5" />,
      description: 'Overview and stats',
      requiresAuth: true
    },
    {
      name: 'Organizations',
      href: '/dashboard/organizations',
      icon: <Building className="w-5 h-5" />,
      description: 'Manage teams',
      requiresAuth: true
    },
    {
      name: 'All Contracts',
      href: '/contracts', // Separate contracts view
      icon: <FileText className="w-5 h-5" />,
      description: 'View all contracts',
      requiresAuth: true,
      showBadge: true,
      badgeCount: (clientContracts?.length || 0) + (freelancerContracts?.length || 0)
    },
    {
      name: 'Create Contract',
      href: '/dashboard/create',
      icon: <Plus className="w-5 h-5" />,
      description: 'Start new project',
      requiresAuth: true
    }
  ];

  const roleBasedNavItems: NavItem[] = [
    {
      name: 'Client View',
      href: '/dashboard?tab=client',
      icon: <User className="w-5 h-5" />,
      description: `${clientContracts?.length || 0} contracts`,
      requiresAuth: true,
      showBadge: true,
      badgeCount: clientContracts?.length || 0
    },
    {
      name: 'Freelancer View',
      href: '/dashboard?tab=freelancer',
      icon: <Briefcase className="w-5 h-5" />,
      description: `${freelancerContracts?.length || 0} contracts`,
      requiresAuth: true,
      showBadge: true,
      badgeCount: freelancerContracts?.length || 0
    }
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === href;
    return pathname.startsWith(href);
  };

  const NavLink: React.FC<{ item: NavItem; mobile?: boolean }> = ({ item, mobile = false }) => {
    const baseClasses = mobile
      ? "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
      : "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors";

    const activeClasses = isActive(item.href)
      ? "bg-orange-100 text-orange-600 font-medium"
      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100";

    return (
      <Link href={item.href} className={`${baseClasses} ${activeClasses}`}>
        {item.icon}
        <span>{item.name}</span>
        {item.showBadge && item.badgeCount !== undefined && item.badgeCount > 0 && (
          <span className="ml-auto bg-orange-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
            {item.badgeCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold text-gray-900">WorkShield</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {/* Public Navigation */}
            {publicNavItems.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}

            {/* Authenticated Navigation */}
            {isSignedIn && authenticatedNavItems.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </div>

          {/* User Menu / Connect Button */}
          <div className="hidden md:flex items-center gap-4">
            {isSignedIn ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">{formatAddress(userAddress || '')}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">Connected Wallet</p>
                      <p className="text-xs text-gray-500 font-mono">{userAddress}</p>
                    </div>
                    
                    {/* Role-based quick links */}
                    <div className="py-2">
                      <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Quick Access
                      </p>
                      {roleBasedNavItems.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <div className="flex items-center gap-2">
                            {item.icon}
                            <span>{item.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{item.description}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 pt-2">
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setIsUserMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 py-4"
          >
            <div className="space-y-2">
              {/* Public Navigation */}
              {publicNavItems.map((item) => (
                <NavLink key={item.name} item={item} mobile />
              ))}

              {/* Authenticated Navigation */}
              {isSignedIn && (
                <>
                  {authenticatedNavItems.map((item) => (
                    <NavLink key={item.name} item={item} mobile />
                  ))}
                  
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Role Views
                    </p>
                    {roleBasedNavItems.map((item) => (
                      <NavLink key={item.name} item={item} mobile />
                    ))}
                  </div>
                </>
              )}

              {/* Mobile User Actions */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                {isSignedIn ? (
                  <>
                    <div className="px-4 py-2">
                      <p className="text-sm font-medium text-gray-900">Connected Wallet</p>
                      <p className="text-xs text-gray-500 font-mono">{userAddress}</p>
                    </div>
                    <button
                      onClick={disconnectWallet}
                      className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Disconnect Wallet
                    </button>
                  </>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <Wallet className="w-5 h-5" />
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Overlay for user menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default MainNavigation;
