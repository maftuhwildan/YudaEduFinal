'use client';

import * as React from 'react';
import { motion, MotionProps, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

// ===========================
// SLIDING NUMBER
// ===========================
interface SlidingNumberProps {
    value: number;
    className?: string;
    padStart?: boolean;
    decimalSeparator?: string;
    thousandSeparator?: string;
}

export function SlidingNumber({
    value,
    className,
    padStart = false,
    decimalSeparator = '.',
    thousandSeparator = '',
}: SlidingNumberProps) {
    const [displayValue, setDisplayValue] = React.useState(value);

    React.useEffect(() => {
        setDisplayValue(value);
    }, [value]);

    const formattedValue = padStart
        ? displayValue.toString().padStart(2, '0')
        : displayValue.toString();

    const digits = formattedValue.split('');

    return (
        <span className={cn('inline-flex overflow-hidden', className)}>
            <AnimatePresence mode="popLayout" initial={false}>
                {digits.map((digit, index) => (
                    <motion.span
                        key={`${index}-${digit}`}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="inline-block tabular-nums"
                    >
                        {digit}
                    </motion.span>
                ))}
            </AnimatePresence>
        </span>
    );
}

// ===========================
// ANIMATED GRADIENT BACKGROUND
// ===========================
interface AnimatedGradientProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    colors?: string[];
    speed?: 'slow' | 'normal' | 'fast';
}

export function AnimatedGradient({
    children,
    className,
    colors = ['#6366f1', '#8b5cf6', '#a855f7', '#6366f1'],
    speed = 'normal',
}: AnimatedGradientProps) {
    const speedMap = {
        slow: 15,
        normal: 8,
        fast: 4,
    };

    return (
        <div className={cn('relative overflow-hidden', className)}>
            <motion.div
                className="absolute inset-0 -z-10"
                style={{
                    background: `linear-gradient(270deg, ${colors.join(', ')})`,
                    backgroundSize: '400% 400%',
                }}
                animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                    duration: speedMap[speed],
                    repeat: Infinity,
                    ease: 'linear',
                }}
            />
            {children}
        </div>
    );
}

// ===========================
// MAGNETIC BUTTON
// ===========================
interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    strength?: number;
}

export function MagneticButton({
    children,
    className,
    strength = 0.3,
    ...props
}: MagneticButtonProps) {
    const ref = React.useRef<HTMLButtonElement>(null);
    const [position, setPosition] = React.useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        setPosition({ x: x * strength, y: y * strength });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <motion.button
            ref={ref}
            className={className}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: 'spring', stiffness: 150, damping: 15 }}
            {...(props as any)}
        >
            {children}
        </motion.button>
    );
}

// ===========================
// FADE IN
// ===========================
interface FadeInProps extends MotionProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function FadeIn({
    children,
    className,
    delay = 0,
    direction = 'up',
    ...props
}: FadeInProps) {
    const directionMap = {
        up: { y: 20 },
        down: { y: -20 },
        left: { x: 20 },
        right: { x: -20 },
        none: {},
    };

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, ...directionMap[direction] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.5, delay, ease: 'easeOut' }}
            {...props}
        >
            {children}
        </motion.div>
    );
}

interface ScaleOnHoverProps {
    children: React.ReactNode;
    className?: string;
    scale?: number;
}

export function ScaleOnHover({
    children,
    className,
    scale = 1.05,
}: ScaleOnHoverProps) {
    return (
        <motion.div
            className={className}
            whileHover={{ scale }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
            {children}
        </motion.div>
    );
}

// ===========================
// PULSE ANIMATION
// ===========================
interface PulseProps {
    children: React.ReactNode;
    className?: string;
    intensity?: 'subtle' | 'normal' | 'strong';
}

export function Pulse({
    children,
    className,
    intensity = 'normal',
}: PulseProps) {
    const intensityMap = {
        subtle: [1, 1.02, 1],
        normal: [1, 1.05, 1],
        strong: [1, 1.1, 1],
    };

    return (
        <motion.div
            className={className}
            animate={{ scale: intensityMap[intensity] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
            {children}
        </motion.div>
    );
}

// ===========================
// STAGGER CHILDREN
// ===========================
interface StaggerContainerProps {
    children: React.ReactNode;
    className?: string;
    staggerDelay?: number;
}

export function StaggerContainer({
    children,
    className,
    staggerDelay = 0.1,
}: StaggerContainerProps) {
    return (
        <motion.div
            className={className}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: staggerDelay,
                    },
                },
            }}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            className={className}
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    );
}

// ===========================
// SHIMMER 
// ===========================
interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function Shimmer({ children, className, ...props }: ShimmerProps) {
    return (
        <div className={cn('relative overflow-hidden', className)} {...props}>
            {children}
            <motion.div
                className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    );
}
