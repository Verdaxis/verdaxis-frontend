export type EcaLayersModule = typeof import('./addEcaLayers');

export const loadEcaLayers = (): Promise<EcaLayersModule> => import('./addEcaLayers');
