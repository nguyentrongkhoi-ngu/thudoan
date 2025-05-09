'use client';

import AdminLayout from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

type Category = {
  id: string;
  name: string;
};

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State cho form thêm sản phẩm
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
    imageUrl: ''
  });

  // Lấy danh sách danh mục
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const response = await axios.get('/api/categories');
        
        let categoriesData = [];
        if (response.data && Array.isArray(response.data)) {
          categoriesData = response.data;
        } else if (response.data && response.data.categories) {
          categoriesData = response.data.categories;
        } else {
          console.warn('Dữ liệu API danh mục không đúng cấu trúc mong đợi:', response.data);
          categoriesData = [];
        }
        
        setCategories(categoriesData);
        
        // Tự động chọn danh mục đầu tiên nếu có
        if (categoriesData.length > 0) {
          setProductData(prev => ({
            ...prev,
            categoryId: categoriesData[0].id
          }));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Lỗi khi tải danh mục:', err);
        setError('Không thể tải danh mục sản phẩm');
        setLoading(false);
      }
    }
    
    fetchCategories();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Chuyển đổi giá và tồn kho từ chuỗi sang số
      const formattedData = {
        ...productData,
        price: parseFloat(productData.price),
        stock: parseInt(productData.stock, 10)
      };
      
      // Gọi API để tạo sản phẩm mới
      const response = await axios.post('/api/products', formattedData);
      
      if (response.status === 201) {
        // Chuyển hướng đến trang chi tiết sản phẩm sau khi tạo thành công
        router.push(`/admin/products/${response.data.id}`);
      }
    } catch (err: any) {
      console.error('Lỗi khi tạo sản phẩm:', err);
      
      // Hiển thị thông báo lỗi cụ thể nếu có
      if (err.response && err.response.data && err.response.data.error) {
        if (Array.isArray(err.response.data.error)) {
          setError(err.response.data.error.join(', '));
        } else {
          setError(err.response.data.error);
        }
      } else {
        setError('Không thể tạo sản phẩm. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Thêm Sản Phẩm Mới</h1>
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            onClick={() => router.push('/admin/products')}
          >
            Quay Lại
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tên sản phẩm */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Tên Sản Phẩm <span className="text-red-500">*</span>
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="name"
                name="name"
                type="text"
                placeholder="Nhập tên sản phẩm"
                value={productData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Giá sản phẩm */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
                Giá (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="price"
                name="price"
                type="number"
                min="0"
                step="1000"
                placeholder="Nhập giá sản phẩm"
                value={productData.price}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Tồn kho */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="stock">
                Số Lượng <span className="text-red-500">*</span>
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="stock"
                name="stock"
                type="number"
                min="0"
                placeholder="Nhập số lượng tồn kho"
                value={productData.stock}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Danh mục */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="categoryId">
                Danh Mục <span className="text-red-500">*</span>
              </label>
              <select
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="categoryId"
                name="categoryId"
                value={productData.categoryId}
                onChange={handleInputChange}
                required
              >
                <option value="">Chọn danh mục</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* URL hình ảnh */}
            <div className="mb-4 md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="imageUrl">
                URL Hình Ảnh
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="imageUrl"
                name="imageUrl"
                type="text"
                placeholder="Nhập URL hình ảnh sản phẩm"
                value={productData.imageUrl}
                onChange={handleInputChange}
              />
              
              {productData.imageUrl && (
                <div className="mt-2">
                  <p className="text-gray-500 text-xs mb-1">Xem trước:</p>
                  <img 
                    src={productData.imageUrl} 
                    alt="Xem trước" 
                    className="w-32 h-32 object-cover border rounded"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/300x300?text=Hình+ảnh+lỗi';
                    }} 
                  />
                </div>
              )}
            </div>

            {/* Mô tả sản phẩm */}
            <div className="mb-4 md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Mô Tả
              </label>
              <textarea
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="description"
                name="description"
                rows={4}
                placeholder="Nhập mô tả sản phẩm"
                value={productData.description}
                onChange={handleInputChange}
              />
            </div>

            {/* Các nút chức năng */}
            <div className="md:col-span-2 flex justify-end space-x-4">
              <button
                type="button"
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                onClick={() => router.push('/admin/products')}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Đang Xử Lý...' : 'Tạo Sản Phẩm'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
} 