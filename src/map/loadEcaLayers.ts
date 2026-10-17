import type { Map as MapboxMap } from 'mapbox-gl';

import { loadEcaZoneCollection } from '../data/secaZones';
import type { EcaLayersOptions } from './addEcaLayers';

export interface EcaLayersModule {
    addEcaLayers: (map: MapboxMap, options: Omit<EcaLayersOptions, 'collection'>) => void;
    setEcaLayersVisible: (map: MapboxMap, visible: boolean) => void;
}

/**
 * Load the ECA overlay: the layer code and the zone geometry.
 *
 * The geometry is a separate hashed asset, so both requests start here and the
 * caller (`BuyerMap`, on `style.load`) sees one promise and one failure path.
 * The resolved module closes over the fetched collection, so its `addEcaLayers`
 * keeps the call shape the map already uses.
 */
export const loadEcaLayers = async (): Promise<EcaLayersModule> => {
    const [module, collection] = await Promise.all([
        import('./addEcaLayers'),
        loadEcaZoneCollection(),
    ]);

    return {
        addEcaLayers: (map, options) => module.addEcaLayers(map, { ...options, collection }),
        setEcaLayersVisible: module.setEcaLayersVisible,
    };
};
