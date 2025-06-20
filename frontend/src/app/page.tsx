'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStacks } from '@/hooks/useStacks';
import { Shield, CheckCircle, Clock, Users, Zap, Bitcoin } from 'lucide-react';

export default function HomePage() {
  const { isSignedIn, loading, connectWallet, userAddress } = useStacks();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateContract = () => {
    if (isSignedIn) {
      router.push('/dashboard/create');
    } else {
      connectWallet();
    }
  };

  const handleGoToDashboard = () => {
    if (isSignedIn) {
      router.push('/dashboard');
    } else {
      connectWallet();
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
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
                  onClick={handleGoToDashboard}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Dashboard
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </motion.div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Secure Milestone Payments on{' '}
              <span className="bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent">
                Bitcoin
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              WorkShield enables trustless escrow contracts between clients and freelancers, 
              secured by Bitcoin through the Stacks blockchain. No middlemen, just code.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={handleCreateContract}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Create Contract
            </button>
            <button
              onClick={handleGoToDashboard}
              className="border border-orange-500 text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              View Dashboard
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose WorkShield?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built on Bitcoin's security with modern smart contract functionality
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Bitcoin,
                title: 'Bitcoin Security',
                description: 'All contracts secured by Bitcoin through Stacks blockchain'
              },
              {
                icon: CheckCircle,
                title: 'Milestone Payments',
                description: 'Break projects into manageable milestones with individual payments'
              },
              {
                icon: Zap,
                title: 'Instant Payments',
                description: 'Automatic fund release when milestones are approved'
              },
              {
                icon: Shield,
                title: 'Dispute Resolution',
                description: 'Fair conflict resolution system for disagreements'
              },
              {
                icon: Users,
                title: 'No Middlemen',
                description: 'Direct peer-to-peer contracts without intermediaries'
              },
              {
                icon: Clock,
                title: 'Time-locked',
                description: 'Automatic deadline enforcement and fund protection'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-orange-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-orange-100 to-orange-200 rounded-xl mb-4">
                  <feature.icon className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-orange-100 mb-8">
              Join the future of trustless freelance payments secured by Bitcoin
            </p>
            <button
              onClick={handleCreateContract}
              className="bg-white text-orange-600 hover:text-orange-700 px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Create Your First Contract
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
