# Audit Logs

All plans record a basic audit log of user sign-ins and settings changes.
Audit log retention varies by plan:

- Starter: 30 days
- Growth: 180 days
- Enterprise: 7 years (configurable down to 1 year)

Enterprise audit logs can be streamed to a customer-owned S3 bucket via the
audit-log export API. The export API is rate-limited to 10 requests per minute.
