
import React from 'react';
import { RealtimeConnectionStatus } from '../../services/RealtimeService';

interface Props {
    status: RealtimeConnectionStatus;
    lastSyncTime: Date | null;
    onReconnect?: () => void;
}

const RealtimeIndicator: React.FC<Props> = ({ status, lastSyncTime, onReconnect }) => {
    const getStatusInfo = () => {
        switch (status) {
            case 'connected':
                return {
                    color: '#10b981',
                    bgColor: '#d1fae5',
                    text: '即時同步中',
                    icon: '🟢'
                };
            case 'reconnecting':
                return {
                    color: '#f59e0b',
                    bgColor: '#fef3c7',
                    text: '重新連線中...',
                    icon: '🟡'
                };
            case 'disconnected':
            default:
                return {
                    color: '#ef4444',
                    bgColor: '#fee2e2',
                    text: '離線',
                    icon: '🔴'
                };
        }
    };

    const statusInfo = getStatusInfo();
    const formattedTime = lastSyncTime
        ? lastSyncTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--:--:--';

    return (
        <div
            onClick={() => {
                if (status !== 'connected' && onReconnect) {
                    onReconnect();
                }
            }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: statusInfo.bgColor,
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                color: statusInfo.color,
                transition: 'all 0.3s ease',
                cursor: status !== 'connected' && onReconnect ? 'pointer' : 'default',
                userSelect: 'none'
            }}
            title={status !== 'connected' ? '點擊重新連線' : '連線正常'}
        >
            {/* Animated dot */}
            <span
                style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: statusInfo.color,
                    animation: status === 'connected' ? 'pulse 2s infinite' :
                        status === 'reconnecting' ? 'blink 1s infinite' : 'none'
                }}
            />

            <span>{statusInfo.text}</span>

            {status === 'connected' && lastSyncTime && (
                <span style={{ color: '#6b7280', fontSize: '11px' }}>
                    最後更新: {formattedTime}
                </span>
            )}

            {/* CSS Animation styles */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
        </div>
    );
};

export default RealtimeIndicator;
