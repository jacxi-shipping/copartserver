from sqlalchemy.dialects import postgresql

from app.repositories.auction_repository import build_query
from app.schemas.search import SearchRequest


def test_search_statement_compiles_for_a_lot_number_query() -> None:
    statement = build_query(SearchRequest(query="48301246").model_dump(by_alias=True))
    assert "CAST(auctions.lot_number AS VARCHAR)" in str(statement.compile(dialect=postgresql.dialect()))


def test_search_request_accepts_advanced_filters() -> None:
    request = SearchRequest.model_validate({"query": "4 runner", "states": ["CA", "NV"], "estimated_retail_value_min": "5000", "sale_date_from": "2026-08-01"})
    assert request.states == ["CA", "NV"]
    assert request.query == "4 runner"


def test_search_request_uses_defaults_when_states_are_not_supplied() -> None:
    assert SearchRequest.model_validate({"q": "4runner"}).states == []