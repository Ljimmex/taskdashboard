import { useRef, useEffect, useState } from 'react';

interface MarqueeProps {
    children: React.ReactNode;
    className?: string;
    speed?: number;
    delay?: number;
}

export const Marquee = ({
    children,
    className = "",
    speed = 20,
    delay = 1
}: MarqueeProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && textRef.current) {
                setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
            }
        };

        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [children]);

    const scrollDistance = (textRef.current?.scrollWidth || 0) - (containerRef.current?.clientWidth || 0);
    const duration = scrollDistance / speed;

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden whitespace-nowrap ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                ref={textRef}
                className="inline-block"
                style={{
                    transform: isOverflowing && isHovered ? `translateX(-${scrollDistance}px)` : 'translateX(0)',
                    transition: isOverflowing && isHovered
                        ? `transform ${duration}s linear ${delay}s`
                        : 'transform 0.3s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    );
};
