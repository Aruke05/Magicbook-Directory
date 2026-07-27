CREATE TABLE `global_parameters` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'fixed' NOT NULL,
	`value_type` text DEFAULT 'text' NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`options` text DEFAULT '[]' NOT NULL,
	`source_parameter_key` text,
	`mapping_rules` text DEFAULT '[]' NOT NULL,
	`fallback` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `global_parameters_key_idx` ON `global_parameters` (`key`);--> statement-breakpoint
CREATE INDEX `global_parameters_enabled_idx` ON `global_parameters` (`enabled`);--> statement-breakpoint
CREATE INDEX `global_parameters_sort_idx` ON `global_parameters` (`sort_order`);--> statement-breakpoint
INSERT INTO `global_parameters` (`id`, `key`, `label`, `description`, `kind`, `value_type`, `options`, `enabled`, `sort_order`, `created_at`, `updated_at`)
VALUES (
  'global-source-service',
  'sourceService',
  '四方支付服务',
  '生成对接任务时选择作为参考的四方支付服务。',
  'select',
  'text',
  COALESCE(
    (
      SELECT json_extract(field.value, '$.options')
      FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
      WHERE template.slug = 'payment-strategy-integration'
        AND json_extract(field.value, '$.key') = 'sourceService'
      LIMIT 1
    ),
    '[{"label":"nexapay","value":"nexapay"},{"label":"lakpay","value":"lakpay"},{"label":"devapay","value":"devapay"},{"label":"nine","value":"nine"},{"label":"poppay","value":"poppay"},{"label":"mcbpay","value":"mcbpay"},{"label":"6g","value":"6g"},{"label":"tata","value":"tata"},{"label":"vns","value":"vns"},{"label":"nupa","value":"nupa"},{"label":"mkpay","value":"mkpay"}]'
  ),
  1,
  0,
  CAST(strftime('%s', 'now') AS integer),
  CAST(strftime('%s', 'now') AS integer)
);--> statement-breakpoint
INSERT INTO `global_parameters` (`id`, `key`, `label`, `description`, `kind`, `value_type`, `source_parameter_key`, `mapping_rules`, `fallback`, `enabled`, `sort_order`, `created_at`, `updated_at`)
VALUES
  (
    'global-base-url',
    'baseUrl',
    'BaseURL',
    '根据四方支付服务自动取得接口基础地址。',
    'mapping',
    'url',
    'sourceService',
    COALESCE((
      SELECT json_extract(field.value, '$.mapping.rules')
      FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
      WHERE template.slug = 'payment-strategy-integration'
        AND json_extract(field.value, '$.key') IN ('baseUrl', 'baseURL', 'apiBaseUrl')
      LIMIT 1
    ), '[]'),
    COALESCE((
      SELECT json_extract(field.value, '$.mapping.fallback')
      FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
      WHERE template.slug = 'payment-strategy-integration'
        AND json_extract(field.value, '$.key') IN ('baseUrl', 'baseURL', 'apiBaseUrl')
      LIMIT 1
    ), ''),
    1,
    1,
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
  ),
  (
    'global-callback-ip',
    'callbackIp',
    '回调 IP',
    '根据四方支付服务自动取得回调来源 IP。',
    'mapping',
    'text',
    'sourceService',
    COALESCE((
      SELECT json_extract(field.value, '$.mapping.rules')
      FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
      WHERE template.slug = 'payment-strategy-integration'
        AND json_extract(field.value, '$.key') IN ('callbackIp', 'callbackIP', 'notifyIp')
      LIMIT 1
    ), '[]'),
    '',
    1,
    2,
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
  ),
  (
    'global-documentation-url',
    'documentationUrl',
    '对接文档地址',
    '根据四方支付服务自动取得对接文档地址。',
    'mapping',
    'url',
    'sourceService',
    COALESCE((
      SELECT json_extract(field.value, '$.mapping.rules')
      FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
      WHERE template.slug = 'payment-strategy-integration'
        AND json_extract(field.value, '$.key') IN ('documentationUrl', 'apiDocumentation', 'documentUrl', 'docUrl')
      LIMIT 1
    ), '[]'),
    '',
    1,
    3,
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
  ),
  (
    'global-target-branch',
    'branch',
    '目标分支',
    '根据四方支付服务自动选择代码目标分支。',
    'mapping',
    'text',
    'sourceService',
    COALESCE((
      SELECT json_extract(field.value, '$.mapping.rules')
      FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
      WHERE template.slug = 'payment-strategy-integration'
        AND json_extract(field.value, '$.key') = 'branch'
      LIMIT 1
    ), '[{"sourceValues":["nexapay"],"output":"nexapay"},{"sourceValues":["lakpay"],"output":"lakpay"},{"sourceValues":["devapay"],"output":"devapay"},{"sourceValues":["nine","poppay"],"output":"uat"},{"sourceValues":["mcbpay","6g","tata","vns","nupa","mkpay"],"output":"prod-pkr"}]'),
    '',
    1,
    4,
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
  ),
  (
    'global-target-region',
    'targetRegion',
    '服务地区',
    '根据四方支付服务自动取得服务地区。',
    'mapping',
    'text',
    'sourceService',
    COALESCE((
      SELECT json_extract(field.value, '$.mapping.rules')
      FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
      WHERE template.slug = 'payment-strategy-integration'
        AND json_extract(field.value, '$.key') = 'targetRegion'
      LIMIT 1
    ), '[]'),
    '',
    1,
    5,
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
  );--> statement-breakpoint
UPDATE `prompt_templates`
SET
  `field_schema` = COALESCE((
    SELECT json_group_array(json(field.value))
    FROM json_each(prompt_templates.field_schema) AS field
    WHERE json_extract(field.value, '$.key') NOT IN (
      'sourceService',
      'baseUrl',
      'baseURL',
      'apiBaseUrl',
      'callbackIp',
      'callbackIP',
      'notifyIp',
      'documentationUrl',
      'apiDocumentation',
      'documentUrl',
      'docUrl',
      'branch',
      'targetRegion'
    )
  ), '[]'),
  `content` = replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(`content`, 'apiBaseUrl', 'baseUrl'),
                'baseURL',
                'baseUrl'
              ),
              'callbackIP',
              'callbackIp'
            ),
            'notifyIp',
            'callbackIp'
          ),
          'apiDocumentation',
          'documentationUrl'
        ),
        'documentUrl',
        'documentationUrl'
      ),
      'docUrl',
      'documentationUrl'
    ),
    '参考服务',
    '四方支付服务'
  ),
  `description` = replace(`description`, '参考服务', '四方支付服务'),
  `updated_at` = CAST(strftime('%s', 'now') AS integer)
WHERE `slug` = 'payment-strategy-integration';
