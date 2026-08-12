import re
from datetime import UTC, date, datetime, time
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

NULL_VALUES = {"", "-", "n/a", "na", "null", "none", "unknown"}
TRUE_VALUES = {"yes", "y", "true", "1"}
FALSE_VALUES = {"no", "n", "false", "0"}


def clean_string(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return None if text.lower() in NULL_VALUES else text


def normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def normalize_search_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def parse_boolean(value: Any) -> Optional[bool]:
    text = clean_string(value)
    if text is None:
        return None
    lowered = text.lower()
    if lowered in TRUE_VALUES:
        return True
    if lowered in FALSE_VALUES:
        return False
    raise ValueError(f"invalid boolean: {value}")


def parse_integer(value: Any) -> Optional[int]:
    text = clean_string(value)
    if text is None:
        return None
    try:
        return int(text.replace(",", ""))
    except ValueError as exc:
        raise ValueError(f"invalid integer: {value}") from exc


def parse_decimal(value: Any) -> Optional[Decimal]:
    text = clean_string(value)
    if text is None:
        return None
    try:
        return Decimal(text.replace("$", "").replace(",", ""))
    except InvalidOperation as exc:
        raise ValueError(f"invalid decimal: {value}") from exc


def parse_sale_date(value: Any) -> Optional[date]:
    text = clean_string(value)
    if text is None or text == "0":
        return None
    try:
        return datetime.strptime(text, "%Y%m%d").date()
    except ValueError as exc:
        raise ValueError(f"invalid sale date: {value}") from exc


def parse_sale_time(value: Any) -> Optional[time]:
    text = clean_string(value)
    if text is None or text == "0":
        return None
    digits = re.sub(r"\D", "", text).zfill(4)
    if len(digits) != 4:
        raise ValueError(f"invalid sale time: {value}")
    try:
        return time(hour=int(digits[:2]), minute=int(digits[2:]))
    except ValueError as exc:
        raise ValueError(f"invalid sale time: {value}") from exc


def parse_datetime(value: Any) -> Optional[datetime]:
    text = clean_string(value)
    if text is None or text == "0":
        return None
    candidates = (
        "%Y%m%d%H%M", "%Y%m%d %H%M", "%m/%d/%Y %H:%M", "%m/%d/%Y %H:%M:%S",
        "%Y-%m-%d-%H.%M.%S.%f",
    )
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        for format_string in candidates:
            try:
                parsed = datetime.strptime(text, format_string)
                break
            except ValueError:
                continue
        else:
            raise ValueError(f"invalid datetime: {value}")
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def extract_url(value: Any) -> Optional[str]:
    text = clean_string(value)
    if text is None:
        return None
    markdown_match = re.search(r"\((https?://[^\s)]+)\)", text)
    candidate = markdown_match.group(1) if markdown_match else text
    if re.match(r"^[a-z0-9.-]+\.[a-z]{2,}/", candidate, re.IGNORECASE):
        candidate = f"https://{candidate}"
    if not re.match(r"^https?://", candidate, re.IGNORECASE):
        raise ValueError(f"invalid URL: {value}")
    return candidate