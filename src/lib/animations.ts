import { Variants } from "framer-motion";

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    x: 30,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] } // spring-like
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};
