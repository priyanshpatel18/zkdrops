'use client'

import { BackgroundBeams } from '@/components/ui/background-beams'
import { Button } from '@/components/ui/button'
import { bricolage } from '@/fonts/bricolage'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const { resolvedTheme } = useTheme()
  const router = useRouter();

  return (
    <section className="relative z-10 h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 text-center text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="max-w-3xl space-y-6 z-50"
      >
        <h1 className={`text-5xl font-bold tracking-tighter lg:text-7xl ${bricolage.className}`}>
          zkdrops
        </h1>
        <p className="text-xl text-muted-foreground">
          Compressed Proof-of-Participation on Solana
        </p>
        <p className="text-sm text-muted-foreground">
          Let creators mint experience tokens (cTokens), attendees claim them via QR codes, and keep everything scalable, verifiable, and privacy-preserving using zero-knowledge proofs.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
          <Button size="lg" className='p-6 rounded-xl' onClick={() => router.push('/dashboard')}>
            <span className='flex items-center gap-2 text-base'>
              Launch App <ArrowRight size={18} />
            </span>
          </Button>
          <Button variant="outline" asChild size="lg" className='p-6 rounded-xl'>
            <a href="https://github.com/TechWizardLabs/zkdrops" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              View Code {resolvedTheme === 'dark' ? (
                <Image src="/github-light-theme.png" alt="GitHub" width={18} height={18} />
              ) : (
                <Image src="/github-dark-theme.png" alt="GitHub" width={18} height={18} />
              )}
            </a>
          </Button>
        </div>
      </motion.div>
      <BackgroundBeams />
    </section>
  )
}
