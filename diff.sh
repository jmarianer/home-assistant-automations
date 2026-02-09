#!/bin/bash
jd <(
  yq -o=json automations.yaml | jq 'map(
    del(.id) |
    if has("trigger") then .triggers = .trigger | del(.trigger) else . end |
    if has("action") then .actions = .action | del(.action) else . end |
    if has("condition") then .conditions = .condition | del(.condition) else . end |
    .triggers |= map(
      if has("platform") then .trigger = .platform | del(.platform) else . end
    ) |
    .actions |= map(
      if has("service") then .action = .service | del(.service) else . end |
      if .data == {} then del(.data) else . end |
      if .metadata == {} then del(.metadata) else . end
    )
  ) | [.[] | select (.alias != "Bedroom Lights - Sunrise alarm")]'
) <(
  jsonnet automations.jsonnet
)