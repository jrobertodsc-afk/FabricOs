# -*- mode: python ; coding: utf-8 -*-
import os
import sys

# SPECPATH is automatically injected by PyInstaller when executing the spec file.
spec_path = SPECPATH if 'SPECPATH' in locals() else os.path.abspath(os.path.dirname(__name__))
root_dir = os.path.abspath(os.path.join(spec_path, ".."))

block_cipher = None

a = Analysis(
    [os.path.join(spec_path, 'build_server.py')],
    pathex=[root_dir],
    binaries=[],
    datas=[
        (os.path.join(root_dir, 'frontend', 'dist'), 'frontend/dist'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'aiosqlite',
        'sqlalchemy.ext.asyncio',
        'jose',
        'jose.jwt',
        'passlib.handlers.bcrypt',
        'passlib.handlers.pbkdf2',
        'passlib.handlers.sha256_crypt',
        'loguru',
        'email.mime.multipart',
        'email.mime.text',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='fabricos_server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
