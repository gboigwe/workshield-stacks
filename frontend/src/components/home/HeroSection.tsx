'use client';

import { motion } from 'framer-motion';

interface HeroSectionProps {
  onCreateContract: () => void;
  onGoToDashboard: () => void;
}

export default function HeroSection({ onCreateContract, onGoToDashboard }: HeroSectionProps) {
  return (
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
            onClick={onCreateContract}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Create Contract
          </button>
          <button
            onClick={onGoToDashboard}
            className="border border-orange-500 text-orange-600 hover:bg-orange-50 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
          >
            View Dashboard
          </button>
        </motion.div>
      </div>
    </section>
  );
}