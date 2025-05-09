'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import React from 'react';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
};

type ProductImage = {
  id: string;
  productId: string;
  imageUrl: string;
  order: number;
  createdAt: string;
};

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  // Unwrap params using React.use()
  const { id } = React.use(params);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        
        // Lấy thông tin sản phẩm
        const productResponse = await axios.get(`/api/admin/products/${id}`);
        setProduct(productResponse.data);
        
        // Lấy danh sách hình ảnh của sản phẩm
        const imagesResponse = await axios.get(`/api/products/${id}/images`);
        let images = imagesResponse.data || [];
        
        // Thêm ảnh chính vào đầu danh sách nếu không có trong images
        if (productResponse.data.imageUrl && 
            !images.some((img: ProductImage) => img.imageUrl === productResponse.data.imageUrl)) {
          setProductImages([
            {
              id: 'main',
              productId: id,
              imageUrl: productResponse.data.imageUrl,
              order: 0,
              createdAt: productResponse.data.createdAt
            },
            ...images
          ]);
        } else {
          setProductImages(images);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching product data:', err);
        setError('Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.');
        setLoading(false);
      }
    };

    fetchProductData();
  }, [id]);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await axios.delete(`/api/admin/products/${id}`);
      toast.success('Đã xóa sản phẩm thành công');
      router.push('/admin/products');
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Không thể xóa sản phẩm. Vui lòng thử lại sau.');
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      toast.error('Không thể xóa sản phẩm');
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
          <button
            onClick={() => router.push('/admin/products')}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Quay lại danh sách
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded">
          <p>Không tìm thấy sản phẩm</p>
          <button
            onClick={() => router.push('/admin/products')}
            className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Quay lại danh sách
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Chi tiết sản phẩm</h1>
          <div className="flex space-x-4">
            <Link
              href="/admin/products"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Quay lại
            </Link>
            <Link
              href={`/admin/products/${id}/edit`}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Chỉnh sửa
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Xóa
            </button>
          </div>
        </div>

        {/* Product information */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="md:flex">
            {/* Product image section */}
            <div className="md:w-1/3 p-4">
              <div className="bg-gray-100 rounded-lg overflow-hidden h-80 flex items-center justify-center">
                {productImages.length > 0 ? (
                  <img
                    src={productImages[activeImageIndex]?.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/600x400?text=Hình+ảnh+lỗi';
                    }}
                  />
                ) : product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/600x400?text=Hình+ảnh+lỗi';
                    }}
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <svg
                      className="mx-auto h-16 w-16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      ></path>
                    </svg>
                    <p>Không có hình ảnh</p>
                  </div>
                )}
              </div>
              
              {/* Thumbnail images */}
              {productImages.length > 1 && (
                <div className="mt-4">
                  <h3 className="text-md font-semibold text-gray-700 mb-2">Tất cả hình ảnh ({productImages.length})</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {productImages.map((image, index) => (
                      <div 
                        key={image.id} 
                        className={`cursor-pointer border rounded p-1 ${activeImageIndex === index ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200 hover:border-gray-400'}`}
                        onClick={() => setActiveImageIndex(index)}
                      >
                        <img 
                          src={image.imageUrl} 
                          alt={`${product.name} - hình ${index + 1}`}
                          className="w-full h-14 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/100x100?text=Lỗi';
                          }}
                        />
                        {image.imageUrl === product.imageUrl && (
                          <div className="text-xs text-center text-blue-600 mt-1 font-semibold">Ảnh chính</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product details */}
            <div className="md:w-2/3 p-6">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800">{product.name}</h2>
                <div className="mt-2">
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded">
                    {product.category?.name || 'Không có danh mục'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Thông tin chung</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span className="text-gray-600">Giá:</span>
                      <span className="font-semibold text-gray-900">{formatPrice(product.price)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Tồn kho:</span>
                      <span className={`font-semibold ${product.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                        {product.stock} sản phẩm
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">ID sản phẩm:</span>
                      <span className="font-mono text-sm text-gray-900">{product.id}</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Thời gian</h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between">
                      <span className="text-gray-600">Ngày tạo:</span>
                      <span className="text-gray-900">{formatDate(product.createdAt)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-600">Cập nhật lần cuối:</span>
                      <span className="text-gray-900">{formatDate(product.updatedAt)}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Mô tả sản phẩm</h3>
                <div className="prose max-w-none">
                  {product.description ? (
                    <p className="text-gray-700">{product.description}</p>
                  ) : (
                    <p className="text-gray-500 italic">Không có mô tả</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Product stats */}
          <div className="border-t border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Thống kê bán hàng</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500 text-center">Chức năng thống kê đang được phát triển</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Xác nhận xóa sản phẩm</h3>
            <p className="mb-6">Bạn có chắc chắn muốn xóa sản phẩm "{product.name}"? Thao tác này không thể hoàn tác.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                disabled={deleteLoading}
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 