'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ContractCard } from './contract-card';
import { Contract, UserRole } from '@/types';

interface ContractListProps {
  contracts: Contract[];
  userRole: UserRole;
  onViewDetails: (contractId: number) => void;
}

export default function ContractList({ contracts, userRole, onViewDetails }: ContractListProps) {
  if (contracts.length === 0) {
    return null; // Parent component handles empty state
  }

  return (
    <div className="space-y-4">
      {contracts.map((contract, index) => (
        <motion.div
          key={contract.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <ContractCard
            contract={contract}
            userRole={userRole}
            onViewDetails={onViewDetails}
          />
        </motion.div>
      ))}
    </div>
  );
}