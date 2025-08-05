'use client';

import { motion } from 'framer-motion';
import { Bitcoin, CheckCircle, Zap, Shield, Users, Clock } from 'lucide-react';

const features = [
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
];

export default function FeaturesSection() {
  return (
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
            Built on Bitcoin&apos;s security with modern smart contract functionality
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
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
  );
}