'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface HeaderProps {
  loading: boolean;
  isSignedIn: boolean;
  userAddress: string | null;
  onGoToDashboard: () => void;
  onConnectWallet: () => void;
}

export default function Header({ 
  loading, 
  isSignedIn, 
  userAddress, 
  onGoToDashboard, 
  onConnectWallet 
}: HeaderProps) {
  return (
    <header className="relative z-10 px-4 sm:px-6 lg:px-8 py-6">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
            WorkShield
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {loading ? (
            <div className="animate-pulse bg-gray-200 h-10 w-32 rounded-lg"></div>
          ) : isSignedIn ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : ''}
              </span>
              <button
                onClick={onGoToDashboard}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Dashboard
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </motion.div>
      </nav>
    </header>
  );
}