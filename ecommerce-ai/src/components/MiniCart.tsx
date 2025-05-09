'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, X, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartProvider';

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
};

type CartItem = {
  id: string;
  quantity: number;
  product: Product;
};

type MiniCartProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MiniCart({ isOpen, onClose }: MiniCartProps) {
  const { cartTotal, cartItems, isLoading } = useCart();

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 mt-2 w-80 bg-base-100 rounded-xl shadow-xl border border-base-300 z-50"
        >
          <div className="p-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center">
                <ShoppingBag size={16} className="mr-2" />
                Giỏ hàng của bạn
              </h3>
              <button 
                onClick={onClose}
                className="p-1 rounded-full hover:bg-base-200"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : cartItems.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingBag size={36} className="mx-auto mb-2 text-base-content/40" />
                <p className="text-sm text-base-content/60">Giỏ hàng của bạn đang trống</p>
                <Link 
                  href="/products" 
                  className="text-primary text-sm mt-2 inline-flex items-center" 
                  onClick={onClose}
                >
                  <ArrowRight size={14} className="mr-1 rotate-180" />
                  Tiếp tục mua sắm
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto max-h-60 pr-2 -mr-2">
                  {cartItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex gap-3 py-2 border-b border-base-200 last:border-0">
                      <div className="w-16 h-16 bg-base-200 rounded-md overflow-hidden relative flex-shrink-0">
                        {item.product.imageUrl ? (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-base-content/30">
                            <ShoppingBag size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/products/${item.product.id}`} 
                          className="text-sm font-medium hover:text-primary line-clamp-2"
                          onClick={onClose}
                        >
                          {item.product.name}
                        </Link>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-base-content/70">{item.quantity} x</span>
                          <span className="text-sm font-medium text-primary">
                            {formatCurrency(item.product.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {cartItems.length > 3 && (
                    <div className="text-center py-2 text-sm text-base-content/70">
                      +{cartItems.length - 3} sản phẩm khác
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-base-200">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm">Tổng cộng:</span>
                    <span className="font-medium">{formatCurrency(cartTotal)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link 
                      href="/cart" 
                      className="btn btn-outline btn-sm flex-1"
                      onClick={onClose}
                    >
                      Xem giỏ hàng
                    </Link>
                    <Link 
                      href="/checkout" 
                      className="btn btn-primary btn-sm flex-1"
                      onClick={onClose}
                    >
                      Thanh toán
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 