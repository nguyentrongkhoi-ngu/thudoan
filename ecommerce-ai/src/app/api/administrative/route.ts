import { NextResponse } from 'next/server';

// Các URL API chính thức
const PROVINCE_API_URL = 'https://provinces.open-api.vn/api/p/';
const DISTRICT_API_URL = 'https://provinces.open-api.vn/api/p';
const WARD_API_URL = 'https://provinces.open-api.vn/api/d';

// Type definitions
type Province = {
  code: string;
  name: string;
};

type District = {
  code: string;
  name: string;
  provinceCode: string;
};

type Ward = {
  code: string;
  name: string;
  districtCode: string;
};

// Hàm lấy dữ liệu tỉnh/thành phố
async function fetchProvinces(): Promise<Province[]> {
  try {
    const response = await fetch(PROVINCE_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch provinces');
    }
    
    const data = await response.json();
    return data.map((province: any) => ({
      code: province.code.toString(),
      name: province.name
    }));
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
}

// Hàm lấy dữ liệu quận/huyện cho một tỉnh
async function fetchDistrictsForProvince(provinceCode: string): Promise<District[]> {
  try {
    const response = await fetch(`${DISTRICT_API_URL}/${provinceCode}?depth=2`);
    if (!response.ok) {
      throw new Error(`Failed to fetch districts for province ${provinceCode}`);
    }
    
    const data = await response.json();
    if (!data.districts) {
      return [];
    }
    
    return data.districts.map((district: any) => ({
      code: district.code.toString(),
      name: district.name,
      provinceCode: provinceCode
    }));
  } catch (error) {
    console.error(`Error fetching districts for province ${provinceCode}:`, error);
    return [];
  }
}

// Hàm lấy dữ liệu phường/xã cho một quận/huyện
async function fetchWardsForDistrict(districtCode: string): Promise<Ward[]> {
  try {
    const response = await fetch(`${WARD_API_URL}/${districtCode}?depth=2`);
    if (!response.ok) {
      throw new Error(`Failed to fetch wards for district ${districtCode}`);
    }
    
    const data = await response.json();
    if (!data.wards) {
      return [];
    }
    
    return data.wards.map((ward: any) => ({
      code: ward.code.toString(),
      name: ward.name,
      districtCode: districtCode
    }));
  } catch (error) {
    console.error(`Error fetching wards for district ${districtCode}:`, error);
    return [];
  }
}

// Hàm lấy toàn bộ dữ liệu hành chính
async function fetchAllAdministrativeData() {
  // Lấy danh sách tỉnh/thành phố
  const provinces = await fetchProvinces();
  
  // Khởi tạo đối tượng chứa dữ liệu districts và wards
  const districts: Record<string, District[]> = {};
  const wards: Record<string, Ward[]> = {};
  
  // Lấy dữ liệu quận/huyện cho mỗi tỉnh/thành phố
  for (const province of provinces) {
    const districtsForProvince = await fetchDistrictsForProvince(province.code);
    districts[province.code] = districtsForProvince;
    
    // Lấy dữ liệu phường/xã cho mỗi quận/huyện
    for (const district of districtsForProvince) {
      const wardsForDistrict = await fetchWardsForDistrict(district.code);
      wards[district.code] = wardsForDistrict;
    }
  }
  
  return {
    provinces,
    districts,
    wards
  };
}

export async function GET() {
  try {
    const data = await fetchAllAdministrativeData();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in administrative API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch administrative data' },
      { status: 500 }
    );
  }
} 