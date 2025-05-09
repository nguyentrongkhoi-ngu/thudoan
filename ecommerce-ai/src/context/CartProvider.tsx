'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';

// Define cart item type
type CartItem = {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    imageUrl?: string;
    category: {
      id: string;
      name: string;
    };
  };
};

// Define cart data type
type CartData = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  appliedCoupon: {
    code: string;
    discountPercent?: number;
    discountAmount?: number;
    discountValue: number;
  } | null;
};

type CartContextType = {
  cartCount: number;
  cartTotal: number;
  cartItems: CartItem[];
  refreshCart: () => Promise<void>;
  isLoading: boolean;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateCartItem: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

const CartContext = createContext<CartContextType>({
  cartCount: 0,
  cartTotal: 0,
  cartItems: [],
  refreshCart: async () => {},
  isLoading: false,
  addToCart: async () => {},
  updateCartItem: async () => {},
  removeFromCart: async () => {},
  clearCart: async () => {},
});

export const useCart = () => useContext(CartContext);

type CartProviderProps = {
  children: ReactNode;
};

export default function CartProvider({ children }: CartProviderProps) {
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status, update } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      refreshCart();
    } else if (status === 'unauthenticated') {
      // Xóa giỏ hàng khi người dùng không đăng nhập
      setCartCount(0);
      setCartTotal(0);
      setCartItems([]);
    }

    // Lắng nghe sự kiện cập nhật giỏ hàng
    window.addEventListener('cart-updated', refreshCart);
    return () => window.removeEventListener('cart-updated', refreshCart);
  }, [status]);

  // Refresh lại giỏ hàng khi đăng nhập trạng thái thay đổi
  useEffect(() => {
    if (status === 'authenticated') {
      refreshCart();
    }
  }, [status]);

  const refreshCart = async () => {
    try {
      // Kiểm tra trạng thái đăng nhập trước khi gọi API
      if (status !== 'authenticated') {
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/cart', {
        credentials: 'include', // Đảm bảo cookies được gửi đi
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Người dùng chưa đăng nhập hoặc session hết hạn
          setCartCount(0);
          setCartTotal(0);
          setCartItems([]);
          
          // Nếu có session nhưng server trả về 401, có thể session đã hết hạn
          if (session) {
            console.warn('Session có thể đã hết hạn. Đang cập nhật lại session...');
            await update(); // Cập nhật lại session từ NextAuth
          }
          return;
        }
        throw new Error('Không thể lấy thông tin giỏ hàng');
      }
      
      const data = await response.json();
      
      if (data && data.items) {
        setCartItems(data.items);
        setCartCount(data.items.length);
        // Sử dụng total từ API, đã bao gồm giảm giá nếu có
        setCartTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Lỗi khi lấy giỏ hàng:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Thêm vào giỏ hàng
  const addToCart = async (productId: string, quantity: number) => {
    try {
      // Kiểm tra trạng thái đăng nhập từ useSession
      if (status !== 'authenticated' || !session) {
        toast.error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Đảm bảo cookies được gửi đi
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Xử lý lỗi 401 - Unauthorized
        if (response.status === 401) {
          // Thử cập nhật lại session
          console.warn('Phiên đăng nhập có thể đã hết hạn. Đang cập nhật lại session...');
          await update(); // Cập nhật lại session từ NextAuth
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng thử lại.');
        }
        
        throw new Error(error.error || 'Lỗi khi thêm vào giỏ hàng');
      }

      // Cập nhật giỏ hàng
      await refreshCart();
      toast.success('Đã thêm vào giỏ hàng');
    } catch (error) {
      console.error('Lỗi khi thêm vào giỏ hàng:', error);
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cập nhật số lượng
  const updateCartItem = async (cartItemId: string, quantity: number) => {
    try {
      // Kiểm tra trạng thái đăng nhập từ useSession
      if (status !== 'authenticated' || !session) {
        toast.error('Vui lòng đăng nhập để cập nhật giỏ hàng');
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Đảm bảo cookies được gửi đi
        body: JSON.stringify({ cartItemId, quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Xử lý lỗi 401 - Unauthorized
        if (response.status === 401) {
          // Thử cập nhật lại session
          console.warn('Phiên đăng nhập có thể đã hết hạn. Đang cập nhật lại session...');
          await update(); // Cập nhật lại session từ NextAuth
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng thử lại.');
        }
        
        throw new Error(error.error || 'Lỗi khi cập nhật giỏ hàng');
      }

      // Nếu xóa sản phẩm (quantity = 0)
      if (quantity === 0) {
        toast.success('Đã xóa sản phẩm khỏi giỏ hàng');
      }

      // Cập nhật giỏ hàng
      await refreshCart();
    } catch (error) {
      console.error('Lỗi khi cập nhật giỏ hàng:', error);
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Xóa khỏi giỏ hàng
  const removeFromCart = async (cartItemId: string) => {
    return updateCartItem(cartItemId, 0);
  };

  // Xóa toàn bộ giỏ hàng
  const clearCart = async () => {
    try {
      // Kiểm tra trạng thái đăng nhập từ useSession
      if (status !== 'authenticated' || !session) {
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/cart/clear', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 401) {
          console.warn('Phiên đăng nhập có thể đã hết hạn. Đang cập nhật lại session...');
          await update();
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng thử lại.');
        }
        
        throw new Error(error.error || 'Lỗi khi xóa giỏ hàng');
      }

      // Cập nhật state
      setCartItems([]);
      setCartCount(0);
      setCartTotal(0);
    } catch (error) {
      console.error('Lỗi khi xóa toàn bộ giỏ hàng:', error);
      // Không hiển thị thông báo lỗi vì có thể gây phiền nhiễu trong quá trình thanh toán
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartCount,
        cartTotal,
        cartItems,
        refreshCart,
        isLoading,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
} 