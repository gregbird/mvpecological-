---
allowed-tools: mcp__supabase__get_advisors, mcp__supabase__list_tables, mcp__supabase__execute_sql
description: Check Supabase security and performance
---

# Supabase Health Check

Run security and performance checks on Dulra's Supabase:

1. Get security advisors: check for RLS issues, exposed data
2. Get performance advisors: check for slow queries, missing indexes
3. List tables and verify RLS is enabled on all
4. Report findings with remediation links
