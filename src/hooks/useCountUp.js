import { useEffect, useRef, useState } from 'react';

function easeOutQuad(t) {
  return t * (2 - t);
}

export function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(0);
  const startTime = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    if (!target) {
      setValue(0);
      return;
    }

    startTime.current = null;

    function step(timestamp) {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.floor(easeOutQuad(progress) * target));
      if (progress < 1) {
        rafId.current = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    }

    rafId.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId.current);
  }, [target, duration]);

  return value;
}
