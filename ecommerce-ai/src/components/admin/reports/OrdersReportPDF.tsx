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
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
    color: '#555',
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  reportInfo: {
    marginBottom: 20,
    fontSize: 10,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
  },
  reportInfoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    fontWeight: 'bold',
    width: 100,
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
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf',
  },
  tableCellHeader: {
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableCell: {
    fontSize: 9,
  },
  id: { width: '15%' },
  customer: { width: '25%' },
  date: { width: '15%' },
  items: { width: '10%', textAlign: 'center' },
  status: { width: '15%' },
  total: { 
    width: '20%', 
    textAlign: 'right',
    borderRightWidth: 0,
  },
  summarySection: {
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  summaryLabel: {
    fontWeight: 'bold',
    width: '70%',
    textAlign: 'right',
  },
  summaryValue: {
    width: '30%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  statusCell: {
    borderRadius: 10,
    padding: 3,
    fontSize: 8,
    textAlign: 'center',
    margin: 2,
  },
  footer: {
    marginTop: 30,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    fontSize: 8,
    textAlign: 'center',
    color: 'grey',
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 10,
    bottom: 20,
    right: 20,
    color: 'grey',
  },
});

// Create Document Component
const OrdersReportPDF = ({ 
  orders, 
  fromDate, 
  toDate,
  statusFilter
}: { 
  orders: Order[], 
  fromDate?: Date,
  toDate?: Date,
  statusFilter?: OrderStatus
}) => {

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
      month: 'numeric',
      day: 'numeric',
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

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': 
        return { backgroundColor: '#FEF9C3', color: '#854D0E' };
      case 'PROCESSING': 
        return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'COMPLETED': 
        return { backgroundColor: '#DCFCE7', color: '#166534' };
      case 'CANCELLED': 
        return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      default: 
        return { backgroundColor: '#F3F4F6', color: '#1F2937' };
    }
  };

  // Calculate summary statistics
  const totalRevenue = orders
    .filter(order => order.status !== 'CANCELLED')
    .reduce((sum, order) => sum + order.total, 0);
  
  const countByStatus = {
    PENDING: orders.filter(order => order.status === 'PENDING').length,
    PROCESSING: orders.filter(order => order.status === 'PROCESSING').length,
    COMPLETED: orders.filter(order => order.status === 'COMPLETED').length,
    CANCELLED: orders.filter(order => order.status === 'CANCELLED').length,
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Báo Cáo Đơn Hàng</Text>
        <Text style={styles.subtitle}>
          {fromDate && toDate 
            ? `Từ ${fromDate.toLocaleDateString('vi-VN')} đến ${toDate.toLocaleDateString('vi-VN')}` 
            : 'Tất cả đơn hàng'}
          {statusFilter ? ` - Trạng thái: ${getStatusText(statusFilter)}` : ''}
        </Text>
        
        <View style={styles.reportInfo}>
          <View style={styles.reportInfoRow}>
            <Text style={styles.label}>Ngày báo cáo:</Text>
            <Text style={styles.value}>{new Date().toLocaleDateString('vi-VN')}</Text>
          </View>
          <View style={styles.reportInfoRow}>
            <Text style={styles.label}>Tổng đơn hàng:</Text>
            <Text style={styles.value}>{orders.length}</Text>
          </View>
          <View style={styles.reportInfoRow}>
            <Text style={styles.label}>Tổng doanh thu:</Text>
            <Text style={styles.value}>{formatPrice(totalRevenue)}</Text>
          </View>
        </View>
        
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableRowHeader]}>
            <View style={[styles.tableColHeader, styles.id]}>
              <Text style={styles.tableCellHeader}>Mã đơn</Text>
            </View>
            <View style={[styles.tableColHeader, styles.customer]}>
              <Text style={styles.tableCellHeader}>Khách hàng</Text>
            </View>
            <View style={[styles.tableColHeader, styles.date]}>
              <Text style={styles.tableCellHeader}>Ngày đặt</Text>
            </View>
            <View style={[styles.tableColHeader, styles.items]}>
              <Text style={styles.tableCellHeader}>Số SP</Text>
            </View>
            <View style={[styles.tableColHeader, styles.status]}>
              <Text style={styles.tableCellHeader}>Trạng thái</Text>
            </View>
            <View style={[styles.tableColHeader, styles.total]}>
              <Text style={styles.tableCellHeader}>Tổng tiền</Text>
            </View>
          </View>
          
          {/* Table Body */}
          {orders.map((order, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={[styles.tableCol, styles.id]}>
                <Text style={styles.tableCell}>{order.id}</Text>
              </View>
              <View style={[styles.tableCol, styles.customer]}>
                <Text style={styles.tableCell}>{order.customerName}</Text>
                <Text style={[styles.tableCell, { fontSize: 8, color: 'grey' }]}>
                  {order.customerEmail}
                </Text>
              </View>
              <View style={[styles.tableCol, styles.date]}>
                <Text style={styles.tableCell}>{formatDate(order.createdAt)}</Text>
              </View>
              <View style={[styles.tableCol, styles.items]}>
                <Text style={styles.tableCell}>
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </Text>
              </View>
              <View style={[styles.tableCol, styles.status]}>
                <Text style={[
                  styles.statusCell, 
                  getStatusStyle(order.status)
                ]}>
                  {getStatusText(order.status)}
                </Text>
              </View>
              <View style={[styles.tableCol, styles.total]}>
                <Text style={styles.tableCell}>{formatPrice(order.total)}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.summarySection}>
          <Text style={[styles.label, { marginBottom: 5 }]}>Thống kê theo trạng thái:</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Chờ xử lý:</Text>
            <Text style={styles.value}>{countByStatus.PENDING} đơn hàng</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Đang xử lý:</Text>
            <Text style={styles.value}>{countByStatus.PROCESSING} đơn hàng</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Hoàn thành:</Text>
            <Text style={styles.value}>{countByStatus.COMPLETED} đơn hàng</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Đã hủy:</Text>
            <Text style={styles.value}>{countByStatus.CANCELLED} đơn hàng</Text>
          </View>
          
          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={styles.summaryLabel}>Tổng doanh thu:</Text>
            <Text style={styles.summaryValue}>{formatPrice(totalRevenue)}</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text>Báo cáo này được tạo tự động từ hệ thống quản lý đơn hàng.</Text>
          <Text>Thời gian tạo báo cáo: {new Date().toLocaleString('vi-VN')}</Text>
        </View>
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Trang ${pageNumber} / ${totalPages}`
        )} />
      </Page>
    </Document>
  );
};

export default OrdersReportPDF; 