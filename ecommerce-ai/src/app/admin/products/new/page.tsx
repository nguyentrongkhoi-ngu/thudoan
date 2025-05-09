'use client';

import AdminLayout from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

type Category = {
  id: string;
  name: string;
};

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productImages, setProductImages] = useState<{url: string; isUploading?: boolean}[]>([]);
  
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

  const handleImageUpload = async (file: File) => {
    try {
      // Thêm một placeholder cho hình ảnh đang được tải lên
      const tempImageIndex = productImages.length;
      setProductImages(prev => [...prev, { url: URL.createObjectURL(file), isUploading: true }]);
      
      setUploadingImage(true);
      
      // Tạo FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Gọi API tải lên
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Lấy URL hình ảnh đã tải lên
      const imageUrl = response.data.url;
      
      // Cập nhật danh sách hình ảnh
      setProductImages(prev => {
        const updated = [...prev];
        updated[tempImageIndex] = { url: imageUrl };
        return updated;
      });
      
      // Nếu là hình ảnh đầu tiên, đặt làm ảnh chính
      if (productImages.length === 0) {
        setProductData(prev => ({
          ...prev,
          imageUrl: imageUrl
        }));
      }
      
      toast.success('Đã tải lên hình ảnh thành công');
    } catch (error) {
      console.error('Lỗi khi tải lên hình ảnh:', error);
      
      // Xóa hình ảnh lỗi khỏi danh sách
      setProductImages(prev => prev.filter((_, index) => index !== productImages.length - 1));
      
      toast.error('Đã xảy ra lỗi khi tải lên hình ảnh');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setProductImages(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    
    // Nếu xóa ảnh chính, cập nhật lại ảnh chính nếu còn hình ảnh khác
    if (productImages[index].url === productData.imageUrl) {
      if (productImages.length > 1) {
        const newMainImageUrl = index === 0 && productImages.length > 1 
          ? productImages[1].url 
          : productImages[0].url;
        
        setProductData(prev => ({
          ...prev,
          imageUrl: newMainImageUrl
        }));
      } else {
        setProductData(prev => ({
          ...prev,
          imageUrl: ''
        }));
      }
    }
  };

  const setAsMainImage = (url: string) => {
    setProductData(prev => ({
      ...prev,
      imageUrl: url
    }));
    toast.success('Đã đặt làm ảnh chính');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Chuyển đổi giá và tồn kho sang số
      const formattedData = {
        ...productData,
        price: parseFloat(productData.price),
        stock: parseInt(productData.stock, 10)
      };
      
      const response = await axios.post('/api/products', formattedData);
      
      if (response.status === 201) {
        const newProductId = response.data.id;
        
        // Thêm các hình ảnh khác nếu có
        if (productImages.length > 0) {
          const imagePromises = productImages
            .filter(img => img.url !== productData.imageUrl) // Lọc các hình ảnh phụ
            .map((img, index) => 
              axios.post(`/api/products/${newProductId}/images`, {
                imageUrl: img.url,
                order: index + 1 // Ảnh chính là thứ tự 0
              })
            );
            
          await Promise.all(imagePromises);
        }
        
        toast.success('Đã thêm sản phẩm thành công');
        
        // Chuyển hướng đến trang danh sách sản phẩm sau khi thêm thành công
        router.push('/admin/products');
      }
    } catch (err: any) {
      console.error('Lỗi khi thêm sản phẩm:', err);
      
      // Hiển thị thông báo lỗi cụ thể nếu có
      if (err.response && err.response.data && err.response.data.error) {
        if (Array.isArray(err.response.data.error)) {
          setError(err.response.data.error.join(', '));
        } else {
          setError(err.response.data.error);
        }
      } else {
        setError('Không thể thêm sản phẩm. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

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

            {/* Quản lý hình ảnh */}
            <div className="mb-4 md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Hình Ảnh Sản Phẩm
              </label>
              
              {/* Khu vực tải lên */}
              <div 
                className={`border-2 border-dashed rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer relative ${
                  uploadingImage ? 'opacity-50' : ''
                }`}
                onClick={() => {
                  if (!uploadingImage) {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleImageUpload(e.target.files[0]);
                      }
                    };
                    input.click();
                  }
                }}
              >
                {uploadingImage ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-sm text-gray-500">Đang tải lên...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p className="text-sm text-gray-500">Click để chọn hình ảnh</p>
                    <p className="text-xs text-gray-400 mt-1">Hỗ trợ PNG, JPG, JPEG</p>
                  </div>
                )}
              </div>
              
              {/* Hiển thị danh sách hình ảnh */}
              {productImages.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">Danh sách hình ảnh:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {productImages.map((image, index) => (
                      <div key={index} className={`relative rounded border ${image.url === productData.imageUrl ? 'ring-2 ring-blue-500' : ''}`}>
                        <img 
                          src={image.url} 
                          alt={`Product image ${index + 1}`} 
                          className="w-full h-32 object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/300x300?text=Hình+ảnh+lỗi';
                          }}
                        />
                        <div className="absolute top-0 right-0 p-1 flex space-x-1">
                          {image.url !== productData.imageUrl && (
                            <button 
                              type="button"
                              className="bg-blue-500 text-white rounded-full p-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAsMainImage(image.url);
                              }}
                              title="Đặt làm ảnh chính"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </button>
                          )}
                          <button 
                            type="button"
                            className="bg-red-500 text-white rounded-full p-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                            }}
                            title="Xóa hình ảnh"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </button>
                        </div>
                        {image.url === productData.imageUrl && (
                          <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-xs py-1 px-2 text-center">
                            Ảnh chính
                          </div>
                        )}
                        {image.isUploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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

            {/* Nút thêm sản phẩm */}
            <div className="md:col-span-2 flex justify-end">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Đang Xử Lý...' : 'Thêm Sản Phẩm'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
} 