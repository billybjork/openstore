WITH
closed AS (
  SELECT
    os_store_id
  FROM
    ANALYTICS.MAIN.OS_MERCHANTS
  WHERE
    is_closed
),
ad_name AS (
  SELECT DISTINCT
         to_varchar(ad_id) AS ad_id,
         ad_name,
         trim(a.ad_name) AS job_name
  FROM
    ANALYTICS_DBT_PROD_DATABASE._D4__4__DBT_BUILD__DEFINITIONS_OS.PROSPECTIVE_MERCHANTS__TIKTOK_ADS__AD_ADAPTER A
  JOIN (
      SELECT
        os_store_id
      FROM
        ANALYTICS.MAIN.OS_MERCHANTS
      WHERE
        is_closed
    ) M ON M.OS_STORE_ID = A.OS_STORE_ID
  WHERE
    split_part(trim(a.ad_name), '_', 1) REGEXP '^[A-Za-z]{3}[0-9]+.*'
),
ad_level AS (
  SELECT
    a.advertiser_id,
    a.ad_id,
    a.ad_name,
    a.ad_status,  -- AD_STATUS added here
    all_ads.job_name,
    a.ad_group_status,
    a.campaign_status,
    a.video_watched_2_s,
    w.winner AS is_winner,
    a.landing_page_url AS landing_page_url,
    concat(
      'https://ads.tiktok.com/i18n/analysis/videoInsights?aadvid=',
      a.advertiser_id,
      '&from_project=dashboard&material_id=',
      a.material_id,
      '&openIframe=1'
    ) AS ads_manager_link,
    CASE
      WHEN split_part(all_ads.job_name, '_', 1) = '2023' THEN split_part(all_ads.job_name, '_', 2)
      ELSE split_part(all_ads.job_name, '_', 1)
    END AS job_match,
    sum(spend) AS tot_spend,
    sum(clicks) AS clicks,
    sum(impressions) AS impressions,
    sum(conversions) AS conversions,
    min(os_dt) AS ad_live_day
  FROM
    ad_name all_ads
  RIGHT JOIN ANALYTICS_DBT_PROD_DATABASE._D4__4__DBT_BUILD__DEFINITIONS_OS.PROSPECTIVE_MERCHANTS__TIKTOK_ADS__AD_ADAPTER A
    ON all_ads.ad_id = to_varchar(a.ad_id)
  JOIN closed M ON M.OS_STORE_ID = A.OS_STORE_ID
  LEFT JOIN (
    SELECT
      ad_id,
      winner
    FROM
      ANALYTICS.MAIN.OS_AGG_FB_WINNING_ADS 
    QUALIFY ROW_NUMBER() OVER (
      PARTITION BY ad_id
      ORDER BY os_dt DESC
    ) = 1
  ) w ON a.ad_id = to_varchar(w.ad_id)
  GROUP BY
    a.advertiser_id,
    a.ad_id,
    a.ad_name,
    a.ad_status,  -- Include AD_STATUS in GROUP BY
    all_ads.job_name,
    a.ad_group_status,
    a.campaign_status,
    a.video_watched_2_s,
    w.winner,
    a.landing_page_url,
    a.material_id
)
SELECT
  ad_id,
  ad_live_day,
  ad_name,
  ad_status,
  ad_group_status,
  campaign_status,
  video_watched_2_s,
  advertiser_id,
  clicks,
  conversions,
  impressions,
  is_winner,
  job_match,
  job_name,
  tot_spend,
  landing_page_url,
  ads_manager_link
FROM
  ad_level
WHERE
  ad_live_day > CURRENT_DATE() - INTERVAL '12 MONTH'
ORDER BY
  ad_live_day DESC;