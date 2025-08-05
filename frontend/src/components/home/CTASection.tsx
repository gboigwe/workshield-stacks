'use client';

import { motion } from 'framer-motion';

interface CTASectionProps {
  onCreateContract: () => void;
}

export default function CTASection({ onCreateContract }: CTASectionProps) {
  return (
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
            onClick={onCreateContract}
            className="bg-white text-orange-600 hover:text-orange-700 px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Create Your First Contract
          </button>
        </motion.div>
      </div>
    </section>
  );
}