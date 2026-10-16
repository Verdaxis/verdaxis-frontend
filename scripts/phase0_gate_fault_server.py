"""Local-only fault controller around the unchanged canonical application."""
import json
import os
from pathlib import Path

import uvicorn
from app.main import app
from app.services.kyc_document_vault import KeyRing
from tests.disposable_server import DisposableIdentityApp, validate_config


def main():
    port = int(os.environ['GATE_API_PORT'])
    token = validate_config(os.environ['ENVIRONMENT'], os.environ['DISPOSABLE_TEST_TOKEN'],
                            '127.0.0.1', port, os.environ['RELEASE_SHA'])
    control = Path(os.environ['GATE_FAULT_CONTROL'])
    keys = KeyRing('synthetic', {'synthetic': b'S' * 32})

    @app.middleware('http')
    async def local_vault_fault(request, call_next):
        mode = json.loads(control.read_text()).get('vault', 'unavailable')
        app.state.kyc_document_keys = keys if mode == 'available' else None
        return await call_next(request)

    uvicorn.run(DisposableIdentityApp(app, token), host='127.0.0.1', port=port)


if __name__ == '__main__':
    main()
