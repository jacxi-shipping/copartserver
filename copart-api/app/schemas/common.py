from math import ceil
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Pagination(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_previous: bool

    @classmethod
    def create(cls, page: int, page_size: int, total: int) -> "Pagination":
        return cls(page=page, page_size=page_size, total=total, total_pages=ceil(total / page_size) if total else 0, has_next=page * page_size < total, has_previous=page > 1)


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T


class ErrorDetail(BaseModel):
    code: str
    message: str