"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title = "Bạn có chắc chắn không?",
  description = "Hành động này không thể hoàn tác.",
  confirmText = "Tiếp tục",
  cancelText = "Hủy",
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-lg font-medium mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-5">{description}</p>
        <div className="flex items-center justify-end gap-2">
          <Button
            disabled={loading}
            variant="outline"
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            disabled={loading}
            variant="destructive"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}; 