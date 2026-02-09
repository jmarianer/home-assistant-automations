#!/bin/bash
jsonnet automations.jsonnet | yq -P > /Volumes/config/automations.yaml
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJiZjY1N2YyOTkzMmI0MDljYWU5ZGZhZDI4MWFkNzUxNSIsImlhdCI6MTc3MDUzNDA3NiwiZXhwIjoyMDg1ODk0MDc2fQ.hKpN8XveDKdcMdHG0LeSLHXDM_BnzrMRWHR6qQ7D6H0"
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://homeassistant.local:8123/api/services/automation/reload
