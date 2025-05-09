'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        // Hết thời gian
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
        return;
      }
      
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };
    
    // Tính thời gian ban đầu
    calculateTimeLeft();
    
    // Cập nhật mỗi giây
    const timer = setInterval(calculateTimeLeft, 1000);
    
    // Cleanup khi component unmount
    return () => clearInterval(timer);
  }, [targetDate]);
  
  // Helper để hiển thị số với 2 chữ số
  const formatNumber = (num: number): string => {
    return num < 10 ? `0${num}` : num.toString();
  };
  
  return (
    <div className="flex space-x-2 md:space-x-4">
      <div className="flex flex-col items-center">
        <div className="bg-white text-black font-bold text-xl md:text-3xl rounded-lg w-14 md:w-16 h-14 md:h-16 flex items-center justify-center">
          {formatNumber(timeLeft.days)}
        </div>
        <span className="text-xs mt-1">Ngày</span>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="bg-white text-black font-bold text-xl md:text-3xl rounded-lg w-14 md:w-16 h-14 md:h-16 flex items-center justify-center">
          {formatNumber(timeLeft.hours)}
        </div>
        <span className="text-xs mt-1">Giờ</span>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="bg-white text-black font-bold text-xl md:text-3xl rounded-lg w-14 md:w-16 h-14 md:h-16 flex items-center justify-center">
          {formatNumber(timeLeft.minutes)}
        </div>
        <span className="text-xs mt-1">Phút</span>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="bg-white text-black font-bold text-xl md:text-3xl rounded-lg w-14 md:w-16 h-14 md:h-16 flex items-center justify-center">
          {formatNumber(timeLeft.seconds)}
        </div>
        <span className="text-xs mt-1">Giây</span>
      </div>
    </div>
  );
} 