"""Historical nullable RFQ and account-state fixtures, only in the owned database."""
from datetime import UTC, datetime
from uuid import UUID

from app.core.security import get_password_hash
from app.market_catalog import DELIVERY_POINT_IDS, PRODUCT_IDS
from app.models.rfq import RFQ, RFQQuote, RFQStatus
from app.models.user import User, UserRole, UserStatus
from app.models.user_preference import UserPreference
from tests.postgres.test_b100_orderbook import _ask_terms, _bid_terms
from tests.unit.test_lng_order import ASK, BID


async def seed_extra(session, identities):
    buyer = await session.get(User, UUID(identities['BUYER']))
    seller = await session.get(User, UUID(identities['SUPPLIER']))
    for name, role, organization, status, binding in [
        ('rejected', UserRole.BUYER, buyer.organization_id, 'REJECTED', buyer.organization_id),
        ('moved', UserRole.BUYER, buyer.organization_id, 'APPROVED', seller.organization_id),
        ('noorg', UserRole.BUYER, None, 'PENDING', None),
        ('admin', UserRole.ADMIN, None, 'PENDING', None),
        ('pending', UserRole.BUYER, buyer.organization_id, 'PENDING', None),
        ('upload', UserRole.BUYER, buyer.organization_id, 'PENDING', None),
    ]:
        user = User(email=f'{name}@example.com', first_name='Synthetic', last_name=name,
            password_hash=get_password_hash('Synthetic-Gate-Password-42!'), role=role,
            status=UserStatus.APPROVED, email_verified=True, organization_id=organization,
            kyc_status=status, kyc_organization_id=binding)
        session.add(user)
        await session.flush()
        identities[name] = str(user.id)
    for user_id in [identities['BUYER'], identities['SUPPLIER']]:
        session.add(UserPreference(user_id=UUID(user_id), namespace='tutorial', value={'completed': True}, updated_at=datetime.now(UTC)))
    historical = RFQ(buyer_org_id=buyer.organization_id, buyer_user_id=buyer.id,
        product_id=PRODUCT_IDS['B100'], delivery_point_id=DELIVERY_POINT_IDS['Singapore'],
        quantity_mt=200, availability_window='SPOT', status=RFQStatus.CANCELLED,
        created_at=datetime(2026, 1, 1, tzinfo=UTC), expires_at=datetime(2026, 1, 2, tzinfo=UTC),
        contract_terms=None, source_offer_id=None, source_offer_snapshot=None,
        notes='Synthetic copied pre-FAME history')
    session.add(historical)
    await session.flush()
    quote = RFQQuote(rfq_id=historical.id, seller_org_id=seller.organization_id,
        seller_user_id=seller.id, price_per_mt_usd=900, offer_terms=None, expires_at=None,
        created_at=datetime(2026, 1, 1, tzinfo=UTC))
    session.add(quote)
    identities['historical_rfq'] = str(historical.id)
    # These are validated backend fixture terms, not invented response projections.
    identities['typed'] = {
        'BIO_LNG': {'ask': {**ASK, 'seller_is_physical_supplier': True}, 'bid': BID},
        'UCOME_B100': {'ask': _ask_terms({'product_id': PRODUCT_IDS['UCOME_B100'], 'point_id': DELIVERY_POINT_IDS['Singapore']}), 'bid': _bid_terms()},
    }
