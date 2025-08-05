'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStacks } from '@/hooks/useStacks';
import Header from '@/components/home/Header';
import HeroSection from '@/components/home/HeroSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import CTASection from '@/components/home/CTASection';

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <Header
        loading={loading}
        isSignedIn={isSignedIn}
        userAddress={userAddress}
        onGoToDashboard={handleGoToDashboard}
        onConnectWallet={connectWallet}
      />
      
      <HeroSection
        onCreateContract={handleCreateContract}
        onGoToDashboard={handleGoToDashboard}
      />
      
      <FeaturesSection />
      
      <CTASection onCreateContract={handleCreateContract} />
    </div>
  );
}
