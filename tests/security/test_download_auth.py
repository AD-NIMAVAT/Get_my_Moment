import io
import uuid
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.database import SessionLocal
from apps.api.models import Photographer, Event, Photo, Folder, AdminUser
from apps.api.auth import hash_password, create_access_token

client = TestClient(app)

def create_dummy_jpeg():
    buf = io.BytesIO()
    img = Image.new('RGB', (100, 100), color=(200, 50, 50))
    img.save(buf, format='JPEG')
    return buf.getvalue()

@pytest.fixture(scope='module')
def setup_tenants_and_photos():
    db = SessionLocal()
    
    # 1. Setup Studio A
    uid1 = uuid.uuid4().hex[:6]
    p1 = Photographer(
        email='studio_a_' + uid1 + '@test.com',
        password_hash=hash_password('Password123!'),
        full_name='Studio A Owner',
        studio_name='Studio A',
        is_active=True
    )
    # 2. Setup Studio B
    uid2 = uuid.uuid4().hex[:6]
    p2 = Photographer(
        email='studio_b_' + uid2 + '@test.com',
        password_hash=hash_password('Password123!'),
        full_name='Studio B Owner',
        studio_name='Studio B',
        is_active=True
    )
    # 3. Setup SuperAdmin
    uid3 = uuid.uuid4().hex[:6]
    admin = AdminUser(
        email='superadmin_' + uid3 + '@gmm.com',
        password_hash=hash_password('AdminMaster123!'),
        full_name='Super Administrator',
        role='SUPER_ADMIN',
        is_active=True
    )
    db.add_all([p1, p2, admin])
    db.commit()
    db.refresh(p1)
    db.refresh(p2)
    db.refresh(admin)

    # Setup Event A (Photographer A)
    event_a = Event(
        photographer_id=p1.id,
        name='Event A Royal Wedding',
        slug='event-a-' + uid1,
        access_token='evt_a_token_' + uuid.uuid4().hex[:12],
        selection_token='evt_a_sel_' + uuid.uuid4().hex[:12],
        allow_downloads=True,
        status='ACTIVE'
    )
    # Setup Event B (Photographer B)
    event_b = Event(
        photographer_id=p2.id,
        name='Event B Grand Gala',
        slug='event-b-' + uid2,
        access_token='evt_b_token_' + uuid.uuid4().hex[:12],
        selection_token='evt_b_sel_' + uuid.uuid4().hex[:12],
        allow_downloads=True,
        status='ACTIVE'
    )
    # Setup Event A2 with downloads disabled
    event_a_nodownload = Event(
        photographer_id=p1.id,
        name='Event A Restricted',
        slug='event-a-restricted-' + uid1,
        access_token='evt_a_nodl_token_' + uuid.uuid4().hex[:12],
        selection_token='evt_a_nodl_sel_' + uuid.uuid4().hex[:12],
        allow_downloads=False,
        status='ACTIVE'
    )
    db.add_all([event_a, event_b, event_a_nodownload])
    db.commit()
    db.refresh(event_a)
    db.refresh(event_b)
    db.refresh(event_a_nodownload)

    # Upload Photo to Event A
    jpeg_data = create_dummy_jpeg()
    import os
    from apps.api.services.storage import storage_service
    
    file_path_a = storage_service.save_file(
        file_bytes=jpeg_data,
        original_filename='photo_a.jpg',
        mime_type='image/jpeg',
        studio_id=p1.id,
        event_id=event_a.id
    )
    photo_a = Photo(
        event_id=event_a.id,
        studio_id=p1.id,
        file_path=file_path_a,
        original_file_name='photo_a.jpg',
        file_size=len(jpeg_data),
        mime_type='image/jpeg',
        status='PROCESSED'
    )
    
    # Upload Photo to Event B
    file_path_b = storage_service.save_file(
        file_bytes=jpeg_data,
        original_filename='photo_b.jpg',
        mime_type='image/jpeg',
        studio_id=p2.id,
        event_id=event_b.id
    )
    photo_b = Photo(
        event_id=event_b.id,
        studio_id=p2.id,
        file_path=file_path_b,
        original_file_name='photo_b.jpg',
        file_size=len(jpeg_data),
        mime_type='image/jpeg',
        status='PROCESSED'
    )

    # Upload Photo to Event A Restricted
    file_path_a_nodl = storage_service.save_file(
        file_bytes=jpeg_data,
        original_filename='photo_a_nodl.jpg',
        mime_type='image/jpeg',
        studio_id=p1.id,
        event_id=event_a_nodownload.id
    )
    photo_a_nodl = Photo(
        event_id=event_a_nodownload.id,
        studio_id=p1.id,
        file_path=file_path_a_nodl,
        original_file_name='photo_a_nodl.jpg',
        file_size=len(jpeg_data),
        mime_type='image/jpeg',
        status='PROCESSED'
    )

    db.add_all([photo_a, photo_b, photo_a_nodl])
    db.commit()
    db.refresh(photo_a)
    db.refresh(photo_b)
    db.refresh(photo_a_nodl)

    jwt_p1 = create_access_token({'sub': p1.id, 'role': 'PHOTOGRAPHER'})
    jwt_p2 = create_access_token({'sub': p2.id, 'role': 'PHOTOGRAPHER'})
    jwt_admin = create_access_token({'sub': admin.id, 'role': 'SUPER_ADMIN', 'is_admin': True})

    data = {
        'p1_jwt': jwt_p1,
        'p2_jwt': jwt_p2,
        'admin_jwt': jwt_admin,
        'event_a': event_a,
        'event_b': event_b,
        'event_a_nodl': event_a_nodownload,
        'photo_a': photo_a,
        'photo_b': photo_b,
        'photo_a_nodl': photo_a_nodl
    }
    yield data
    db.close()

def test_1_no_token_unauthenticated_denied(setup_tenants_and_photos):
    photo_a = setup_tenants_and_photos['photo_a']
    res = client.get('/api/v1/photos/' + photo_a.id + '/download')
    assert res.status_code == 401
    assert 'Authentication required' in res.json()['detail']

def test_2_invalid_token_denied(setup_tenants_and_photos):
    photo_a = setup_tenants_and_photos['photo_a']
    res = client.get('/api/v1/photos/' + photo_a.id + '/download?token=totally_fake_token_12345')
    assert res.status_code == 403
    assert 'Invalid download token' in res.json()['detail']

def test_3_event_a_token_on_event_b_photo_denied(setup_tenants_and_photos):
    event_a = setup_tenants_and_photos['event_a']
    photo_b = setup_tenants_and_photos['photo_b']
    res = client.get('/api/v1/photos/' + photo_b.id + '/download?token=' + event_a.access_token)
    assert res.status_code == 403
    assert 'Invalid download token' in res.json()['detail']

def test_4_valid_event_a_token_allowed(setup_tenants_and_photos):
    event_a = setup_tenants_and_photos['event_a']
    photo_a = setup_tenants_and_photos['photo_a']
    res = client.get('/api/v1/photos/' + photo_a.id + '/download?token=' + event_a.access_token)
    assert res.status_code == 200
    assert len(res.content) > 0

def test_5_photographer_a_jwt_allowed_own_photo(setup_tenants_and_photos):
    p1_jwt = setup_tenants_and_photos['p1_jwt']
    photo_a = setup_tenants_and_photos['photo_a']
    res = client.get('/api/v1/photos/' + photo_a.id + '/download', headers={'Authorization': 'Bearer ' + p1_jwt})
    assert res.status_code == 200
    assert len(res.content) > 0

def test_6_photographer_a_jwt_denied_photographer_b_photo(setup_tenants_and_photos):
    p1_jwt = setup_tenants_and_photos['p1_jwt']
    photo_b = setup_tenants_and_photos['photo_b']
    res = client.get('/api/v1/photos/' + photo_b.id + '/download', headers={'Authorization': 'Bearer ' + p1_jwt})
    assert res.status_code == 403

def test_7_downloads_disabled_on_event_denied(setup_tenants_and_photos):
    event_a_nodl = setup_tenants_and_photos['event_a_nodl']
    photo_a_nodl = setup_tenants_and_photos['photo_a_nodl']
    res = client.get('/api/v1/photos/' + photo_a_nodl.id + '/download?token=' + event_a_nodl.access_token)
    assert res.status_code == 403
    assert 'disabled' in res.json()['detail'].lower()

def test_8_selection_token_allowed_own_event_photo(setup_tenants_and_photos):
    event_a = setup_tenants_and_photos['event_a']
    photo_a = setup_tenants_and_photos['photo_a']
    res = client.get('/api/v1/photos/' + photo_a.id + '/download?token=' + event_a.selection_token)
    assert res.status_code == 200
    assert len(res.content) > 0

def test_9_selection_token_denied_foreign_event_photo(setup_tenants_and_photos):
    event_a = setup_tenants_and_photos['event_a']
    photo_b = setup_tenants_and_photos['photo_b']
    res = client.get('/api/v1/photos/' + photo_b.id + '/download?token=' + event_a.selection_token)
    assert res.status_code == 403

def test_10_superadmin_jwt_allowed_any_photo(setup_tenants_and_photos):
    admin_jwt = setup_tenants_and_photos['admin_jwt']
    photo_b = setup_tenants_and_photos['photo_b']
    res = client.get('/api/v1/photos/' + photo_b.id + '/download', headers={'Authorization': 'Bearer ' + admin_jwt})
    assert res.status_code == 200
