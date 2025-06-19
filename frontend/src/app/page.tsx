'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStacks } from '@/hooks/useStacks';
import { Shield, CheckCircle, Clock, Users, Zap, Bitcoin } from 'lucide-react';

export default function HomePage() {
  const { isSignedIn, loading, connectWallet, userAddress } = useStacks();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                </span>
                <a
                  href="/dashboard"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                >
                  Dashboard
                </a>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
              >
                Connect Wallet
              </button>
            )}
          </motion.div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-orange-100 border border-orange-200 mb-6">
                <Bitcoin className="w-4 h-4 text-orange-600 mr-2" />
                <span className="text-sm font-medium text-orange-800">
                  Secured by Bitcoin
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Secure
                <span className="block text-orange-600">Milestone</span>
                <span className="block">Payments</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                WorkShield enables trustless milestone-based payment contracts between clients and freelancers. 
                Built on Stacks with Bitcoin-level security.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                {isSignedIn ? (
                  <>
                    <a
                      href="/contracts/create"
                      className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                    >
                      Create Contract
                    </a>
                    <a
                      href="/dashboard"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white text-orange-600 font-medium rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-all duration-200 hover:-translate-y-1"
                    >
                      View Dashboard
                    </a>
                  </>
                ) : (
                  <>
                    <button
                      onClick={connectWallet}
                      className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                    >
                      Get Started
                    </button>
                    <a
                      href="#features"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white text-orange-600 font-medium rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-all duration-200 hover:-translate-y-1"
                    >
                      Learn More
                    </a>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-8">
                <div className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-2" />
                  <span>Bitcoin Secured</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-2" />
                  <span>0% Platform Fees</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-2" />
                  <span>Instant Payments</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Demo Card */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                  <h3 className="text-white font-semibold">Contract Preview</h3>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Project:</span>
                      <span className="font-medium">Website Redesign</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">500 STX</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Milestones</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm">Design Mockups</span>
                        </div>
                        <span className="text-sm font-medium">150 STX</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-orange-500 mr-2" />
                          <span className="text-sm">Frontend Development</span>
                        </div>
                        <span className="text-sm font-medium">250 STX</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2"></div>
                          <span className="text-sm">Testing & Deployment</span>
                        </div>
                        <span className="text-sm font-medium">100 STX</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose WorkShield?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built on Stacks with Bitcoin-level security, WorkShield provides the most secure and transparent platform for freelance payments.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Bitcoin Security",
                description: "All contracts are secured by Bitcoin's robust security model through the Stacks blockchain."
              },
              {
                icon: Zap,
                title: "Instant Payments",
                description: "Automatic payment release when milestones are approved. No waiting, no intermediaries."
              },
              {
                icon: Users,
                title: "Dispute Resolution",
                description: "Fair and transparent dispute resolution system to protect both clients and freelancers."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-orange-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow duration-200"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl mb-6">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
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
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Start Securing Your Payments?
            </h2>
            <p className="text-xl text-orange-100 mb-8">
              Join the future of freelance payments with Bitcoin-level security.
            </p>
            {!isSignedIn && (
              <button
                onClick={connectWallet}
                className="bg-white text-orange-600 px-8 py-4 rounded-xl font-semibold hover:bg-orange-50 transition-colors duration-200 shadow-lg"
              >
                Connect Wallet & Get Started
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold">WorkShield</span>
            </div>
            <p className="text-gray-400 text-center md:text-right">
              Built for Stacks Ascent Program • Secured by Bitcoin
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
