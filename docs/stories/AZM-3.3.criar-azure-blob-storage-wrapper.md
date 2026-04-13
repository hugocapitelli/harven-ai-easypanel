# Story AZM-3.3: Criar Azure Blob Storage Wrapper

> **Epic:** Epic 3 — Backend Data Layer Refactor
> **Status:** Draft
> **Priority:** High
> **Estimated Points:** 3
> **Owner:** @dev
> **Depends on:** Nenhum (pode iniciar em paralelo com Epic 1 e Epic 2)
> **Created:** 2026-02-27
> **Created By:** River (SM Agent)

---

## Story

**As a** developer,
**I want** implementar um wrapper AzureBlobStorage que substitua todas as 24 operações de supabase.storage,
**so that** uploads de arquivos, URLs públicas e signed URLs funcionem com Azure Blob Storage.

---

## Acceptance Criteria

1. [ ] `backend/storage.py` criado com classe AzureBlobStorage
2. [ ] Métodos: `upload()`, `get_public_url()`, `create_signed_url()`, `remove()`, `upload_with_fallback()`
3. [ ] Suporte a autenticação via connection string (dev) e Managed Identity (prod)
4. [ ] upload(): substitui `supabase.storage.from_(bucket).upload()` (11 usos)
5. [ ] get_public_url(): substitui `supabase.storage.from_(bucket).get_public_url()` (10 usos)
6. [ ] create_signed_url(): substitui `create_signed_url()` com SAS token (1 uso — backups)
7. [ ] remove(): substitui `supabase.storage.from_(bucket).remove()` (2 usos)
8. [ ] upload_with_fallback(): substitui padrão de try/except entre múltiplos buckets
9. [ ] Singleton `blob_storage` exportado para uso direto nas rotas

---

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

---

## Tasks / Subtasks

- [ ] Task 1: Criar `backend/storage.py` (AC: 1, 9)
  - [ ] Import: BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions from azure.storage.blob
  - [ ] Import: DefaultAzureCredential from azure.identity
  - [ ] Class AzureBlobStorage com __init__ dual-mode (connection string ou Managed Identity)
  - [ ] Singleton: `blob_storage = AzureBlobStorage()` no final do módulo
- [ ] Task 2: Implementar upload() (AC: 2, 4)
  - [ ] Params: container, file_path, content(bytes), content_type, upsert=True
  - [ ] `blob_client.upload_blob(content, overwrite=upsert, content_settings=ContentSettings(content_type=content_type))`
  - [ ] Return: public URL
- [ ] Task 3: Implementar get_public_url() (AC: 2, 5)
  - [ ] Return: `https://{account_name}.blob.core.windows.net/{container}/{file_path}`
- [ ] Task 4: Implementar create_signed_url() (AC: 2, 6)
  - [ ] generate_blob_sas com BlobSasPermissions(read=True) e expiry
  - [ ] Return: URL com SAS token
- [ ] Task 5: Implementar remove() (AC: 2, 7)
  - [ ] Loop file_paths, `blob_client.delete_blob(delete_snapshots="include")`
- [ ] Task 6: Implementar upload_with_fallback() (AC: 2, 8)
  - [ ] Try containers em ordem, return (url, container_usado)
  - [ ] Raise se todos falharem

---

## Dev Notes

**Código completo (da arquitetura):**
```python
from azure.storage.blob import BlobServiceClient, ContentSettings, generate_blob_sas, BlobSasPermissions
from azure.identity import DefaultAzureCredential
from datetime import datetime, timedelta, timezone
import os
import uuid

class AzureBlobStorage:
    def __init__(self):
        connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.account_name = os.getenv("AZURE_STORAGE_ACCOUNT_NAME", "harvenstorage")
        if connection_string:
            self.client = BlobServiceClient.from_connection_string(connection_string)
        else:
            credential = DefaultAzureCredential()
            self.client = BlobServiceClient(
                account_url=f"https://{self.account_name}.blob.core.windows.net",
                credential=credential
            )
        self.account_key = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")

    def upload(self, container, file_path, content, content_type="application/octet-stream", upsert=True):
        blob_client = self.client.get_blob_client(container=container, blob=file_path)
        blob_client.upload_blob(content, overwrite=upsert, content_settings=ContentSettings(content_type=content_type))
        return self.get_public_url(container, file_path)

    def get_public_url(self, container, file_path):
        return f"https://{self.account_name}.blob.core.windows.net/{container}/{file_path}"

    def create_signed_url(self, container, file_path, expires_in=3600):
        sas_token = generate_blob_sas(
            account_name=self.account_name, container_name=container, blob_name=file_path,
            account_key=self.account_key, permission=BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
        )
        return f"https://{self.account_name}.blob.core.windows.net/{container}/{file_path}?{sas_token}"

    def remove(self, container, file_paths):
        for file_path in file_paths:
            blob_client = self.client.get_blob_client(container=container, blob=file_path)
            blob_client.delete_blob(delete_snapshots="include")

    def upload_with_fallback(self, containers, file_path, content, content_type):
        for container in containers:
            try:
                url = self.upload(container, file_path, content, content_type)
                return url, container
            except Exception:
                continue
        raise Exception(f"Upload failed in all containers: {containers}")

blob_storage = AzureBlobStorage()
```

**Mapeamento de containers (Supabase buckets → Azure containers):**
| Supabase Bucket | Azure Container | Access Level |
|---|---|---|
| `courses` | `courses` | Public (blob) |
| `avatars` | `avatars` | Public (blob) |
| `backups` | `backups` | Private |

**Mapeamento de operações (24 total):**
- upload: 11 usos (avatars, course images, content files, logos, backups)
- get_public_url: 10 usos (retorno de URLs após upload, settings defaults)
- create_signed_url: 1 uso (backup download — container privado)
- remove: 2 usos (delete avatar, delete backup file)

**Environment variables necessárias:**
- `AZURE_STORAGE_CONNECTION_STRING` — para dev local
- `AZURE_STORAGE_ACCOUNT_NAME` — default "harvenstorage"
- `AZURE_STORAGE_ACCOUNT_KEY` — necessário para SAS tokens

### Testing

- Testar upload com content_type correto
- Testar get_public_url retorna formato correto
- Testar create_signed_url gera SAS token válido
- Testar remove não falha para arquivos inexistentes (graceful)
- Testar upload_with_fallback tenta próximo container em caso de erro
- Testar dual-mode: connection string vs Managed Identity (mock)
- **Nota:** Testes de integração reais requerem Storage Account provisionado (AZM-1.1). Testes unitários podem usar mocks.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-27 | 1.0 | Story criada | River (SM) |
| 2026-02-28 | 1.1 | Correções pós-validação PO (Pax) | River (SM) |

---

## Dev Agent Record

### Agent Model Used
_To be filled by dev agent_

### Debug Log References
_To be filled by dev agent_

### Completion Notes List
_To be filled by dev agent_

### File List
_To be filled by dev agent_

---

## QA Results
_To be filled by QA agent_
