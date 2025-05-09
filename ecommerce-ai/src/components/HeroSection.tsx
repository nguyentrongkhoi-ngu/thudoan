'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      title: "Mua sắm thông minh với AI",
      description: "Khám phá trải nghiệm mua sắm được cá nhân hóa với công nghệ AI hiện đại. Chúng tôi phân tích hành vi của bạn để đề xuất những sản phẩm phù hợp nhất.",
      image: "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?q=80&w=2940&auto=format&fit=crop",
      gradient: "from-blue-600 to-indigo-700"
    },
    {
      title: "Xu hướng thời trang 2024",
      description: "Cập nhật các xu hướng thời trang mới nhất với bộ sưu tập đặc biệt từ các thương hiệu hàng đầu.",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2940&auto=format&fit=crop",
      gradient: "from-purple-600 to-pink-700"
    },
    {
      title: "Công nghệ tối tân nhất",
      description: "Khám phá những sản phẩm công nghệ mới nhất với hiệu suất vượt trội và thiết kế hiện đại.",
      image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=2832&auto=format&fit=crop",
      gradient: "from-emerald-600 to-teal-700"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-2xl shadow-2xl">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div 
          key={index}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Overlay gradient */}
          <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-80`}></div>
          
          {/* Background image */}
          <img
            src={slide.image}
            className="object-cover w-full h-full"
            alt={slide.title}
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/1600x900?text=E-Shop+AI';
            }}
          />
          
          {/* Content */}
          <div className="absolute inset-0 flex items-center z-20">
            <div className="container mx-auto px-6 lg:px-20">
              <div className="max-w-2xl text-white">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight animate-fade-in-up">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-xl opacity-90 mb-8 animate-fade-in-up animation-delay-200">
                  {slide.description}
                </p>
                
                <form onSubmit={handleSearch} className="relative mt-6 max-w-md animate-fade-in-up animation-delay-400">
                  <input
                    className="w-full px-4 py-3 rounded-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary shadow-lg"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button 
                    className="absolute right-0 top-0 bottom-0 px-6 rounded-full bg-primary text-white hover:bg-primary-focus transition-colors"
                    type="submit"
                  >
                    Tìm kiếm
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {/* Pagination dots */}
      <div className="absolute bottom-5 left-0 right-0 z-20 flex justify-center space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
} 