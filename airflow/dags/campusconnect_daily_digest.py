from datetime import datetime, timezone

from airflow import DAG
from airflow.operators.python import PythonOperator


def build_event_digest() -> None:
    print("CampusConnect demo digest: summarize upcoming events here.")


with DAG(
    dag_id="campusconnect_daily_digest",
    description="Example scheduled workflow for a campus events digest.",
    start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
    schedule="@daily",
    catchup=False,
    tags=["campusconnect", "teaching-example"],
) as dag:
    create_digest = PythonOperator(
        task_id="build_event_digest",
        python_callable=build_event_digest,
    )
