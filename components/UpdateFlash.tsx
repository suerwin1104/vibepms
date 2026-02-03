
import React, { useState, useEffect } from 'react';

interface Props {
    isUpdated: boolean;
    duration?: number;
    color?: string;
    children: React.ReactNode;
}

/**
 * UpdateFlash - 資料更新時觸發閃爍高亮動畫
 * 
 * 用法:
 * <UpdateFlash isUpdated={hasJustUpdated}>
 *   <YourComponent />
 * </UpdateFlash>
 */
const UpdateFlash: React.FC<Props> = ({
    isUpdated,
    duration = 1500,
    color = '#fef08a',
    children
}) => {
    const [isFlashing, setIsFlashing] = useState(false);

    useEffect(() => {
        if (isUpdated) {
            setIsFlashing(true);
            const timer = setTimeout(() => {
                setIsFlashing(false);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isUpdated, duration]);

    return (
        <div
            style={{
                position: 'relative',
                transition: `background-color ${duration / 2}ms ease-out`,
                backgroundColor: isFlashing ? color : 'transparent',
                borderRadius: '8px'
            }}
        >
            {children}

            {/* Ripple effect overlay */}
            {isFlashing && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: '8px',
                        border: `2px solid ${color}`,
                        animation: `updateRipple ${duration}ms ease-out forwards`,
                        pointerEvents: 'none'
                    }}
                />
            )}

            <style>{`
        @keyframes updateRipple {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.05);
          }
        }
      `}</style>
        </div>
    );
};

export default UpdateFlash;
