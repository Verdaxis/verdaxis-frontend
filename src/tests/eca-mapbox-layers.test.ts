import { expect, it, vi } from 'vitest';
import type { Map } from 'mapbox-gl';
import { addEcaLayers, setEcaLayersVisible } from '../map/addEcaLayers';
import type { EcaZoneFeatureCollection } from '../data/secaZones';

const collection: EcaZoneFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'baltic', shortLabel: 'Baltic', displayStatus: 'active', labelPoint: [19, 58] } as never,
      geometry: { type: 'Polygon', coordinates: [[[10, 55], [20, 55], [20, 60], [10, 60]]] },
    },
  ],
};

it('places ECA overlays below vector labels and toggles all three layers', () => {
  const map = {
    getStyle: () => ({ layers: [{ id: 'water', type: 'fill' }, { id: 'place-label', type: 'symbol' }] }),
    getSource: vi.fn(),
    getLayer: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    setLayoutProperty: vi.fn(),
  };
  addEcaLayers(map as unknown as Map, { isDark: true, visible: true, collection });
  expect(map.addLayer).toHaveBeenCalledTimes(3);
  for (const [layer, before] of map.addLayer.mock.calls) {
    expect(before).toBe('place-label');
    expect(layer.layout.visibility).toBe('visible');
  }
  expect(map.addLayer.mock.calls[2][0].layout['text-font']).toContain('DIN Pro Medium');
  map.getLayer.mockReturnValue({});
  setEcaLayersVisible(map as unknown as Map, false);
  expect(map.setLayoutProperty).toHaveBeenCalledTimes(3);
  expect(map.setLayoutProperty.mock.calls.every(([, property, value]) => property === 'visibility' && value === 'none')).toBe(true);
});
