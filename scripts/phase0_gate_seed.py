"""Synthetic records for the disposable Task 8 browser gate; no schema patches."""
import asyncio
import json
import os
from pathlib import Path

from app.core.security import get_password_hash
from app.models.notification import Notification, NotificationType
from app.models.port import Vessel
from app.models.user import Organization, OrgType, User, UserRole, UserStatus
from app.seeds.catalog_seed import seed_catalog
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from tests.postgres.market_test_support import assign_fixture_real_provenance


async def main():
    url = os.environ['DATABASE_URL']
    assert '@127.0.0.1:' in url and url.endswith('/phase0_browser_market_integrity_test')
    engine = create_async_engine(url)
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            await seed_catalog(session)
            identities = {}
            for role in (UserRole.BUYER, UserRole.SUPPLIER):
                org = Organization(name=f'Synthetic {role.value}',
                    type=OrgType.FUEL_BUYER if role == UserRole.BUYER else OrgType.FUEL_SUPPLIER,
                    verification_status='APPROVED')
                user = User(email=f'{role.value.lower()}@example.com',
                    password_hash=get_password_hash('Synthetic-Gate-Password-42!'),
                    first_name='Synthetic', last_name=role.value, role=role,
                    status=UserStatus.APPROVED, organization=org,
                    email_verified=True, kyc_status='APPROVED')
                session.add(user)
                await session.flush()
                user.kyc_organization_id = org.id
                await assign_fixture_real_provenance(session, [org])
                identities[role.value] = str(user.id)
                if role == UserRole.BUYER:
                    session.add(Vessel(organization_id=org.id, name='Synthetic unpriced vessel',
                        imo_number='9999991', vessel_type='Bulk Carrier', dwt=50000))
                for hidden in (False, True):
                    session.add(Notification(recipient_id=user.id, type=NotificationType.ORDER_UPDATE,
                        title='Synthetic reminder', message='Synthetic only',
                        data={'event': 'order_expiring', 'expires_at': '2030-01-01T00:00:00Z',
                              '_email_only': hidden, '_email_payload': {'private': 'synthetic'},
                              '_email_status': 'sent'}))
            await session.commit()
            Path(os.environ['GATE_IDENTITIES']).write_text(json.dumps(identities))
    finally:
        await engine.dispose()


asyncio.run(main())
