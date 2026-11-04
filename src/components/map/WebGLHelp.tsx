import React from 'react';
import { useNamespace } from '../../hooks/useNamespace';
import { browserFamily } from '../../map/webglSupport';

/**
 * The steps that turn graphics acceleration back on, for the user's browser.
 * Shown when the Intelligence Map cannot start WebGL.
 */
export function WebGLHelp({ userAgent = navigator.userAgent }: { userAgent?: string }) {
    const { t } = useNamespace('dashboard');
    const family = browserFamily(userAgent);
    return (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>{t('buyerMap.webgl.stepRestart')}</li>
            <li>{t(`buyerMap.webgl.browsers.${family}.acceleration`)}</li>
            <li>{t(`buyerMap.webgl.browsers.${family}.check`)}</li>
        </ol>
    );
}
