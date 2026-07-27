UPDATE `global_parameters`
SET
  `options` = (
    SELECT json_extract(field.value, '$.options')
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'sourceService'
    LIMIT 1
  ),
  `updated_at` = CAST(strftime('%s', 'now') AS integer)
WHERE `key` = 'sourceService'
  AND EXISTS (
    SELECT 1
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'sourceService'
      AND json_array_length(json_extract(field.value, '$.options')) > 0
  );--> statement-breakpoint
UPDATE `global_parameters`
SET
  `source_parameter_key` = 'sourceService',
  `mapping_rules` = (
    SELECT json_extract(field.value, '$.mapping.rules')
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'baseUrl'
    LIMIT 1
  ),
  `fallback` = COALESCE((
    SELECT json_extract(field.value, '$.mapping.fallback')
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'baseUrl'
    LIMIT 1
  ), ''),
  `updated_at` = CAST(strftime('%s', 'now') AS integer)
WHERE `key` = 'baseUrl'
  AND EXISTS (
    SELECT 1
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'baseUrl'
      AND json_array_length(json_extract(field.value, '$.mapping.rules')) > 0
  );--> statement-breakpoint
UPDATE `global_parameters`
SET
  `source_parameter_key` = 'sourceService',
  `mapping_rules` = (
    SELECT json_extract(field.value, '$.mapping.rules')
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'callbackIp'
    LIMIT 1
  ),
  `fallback` = COALESCE((
    SELECT json_extract(field.value, '$.mapping.fallback')
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'callbackIp'
    LIMIT 1
  ), ''),
  `updated_at` = CAST(strftime('%s', 'now') AS integer)
WHERE `key` = 'callbackIp'
  AND EXISTS (
    SELECT 1
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'callbackIp'
      AND json_array_length(json_extract(field.value, '$.mapping.rules')) > 0
  );--> statement-breakpoint
UPDATE `global_parameters`
SET
  `source_parameter_key` = 'sourceService',
  `mapping_rules` = (
    SELECT json_extract(field.value, '$.mapping.rules')
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'documentationUrl'
    LIMIT 1
  ),
  `fallback` = COALESCE((
    SELECT json_extract(field.value, '$.mapping.fallback')
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'documentationUrl'
    LIMIT 1
  ), ''),
  `updated_at` = CAST(strftime('%s', 'now') AS integer)
WHERE `key` = 'documentationUrl'
  AND EXISTS (
    SELECT 1
    FROM `prompt_templates` AS template, json_each(template.field_schema) AS field
    WHERE template.slug = 'integration-document'
      AND json_extract(field.value, '$.key') = 'documentationUrl'
      AND json_array_length(json_extract(field.value, '$.mapping.rules')) > 0
  );--> statement-breakpoint
UPDATE `prompt_templates`
SET
  `field_schema` = COALESCE((
    SELECT json_group_array(json(field.value))
    FROM json_each(prompt_templates.field_schema) AS field
    WHERE json_extract(field.value, '$.key') NOT IN (
      'sourceService',
      'baseUrl',
      'callbackIp',
      'documentationUrl'
    )
  ), '[]'),
  `updated_at` = CAST(strftime('%s', 'now') AS integer)
WHERE `slug` = 'integration-document';
