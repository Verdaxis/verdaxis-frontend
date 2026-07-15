import React from 'react';
import { useTranslation } from 'react-i18next';

import { ProductPortCell } from '../../../types/productAnalytics';
import { EmptyNote, cellText } from './AnalyticsStates';

// Product × port matrix as a real table (§1.7): keyboard-reachable cells,
// suppression markers, no color-only encoding.
export const MarketActivityMatrix: React.FC<{ cells: ProductPortCell[] }> = ({ cells }) => {
  const { t } = useTranslation('admin');
  const suppressed = t('pa.state.suppressed');
  if (cells.length === 0) return <EmptyNote label={t('pa.state.sparse')} />;
  const products = [...new Map(cells.map(cell => [cell.product_key, cell.product_label]))];
  const ports = [...new Map(cells.map(cell => [cell.delivery_point_key, cell.delivery_point_label]))];
  const byKey = new Map(cells.map(cell => [`${cell.product_key}|${cell.delivery_point_key}`, cell]));
  return (
    <div className="overflow-x-auto">
      <table className="text-sm tabular-nums" data-testid="market-matrix">
        <thead>
          <tr className="text-left text-xs text-verdaxis-text-muted">
            <th className="py-1 pr-4 font-medium">{t('pa.matrix.product')}</th>
            {ports.map(([key, label]) => (
              <th key={key} className="py-1 px-3 font-medium text-right">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.map(([productKey, productLabel]) => (
            <tr key={productKey} className="border-t border-verdaxis-border/60">
              <td className="py-1.5 pr-4 text-verdaxis-text-muted">{productLabel}</td>
              {ports.map(([portKey]) => {
                const cell = byKey.get(`${productKey}|${portKey}`);
                return (
                  <td key={portKey} className="py-1.5 px-3 text-right">
                    {cell ? (
                      <span
                        tabIndex={0}
                        className="inline-block rounded px-1.5 focus:outline focus:outline-1 focus:outline-verdaxis"
                        aria-label={t('pa.matrix.cellLabel', {
                          product: productLabel,
                          port: byKey.get(`${productKey}|${portKey}`)?.delivery_point_label,
                          orders: cellText(cell.orders, suppressed),
                          organizations: cellText(cell.organizations, suppressed),
                        })}
                      >
                        {cellText(cell.orders, suppressed)}
                        <span className="text-xs text-verdaxis-text-muted ml-1">
                          / {cellText(cell.organizations, suppressed)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-verdaxis-text-muted/50">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-verdaxis-text-muted mt-1">{t('pa.matrix.legend')}</p>
    </div>
  );
};
