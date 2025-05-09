import axios from 'axios';
import { useState, useRef, useEffect, useCallback } from 'react';
// Xóa import từ lodash vì đang gặp vấn đề
// import debounce from 'lodash/debounce';
import { useSession } from 'next-auth/react';
import { logger } from '@/lib/logger';
import api, { isRequestCanceled, createAbortControllerWithTimeout } from '@/lib/axios';

// Tự triển khai hàm debounce để tránh phụ thuộc vào lodash
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      timeout = null;
      func.apply(context, args);
    }, wait);
  } as T;
}

// Constants
const DEBOUNCE_TIME = 500; // ms
const MAX_RETRY = 2;
const MAX_TIMEOUTS_BEFORE_DISABLE = 3;
const TRACKING_DISABLED_TIME = 5 * 60 * 1000; // 5 phút

// Types
interface TrackProductViewPayload {
  productId: string;
  viewDuration?: number;
  lastView?: boolean;
}

interface TrackSearchQueryPayload {
  query: string;
  resultCount: number;
}

interface TrackViewProductParams {
  productId: string;
}

interface TrackSearchParams {
  searchQuery: string;
}

const useUserBehavior = () => {
  const { data: session } = useSession();
  const [hasApiError, setHasApiError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastViewedProductRef = useRef<{ id: string; startTime: number } | null>(null);
  const viewIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutCountRef = useRef(0);
  const apiDisabledUntilRef = useRef<number | null>(null);

  // Track tính năng user đang xem sản phẩm
  const trackProductView = useCallback(
    debounce((productIdOrParams: string | TrackViewProductParams) => {
      // Xác định productId từ tham số đầu vào
      const productId = typeof productIdOrParams === 'string' 
        ? productIdOrParams 
        : productIdOrParams.productId;

      if (!productId) return;

      // Nếu đang xem sản phẩm khác, lưu thời gian xem của sản phẩm trước đó
      if (
        lastViewedProductRef.current &&
        lastViewedProductRef.current.id !== productId
      ) {
        const viewDuration = Date.now() - lastViewedProductRef.current.startTime;
        trackBehaviorAPI({
          productId: lastViewedProductRef.current.id,
          viewDuration,
          lastView: true,
        });
      }

      // Cập nhật sản phẩm mới đang xem
      lastViewedProductRef.current = {
        id: productId,
        startTime: Date.now(),
      };

      // Gọi API để track
      trackBehaviorAPI({ productId });

      // Thiết lập interval để cập nhật thời gian xem mỗi 30 giây
      if (viewIntervalRef.current) {
        clearInterval(viewIntervalRef.current);
      }
      
      viewIntervalRef.current = setInterval(() => {
        if (lastViewedProductRef.current) {
          const viewDuration = Date.now() - lastViewedProductRef.current.startTime;
          trackBehaviorAPI({
            productId: lastViewedProductRef.current.id,
            viewDuration,
          });
        }
      }, 30000); // 30 giây
    }, DEBOUNCE_TIME),
    []
  );

  // Track search query
  const trackSearchQuery = useCallback(
    debounce((query: string, resultCount: number) => {
      if (!query) return;
      trackBehaviorAPI({ query, resultCount });
    }, DEBOUNCE_TIME),
    []
  );

  // Hàm gọi API để track các hoạt động
  const trackBehaviorAPI = async (
    payload: TrackProductViewPayload | TrackSearchQueryPayload,
    retryCount = 0,
    maxRetries = MAX_RETRY
  ): Promise<boolean> => {
    // Kiểm tra nếu API đã bị vô hiệu hóa tạm thời
    if (apiDisabledUntilRef.current && Date.now() < apiDisabledUntilRef.current) {
      return false;
    }

    // Hủy request trước đó nếu có
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('New request started');
    }

    // Tạo AbortController mới với timeout
    const { controller, timeoutId, cleanup } = createAbortControllerWithTimeout();
    abortControllerRef.current = controller;
    timeoutIdRef.current = timeoutId;

    try {
      const userId = session?.user?.id;
      if (!userId) {
        // Không track nếu không có user
        return false;
      }

      // Xác định endpoint dựa vào loại payload
      const endpoint = 'productId' in payload
        ? '/api/tracking/product-view'
        : '/api/tracking/search-query';

      await api.post(endpoint, {
        ...payload,
        userId,
      }, {
        signal: controller.signal
      });

      // Reset timeout counter sau khi thành công
      timeoutCountRef.current = 0;
      
      // Cleanup
      cleanup();
      return true;
    } catch (err: any) {
      cleanup();

      // Xử lý lỗi theo loại
      if (isRequestCanceled(err)) {
        // Request đã bị hủy, log ở debug level
        logger.debug('User behavior tracking request canceled:', err.message);
        return false;
      }

      // Kiểm tra nếu là timeout error
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      
      if (isTimeout) {
        timeoutCountRef.current++;
        if (timeoutCountRef.current >= MAX_TIMEOUTS_BEFORE_DISABLE) {
          logger.warn(`Too many timeouts (${timeoutCountRef.current}), disabling tracking temporarily`);
          apiDisabledUntilRef.current = Date.now() + TRACKING_DISABLED_TIME;
        } else {
          logger.warn(`Timeout when tracking user behavior (${timeoutCountRef.current}/${MAX_TIMEOUTS_BEFORE_DISABLE})`);
        }
      } else {
        logger.error('Error tracking user behavior:', err);
      }

      // Thử lại nếu chưa quá số lần cho phép
      if (retryCount < maxRetries) {
        const backoff = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        logger.info(`Retrying behavior tracking in ${backoff}ms (${retryCount + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, backoff));
        return trackBehaviorAPI(payload, retryCount + 1, maxRetries);
      }

      // Đánh dấu API có lỗi để giảm số request
      if (isTimeout && timeoutCountRef.current < MAX_TIMEOUTS_BEFORE_DISABLE) {
        return false;
      }
      
      if (!(err.response && err.response.status >= 500) || retryCount >= maxRetries) {
        setHasApiError(true);
      }
      
      return false;
    }
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      // Hủy bỏ các request đang chờ
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('Component unmounted');
      }

      // Xóa timeout
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      // Xóa interval
      if (viewIntervalRef.current) {
        clearInterval(viewIntervalRef.current);
      }

      // Lưu lại thời gian xem cuối cùng
      const saveLastView = async () => {
        if (lastViewedProductRef.current && !hasApiError) {
          try {
            const viewDuration = Date.now() - lastViewedProductRef.current.startTime;
            const userId = session?.user?.id;
            
            // Gửi request nhưng không đợi response vì component đã unmount
            await fetch('/api/tracking/product-view', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: lastViewedProductRef.current.id,
                viewDuration,
                lastView: true,
                userId
              }),
              // Sử dụng keepalive để đảm bảo request được gửi
              keepalive: true,
            });
          } catch (error) {
            // Lỗi ở đây có thể bỏ qua vì component đã unmount
            console.error('Failed to save last view on unmount', error);
          }
        }
      };
      
      saveLastView();
    };
  }, [session, hasApiError]);

  return {
    trackProductView,
    trackSearchQuery,
    hasApiError,
  };
};

export default useUserBehavior; 