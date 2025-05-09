"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { formatDate, formatPrice } from "@/lib/utils";

// Interfaces
interface ProductInOrder {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  price: number;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: ProductInOrder;
}

interface ShippingAddress {
  id: string;
  fullName: string;
  address: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  phoneNumber: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  trackingNumber: string | null;
  paymentMethod: string | null;
  notes: string | null;
  items: OrderItem[];
  shippingAddress: ShippingAddress | null;
}

// Component hiển thị trạng thái đơn hàng dưới dạng Badge
const OrderStatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return { label: "Chờ xử lý", variant: "secondary" as const };
      case "PROCESSING":
        return { label: "Đang xử lý", variant: "warning" as const };
      case "SHIPPED":
        return { label: "Đang giao", variant: "default" as const };
      case "DELIVERED":
        return { label: "Đã giao", variant: "success" as const };
      case "COMPLETED":
        return { label: "Hoàn thành", variant: "success" as const };
      case "CANCELLED":
        return { label: "Đã hủy", variant: "destructive" as const };
      case "RETURN_REQUESTED":
        return { label: "Yêu cầu trả hàng", variant: "destructive" as const };
      default:
        return { label: status, variant: "outline" as const };
    }
  };

  const { label, variant } = getStatusConfig(status);
  return <Badge variant={variant}>{label}</Badge>;
};

// Trang chi tiết đơn hàng
export default function OrderDetails({ params }: { params: { id: string } }) {
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const orderId = unwrappedParams.id;
  
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch order details when component mounts
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (sessionStatus === "loading") return;
      
      if (!session?.user) {
        router.push(`/login?callbackUrl=/profile/orders/${orderId}`);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/orders/${orderId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            router.push("/profile/orders");
            toast.error("Đơn hàng không tồn tại hoặc bạn không có quyền truy cập");
            return;
          }
          throw new Error("Failed to fetch order details");
        }
        
        const data = await response.json();
        setOrder(data.order);
      } catch (error) {
        console.error("Error fetching order details:", error);
        toast.error("Không thể tải thông tin đơn hàng. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, session, sessionStatus, router]);

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!order) return;
    
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${order.id}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
          reason: "Hủy bởi người dùng",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Không thể hủy đơn hàng");
      }

      // Update local order state
      setOrder((prevOrder) => 
        prevOrder ? { ...prevOrder, status: "CANCELLED" } : null
      );

      toast.success("Đơn hàng đã được hủy thành công");
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast.error(error.message || "Không thể hủy đơn hàng. Vui lòng thử lại sau.");
    }
  };

  if (sessionStatus === "loading" || isLoading) {
    return <OrderDetailsSkeleton />;
  }

  if (!order) {
    return (
      <div className="container py-10 text-center">
        <h1 className="text-3xl font-bold mb-4">Không tìm thấy đơn hàng</h1>
        <p className="mb-6">Đơn hàng không tồn tại hoặc bạn không có quyền truy cập</p>
        <Button asChild>
          <Link href="/profile/orders">Quay lại danh sách đơn hàng</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile/orders">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Quay lại
              </Link>
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">
              Đơn hàng #{order.id.substring(0, 8)}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground">
            Đặt ngày: {formatDate(order.createdAt)}
          </p>
        </div>
        {(order.status === "PENDING" || order.status === "PROCESSING") && (
          <Button variant="destructive" onClick={handleCancelOrder}>
            Hủy đơn hàng
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Chi tiết sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Giá</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.product.imageUrl ? (
                            <div className="h-14 w-14 rounded bg-muted/50 overflow-hidden relative">
                              <Image
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-14 w-14 rounded bg-muted/50" />
                          )}
                          <div>
                            <Link
                              href={`/products/${item.product.id}`}
                              className="font-semibold hover:underline"
                            >
                              {item.product.name}
                            </Link>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(item.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-muted/30 flex flex-col items-end p-4">
              <div className="space-y-1.5 w-full max-w-[240px]">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Tổng cộng:</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Trạng thái</div>
                <div><OrderStatusBadge status={order.status} /></div>
              </div>
              {order.trackingNumber && (
                <div>
                  <div className="text-sm font-medium">Mã vận đơn</div>
                  <div>{order.trackingNumber}</div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium">Phương thức thanh toán</div>
                <div>{order.paymentMethod || "Không có thông tin"}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Ngày đặt hàng</div>
                <div>{formatDate(order.createdAt)}</div>
              </div>
              {order.notes && (
                <div>
                  <div className="text-sm font-medium">Ghi chú</div>
                  <div className="text-sm">{order.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {order.shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Địa chỉ giao hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-medium">{order.shippingAddress.fullName}</div>
                <div>{order.shippingAddress.address}</div>
                <div>
                  {order.shippingAddress.city}
                  {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                  {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
                </div>
                <div>{order.shippingAddress.country}</div>
                <div className="pt-2">
                  <div className="text-sm font-medium">Số điện thoại</div>
                  <div>{order.shippingAddress.phoneNumber}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton loading state
function OrderDetailsSkeleton() {
  return (
    <div className="container py-10 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <Skeleton className="h-10 w-60 mb-2" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-14 w-14" />
                      <Skeleton className="h-6 w-40" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-4 bg-muted/30">
              <div className="w-[200px] space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 