'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface Slide {
    id: string;
    title?: string | null;
    description?: string | null;
    imageUrl: string;
    order: number;
}

export function LoginSlider() {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [current, setCurrent] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch('/api/slides')
            .then((r) => r.json())
            .then((data: Slide[]) => {
                setSlides(Array.isArray(data) ? data : []);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
    }, [slides.length]);

    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, [slides.length, next]);

    // Fallback to static image if no slides
    if (!loaded) {
        return (
            <div className="relative hidden lg:block">
                <Image
                    src="/login-bg.png"
                    alt="Loading..."
                    fill
                    className="object-cover"
                    sizes="50vw"
                    priority
                    quality={75}
                />
            </div>
        );
    }

    if (slides.length === 0) {
        return (
            <div className="relative hidden lg:block">
                <Image
                    src="/login-bg.png"
                    alt="Education Illustration"
                    fill
                    className="object-cover"
                    sizes="50vw"
                    priority
                    quality={75}
                />
            </div>
        );
    }

    return (
        <div className="relative hidden lg:block overflow-hidden">
            {/* Slides */}
            {slides.map((slide, idx) => (
                <div
                    key={slide.id}
                    className="absolute inset-0 transition-opacity duration-700"
                    style={{ opacity: idx === current ? 1 : 0 }}
                    aria-hidden={idx !== current}
                >
                    <Image
                        src={slide.imageUrl}
                        alt={slide.title || `Slide ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="50vw"
                        priority={idx === 0}
                        quality={75}
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Text overlay */}
                    {(slide.title || slide.description) && (
                        <div className="absolute bottom-10 left-8 right-8 text-white">
                            {slide.title && (
                                <p className="text-2xl font-bold leading-tight drop-shadow-md">{slide.title}</p>
                            )}
                            {slide.description && (
                                <p className="mt-2 text-sm text-white/80 leading-relaxed drop-shadow">{slide.description}</p>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Dot indicators */}
            {slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrent(idx)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === current
                                    ? 'bg-white w-5'
                                    : 'bg-white/50 hover:bg-white/80'
                                }`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
