'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// Số lượng đánh giá hiển thị ban đầu
const INITIAL_REVIEW_LIMIT = 3;

interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    name: string;
    image?: string;
  };
}

interface Pagination {
  total: number;
  pages: number;
  page: number;
  limit: number;
}

interface ReviewsResponse {
  reviews: Review[];
  pagination: Pagination;
}

interface ProductReviewsProps {
  productId: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  // Số lượng đánh giá hiển thị
  const [visibleReviewCount, setVisibleReviewCount] = useState(INITIAL_REVIEW_LIMIT);
  // Thông tin phân trang
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        // Gọi API với limit lớn hơn để tải sẵn nhiều đánh giá
        const response = await axios.get<ReviewsResponse>(
          `/api/products/${productId}/reviews?limit=${INITIAL_REVIEW_LIMIT * 2}`
        );
        
        setReviews(response.data.reviews);
        setPagination(response.data.pagination);
        setTotalReviews(response.data.pagination.total);
        
        // Calculate average rating
        if (response.data.reviews.length > 0) {
          const total = response.data.reviews.reduce((sum: number, review: Review) => sum + review.rating, 0);
          setAverageRating(total / response.data.reviews.length);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError('Không thể tải đánh giá sản phẩm.');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  // Tải thêm đánh giá
  const loadMoreReviews = async () => {
    if (!pagination || pagination.page >= pagination.pages) return;
    
    try {
      const nextPage = pagination.page + 1;
      const response = await axios.get<ReviewsResponse>(
        `/api/products/${productId}/reviews?page=${nextPage}&limit=${pagination.limit}`
      );
      
      // Thêm các đánh giá mới vào danh sách hiện tại
      setReviews(prev => [...prev, ...response.data.reviews]);
      setPagination(response.data.pagination);
      
      // Tăng số lượng đánh giá hiển thị
      setVisibleReviewCount(prev => prev + Math.min(INITIAL_REVIEW_LIMIT, response.data.reviews.length));
    } catch (err) {
      console.error('Error loading more reviews:', err);
      setError('Không thể tải thêm đánh giá.');
    }
  };

  // Hiển thị thêm đánh giá từ cache
  const showMoreReviews = () => {
    if (visibleReviewCount >= reviews.length && pagination && pagination.page < pagination.pages) {
      // Nếu đã hiển thị hết đánh giá trong cache, tải thêm từ server
      loadMoreReviews();
    } else {
      // Nếu còn đánh giá trong cache, chỉ tăng số lượng hiển thị
      setVisibleReviewCount(prev => Math.min(prev + INITIAL_REVIEW_LIMIT, reviews.length));
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      router.push(`/login?redirectTo=/products/${productId}`);
      return;
    }

    try {
      setSubmitting(true);
      // Gửi đánh giá mới
      await axios.post(`/api/products/${productId}/reviews`, {
        rating: newReview.rating,
        comment: newReview.comment
      });
      
      // Refresh reviews
      const response = await axios.get<ReviewsResponse>(
        `/api/products/${productId}/reviews?limit=${INITIAL_REVIEW_LIMIT * 2}`
      );
      
      setReviews(response.data.reviews);
      setPagination(response.data.pagination);
      setTotalReviews(response.data.pagination.total);
      
      // Update average rating
      if (response.data.reviews.length > 0) {
        const total = response.data.reviews.reduce((sum: number, review: Review) => sum + review.rating, 0);
        setAverageRating(total / response.data.reviews.length);
      }
      
      // Reset form
      setNewReview({ rating: 5, comment: '' });
      setShowReviewForm(false);
      
      // Reset visible review count to include the new review
      setVisibleReviewCount(Math.min(INITIAL_REVIEW_LIMIT, response.data.reviews.length));
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('Không thể gửi đánh giá. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <svg 
        key={i}
        xmlns="http://www.w3.org/2000/svg"
        className={`h-5 w-5 ${i < rating ? 'text-yellow-500' : 'text-gray-300'}`}
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-3">
          {Array.from({ length: Math.min(INITIAL_REVIEW_LIMIT, 3) }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Chỉ hiển thị số lượng đánh giá được giới hạn
  const visibleReviews = reviews.slice(0, visibleReviewCount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Đánh giá sản phẩm</h3>
          {totalReviews > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {renderStars(Math.round(averageRating))}
              </div>
              <span className="text-sm text-gray-600">
                ({averageRating.toFixed(1)}/5) từ {totalReviews} đánh giá
              </span>
            </div>
          )}
        </div>
        {session && !showReviewForm && (
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => setShowReviewForm(true)}
          >
            Viết đánh giá
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {showReviewForm && (
        <form onSubmit={handleSubmitReview} className="card bg-base-100 shadow-sm border border-base-300 p-4 my-4">
          <h4 className="font-semibold mb-2">Đánh giá của bạn</h4>
          <div className="form-control mb-2">
            <label className="label">
              <span className="label-text">Xếp hạng</span>
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className="btn btn-sm btn-ghost p-1"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 ${star <= newReview.rating ? 'text-yellow-500' : 'text-gray-300'}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Nhận xét</span>
            </label>
            <textarea 
              className="textarea textarea-bordered h-24"
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
              required
            ></textarea>
          </div>
          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              className="btn btn-sm btn-outline"
              onClick={() => setShowReviewForm(false)}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn btn-sm btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!</p>
          {!session && (
            <button 
              className="btn btn-sm btn-outline mt-2"
              onClick={() => router.push(`/login?redirectTo=/products/${productId}`)}
            >
              Đăng nhập để đánh giá
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleReviews.map((review) => (
            <div key={review.id} className="card bg-base-100 shadow-sm border border-base-300 p-4">
              <div className="flex items-start gap-3">
                <div className="avatar">
                  <div className="w-10 h-10 rounded-full">
                    {review.user.image ? (
                      <img src={review.user.image} alt={review.user.name} />
                    ) : (
                      <div className="bg-primary text-primary-content flex items-center justify-center text-lg font-semibold">
                        {review.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{review.user.name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex my-1">
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-sm mt-1">{review.comment}</p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Nút "Xem thêm đánh giá" khi còn đánh giá chưa hiển thị */}
          {(visibleReviewCount < reviews.length || (pagination && pagination.page < pagination.pages)) && (
            <div className="flex justify-center mt-4">
              <button 
                onClick={showMoreReviews} 
                className="btn btn-outline btn-sm"
              >
                Xem thêm đánh giá ({totalReviews - visibleReviewCount} đánh giá)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 