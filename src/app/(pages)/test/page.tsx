'use client'

import { bricolage } from '@/fonts/bricolage'
import { motion } from 'framer-motion'

export default function page() {
  return (
    <motion.h1
      className={`text-4xl sm:text-6xl font-bold leading-tight text-foreground ${bricolage.className} w-full h-[calc(100vh-4rem)] flex items-center justify-center`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      zkdrops
    </motion.h1>
  )
}
