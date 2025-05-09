/**
 * Cấu hình Axios toàn cục và tiện ích xử lý lỗi
 */
import axios from 'axios';

// Thời gian mặc định cho các yêu cầu timeout
const DEFAULT_TIMEOUT = 15000; // 15 giây

// Tạo thể hiện Axios mới với cấu hình mặc định
const api = axios.create({
  baseURL: '/api',  // URL gốc cho API gọi từ client
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Tiện ích để kiểm tra xem lỗi có phải do request bị hủy không 
 * (CanceledError, AbortError hoặc các dạng tương tự)
 */
export const isRequestCanceled = (error: any): boolean => {
  return (
    axios.isCancel(error) || 
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError' ||
    (error?.message && error?.message.toLowerCase().includes('cancel'))
  );
};

/**
 * Tiện ích để xử lý lỗi Axios với message thân thiện
 * @param error Lỗi từ Axios
 * @param defaultMessage Thông báo mặc định nếu không xác định được lỗi cụ thể
 * @returns Thông báo lỗi thân thiện với người dùng
 */
export const getErrorMessage = (error: any, defaultMessage = 'Đã xảy ra lỗi, vui lòng thử lại sau'): string => {
  if (isRequestCanceled(error)) {
    return 'Yêu cầu đã bị hủy';
  }

  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Kết nối đến máy chủ quá chậm, vui lòng thử lại sau';
  }

  if (error?.response) {
    // Xử lý lỗi theo status code
    const status = error.response.status;
    
    switch (status) {
      case 400:
        return error.response.data?.error || 'Yêu cầu không hợp lệ';
      case 401:
        return 'Vui lòng đăng nhập để tiếp tục';
      case 403:
        return 'Bạn không có quyền truy cập nội dung này';
      case 404:
        return 'Không tìm thấy nội dung yêu cầu';
      case 409:
        return error.response.data?.error || 'Dữ liệu đã tồn tại hoặc có xung đột';
      case 429:
        return 'Quá nhiều yêu cầu, vui lòng thử lại sau';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Máy chủ đang gặp sự cố, vui lòng thử lại sau';
      default:
        return error.response.data?.error || defaultMessage;
    }
  }

  if (error?.request) {
    // Request đã được gửi nhưng không nhận được response
    return 'Không thể kết nối đến máy chủ, vui lòng kiểm tra kết nối mạng';
  }

  // Lỗi khi thiết lập request
  return error?.message || defaultMessage;
};

/**
 * Tạo AbortController mới với timeout tự động
 * @param timeoutMs Thời gian timeout (ms)
 * @returns Đối tượng { controller, timeoutId } để có thể xóa timeout và controller sau khi sử dụng
 */
export const createAbortControllerWithTimeout = (timeoutMs = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort('Request timeout');
  }, timeoutMs);

  return {
    controller,
    timeoutId,
    cleanup: () => clearTimeout(timeoutId)
  };
};

export default api; 