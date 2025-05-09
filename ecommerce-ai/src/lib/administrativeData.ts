// Type definitions for administrative data
export type Province = {
  code: string;
  name: string;
};

export type District = {
  code: string;
  name: string;
  provinceCode: string;
};

export type Ward = {
  code: string;
  name: string;
  districtCode: string;
};

// Đường dẫn API để lấy dữ liệu hành chính
export const ADMIN_API_URLS = {
  base: 'https://provinces.open-api.vn/api',
  provinces: 'https://provinces.open-api.vn/api/p',
  districts: 'https://provinces.open-api.vn/api/d',
  wards: 'https://provinces.open-api.vn/api/w',
};

// Hàm lấy danh sách tỉnh/thành phố
export async function fetchProvinces(): Promise<Province[]> {
  try {
    const response = await fetch(`${ADMIN_API_URLS.provinces}`);
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

// Hàm lấy danh sách quận/huyện cho một tỉnh/thành phố
export async function fetchDistrictsForProvince(provinceCode: string): Promise<District[]> {
  try {
    const response = await fetch(`${ADMIN_API_URLS.provinces}/${provinceCode}?depth=2`);
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

// Hàm lấy danh sách phường/xã cho một quận/huyện
export async function fetchWardsForDistrict(districtCode: string): Promise<Ward[]> {
  try {
    const response = await fetch(`${ADMIN_API_URLS.districts}/${districtCode}?depth=2`);
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