import React from 'react';
import { useTranslation } from 'react-i18next';

export const ProducerDatasetNotice: React.FC = () => {
  const { t } = useTranslation('public');

  return (
    <section
      aria-labelledby="producer-dataset-notice-title"
      style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA', padding: '24px' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 id="producer-dataset-notice-title" style={{ color: '#7C2D12', fontSize: 18, margin: '0 0 8px' }}>
          {t('producerMap.dataset.title')}
        </h2>
        <p style={{ color: '#9A3412', fontSize: 14, lineHeight: 1.65, margin: '0 0 8px' }}>
          {t('producerMap.dataset.provenance')}
        </p>
        <p style={{ color: '#9A3412', fontSize: 14, lineHeight: 1.65, margin: '0 0 8px' }}>
          {t('producerMap.dataset.capacityLimit')}
        </p>
        <p style={{ color: '#9A3412', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
          {t('producerMap.dataset.coordinates')}{' '}
          <a href="https://nominatim.org/" target="_blank" rel="noreferrer" style={{ color: '#9A3412', textDecoration: 'underline' }}>
            {t('producerMap.dataset.geocoderLink')}
          </a>
          {' · '}{t('producerMap.dataset.reviewed')}
        </p>
      </div>
    </section>
  );
};
