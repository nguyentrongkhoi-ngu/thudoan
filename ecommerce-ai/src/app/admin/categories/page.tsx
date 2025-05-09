"use client";

import axios from "axios";
import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { FileEdit, Trash, AlertCircle, Info, Search, Plus, ImageIcon, Image as ImageComponent, Loader2, Upload, Download, FileJson, FileSpreadsheet, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingModal } from "@/components/modals/loading-modal";
import { AlertModal } from "@/components/modals/alert-modal";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Alert, AlertDescription } from "@/components/ui/alert";
import debounce from 'lodash.debounce';
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Đăng ký các thành phần Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Schema xác thực danh mục
const formSchema = z.object({
  name: z.string().min(1, { message: "Tên danh mục là bắt buộc" }),
  imageUrl: z.string().optional(),
  parentId: z.string().optional().nullable(),
  description: z.string().optional(),
  sortOrder: z.number().optional().nullable(),
});

type CategoryColumn = {
  id: string;
  name: string;
  imageUrl: string | null;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  parentCategory?: CategoryColumn;
  subCategories?: CategoryColumn[];
  _count?: {
    products: number;
    subCategories?: number;
  }
};

// Định nghĩa interface cho dữ liệu thống kê danh mục
interface CategoryStats {
  id: string;
  name: string;
  imageUrl: string | null;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
}

const CategoriesPage = () => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryColumn[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<CategoryColumn[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState<boolean>(false);
  const [dataSeeded, setDataSeeded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [showProductsForCategory, setShowProductsForCategory] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Định nghĩa form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
      parentId: "none",
      description: "",
      sortOrder: 0,
    },
  });

  // Xử lý tải danh mục
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      console.log("Đang lấy danh sách danh mục...");
      
      try {
        const response = await axios.get('/api/categories?includeStructure=true');
        console.log("API response data:", response.data);
        
        // Kiểm tra dữ liệu mẫu
        const hasMockData = response.headers['x-mock-data'] === 'true';
        setUsingMockData(hasMockData);
        
        // Kiểm tra nếu dữ liệu vừa được khởi tạo
        if (response.headers['x-data-seeded'] === 'true') {
          setDataSeeded(true);
          toast.success('Đã khởi tạo dữ liệu mẫu vào cơ sở dữ liệu!');
        }
        
        // Tổ chức dữ liệu danh mục
        let categoriesData = response.data || [];
        
        // Sắp xếp danh mục theo thứ tự
        categoriesData = categoriesData.sort((a: CategoryColumn, b: CategoryColumn) => {
          // Ưu tiên sắp xếp theo sortOrder
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          // Nếu cùng sortOrder, sắp xếp theo thời gian tạo (mới nhất lên đầu)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setCategories(categoriesData);
        setFilteredCategories(categoriesData);
      } catch (requestError: any) {
        console.error("Request error:", requestError);
        console.error("Error status:", requestError?.response?.status);
        
        const errorMessage = requestError?.response?.data?.error || "Không thể tải danh mục";
        const errorDetails = requestError?.response?.data?.details || "";
        const fullError = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
        
        setErrorMessage(fullError);
        toast.error(fullError);
        
        // Nếu có dữ liệu mẫu trong lỗi response, hiển thị nó
        if (requestError?.response?.data?.length > 0 && 
            requestError.response.data[0]?.id?.startsWith('mock-')) {
          setCategories(requestError.response.data || []);
          setFilteredCategories(requestError.response.data || []);
          setUsingMockData(true);
        }
      }
    } catch (error) {
      console.error("Error in fetchCategories:", error);
      const message = error instanceof Error ? error.message : "Đã xảy ra lỗi khi tải danh mục";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Tải danh mục khi component được mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Xử lý tìm kiếm danh mục
  const handleSearch = useCallback(
    debounce((term: string) => {
      if (!term.trim()) {
        setFilteredCategories(categories);
        return;
      }
      
      const searchResults = categories.filter(
        category => category.name.toLowerCase().includes(term.toLowerCase())
      );
      
      setFilteredCategories(searchResults);
    }, 300),
    [categories]
  );

  // Xử lý tìm kiếm khi searchTerm thay đổi
  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, handleSearch]);
  
  // Chuyển danh sách danh mục phẳng thành cấu trúc cây
  const getCategoryTree = () => {
    if (!categories.length) return [];
    
    const rootCategories = categories.filter(cat => !cat.parentId);
    
    const buildTree = (parentCategories: CategoryColumn[]): CategoryColumn[] => {
      return parentCategories.map(parent => {
        const children = categories.filter(cat => cat.parentId === parent.id);
        return {
          ...parent,
          subCategories: children.length ? buildTree(children) : []
        };
      });
    };
    
    return buildTree(rootCategories);
  };
  
  // Chuyển cấu trúc cây thành danh sách phẳng cho việc hiển thị
  const flattenCategoryTree = (tree: CategoryColumn[], level = 0): CategoryColumn[] => {
    return tree.reduce((acc: CategoryColumn[], node: CategoryColumn) => {
      const flatNode = { 
        ...node, 
        level // Thêm level để đánh dấu độ sâu của danh mục trong cây
      };
      acc.push(flatNode);
      
      if (node.subCategories && node.subCategories.length > 0) {
        acc = [...acc, ...flattenCategoryTree(node.subCategories, level + 1)];
      }
      
      return acc;
    }, []);
  };
  
  // Sắp xếp và phân cấp danh mục
  const treeCategories = useMemo(() => {
    const tree = getCategoryTree();
    return flattenCategoryTree(tree);
  }, [categories]);
  
  // Lọc cây danh mục theo từ khóa tìm kiếm
  const getFilteredTreeCategories = () => {
    if (!searchTerm) return treeCategories;
    
    return treeCategories.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Lọc theo tab và view mode
  useEffect(() => {
    if (viewMode === 'tree') {
      // Trong chế độ cây, sử dụng cấu trúc cây đã lọc
      if (activeTab === "all") {
        setFilteredCategories(getFilteredTreeCategories());
      } else if (activeTab === "parent") {
        setFilteredCategories(
          getFilteredTreeCategories().filter(cat => !cat.parentId)
        );
      } else if (activeTab === "sub") {
        setFilteredCategories(
          getFilteredTreeCategories().filter(cat => !!cat.parentId)
        );
      }
    } else {
      // Chế độ danh sách phẳng (giống code cũ)
      if (activeTab === "all") {
        handleSearch(searchTerm);
      } else if (activeTab === "parent") {
        const parentCategories = categories.filter(
          category => !category.parentId && 
          category.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredCategories(parentCategories);
      } else if (activeTab === "sub") {
        const subCategories = categories.filter(
          category => category.parentId && 
          category.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredCategories(subCategories);
      }
    }
    
    // Reset selected categories when filtering changes
    setSelectedCategories([]);
  }, [activeTab, categories, searchTerm, handleSearch, viewMode, treeCategories]);

  // Handle selecting a category (for bulk operations)
  const toggleCategorySelection = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) 
        ? prev.filter(categoryId => categoryId !== id) 
        : [...prev, id]
    );
  };

  // Select/deselect all visible categories
  const toggleSelectAll = () => {
    if (selectedCategories.length === filteredCategories.length) {
      // If all are selected, deselect all
      setSelectedCategories([]);
    } else {
      // Otherwise select all visible categories
      setSelectedCategories(filteredCategories.map(cat => cat.id));
    }
  };

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (selectedCategories.length === 0) return;
    
    try {
      setLoading(true);
      let success = true;
      let failedCategories: Array<{id: string, name: string, reason: string}> = [];
      
      // First, check each category for products and subcategories
      for (const id of selectedCategories) {
        try {
          // Get the category details
          const categoryResponse = await axios.get(`/api/categories/${id}`);
          const category = categoryResponse.data;
          
          // Check if this category has subcategories
          const hasSubcategories = categories.some(c => c.parentId === id);
          
          // Check if this category has products (we need an additional API for this)
          const hasProducts = category._count?.products > 0;
          
          // Skip deletion check if it has dependencies
          if (hasSubcategories || hasProducts) {
            success = false;
            const categoryName = category.name || categories.find(c => c.id === id)?.name || id;
            let reason = '';
            
            if (hasSubcategories && hasProducts) {
              reason = 'có cả danh mục con và sản phẩm';
            } else if (hasSubcategories) {
              reason = 'có danh mục con';
            } else {
              reason = 'có sản phẩm';
            }
            
            failedCategories.push({
              id,
              name: categoryName,
              reason
            });
          }
        } catch (error) {
          console.error(`Lỗi khi kiểm tra danh mục ${id}:`, error);
        }
      }
      
      // Filter out categories that cannot be deleted
      const categoriesToDelete = selectedCategories.filter(
        id => !failedCategories.some(fc => fc.id === id)
      );
      
      // If we have categories to delete, proceed
      if (categoriesToDelete.length > 0) {
        let deleteSuccess = true;
        
        // Delete each category
        for (const id of categoriesToDelete) {
          try {
            await axios.delete(`/api/categories/${id}`);
          } catch (error: any) {
            console.error(`Lỗi khi xóa danh mục ${id}:`, error);
            deleteSuccess = false;
            
            // Get the category name for better error message
            const categoryName = categories.find(c => c.id === id)?.name || id;
            failedCategories.push({
              id,
              name: categoryName,
              reason: 'lỗi khi xóa'
            });
          }
        }
        
        // If all deletions succeeded, show success message
        if (deleteSuccess) {
          toast.success(`Đã xóa ${categoriesToDelete.length} danh mục thành công`);
        } else {
          // Some deletions failed
          const deletedCount = categoriesToDelete.length - failedCategories.filter(fc => 
            !fc.reason.includes('có') // Filter out dependency failures to count only delete failures
          ).length;
          
          toast.success(`Đã xóa ${deletedCount} danh mục thành công`);
        }
      }
      
      // Show errors for categories that could not be deleted
      if (failedCategories.length > 0) {
        // Group by reason
        const reasonGroups: Record<string, string[]> = {};
        failedCategories.forEach(fc => {
          if (!reasonGroups[fc.reason]) {
            reasonGroups[fc.reason] = [];
          }
          reasonGroups[fc.reason].push(fc.name);
        });
        
        // Generate error messages
        Object.entries(reasonGroups).forEach(([reason, names]) => {
          toast.error(`${names.length} danh mục không thể xóa vì ${reason}: ${names.join(', ')}`);
        });
      }
      
      // Reset selection and reload categories
      setSelectedCategories([]);
      await fetchCategories();
    } catch (error) {
      console.error("Lỗi khi xóa hàng loạt danh mục:", error);
      toast.error("Đã xảy ra lỗi khi xóa danh mục");
    } finally {
      setLoading(false);
      setIsBulkDeleteOpen(false);
    }
  };

  // Lấy danh mục cha (để chọn trong dropdown)
  const getParentCategories = () => {
    // Nếu đang chỉnh sửa, không hiển thị danh mục hiện tại trong danh sách lựa chọn
    return categories.filter(category => !categoryId || category.id !== categoryId);
  };

  // Xử lý chỉnh sửa danh mục
  const handleEdit = (category: CategoryColumn) => {
    setCategoryId(category.id);
    form.setValue("name", category.name);
    form.setValue("imageUrl", category.imageUrl || "");
    form.setValue("parentId", category.parentId || "none");
    form.setValue("description", category.description || "");
    form.setValue("sortOrder", category.sortOrder);
    
    // Hiển thị xem trước hình ảnh nếu có
    setPreviewImage(category.imageUrl);
  };
  
  // Xử lý nộp form
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      
      // Kiểm tra nếu người dùng đang cố gắng đặt danh mục cha là con của chính nó
      if (categoryId && values.parentId === categoryId) {
        toast.error("Không thể đặt danh mục là con của chính nó");
        return;
      }
      
      // Kiểm tra xem danh mục được chọn làm cha có phải là con của danh mục hiện tại không
      if (categoryId && values.parentId && values.parentId !== "none") {
        const isSubCategory = checkIfSubCategory(categoryId, values.parentId);
        if (isSubCategory) {
          toast.error("Không thể đặt danh mục con làm cha của danh mục cha");
          return;
        }
      }
      
      // Xử lý sortOrder
      let sortOrder: number | undefined = undefined;
      if (values.sortOrder !== null && values.sortOrder !== undefined) {
        // Chuyển đổi sang số
        sortOrder = Number(values.sortOrder);
        // Kiểm tra có phải là số hợp lệ không
        if (isNaN(sortOrder)) {
          toast.error("Thứ tự hiển thị phải là một số");
          return;
        }
      }
      
      // Chuẩn bị dữ liệu để gửi
      const categoryData = {
        name: values.name,
        imageUrl: values.imageUrl || null,
        parentId: values.parentId === "none" ? null : values.parentId,
        description: values.description || null,
        sortOrder: sortOrder,
      };
      
      console.log("Dữ liệu gửi đi:", JSON.stringify(categoryData));
      
      // Nếu đang chỉnh sửa danh mục hiện có
      if (categoryId) {
        console.log(`Đang cập nhật danh mục: ${categoryId}`, categoryData);
        try {
          const response = await axios.put(`/api/categories/${categoryId}`, categoryData);
          console.log("Phản hồi cập nhật:", response.data);
          toast.success("Đã cập nhật danh mục thành công");
          
          // Reset form và tải lại danh mục
          form.reset();
          setCategoryId(null);
          setPreviewImage(null);
          await fetchCategories();
        } catch (updateError: any) {
          console.error("Chi tiết lỗi cập nhật:", updateError);
          const errorData = updateError?.response?.data;
          console.error("Response error data:", errorData);
          const errorMessage = errorData?.error || "Đã xảy ra lỗi khi cập nhật danh mục";
          const errorDetails = errorData?.details || "";
          const fullError = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
          
          setErrorMessage(fullError);
          toast.error(fullError);
        }
      } else { // Tạo danh mục mới
        console.log("Đang tạo danh mục mới:", categoryData);
        try {
          const response = await axios.post('/api/categories', categoryData);
          console.log("Phản hồi tạo mới:", response.data);
          toast.success("Đã tạo danh mục thành công");
          
          // Reset form và tải lại danh mục
          form.reset();
          setCategoryId(null);
          setPreviewImage(null);
          await fetchCategories();
        } catch (createError: any) {
          console.error("Chi tiết lỗi tạo mới:", createError);
          const errorData = createError?.response?.data;
          console.error("Response error data:", errorData);
          const errorMessage = errorData?.error || "Đã xảy ra lỗi khi tạo danh mục";
          const errorDetails = errorData?.details || "";
          const fullError = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
          
          setErrorMessage(fullError);
          toast.error(fullError);
        }
      }
    } catch (error: any) {
      console.error("Lỗi khi lưu danh mục:", error);
      if (error.response) {
        // Lỗi từ server (response đã nhận được)
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
        console.error("Headers:", error.response.headers);
        const errorMessage = `Lỗi server: ${error.response.status} - ${error.response.data?.error || "Không xác định"}`;
        const errorDetails = error.response.data?.details || "";
        const fullError = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
        
        setErrorMessage(fullError);
        toast.error(fullError);
      } else if (error.request) {
        // Lỗi không nhận được response
        console.error("Request made but no response received:", error.request);
        setErrorMessage("Không nhận được phản hồi từ server. Vui lòng kiểm tra kết nối mạng.");
        toast.error("Không nhận được phản hồi từ server. Vui lòng kiểm tra kết nối mạng.");
      } else {
        // Lỗi khi thiết lập request
        console.error("Request setup error:", error.message);
        setErrorMessage(`Lỗi: ${error.message}`);
        toast.error(`Lỗi: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra xem categoryB có phải là con (hoặc cháu) của categoryA
  const checkIfSubCategory = (parentId: string, childId: string): boolean => {
    console.log(`Kiểm tra xem ${childId} có phải là con/cháu của ${parentId}`);
    
    // Nếu childId hoặc parentId không tồn tại, trả về false
    if (!childId || !parentId) {
      console.log("childId hoặc parentId không hợp lệ, trả về false");
      return false;
    }
    
    // Nếu trùng nhau, không thể là con của nhau
    if (childId === parentId) {
      console.log("childId trùng với parentId, trả về true");
      return true;
    }
    
    // Tìm tất cả các danh mục con của parentId
    try {
      const findAllChildren = (categoryId: string): string[] => {
        if (!categoryId) return [];
        
        const directChildren = categories
          .filter(cat => cat.parentId === categoryId)
          .map(cat => cat.id);
        
        console.log(`Danh mục con trực tiếp của ${categoryId}:`, directChildren);
        
        let allChildren: string[] = [...directChildren];
        
        // Đệ quy tìm tất cả các con cháu
        for (const subId of directChildren) {
          if (subId) {
            const subChildren = findAllChildren(subId);
            allChildren = [...allChildren, ...subChildren];
          }
        }
        
        return allChildren;
      };
      
      const allChildren = findAllChildren(parentId);
      console.log(`Tất cả con/cháu của ${parentId}:`, allChildren);
      
      return allChildren.includes(childId);
    } catch (error) {
      console.error("Lỗi khi kiểm tra cấu trúc danh mục:", error);
      // Trong trường hợp lỗi, trả về false để không chặn luồng chính
      return false;
    }
  };

  // Xử lý tải lên hình ảnh
  const handleImageUpload = async (file: File) => {
    try {
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
      
      // Cập nhật giá trị form và hiển thị xem trước
      form.setValue('imageUrl', imageUrl);
      setPreviewImage(imageUrl);
      
      toast.success('Đã tải lên hình ảnh thành công');
    } catch (error) {
      console.error('Lỗi khi tải lên hình ảnh:', error);
      toast.error('Đã xảy ra lỗi khi tải lên hình ảnh');
    } finally {
      setUploadingImage(false);
    }
  };

  // Xử lý hủy chỉnh sửa
  const handleCancel = () => {
    setCategoryId(null);
    form.reset();
    setPreviewImage(null);
  };

  // Hàm lưu thứ tự khi kéo thả
  const saveSortOrder = async (items: CategoryColumn[]) => {
    try {
      setLoading(true);
      console.log("Đang cập nhật thứ tự:", items);
      
      // Tạo mảng chứa cả danh mục cha và con để cập nhật
      const updateData = items.map((item, index) => ({
        id: item.id,
        sortOrder: index + 1,
      }));
      
      const response = await axios.put('/api/categories/reorder', {
        categories: updateData,
      });
      
      console.log("Phản hồi cập nhật thứ tự:", response.data);
      await fetchCategories();
      toast.success("Đã cập nhật thứ tự thành công");
    } catch (error) {
      console.error("Lỗi khi cập nhật thứ tự:", error);
      toast.error("Đã xảy ra lỗi khi cập nhật thứ tự");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý kéo thả
  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(filteredCategories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Cập nhật state trước khi gửi API để UI phản hồi ngay lập tức
    setFilteredCategories(items);
    
    // Cập nhật danh sách gốc nếu cần
    if (JSON.stringify(categories.map(c => c.id)) !== JSON.stringify(filteredCategories.map(c => c.id))) {
      // Nếu đang lọc hoặc sắp xếp, chỉ cập nhật filtered categories
      // và không gọi API để tránh gây rối
      if (searchTerm || activeTab !== 'all') {
        toast.error("Thứ tự sẽ không được lưu khi đang lọc danh mục. Hãy tắt bộ lọc trước khi sắp xếp.");
        return;
      }
    }
    
    // Lưu thứ tự mới
    setCategories(items);
    saveSortOrder(items);
  };

  // Hiển thị tên danh mục cha
  const getParentCategoryName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = categories.find(cat => cat.id === parentId);
    return parent ? parent.name : null;
  };

  // Xử lý xóa danh mục
  const confirmDelete = async () => {
    if (!categoryId) return;
    
    try {
      setLoading(true);
      console.log(`Đang xóa danh mục: ${categoryId}`);
      
      const response = await axios.delete(`/api/categories/${categoryId}`);
      console.log("Phản hồi xóa:", response.data);
      
      toast.success("Đã xóa danh mục thành công");
      await fetchCategories();
    } catch (error: any) {
      console.error("Lỗi khi xóa danh mục:", error);
      const errorMessage = error?.response?.data?.error || "Đã xảy ra lỗi khi xóa danh mục";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setOpen(false);
      setCategoryId(null);
    }
  };

  // Function to load products for a category
  const loadCategoryProducts = async (categoryId: string) => {
    try {
      setLoadingProducts(true);
      const response = await axios.get(`/api/categories/${categoryId}/products`);
      setCategoryProducts(response.data.products || []);
      setShowProductsForCategory(categoryId);
    } catch (error) {
      console.error('Lỗi khi tải sản phẩm cho danh mục:', error);
      toast.error('Không thể tải danh sách sản phẩm');
      setCategoryProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Hàm xuất danh mục ra JSON/CSV
  const exportCategories = async (format: 'json' | 'csv') => {
    try {
      setLoading(true);
      
      // Tạo URL với format
      const url = `/api/categories/export?format=${format}`;
      
      // Tạo thẻ a tạm thời và kích hoạt tải xuống
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `categories_export.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Đã xuất danh mục dạng ${format.toUpperCase()} thành công`);
    } catch (error) {
      console.error('Lỗi khi xuất danh mục:', error);
      toast.error('Đã xảy ra lỗi khi xuất danh mục');
    } finally {
      setLoading(false);
    }
  };

  // Hàm nhập danh mục từ file JSON
  const handleImportFile = (file: File) => {
    // Kiểm tra loại file
    if (!file.name.endsWith('.json')) {
      toast.error('Chỉ hỗ trợ nhập file JSON');
      return;
    }
    
    // Đặt file vào state
    setImportFile(file);
  };
  
  // Hàm thực hiện nhập danh mục
  const processImport = async () => {
    if (!importFile) {
      toast.error('Vui lòng chọn file để nhập');
      return;
    }
    
    try {
      setIsImporting(true);
      
      // Đọc file JSON
      const fileContent = await importFile.text();
      const categoriesData = JSON.parse(fileContent);
      
      // Gửi dữ liệu lên API
      const response = await axios.post('/api/categories/import', categoriesData);
      
      // Hiển thị kết quả
      setImportResult(response.data);
      
      // Hiển thị thông báo
      toast.success(`Đã nhập danh mục thành công: ${response.data.stats.created} tạo mới, ${response.data.stats.updated} cập nhật`);
      
      // Tải lại danh mục sau khi nhập
      await fetchCategories();
    } catch (error: any) {
      console.error('Lỗi khi nhập danh mục:', error);
      
      const errorMessage = error?.response?.data?.error || 'Đã xảy ra lỗi khi nhập danh mục';
      toast.error(errorMessage);
      
      setImportResult({
        error: errorMessage,
        details: error?.response?.data?.details
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Hàm tải dữ liệu thống kê
  const loadStats = async () => {
    try {
      setStatsLoading(true);
      
      // Lấy thống kê từ API
      const response = await axios.get('/api/categories/stats');
      setStatsData(response.data);
      setShowStats(true);
    } catch (error) {
      console.error('Lỗi khi tải thống kê:', error);
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Quản Lý Danh Mục</h1>
          <div className="flex items-center space-x-2">
            <Button 
              variant="default" 
              className="flex items-center" 
              onClick={() => {
                setCategoryId(null);
                setOpen(true);
                form.reset();
                setPreviewImage(null);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm Danh Mục
            </Button>
            
            {/* Nút cho chức năng xuất/nhập */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  <span>Xuất/Nhập</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportCategories('json')}>
                  <FileJson className="h-4 w-4 mr-2" />
                  <span>Xuất file JSON</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCategories('csv')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  <span>Xuất file CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsImporting(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Nhập danh mục</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Thống kê */}
            <Button 
              variant="outline" 
              onClick={() => {
                if (showStats) {
                  setShowStats(false);
                } else {
                  setShowStats(true);
                  loadStats();
                }
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showStats ? "Ẩn Thống Kê" : "Xem Thống Kê"}
            </Button>
          </div>
        </div>
        
        {/* Phần tìm kiếm, lọc và chọn chế độ xem */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm danh mục..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
            />
          </div>
          
          <Select 
            value={activeTab} 
            onValueChange={(value) => {
              setActiveTab(value);
              if (value === "all") {
                setFilteredCategories(categories);
              } else if (value === "parent") {
                setFilteredCategories(categories.filter(cat => cat.parentId === null));
              } else if (value === "sub") {
                setFilteredCategories(categories.filter(cat => cat.parentId !== null));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Lọc danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              <SelectItem value="parent">Danh mục cha</SelectItem>
              <SelectItem value="sub">Danh mục con</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={viewMode}
            onValueChange={(value: 'list' | 'tree') => setViewMode(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chế độ xem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Xem dạng danh sách</SelectItem>
              <SelectItem value="tree">Xem dạng cây</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Cảnh báo dữ liệu mẫu nếu có */}
        {usingMockData && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Đang hiển thị dữ liệu mẫu do không thể kết nối đến cơ sở dữ liệu.
              Các thay đổi sẽ không được lưu cho đến khi kết nối được khôi phục.
            </AlertDescription>
          </Alert>
        )}

        {/* Hiển thị thông báo lỗi nếu có */}
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Bảng danh sách danh mục */}
        <div className="rounded-md border">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Danh sách danh mục</h2>
              <p className="text-sm text-gray-500">
                {filteredCategories.length} danh mục {searchTerm ? `phù hợp với "${searchTerm}"` : ""}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {selectedCategories.length > 0 && (
                <>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setIsBulkDeleteOpen(true)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Xóa ({selectedCategories.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedCategories([])}
                  >
                    Bỏ chọn
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Đây là nơi hiển thị bảng danh mục */}
          <div className="p-4">
            {/* Hiển thị danh sách danh mục */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Không có danh mục nào {searchTerm ? "phù hợp với tìm kiếm" : ""}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between p-4 rounded-md border 
                      ${category.parentId ? 'ml-6 bg-gray-50' : 'bg-white'} 
                      hover:bg-gray-100 transition-colors`}
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategorySelection(category.id)}
                      />
                      
                      {/* Hình ảnh danh mục */}
                      <div className="h-10 w-10 relative rounded-md overflow-hidden border">
                        {category.imageUrl ? (
                          <div 
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${category.imageUrl})` }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gray-100">
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-gray-500">
                          {category.description ? category.description : 
                            category.parentId ? `Danh mục con của: ${getParentCategoryName(category.parentId)}` : 
                            "Danh mục cha"}
                        </div>
                        <div className="flex items-center mt-1 space-x-2">
                          <Badge variant="outline" className="text-xs">
                            ID: {category.id.substring(0, 8)}
                          </Badge>
                          {category._count?.products !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {category._count.products} sản phẩm
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <FileEdit className="h-4 w-4 mr-2" />
                        Sửa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setCategoryId(category.id);
                          setOpen(true);
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Xóa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modals go here */}
      <LoadingModal loading={loading || uploadingImage} />

      {/* Form modal cho thêm/chỉnh sửa danh mục */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-medium mb-4">
              {categoryId ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
            </h2>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên danh mục <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Tên danh mục"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Danh mục cha</FormLabel>
                      <Select
                        disabled={loading} 
                        onValueChange={field.onChange} 
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn danh mục cha (nếu có)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Không có danh mục cha</SelectItem>
                          {getParentCategories().map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Chọn nếu đây là danh mục con
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mô tả</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Mô tả ngắn về danh mục"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thứ tự hiển thị</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          disabled={loading}
                          placeholder="Thứ tự hiển thị"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            field.onChange(isNaN(value) ? 0 : value);
                          }}
                          value={field.value === null ? "" : field.value}
                        />
                      </FormControl>
                      <FormDescription>
                        Số nhỏ hơn sẽ hiển thị trước
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hình ảnh</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div 
                            className={`border-2 border-dashed rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer relative ${
                              uploadingImage ? 'opacity-50' : ''
                            }`}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e: any) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleImageUpload(e.target.files[0]);
                                }
                              };
                              input.click();
                            }}
                          >
                            {uploadingImage ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                <span className="ml-2 text-sm text-gray-500">Đang tải lên...</span>
                              </div>
                            ) : previewImage ? (
                              <div className="relative">
                                <img 
                                  src={previewImage} 
                                  alt="Preview" 
                                  className="max-h-[150px] rounded-md mx-auto object-contain"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(null);
                                    form.setValue('imageUrl', '');
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-4">
                                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                                <p className="text-sm text-gray-500">Click để chọn hình ảnh</p>
                                <p className="text-xs text-gray-400 mt-1">Hỗ trợ PNG, JPG, JPEG</p>
                              </div>
                            )}
                          </div>

                          <Input
                            {...field}
                            placeholder="Hoặc nhập URL hình ảnh"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setCategoryId(null);
                      form.reset();
                      setPreviewImage(null);
                    }}
                    disabled={loading}
                  >
                    Hủy
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                  >
                    {categoryId ? "Cập nhật" : "Tạo mới"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}

      <AlertModal 
        isOpen={!!categoryId && !open} 
        onClose={() => setCategoryId(null)}
        onConfirm={confirmDelete}
        loading={loading}
        title="Xóa danh mục"
        description="Bạn có chắc muốn xóa danh mục này? Thao tác này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
      />
      
      <AlertModal 
        isOpen={isBulkDeleteOpen} 
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        loading={loading}
        title="Xóa nhiều danh mục"
        description={`Bạn có chắc muốn xóa ${selectedCategories.length} danh mục đã chọn? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa tất cả"
        cancelText="Hủy"
      />
      
      {/* Modals for import and other functionality */}
      {/* ... existing code ... */}
    </AdminLayout>
  );
};

export default CategoriesPage;