import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
};

type Order = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

// Create styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    padding: 30,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
    fontWeight: 'bold',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  orderInfo: {
    marginBottom: 20,
  },
  orderInfoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    width: 120,
  },
  value: {
    flex: 1,
  },
  table: { 
    display: 'table', 
    width: '100%', 
    borderStyle: 'solid', 
    borderWidth: 1, 
    borderColor: '#bfbfbf',
    marginBottom: 20,
  }, 
  tableRow: { 
    flexDirection: 'row',
  },
  tableRowHeader: {
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf',
    fontWeight: 'bold',
  },
  tableColHeader: { 
    borderRightWidth: 1, 
    borderRightColor: '#bfbfbf',
    padding: 5,
  },
  tableCol: {
    borderRightWidth: 1, 
    borderRightColor: '#bfbfbf',
    padding: 5,
  },
  tableCellHeader: {
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
  },
  col1: {
    width: '40%',
  },
  col2: {
    width: '20%',
    textAlign: 'right',
  },
  col3: {
    width: '15%',
    textAlign: 'right',
  },
  col4: {
    width: '25%',
    textAlign: 'right',
    borderRightWidth: 0,
  },
  total: {
    marginTop: 10,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 30,
    fontSize: 10,
    textAlign: 'center',
    color: 'grey',
  },
});

// Create Document Component
const OrderPDF = ({ order }: { order: Order }) => {
  // Helper functions
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      maximumFractionDigits: 0 
    }).format(price);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'Chờ Xử Lý';
      case 'PROCESSING': return 'Đang Xử Lý';
      case 'COMPLETED': return 'Hoàn Thành';
      case 'CANCELLED': return 'Đã Hủy';
      default: return status;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Báo Cáo Đơn Hàng</Text>
        
        <View style={styles.orderInfo}>
          <View style={styles.orderInfoRow}>
            <Text style={styles.label}>Mã đơn hàng:</Text>
            <Text style={styles.value}>{order.id}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.label}>Trạng thái:</Text>
            <Text style={styles.value}>{getStatusText(order.status)}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.label}>Ngày đặt:</Text>
            <Text style={styles.value}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.label}>Cập nhật:</Text>
            <Text style={styles.value}>{formatDate(order.updatedAt)}</Text>
          </View>
        </View>
        
        <View style={styles.orderInfo}>
          <Text style={[styles.label, { marginBottom: 5 }]}>Thông tin khách hàng:</Text>
          <View style={styles.orderInfoRow}>
            <Text style={styles.label}>Họ tên:</Text>
            <Text style={styles.value}>{order.customerName}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{order.customerEmail}</Text>
          </View>
        </View>
        
        <Text style={[styles.label, { marginBottom: 10 }]}>Chi tiết sản phẩm:</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <View style={[styles.tableColHeader, styles.col1]}>
              <Text style={styles.tableCellHeader}>Sản phẩm</Text>
            </View>
            <View style={[styles.tableColHeader, styles.col2]}>
              <Text style={styles.tableCellHeader}>Đơn giá</Text>
            </View>
            <View style={[styles.tableColHeader, styles.col3]}>
              <Text style={styles.tableCellHeader}>Số lượng</Text>
            </View>
            <View style={[styles.tableColHeader, styles.col4]}>
              <Text style={styles.tableCellHeader}>Thành tiền</Text>
            </View>
          </View>
          
          {/* Table Body */}
          {order.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={[styles.tableCol, styles.col1]}>
                <Text style={styles.tableCell}>{item.productName}</Text>
                <Text style={[styles.tableCell, { fontSize: 8, color: 'grey' }]}>
                  Mã: {item.productId}
                </Text>
              </View>
              <View style={[styles.tableCol, styles.col2]}>
                <Text style={styles.tableCell}>{formatPrice(item.price)}</Text>
              </View>
              <View style={[styles.tableCol, styles.col3]}>
                <Text style={styles.tableCell}>{item.quantity}</Text>
              </View>
              <View style={[styles.tableCol, styles.col4]}>
                <Text style={styles.tableCell}>{formatPrice(item.subtotal)}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View>
          <Text style={styles.total}>Tổng giá trị: {formatPrice(order.total)}</Text>
        </View>
        
        <View style={styles.footer}>
          <Text>Tài liệu này được tạo tự động từ hệ thống quản lý đơn hàng.</Text>
          <Text>Báo cáo ngày: {new Date().toLocaleDateString('vi-VN')}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default OrderPDF; 