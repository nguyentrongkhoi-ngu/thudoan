'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Array of testimonials
const testimonials = [
    {
        name: "Sarah Johnson",
        avatar: "/images/avatars/avatar-1.png",
        role: "Marketing Director",
        rating: 5,
        comment: "This platform transformed our online presence. The intuitive interface and powerful features exceeded our expectations. Our sales have increased by 40% since implementation!",
        date: "August 2023"
    },
    {
        name: "Michael Chen",
        avatar: "/images/avatars/avatar-2.png",
        role: "E-commerce Manager",
        rating: 5,
        comment: "After trying numerous e-commerce solutions, this one stands out for its reliability and comprehensive feature set. Customer support is exceptional and always ready to help.",
        date: "September 2023"
    },
    {
        name: "Emily Rodriguez",
        avatar: "/images/avatars/avatar-3.png",
        role: "Small Business Owner",
        rating: 4,
        comment: "As a small business owner, finding an affordable yet powerful e-commerce solution was crucial. This platform provided everything I needed without breaking the bank.",
        date: "October 2023"
    },
    {
        name: "David Thompson",
        avatar: "/images/avatars/avatar-4.png",
        role: "IT Director",
        rating: 5,
        comment: "The integration capabilities are outstanding. We connected our CRM and inventory systems seamlessly. The performance is top-notch even with our extensive product catalog.",
        date: "November 2023"
    }
];

const Testimonials = () => {
    const [current, setCurrent] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

    // Start or stop autoplay
    useEffect(() => {
        if (isAutoPlaying) {
            autoPlayRef.current = setInterval(() => {
                setCurrent((prev) => (prev + 1) % testimonials.length);
            }, 5000);
        }
        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, [isAutoPlaying]);

    // Pause autoplay on hover
    const handleMouseEnter = () => setIsAutoPlaying(false);
    const handleMouseLeave = () => setIsAutoPlaying(true);

    // Navigate to previous testimonial
    const prevTestimonial = () => {
        setCurrent((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
    };

    // Navigate to next testimonial
    const nextTestimonial = () => {
        setCurrent((prev) => (prev + 1) % testimonials.length);
    };

    // Set current testimonial
    const goToTestimonial = (index: number) => {
        setCurrent(index);
    };

    // Render stars based on rating
    const renderStars = (rating: number) => {
        return (
            <div className="flex space-x-1 star-rating">
                {[...Array(5)].map((_, i) => (
                    <Star 
                        key={i} 
                        size={20} 
                        className={i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} 
                    />
                ))}
            </div>
        );
    };

    return (
        <section 
            className="py-16 testimonial-bg-animate"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="container px-4 mx-auto">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
                        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Discover why thousands of businesses trust our platform for their e-commerce needs.
                        </p>
                    </motion.div>
                </div>

                <div className="relative max-w-4xl mx-auto px-4">
                    {/* Quote icon decoration */}
                    <div className="absolute -top-6 -left-2 opacity-20 text-indigo-600 dark:text-indigo-400">
                        <Quote size={60} className="animated-quote" />
                    </div>
                    
                    {/* Testimonial slides */}
                    <div 
                        className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg overflow-hidden testimonial-shine card-tilt"
                        style={{ minHeight: '340px' }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={current}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="flex flex-col h-full"
                            >
                                <div className="mb-6">
                                    {renderStars(testimonials[current].rating)}
                                </div>
                                
                                <p className="text-gray-700 dark:text-gray-200 text-lg italic mb-8">
                                    "{testimonials[current].comment}"
                                </p>
                                
                                <div className="mt-auto flex items-center">
                                    <div className="relative h-14 w-14 mr-4 rounded-full overflow-hidden avatar-glow">
                                        <Image
                                            src={testimonials[current].avatar}
                                            alt={testimonials[current].name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg">{testimonials[current].name}</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{testimonials[current].role}</p>
                                        <p className="text-indigo-600 dark:text-indigo-400 text-sm">{testimonials[current].date}</p>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={prevTestimonial}
                            className="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-md hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all testimonial-nav-btn"
                            aria-label="Previous testimonial"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center space-x-2">
                            {testimonials.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToTestimonial(index)}
                                    className={`h-3 rounded-full transition-all ${
                                        current === index 
                                            ? 'dot-active bg-indigo-600 dark:bg-indigo-500' 
                                            : 'w-3 bg-gray-300 dark:bg-gray-600 hover:bg-indigo-400 dark:hover:bg-indigo-700'
                                    }`}
                                    aria-label={`Go to testimonial ${index + 1}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={nextTestimonial}
                            className="p-3 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-md hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all testimonial-nav-btn"
                            aria-label="Next testimonial"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Testimonials; 