"""
Harven.ai LTI 1.1 Integration Service
======================================

Permite que o Harven.ai seja lançado como ferramenta externa (External Tool)
dentro do Moodle via protocolo LTI 1.1 (OAuth 1.0a).

Fluxo:
    1. Moodle envia POST /lti/launch com parâmetros assinados via OAuth 1.0a
    2. Este serviço valida a assinatura
    3. Extrai dados do aluno/professor (RA, nome, email, role)
    4. Faz upsert do usuário no banco
    5. Gera JWT do Harven e redireciona para o frontend

Uso:
    from services.lti_service import LTIService

    lti = LTIService()
    launch_data = await lti.validate_launch(request)
    user = lti.get_or_create_user(db, launch_data)
"""

import os
import time
import hmac
import hashlib
import base64
import logging
import urllib.parse
from dataclasses import dataclass, field
from typing import Optional, Dict, Any

logger = logging.getLogger("harven.lti")

# LTI consumer credentials from environment
LTI_CONSUMER_KEY = os.getenv("LTI_CONSUMER_KEY", "")
LTI_SHARED_SECRET = os.getenv("LTI_SHARED_SECRET", "")
LTI_ENABLED = os.getenv("LTI_ENABLED", "false").lower() == "true"
LTI_AUTO_CREATE_USERS = os.getenv("LTI_AUTO_CREATE_USERS", "true").lower() == "true"
LTI_REDIRECT_URL = os.getenv("LTI_REDIRECT_URL", "http://localhost:3000")

# OAuth 1.0a nonce window (seconds) — reject requests older than this
NONCE_WINDOW = 300  # 5 minutes


@dataclass
class LTILaunchData:
    """Dados extraídos de um launch request LTI validado."""
    # User identity
    user_id: str  # LTI user_id (Moodle internal)
    ra: Optional[str] = None  # lis_person_sourcedid (RA do aluno)
    name: str = ""
    email: str = ""
    role: str = "STUDENT"  # Mapped to Harven role

    # Moodle context
    context_id: Optional[str] = None  # Course/discipline ID in Moodle
    context_title: Optional[str] = None  # Course/discipline name
    resource_link_id: Optional[str] = None  # Activity ID in Moodle

    # Grade passback (for future use)
    outcome_service_url: Optional[str] = None
    result_sourcedid: Optional[str] = None

    # Raw params (for debugging/auditing)
    raw_params: Dict[str, str] = field(default_factory=dict)


class LTIValidationError(Exception):
    """Raised when LTI launch validation fails."""
    pass


class LTIService:
    """Serviço de integração LTI 1.1 para o Harven.ai."""

    # LTI role URN → Harven role mapping
    ROLE_MAP = {
        "instructor": "TEACHER",
        "contentdeveloper": "TEACHER",
        "teachingassistant": "TEACHER",
        "administrator": "ADMIN",
        "learner": "STUDENT",
        "student": "STUDENT",
        "member": "STUDENT",
    }

    def __init__(self, consumer_key: str = None, shared_secret: str = None):
        self.consumer_key = consumer_key or LTI_CONSUMER_KEY
        self.shared_secret = shared_secret or LTI_SHARED_SECRET

    async def validate_launch(self, request) -> LTILaunchData:
        """
        Valida um LTI launch request via OAuth 1.0a.

        Args:
            request: FastAPI Request object (POST form-encoded)

        Returns:
            LTILaunchData com dados extraídos do launch

        Raises:
            LTIValidationError: se validação falhar
        """
        form = await request.form()
        params = {k: v for k, v in form.items()}

        # 1. Check LTI message type
        if params.get("lti_message_type") != "basic-lti-launch-request":
            raise LTIValidationError("Invalid LTI message type")

        if params.get("lti_version") not in ("LTI-1p0", "LTI-1p1"):
            raise LTIValidationError("Unsupported LTI version")

        # 2. Validate consumer key
        consumer_key = params.get("oauth_consumer_key", "")
        if consumer_key != self.consumer_key:
            raise LTIValidationError("Invalid consumer key")

        # 3. Validate timestamp (prevent replay)
        try:
            timestamp = int(params.get("oauth_timestamp", "0"))
        except ValueError:
            raise LTIValidationError("Invalid OAuth timestamp")

        now = int(time.time())
        if abs(now - timestamp) > NONCE_WINDOW:
            raise LTIValidationError("OAuth timestamp expired")

        # 4. Validate OAuth signature
        url = str(request.url).split("?")[0]  # Base URL without query string
        # Ensure HTTPS in production (Moodle signs with the URL it sends to)
        if request.headers.get("x-forwarded-proto") == "https":
            url = url.replace("http://", "https://", 1)

        if not self._verify_oauth_signature(params, url):
            raise LTIValidationError("Invalid OAuth signature")

        # 5. Extract user data
        return self._extract_launch_data(params)

    def _verify_oauth_signature(self, params: Dict[str, str], url: str) -> bool:
        """
        Verifica a assinatura OAuth 1.0a HMAC-SHA1.

        Segue a spec OAuth 1.0a (RFC 5849):
        1. Coletar parâmetros (exceto oauth_signature)
        2. Normalizar e ordenar
        3. Construir base string: METHOD&URL&PARAMS
        4. Assinar com HMAC-SHA1 usando consumer_secret&
        """
        # Collect params excluding signature
        oauth_params = {
            k: v for k, v in params.items()
            if k != "oauth_signature"
        }

        # Sort and encode
        sorted_params = sorted(oauth_params.items())
        param_string = "&".join(
            f"{self._percent_encode(k)}={self._percent_encode(str(v))}"
            for k, v in sorted_params
        )

        # Build base string
        base_string = "&".join([
            "POST",
            self._percent_encode(url),
            self._percent_encode(param_string),
        ])

        # Sign with HMAC-SHA1 (key = consumer_secret + "&" + token_secret)
        # LTI 1.1 has no token secret, so it's just consumer_secret&
        signing_key = f"{self._percent_encode(self.shared_secret)}&"

        hashed = hmac.new(
            signing_key.encode("utf-8"),
            base_string.encode("utf-8"),
            hashlib.sha1,
        )
        computed_signature = base64.b64encode(hashed.digest()).decode("utf-8")

        expected_signature = params.get("oauth_signature", "")
        return hmac.compare_digest(computed_signature, expected_signature)

    def _extract_launch_data(self, params: Dict[str, str]) -> LTILaunchData:
        """Extrai dados padronizados do payload LTI."""
        # Map LTI roles to Harven roles
        role = self._map_roles(params.get("roles", ""))

        # Build full name from parts or use full name directly
        name = params.get("lis_person_name_full", "")
        if not name:
            given = params.get("lis_person_name_given", "")
            family = params.get("lis_person_name_family", "")
            name = f"{given} {family}".strip()

        return LTILaunchData(
            user_id=params.get("user_id", ""),
            ra=params.get("lis_person_sourcedid") or params.get("custom_ra"),
            name=name or f"User {params.get('user_id', 'unknown')}",
            email=params.get("lis_person_contact_email_primary", ""),
            role=role,
            context_id=params.get("context_id"),
            context_title=params.get("context_title"),
            resource_link_id=params.get("resource_link_id"),
            outcome_service_url=params.get("lis_outcome_service_url"),
            result_sourcedid=params.get("lis_result_sourcedid"),
            raw_params=params,
        )

    def _map_roles(self, roles_str: str) -> str:
        """
        Mapeia roles LTI para roles Harven.

        LTI roles podem ser URNs completos ou simples:
        - urn:lti:role:ims/lis/Instructor → TEACHER
        - Learner → STUDENT
        """
        if not roles_str:
            return "STUDENT"

        roles = [r.strip().lower() for r in roles_str.split(",")]

        for role in roles:
            # Extract last part of URN if present
            short_role = role.rsplit("/", 1)[-1].rsplit(":", 1)[-1]
            if short_role in self.ROLE_MAP:
                return self.ROLE_MAP[short_role]

        return "STUDENT"

    def get_or_create_user(self, db, launch_data: LTILaunchData):
        """
        Busca ou cria usuário baseado nos dados LTI.

        Estratégia de lookup:
        1. Buscar por RA (lis_person_sourcedid) se disponível
        2. Buscar por moodle_user_id
        3. Buscar por email
        4. Criar novo usuário se LTI_AUTO_CREATE_USERS=true
        """
        from repositories import UserRepository
        from models import User, ExternalMapping

        user_repo = UserRepository(db)
        user = None

        # 1. Try by RA
        if launch_data.ra:
            user = user_repo.get_by_ra(launch_data.ra)

        # 2. Try by moodle_user_id
        if not user and launch_data.user_id:
            user = db.query(User).filter(
                User.moodle_user_id == launch_data.user_id
            ).first()

        # 3. Try by email
        if not user and launch_data.email:
            user = db.query(User).filter(
                User.email == launch_data.email
            ).first()

        # 4. Create new user
        if not user:
            if not LTI_AUTO_CREATE_USERS:
                return None

            import uuid
            user = User(
                id=str(uuid.uuid4()),
                ra=launch_data.ra or f"lti-{launch_data.user_id}",
                name=launch_data.name,
                email=launch_data.email or None,
                role=launch_data.role,
                moodle_user_id=launch_data.user_id,
                password_hash="",  # LTI users don't need password
            )
            db.add(user)
            logger.info(f"LTI: Created new user ra={user.ra} role={user.role}")
        else:
            # Update moodle_user_id if not set
            if not user.moodle_user_id and launch_data.user_id:
                user.moodle_user_id = launch_data.user_id
            # Update name/email if provided and changed
            if launch_data.name and launch_data.name != user.name:
                user.name = launch_data.name
            if launch_data.email and launch_data.email != user.email:
                user.email = launch_data.email
            logger.info(f"LTI: Found existing user ra={user.ra}")

        # Save external mapping for LTI context
        if launch_data.context_id:
            existing_mapping = db.query(ExternalMapping).filter(
                ExternalMapping.entity_type == "lti_context",
                ExternalMapping.local_id == user.id,
                ExternalMapping.external_id == launch_data.context_id,
                ExternalMapping.external_system == "moodle_lti",
            ).first()

            if not existing_mapping:
                import uuid
                mapping = ExternalMapping(
                    id=str(uuid.uuid4()),
                    entity_type="lti_context",
                    local_id=user.id,
                    external_id=launch_data.context_id,
                    external_system="moodle_lti",
                )
                db.add(mapping)

        try:
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            logger.error(f"LTI: Failed to save user: {e}")
            raise

        return user

    @staticmethod
    def _percent_encode(s: str) -> str:
        """RFC 5849 percent-encoding."""
        return urllib.parse.quote(str(s), safe="")

    @staticmethod
    def generate_config_xml(tool_name: str, launch_url: str, description: str) -> str:
        """Gera XML de configuração para instalação automática no Moodle."""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<cartridge_basiclti_link
    xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0"
    xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0"
    xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0"
    xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imslticc_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd
        http://www.imsglobal.org/xsd/imsbasiclti_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imsbasiclti_v1p0p1.xsd
        http://www.imsglobal.org/xsd/imslticm_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticm_v1p0.xsd
        http://www.imsglobal.org/xsd/imslticp_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticp_v1p0.xsd">
    <blti:title>{tool_name}</blti:title>
    <blti:description>{description}</blti:description>
    <blti:launch_url>{launch_url}</blti:launch_url>
    <blti:extensions platform="moodle.org">
        <lticm:property name="privacy_level">public</lticm:property>
    </blti:extensions>
    <cartridge_bundle identifierref="BLTI001_Bundle"/>
    <cartridge_icon identifierref="BLTI001_Icon"/>
</cartridge_basiclti_link>"""
