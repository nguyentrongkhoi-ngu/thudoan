"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { formatDate, formatPrice } from "@/lib/utils";

// Interface cho thông tin đơn hàng
interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  trackingNumber: string | null;
  items: OrderItem[];
}

// Hiển thị trạng thái đơn hàng dưới dạng Badge với màu sắc tương ứng
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

export default function OrderHistory() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch orders when component mounts
  useEffect(() => {
    const fetchOrders = async () => {
      if (sessionStatus === "loading") return;
      
      if (!session?.user) {
        router.push("/login?callbackUrl=/profile/orders");
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch("/api/orders");
        
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        
        const data = await response.json();
        setOrders(data.orders);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Không thể tải lịch sử đơn hàng. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [session, sessionStatus, router]);

  // Handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/actions`, {
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

      // Update local orders state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: "CANCELLED" }
            : order
        )
      );

      toast.success("Đơn hàng đã được hủy thành công");
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast.error(error.message || "Không thể hủy đơn hàng. Vui lòng thử lại sau.");
    }
  };

  if (sessionStatus === "loading" || isLoading) {
    return <OrderHistorySkeleton />;
  }

  return (
    <div className="container py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Lịch sử đơn hàng</h1>
        <p className="text-muted-foreground">
          Xem chi tiết và theo dõi tất cả đơn hàng của bạn
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="mb-6">Bạn chưa có đơn hàng nào</p>
            <Button asChild>
              <Link href="/products">Mua sắm ngay</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-4">
                      Đơn hàng #{order.id.substring(0, 8)}
                      <OrderStatusBadge status={order.status} />
                    </CardTitle>
                    <CardDescription>
                      Ngày đặt: {formatDate(order.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                      <Link href={`/profile/orders/${order.id}`}>
                        Xem chi tiết
                      </Link>
                    </Button>
                    {(order.status === "PENDING" || order.status === "PROCESSING") && (
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        Hủy đơn
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="text-right">Giá</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.slice(0, 3).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatPrice(item.price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {order.items.length > 3 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                          + {order.items.length - 3} sản phẩm khác
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex justify-between bg-muted/30">
                <div>
                  {order.trackingNumber && (
                    <p className="text-sm text-muted-foreground">
                      Mã vận đơn: {order.trackingNumber}
                    </p>
                  )}
                </div>
                <div className="text-lg font-medium">
                  Tổng: {formatPrice(order.total)}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Skeleton loader khi đang tải dữ liệu
function OrderHistorySkeleton() {
  return (
    <div className="container py-10 max-w-5xl">
      <div className="mb-8">
        <Skeleton className="h-10 w-60 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <Skeleton className="h-6 w-40 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2].map((j) => (
                  <div
                    key={j}
                    className="flex justify-between items-center"
                  >
                    <Skeleton className="h-5 w-60" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between bg-muted/30">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 