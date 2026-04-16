'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Music, LogIn, User } from 'lucide-react'
import HeroWave from '@/components/ui/hero-wave'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Animated Background */}
      <HeroWave />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
      
      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-secondary to-accent shadow-lg shadow-primary/20">
                <Music className="h-7 w-7 text-white" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent blur-lg opacity-40" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  VibeAlbums
                </span>
              </h1>
              <p className="text-xs text-zinc-500 tracking-widest uppercase">Music Reviews</p>
            </div>
          </div>
        </motion.div>

        {/* Main Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-xl text-center"
        >
          <h2 className="text-xl md:text-3xl font-bold text-white mb-5 leading-tight">
            Tu Mundo
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Musical Personal
            </span>
          </h2>
          
          <p className="text-base text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed">
            Descubrí albums, escribí reseñas y conectá con amantes de la música. 
            Calificá, creá listas y compartí tu viaje musical.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <Button
            size="lg"
            onClick={() => router.push('/login')}
            className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Iniciar Sesión
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/explore')}
            className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60 transition-all duration-200"
          >
            <User className="mr-2 h-4 w-4" />
            Entrar como Invitado
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
