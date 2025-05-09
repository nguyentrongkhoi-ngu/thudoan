import { ChartComponentLike } from 'chart.js';

// Bổ sung khai báo cho Chart.js
declare module 'chart.js' {
  interface ChartType {
    register(...args: any[]): void;
  }

  export const Chart: ChartType;
  export const CategoryScale: ChartComponentLike;
  export const LinearScale: ChartComponentLike;
  export const BarElement: ChartComponentLike;
  export const Title: ChartComponentLike;
  export const Tooltip: ChartComponentLike;
  export const Legend: ChartComponentLike;
  export const ArcElement: ChartComponentLike;
  export const PointElement: ChartComponentLike;
  export const LineElement: ChartComponentLike;
  
  export interface ChartDataset {
    data: number[] | null | undefined;
  }
  
  export interface ChartScales {
    x: {
      beginAtZero?: boolean;
      ticks?: {
        precision?: number;
      };
    };
    y: {
      beginAtZero?: boolean;
      ticks?: {
        precision?: number;
      };
    };
  }
} 