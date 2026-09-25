import type { MarketProduct } from '../types';

export type ActivityKind = 'all' | 'browsing' | 'business' | 'login';
export type ActivitySource = Exclude<ActivityKind, 'all'>;
export type ActivityPeriod = 7 | 30 | 90;

export interface UserActivityItem {
  id: string;
  occurred_at: string;
  source: ActivitySource;
  action: string;
  details: Record<string, unknown>;
}

export interface UserActivityResponse {
  items: UserActivityItem[];
  has_more: boolean;
  last_activity_at: string | null;
}

export interface UserActivityQuery {
  days: ActivityPeriod;
  kind: ActivityKind;
  limit: number;
  offset: number;
}

export type ActivityRecordAction = 'page_view' | 'market_view' | 'market_filter';

export interface ActivityRecordEvent {
  id: string;
  action: ActivityRecordAction;
  page: string;
  market_product?: MarketProduct;
  delivery_point_id?: string;
  availability_window?: string;
}

export interface ActivityRecordInput {
  consent_version: 2;
  events: ActivityRecordEvent[];
}
