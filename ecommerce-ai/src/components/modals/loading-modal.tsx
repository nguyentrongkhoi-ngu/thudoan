"use client";

import { useEffect, useState } from "react";

interface LoadingModalProps {
  loading?: boolean;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  loading = false,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (!loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
        <div className="flex items-center space-x-2">
          <div className="h-12 w-12 rounded-full border-t-2 border-b-2 border-primary animate-spin"></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">Vui lòng đợi...</p>
      </div>
    </div>
  );
}; 