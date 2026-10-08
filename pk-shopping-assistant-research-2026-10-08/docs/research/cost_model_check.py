"""Research arithmetic only. Does not implement or contact the proposed service."""
import json
from decimal import Decimal, ROUND_CEILING
from pathlib import Path

D = Decimal

def ceiling(value):
    return int(D(value).to_integral_value(rounding=ROUND_CEILING))

loads = []
for users in (100, 1000, 10000):
    saved_interests = 3 * users
    offers = int(D('0.4') * saved_interests)
    observations = 2 * offers
    ingest_batches = ceiling(D(observations) / 10)
    purge_batches = ceiling(D(observations) / 100)
    retained = 90 * observations
    storage_bytes = int(D('1.25') * (retained * 1024 + offers * 2048))
    warmup_writes = ceiling(D('1.1') * 4 * observations)
    mature_writes = ceiling(D('1.1') * 7 * observations)
    bootstrap_extra_writes = ceiling(D('1.1') * 4 * offers)
    normal_reads = 400 * users + 4 * observations + 3 * observations + 2 * ingest_batches + 100
    backup_reads = 220 * users
    daily_worker_requests = 2 * users + ingest_batches + purge_batches + 10
    feed_bytes = observations * 1024
    output_bytes = users * 50 * 1024  # assumed combined bytes for the two-call viewer workflow
    potential_notices = D('0.05') * saved_interests
    loads.append({
        'daily_active_users': users,
        'local_watch_interest_equivalents': saved_interests,
        'unique_curated_eligible_offers': offers,
        'observation_slots_per_day': observations,
        'ingest_batches_per_day': ingest_batches,
        'purge_batches_per_day_after_day90': purge_batches,
        'worker_requests_per_day': daily_worker_requests,
        'writes_warmup_budget_per_day': warmup_writes,
        'writes_mature_budget_per_day': mature_writes,
        'bootstrap_extra_writes_budget': bootstrap_extra_writes,
        'first_day_writes_including_bootstrap_budget': warmup_writes + bootstrap_extra_writes,
        'reads_normal_day': normal_reads,
        'reads_weekly_backup_day': normal_reads + backup_reads,
        'retained_observations_day90': retained,
        'storage_day90_bytes': storage_bytes,
        'storage_day90_decimal_MB': float(D(storage_bytes)/1000000),
        'feed_input_decimal_MB_per_day': float(D(feed_bytes)/1000000),
        'response_output_decimal_MB_per_day': float(D(output_bytes)/1000000),
        'response_output_decimal_GB_per_30days': float(D(output_bytes)*30/1000000000),
        'possible_local_notice_candidates_per_day': int(potential_notices),
        'delivered_server_notifications_per_day': 0,
    })

revenue = []
for name, users, clicks_per_user, conversion, approved, order_value, rate, upkeep, recruitment in [
    ('conditional_low',100,'0.25','0.02','0.70','5000','0.02','4','4'),
    ('conditional_base',1000,'0.50','0.03','0.80','6000','0.03','8','8'),
    ('conditional_high',10000,'0.75','0.05','0.85','8000','0.04','16','16'),
]:
    clicks = D(users) * D(clicks_per_user)
    orders = clicks * D(conversion)
    approved_orders = orders * D(approved)
    commission = approved_orders * D(order_value) * D(rate)
    support_hours = D(users) * D('0.02') * D(6) / 60
    labor_hours = support_hours + D(upkeep) + D(recruitment)
    revenue.append({
        'scenario':name, 'qualified_monthly_active_users':users,
        'attributable_clicks_per_month':float(clicks),
        'placed_orders_expected':float(orders),
        'approved_orders_expected':float(approved_orders),
        'gross_accrued_commission_PKR':float(commission),
        'commission_PKR_per_MAU':float(commission/users),
        'support_hours_per_month':float(support_hours),
        'maintenance_hours_per_month':float(D(upkeep)),
        'recruitment_hours_per_month':float(D(recruitment)),
        'total_labor_hours_per_month':float(labor_hours),
        'shadow_labor_PKR_at_1000_per_hour':float(labor_hours*1000),
    })

def max_users_for_budget(coefficient, limit, constant=0):
    return int((D(limit)-D(constant)) / D(coefficient))

thresholds = {
    'writes_mature_users_at_80pct':max_users_for_budget('18.48',80000),
    'writes_mature_users_at_90pct_app_stop':max_users_for_budget('18.48',90000),
    'writes_mature_users_at_provider_100pct':max_users_for_budget('18.48',100000),
    'storage_users_at_80pct':max_users_for_budget('279552',400000000),
    'storage_users_at_90pct_app_stop':max_users_for_budget('279552',450000000),
    'storage_users_at_provider_100pct':max_users_for_budget('279552',500000000),
    'reads_backup_day_users_at_80pct':max_users_for_budget('637.28',4000000,100),
    'reads_backup_day_users_at_provider_100pct':max_users_for_budget('637.28',5000000,100),
    'storage_with2048byte_observations_users_at_80pct':max_users_for_budget('556032',400000000),
    'storage_with2048byte_observations_users_at_90pct_app_stop':max_users_for_budget('556032',450000000),
    'storage_with2048byte_observations_users_at_provider100pct':max_users_for_budget('556032',500000000),
    'write_users_at_provider100pct_with_unique_ratio100pct':max_users_for_budget('46.2',100000),
    'base_conditional_MAU_to_cover_hypothetical_PKR5000_cash_cost':ceiling(D(5000)/D('2.16')),
    'base_conditional_MAU_to_cover_hypothetical_PKR15000_total_cost':ceiling(D(15000)/D('2.16')),
}

assert loads[0]['storage_day90_bytes'] == 27955200
assert [load['worker_requests_per_day'] for load in loads] == [237, 2274, 22650]
assert loads[1]['writes_mature_budget_per_day'] == 18480
assert loads[2]['reads_weekly_backup_day'] == 6372900
assert revenue[1]['gross_accrued_commission_PKR'] == 2160.0
assert revenue[2]['gross_accrued_commission_PKR'] == 102000.0
assert thresholds['storage_users_at_provider_100pct'] == 1788
assert thresholds['storage_with2048byte_observations_users_at_provider100pct'] == 899
result = {
    'research_date':'2026-10-08',
    'classification':'Arithmetic checked; all behavioral, row-size, query-cost and revenue inputs are untested planning assumptions.',
    'scope':'No service requests, installations, deployments or production software.',
    'assumptions':{
        'viewer_workflows_per_DAU_per_day':1,
        'API_calls_per_viewer_workflow':2,
        'combined_rows_read_per_viewer_workflow':400,
        'combined_response_bytes_per_viewer_workflow':51200,
        'observation_bytes_including_indexes':1024,
        'ancillary_bytes_per_unique_offer':2048,
        'page_fragmentation_multiplier':1.25,
        'storage_sensitivity_observation_bytes':2048,
        'schema_warning':'Rich JSON sizes and query plans are unmeasured; these are planning assumptions, not measured row sizes.',
    },
    'loads':loads, 'revenue':revenue, 'thresholds':thresholds,
}
destination = Path(__file__).resolve().with_name('cost-model-results.json')
destination.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
print(json.dumps(result, indent=2))
