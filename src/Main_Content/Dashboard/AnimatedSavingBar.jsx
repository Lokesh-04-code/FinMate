import { useEffect, useState } from 'react';

function AnimatedSavingsBar({ savingsRate }) {
  const [width, setWidth] = useState('0%');

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, savingsRate));
    const timeout = setTimeout(() => {
      setWidth(`${clamped}%`);
    }, 100); // delay to trigger animation
    return () => clearTimeout(timeout);
  }, [savingsRate]);

  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${
          savingsRate >= 30
            ? 'bg-green-500'
            : savingsRate >= 10
            ? 'bg-yellow-500'
            : 'bg-red-500'
        }`}
        style={{ width }}
      ></div>
    </div>
  );
}

export default AnimatedSavingsBar;
