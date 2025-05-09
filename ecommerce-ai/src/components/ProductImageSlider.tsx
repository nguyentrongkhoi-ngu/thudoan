'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductImageSliderProps {
  images: string[];
  productName: string;
}

export default function ProductImageSlider({ images, productName }: ProductImageSliderProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Use a placeholder image if no images are provided
  const displayImages = images.length > 0 
    ? images 
    : ['https://placehold.co/600x400?text=Product+Image'];

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === displayImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? displayImages.length - 1 : prevIndex - 1
    );
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden border border-base-300">
      {/* Main image display */}
      <AnimatePresence mode="wait">
        <motion.img
          key={currentImageIndex}
          src={displayImages[currentImageIndex]}
          alt={`${productName} - image ${currentImageIndex + 1}`}
          className="w-full h-full object-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      </AnimatePresence>

      {/* Navigation arrows - only show if there are multiple images */}
      {displayImages.length > 1 && (
        <>
          <button 
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white"
            aria-label="Previous image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white"
            aria-label="Next image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Thumbnail navigation - only show if there are multiple images */}
      {displayImages.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
          {displayImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentImageIndex 
                  ? 'bg-primary scale-125' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
} 