"""Initial Copart auction schema."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.create_table(
        "import_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("filename", sa.String(512), nullable=False), sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False), sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)), sa.Column("total_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("processed_rows", sa.Integer(), nullable=False, server_default="0"), sa.Column("inserted_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_rows", sa.Integer(), nullable=False, server_default="0"), sa.Column("skipped_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_rows", sa.Integer(), nullable=False, server_default="0"), sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_import_jobs_status", "import_jobs", ["status"])
    common_columns = [
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True), sa.Column("source_id", sa.String(100)),
        sa.Column("yard_number", sa.Integer()), sa.Column("yard_name", sa.String(255)), sa.Column("sale_date", sa.Date()),
        sa.Column("day_of_week", sa.String(20)), sa.Column("sale_time", sa.Time()), sa.Column("time_zone", sa.String(64)),
        sa.Column("item_number", sa.String(100)), sa.Column("lot_number", sa.BigInteger(), nullable=False), sa.Column("vehicle_type", sa.String(100)),
        sa.Column("year", sa.Integer()), sa.Column("make", sa.String(100)), sa.Column("model_group", sa.String(150)), sa.Column("model_detail", sa.String(255)),
        sa.Column("body_style", sa.String(100)), sa.Column("color", sa.String(100)), sa.Column("damage_description", sa.String(255)), sa.Column("secondary_damage", sa.String(255)),
        sa.Column("sale_title_state", sa.String(20)), sa.Column("sale_title_type", sa.String(100)), sa.Column("has_keys", sa.Boolean()), sa.Column("lot_condition_code", sa.String(100)),
        sa.Column("vin", sa.String(17)), sa.Column("odometer", sa.Numeric()), sa.Column("odometer_brand", sa.String(100)),
        sa.Column("estimated_retail_value", sa.Numeric(14, 2)), sa.Column("repair_cost", sa.Numeric(14, 2)), sa.Column("engine", sa.String(100)),
        sa.Column("drive", sa.String(100)), sa.Column("transmission", sa.String(100)), sa.Column("fuel_type", sa.String(100)), sa.Column("cylinders", sa.Integer()),
        sa.Column("runs_drives", sa.String(255)), sa.Column("sale_status", sa.String(100)), sa.Column("high_bid", sa.Numeric(14, 2)), sa.Column("special_note", sa.Text()),
        sa.Column("location_city", sa.String(100)), sa.Column("location_state", sa.String(20)), sa.Column("location_zip", sa.String(20)), sa.Column("location_country", sa.String(100)),
        sa.Column("currency_code", sa.String(10)), sa.Column("image_thumbnail", sa.Text()), sa.Column("create_datetime", sa.DateTime(timezone=True)), sa.Column("grid_row", sa.String(100)),
        sa.Column("make_offer_eligible", sa.Boolean()), sa.Column("buy_it_now_price", sa.Numeric(14, 2)), sa.Column("image_url", sa.Text()), sa.Column("trim", sa.String(150)),
        sa.Column("last_updated_time", sa.DateTime(timezone=True)), sa.Column("rentals", sa.Boolean()), sa.Column("wholesale", sa.Boolean()), sa.Column("seller_name", sa.String(255)),
        sa.Column("offsite_address1", sa.String(255)), sa.Column("offsite_state", sa.String(20)), sa.Column("offsite_city", sa.String(100)), sa.Column("offsite_zip", sa.String(20)),
        sa.Column("sale_light", sa.String(100)), sa.Column("autograde", sa.String(100)), sa.Column("announcements", sa.Text()),
        sa.Column("sale_datetime_local", sa.DateTime(timezone=True)), sa.Column("sale_datetime_utc", sa.DateTime(timezone=True)), sa.Column("search_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("source_file", sa.String(512)), sa.Column("source_import_job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("import_jobs.id")),
        sa.Column("raw_data", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")), sa.Column("extra_data", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("lot_number", name="uq_auctions_lot_number"),
    ]
    op.create_table("auctions", *common_columns)
    for column in ("yard_number", "yard_name", "sale_date", "lot_number", "vehicle_type", "year", "make", "model_group", "model_detail", "vin", "sale_status", "location_city", "location_state", "sale_datetime_utc", "last_updated_time"):
        op.create_index(f"ix_auctions_{column}", "auctions", [column])
    op.execute("CREATE INDEX ix_auctions_search_text_trgm ON auctions USING gin (search_text gin_trgm_ops)")
    op.execute("CREATE INDEX ix_auctions_vin_lower ON auctions (lower(vin))")


def downgrade() -> None:
    op.drop_table("auctions")
    op.drop_table("import_jobs")