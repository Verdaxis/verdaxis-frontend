"""Disposable journey fixtures: catalog, ports, two REAL-provenance actors.

Runs against the journeys' own disposable PostgreSQL with the backend tree on
``sys.path``. Never accepts a database URL from outside: the runner exports
JOURNEYS_DATABASE_URL and this module refuses any name but the journeys one.
"""
import asyncio
import os
from datetime import UTC, datetime, timedelta

from app.core.security import get_password_hash
from app.models.notification import Notification, NotificationType
from app.models.port import Port
from app.models.user import Organization, OrgType, User, UserRole, UserStatus
from app.seeds.catalog_seed import seed_catalog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from tests.postgres.market_test_support import assign_fixture_real_provenance

# Ephemeral coordinates for the eight approved trading ports. The intelligence
# map reads /ports and renders one circle per row.
PORTS = [
    ('sg-sin', 'Singapore', 'Singapore', 103.8, 1.29, 'Asia/Singapore'),
    ('nl-rtm', 'Rotterdam', 'Netherlands', 4.48, 51.92, 'Europe/Amsterdam'),
    ('us-hou', 'Houston', 'United States', -95.28, 29.72, 'America/Chicago'),
    ('cn-dal', 'Dalian', 'China', 121.66, 38.92, 'Asia/Shanghai'),
    ('kr-bus', 'Busan', 'South Korea', 129.04, 35.10, 'Asia/Seoul'),
    ('cn-sha', 'Shanghai', 'China', 121.47, 31.23, 'Asia/Shanghai'),
    ('us-lax', 'Los Angeles', 'United States', -118.26, 33.73, 'America/Los_Angeles'),
    ('br-ssz', 'Santos', 'Brazil', -46.31, -23.96, 'America/Sao_Paulo'),
]

PASSWORD = 'Journeys-Password-7!'


async def main():
    url = os.environ['JOURNEYS_DATABASE_URL']
    assert '@127.0.0.1:' in url and url.endswith('/verdaxis_journeys_market_integrity_test'), url
    engine = create_async_engine(url)
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            await seed_catalog(session)
            for port_id, name, country, lng, lat, timezone in PORTS:
                session.add(Port(id=port_id, name=name, country=country,
                                 location=f'SRID=4326;POINT({lng} {lat})',
                                 timezone=timezone))
            organizations = {}
            for role in (UserRole.BUYER, UserRole.SUPPLIER, UserRole.ADMIN):
                org = None if role == UserRole.ADMIN else Organization(
                    name=f'Journeys {role.value}',
                    type=OrgType.FUEL_BUYER if role == UserRole.BUYER else OrgType.FUEL_SUPPLIER,
                    verification_status='APPROVED')
                user = User(email=f'{role.value.lower()}@example.com',
                    password_hash=get_password_hash(PASSWORD),
                    first_name='Journeys', last_name=role.value, role=role,
                    status=UserStatus.APPROVED, organization=org,
                    email_verified=True, kyc_status='APPROVED')
                session.add(user)
                await session.flush()
                if org is not None:
                    user.kyc_organization_id = org.id
                    organizations[role.value] = org
            await assign_fixture_real_provenance(session, organizations.values())
            # One unread notification for the buyer's notifications journey. It
            # deliberately carries no `order_expiring` event: that event swaps
            # in a localized reminder title, and the journey asserts this
            # fixture title and its read state.
            buyer = await session.scalar(
                select(User).where(User.email == 'buyer@example.com'))
            session.add(Notification(recipient_id=buyer.id,
                type=NotificationType.ORDER_UPDATE,
                title='Journeys unread reminder',
                message='Journeys-only notification body',
                data={'order_id': None},
                created_at=datetime.now(UTC) - timedelta(minutes=3)))
            await session.commit()
    finally:
        await engine.dispose()


asyncio.run(main())
