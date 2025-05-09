/**
 * Tiện ích logger đơn giản cho ứng dụng
 * Hỗ trợ nhiều cấp độ logging và xử lý khác nhau giữa môi trường phát triển và sản xuất
 */

// Xác định các cấp độ log
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Cấu trúc cơ bản của logger
const logger = {
  /**
   * Log debug messages (chỉ hiển thị trong môi trường phát triển)
   */
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log thông tin chung
   */
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args);
  },

  /**
   * Log cảnh báo
   */
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Log lỗi
   */
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
    
    // Ở đây có thể thêm logic gửi lỗi đến dịch vụ theo dõi ngoài như Sentry
    if (process.env.NODE_ENV === 'production') {
      // TODO: Thêm tích hợp với dịch vụ giám sát lỗi như Sentry
      // reportErrorToMonitoringService(message, ...args);
    }
  },

  /**
   * Log thông tin hiệu suất
   */
  performance: (label: string, callback: () => void) => {
    if (process.env.NODE_ENV !== 'production') {
      console.time(`[PERF] ${label}`);
      callback();
      console.timeEnd(`[PERF] ${label}`);
    } else {
      callback();
    }
  }
};

export { logger }; 