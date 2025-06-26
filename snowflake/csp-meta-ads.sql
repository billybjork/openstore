WITH closed AS (
  SELECT os_store_id
  FROM ANALYTICS.MAIN_OS.OS_MERCHANTS
  WHERE is_closed
),

/* ---------- “latest-status” CTEs ---------- */
campaign_history AS (
  SELECT id AS campaign_id, effective_status, status
  FROM   PROSPECTIVE_MERCHANTS_PROD_DATABASE.FACEBOOK_ADS_MERCHANT_DATA.CAMPAIGN_HISTORY
  QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_time DESC) = 1
),
adset_history AS (
  SELECT id AS ad_set_id, campaign_id, effective_status, status
  FROM   PROSPECTIVE_MERCHANTS_PROD_DATABASE.FACEBOOK_ADS_MERCHANT_DATA.AD_SET_HISTORY
  QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_time DESC) = 1
),
ad_history AS (
  SELECT id AS ad_id, ad_set_id, campaign_id, effective_status, status
  FROM   PROSPECTIVE_MERCHANTS_PROD_DATABASE.FACEBOOK_ADS_MERCHANT_DATA.AD_HISTORY
  QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_time DESC) = 1
),

/* ---------- Delivery logic ---------- */
delivery AS (
  SELECT
    ad_id,
    ad_set_id,
    campaign_id,
    campaign_history.effective_status AS campaign_status,
    adset_history.effective_status    AS adset_status,
    ad_history.effective_status       AS ad_status,
    CASE
      WHEN campaign_history.status = 'ACTIVE'
       AND adset_history.status   = 'ACTIVE'
       AND ad_history.status      = 'ACTIVE' THEN 'ACTIVE'
      WHEN campaign_history.status = 'PAUSED'
        OR adset_history.status   = 'PAUSED'
        OR ad_history.status      = 'PAUSED' THEN 'PAUSED'
      ELSE 'OTHER'
    END AS delivery_logic
  FROM campaign_history
  JOIN adset_history USING (campaign_id)
  JOIN ad_history     USING (campaign_id, ad_set_id)
),

/* ---------- Ad-level roll-up ---------- */
ad_level AS (
  SELECT
    a.account_id,
    a.ad_id,
    a.ad_name,
    NULL                       AS job_name,
    a.ad_status,
    w.winner                   AS is_winner,
    w.first_win_date,
    COALESCE(
      creative_pagelinks,
      template_page_link,
      template_link,
      OBJECT_STORY_LINK_DATA_CAPTION,
      VIDEO_CALL_TO_ACTION_VALUE_LINK,
      PARSE_JSON(ASSET_FEED_SPEC_LINK_URLS)[0]:website_url::STRING
    )                          AS cta_link,
    CONCAT(
      'https://adsmanager.facebook.com/adsmanager/manage/ads?act=',
      a.account_id,
      '&business_id=1429878634028653&selected_campaign_ids=',
      a.campaign_id,
      '&selected_adset_ids=',
      a.ad_set_id,
      '&selected_ad_ids=',
      a.ad_id
    )                          AS ads_manager_link,
    NULL                       AS job_match,
    CASE WHEN MAX(a.os_dt) >= CURRENT_DATE THEN a.ad_status ELSE 'PAUSED' END
                                AS effective_status,
    SUM(spend)                  AS tot_spend,
    SUM(inline_clicks)          AS link_clicks,
    SUM(outbound_clicks)        AS outbound_clicks,
    SUM(impressions)            AS impressions,
    SUM(all_purchases_conversion_value) AS conversion_value,
    SUM(all_conversions)        AS conversions,
    SUM(video_view)             AS video_views_3s,
    MIN(os_dt)                  AS ad_live_day,
    SUM(w.cume_conversions)     AS cumulative_conversions,
    MAX(w.breakeven_cac)        AS breakeven_cac,
    MAX(w.cume_cac)             AS cumulative_cac,
    MAX(w.pre_winner)           AS pre_winner
  FROM (
      SELECT DISTINCT A.*, B.value AS video_view
      FROM analytics.main_os.facebook_ads_adapter A
      JOIN closed ON closed.os_store_id = A.os_store_id
      LEFT JOIN (
        SELECT *
        FROM PROSPECTIVE_MERCHANTS_PROD_DATABASE.FACEBOOK_ADS_MERCHANT_DATA.BASIC_AD_ACTIONS
        WHERE action_type = 'video_view'
      ) B
        ON  A.os_dt = B.date
        AND A.ad_id = B.ad_id
      WHERE A.os_dt > CURRENT_DATE() - INTERVAL '13 MONTH'
    ) A
  LEFT JOIN (
      SELECT *
      FROM (
        SELECT
          ad_id,
          winner,
          cume_conversions,
          breakeven_cac,
          cume_cac,
          IFF(cume_cac <= 0.8 * breakeven_cac AND cume_conversions >= 10,
              TRUE, FALSE) AS pre_winner
        FROM ANALYTICS.MAIN_OS.OS_AGG_FB_WINNING_ADS
        QUALIFY ROW_NUMBER() OVER (PARTITION BY ad_id ORDER BY os_dt DESC) = 1
      ) last_entry
      LEFT JOIN (
        SELECT ad_id, DATE(MIN(os_dt)) AS first_win_date
        FROM   ANALYTICS.MAIN_OS.OS_AGG_FB_WINNING_ADS
        WHERE  winner
        GROUP  BY ad_id
      ) USING (ad_id)
    ) w
    ON a.ad_id = TO_VARCHAR(w.ad_id)
  GROUP BY 1,2,3,4,5,6,7,8,9,10
),

/* ---------- Other metrics ---------- */
estimated_in_platform AS (
  SELECT
    TO_VARCHAR(ad_id) AS ad_id,
    SUM(website_purchase_conversion_value_7d_click * 0.54) AS estimated_in_platform_cd
  FROM ANALYTICS.MAIN_OS.FACEBOOK_ADS_ADAPTER a
  LEFT JOIN ANALYTICS.MAIN_OS.OS_MERCHANTS m
    ON a.os_store_id = m.os_store_id
  WHERE m.is_closed
  GROUP BY 1
),

/* ---------- np_purchase_rate (latest) ---------- */
np_rate AS (
  SELECT TO_VARCHAR(ad_id) AS ad_id, np_purchase_rate
  FROM (
    SELECT
      ad_id,
      np_purchase_rate,
      ROW_NUMBER() OVER (PARTITION BY ad_id ORDER BY os_dt DESC) AS rn
    FROM ANALYTICS_DBT_PROD_DATABASE._D4__4__DBT_BUILD__DEFINITIONS_OS
         .PROSPECTIVE_MERCHANTS__FACEBOOK_ADS__AD_ADAPTER
    WHERE np_purchase_rate IS NOT NULL
  )
  WHERE rn = 1
)

/* ---------- Final result ---------- */
SELECT
  al.account_id,
  al.ads_manager_link,
  al.ad_id,
  al.ad_live_day,
  al.ad_name,
  al.ad_status,
  al.conversions                 AS tot_conversions,
  al.conversion_value,
  al.cta_link,
  al.effective_status,
  al.impressions                 AS tot_impressions,
  al.is_winner,
  al.job_match,
  al.job_name,
  al.link_clicks,
  al.outbound_clicks,
  al.tot_spend,
  al.cumulative_conversions,
  al.breakeven_cac,
  al.cumulative_cac,
  al.pre_winner,
  al.first_win_date,
  d.delivery_logic,
  d.adset_status,
  d.campaign_status,
  al.video_views_3s,
  est.estimated_in_platform_cd,
  npr.np_purchase_rate
FROM ad_level               al
JOIN delivery               d    USING (ad_id)
LEFT JOIN estimated_in_platform est ON al.ad_id = est.ad_id
LEFT JOIN np_rate                npr ON al.ad_id = npr.ad_id
WHERE al.ad_live_day > CURRENT_DATE() - INTERVAL '13 MONTH'
ORDER BY al.ad_live_day DESC;