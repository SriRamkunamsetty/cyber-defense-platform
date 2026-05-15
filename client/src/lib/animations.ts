/**
 * Premium animation utilities for cinematic UI effects
 * Inspired by Apple Intelligence, CrowdStrike Falcon, and futuristic SOC aesthetics
 */

export const animationConfig = {
  // Ultra-smooth easing curves
  easing: {
    smooth: "cubic-bezier(0.23, 1, 0.32, 1)",
    smoothIn: "cubic-bezier(0.77, 0, 0.175, 1)",
    smoothOut: "cubic-bezier(0.16, 1, 0.3, 1)",
    elastic: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },

  // Timing durations (ms)
  duration: {
    instant: 100,
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 800,
    cinematic: 1200,
  },

  // Stagger delays for cascading animations
  stagger: {
    micro: 30,
    small: 50,
    medium: 80,
    large: 120,
  },
};

// Framer Motion variants for common patterns
export const motionVariants = {
  // Fade in with scale
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.4, ease: animationConfig.easing.smooth },
  },

  // Slide in from left
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: animationConfig.easing.smooth },
  },

  // Slide in from right
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: animationConfig.easing.smooth },
  },

  // Glow pulse effect
  glowPulse: {
    animate: {
      boxShadow: [
        "0 0 20px rgba(34, 211, 238, 0.3)",
        "0 0 40px rgba(34, 211, 238, 0.6)",
        "0 0 20px rgba(34, 211, 238, 0.3)",
      ],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },

  // Breathing effect
  breathing: {
    animate: {
      opacity: [1, 0.7, 1],
      scale: [1, 0.98, 1],
    },
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },

  // Shimmer effect
  shimmer: {
    animate: {
      backgroundPosition: ["200% 0", "-200% 0"],
    },
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "linear",
    },
  },

  // Floating animation
  float: {
    animate: {
      y: [-5, 5, -5],
    },
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },

  // Cyber scan wave
  scanWave: {
    animate: {
      backgroundPosition: ["0% 0", "100% 0"],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear",
    },
  },

  // Pulsing indicator
  pulseIndicator: {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.6, 1],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },

  // Typewriter effect
  typewriter: {
    initial: { width: 0 },
    animate: { width: "100%" },
    transition: { duration: 0.5, ease: "easeOut" },
  },

  // Stagger container
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  },

  // Stagger item
  staggerItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  },
};

// CSS animation keyframes for global styles
export const keyframes = `
  @keyframes glow-pulse {
    0%, 100% {
      box-shadow: 0 0 20px rgba(34, 211, 238, 0.3);
    }
    50% {
      box-shadow: 0 0 40px rgba(34, 211, 238, 0.6);
    }
  }

  @keyframes cyber-scan {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @keyframes breathing {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(0.98);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(-5px);
    }
    50% {
      transform: translateY(5px);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @keyframes pulse-indicator {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.6;
    }
  }

  @keyframes warning-pulse {
    0%, 100% {
      background-color: rgba(239, 68, 68, 0.1);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
    }
    50% {
      background-color: rgba(239, 68, 68, 0.2);
      box-shadow: 0 0 40px rgba(239, 68, 68, 0.6);
    }
  }

  @keyframes critical-alert {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes typing {
    0%, 100% {
      width: 0;
    }
    50% {
      width: 100%;
    }
  }
`;
