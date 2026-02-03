
import { supabase } from '../config/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type RealtimeConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export type TableName =
  | 'rooms'
  | 'daily_cleaning_tasks'
  | 'workflow_instances'
  | 'approval_records'
  | 'reservations'
  | 'room_notes'
  | 'housekeepers'
  | 'purchase_requisitions'
  | 'purchase_orders'
  | 'goods_receipts'
  | 'goods_issues'
  | 'stock_transfers'
  | 'petty_cash_transactions'
  | 'journal_entries'
  | 'invoices';

export type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeCallback<T = any> {
  (payload: {
    eventType: ChangeEvent;
    new: T;
    old: T;
    table: TableName;
  }): void;
}

export interface RealtimeSubscription {
  table: TableName;
  callback: RealtimeCallback;
  filter?: string;
}

class RealtimeService {
  private channel: RealtimeChannel | null = null;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private statusCallbacks: Set<(status: RealtimeConnectionStatus) => void> = new Set();
  private currentStatus: RealtimeConnectionStatus = 'disconnected';
  private lastSyncTime: Date | null = null;
  private syncCallbacks: Set<(time: Date) => void> = new Set();

  /**
   * Initialize the realtime channel with all table subscriptions
   */
  initialize(hotelId?: string): RealtimeChannel {
    // Clean up existing channel
    if (this.channel) {
      this.cleanup();
    }

    // Create a new channel
    this.channel = supabase.channel('db-realtime-changes', {
      config: {
        broadcast: { self: true }
      }
    });

    // Set up status callback
    this.channel.on('system', { event: '*' }, (payload) => {
      console.log('[Realtime] System event:', payload);
    });

    // Subscribe to all tables (only tables that exist and have Realtime enabled)
    // Note: Ensure these tables have Realtime enabled in Supabase Dashboard
    const tables: TableName[] = [
      'rooms',
      'daily_cleaning_tasks',
      'workflow_instances',
      'approval_records',
      'reservations',
      'room_notes',
      'journal_entries', // 傳票即時同步
      'invoices' // 發票即時同步
      // Note: housekeepers and procurement tables may need Realtime enabled separately
    ];

    tables.forEach(table => {
      this.channel!.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log(`[Realtime] Change on ${table}:`, payload.eventType);
          this.handleChange(table, payload);
        }
      );
    });

    // Subscribe to the channel
    this.channel.subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);

      if (status === 'SUBSCRIBED') {
        this.setStatus('connected');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        this.setStatus('disconnected');
      } else if (status === 'TIMED_OUT') {
        this.setStatus('reconnecting');
        // Auto-retry after 5 seconds if timed out
        setTimeout(() => {
          if (this.currentStatus === 'reconnecting') {
            console.log('[Realtime] Auto-reconnecting after timeout...');
            this.reconnect(hotelId);
          }
        }, 5000);
      }
    });

    return this.channel;
  }

  /**
   * Handle incoming database changes
   */
  private handleChange(table: TableName, payload: RealtimePostgresChangesPayload<any>) {
    // Update last sync time
    this.lastSyncTime = new Date();
    this.syncCallbacks.forEach(cb => cb(this.lastSyncTime!));

    // Notify all subscribers for this table
    this.subscriptions.forEach((sub, key) => {
      if (sub.table === table) {
        sub.callback({
          eventType: payload.eventType as ChangeEvent,
          new: payload.new,
          old: payload.old,
          table: table
        });
      }
    });
  }

  /**
   * Subscribe to changes on a specific table
   */
  subscribe<T = any>(
    table: TableName,
    callback: RealtimeCallback<T>,
    filter?: string
  ): string {
    const id = `${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(id, { table, callback: callback as RealtimeCallback, filter });
    return id;
  }

  /**
   * Unsubscribe from a specific subscription
   */
  unsubscribe(subscriptionId: string) {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Add a status change listener
   */
  onStatusChange(callback: (status: RealtimeConnectionStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.currentStatus);

    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Add a sync time listener
   */
  onSyncTimeChange(callback: (time: Date) => void): () => void {
    this.syncCallbacks.add(callback);
    if (this.lastSyncTime) {
      callback(this.lastSyncTime);
    }

    return () => {
      this.syncCallbacks.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): RealtimeConnectionStatus {
    return this.currentStatus;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Set connection status and notify listeners
   */
  private setStatus(status: RealtimeConnectionStatus) {
    this.currentStatus = status;
    this.statusCallbacks.forEach(cb => cb(status));
  }

  /**
   * Cleanup and remove the channel
   */
  cleanup() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.subscriptions.clear();
    this.setStatus('disconnected');
  }

  /**
   * Force reconnect
   */
  reconnect(hotelId?: string) {
    this.setStatus('reconnecting');
    this.cleanup();
    this.initialize(hotelId);
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
export default realtimeService;
