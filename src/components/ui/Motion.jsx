import { motion, AnimatePresence } from 'framer-motion';

export const SPRING = { type: 'spring', stiffness: 400, damping: 30 };

const fadeInVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function FadeIn({ children, delay = 0, className }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function StaggerList({ children, className }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

const springScaleVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: SPRING },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.15, ease: 'easeIn' } },
};

export function SpringScale({ children, className }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={springScaleVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SlideInPage({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export { AnimatePresence };
