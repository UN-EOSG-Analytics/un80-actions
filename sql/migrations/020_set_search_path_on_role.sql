-- Set default search_path on the application role so every connection
-- automatically resolves tables in the correct schemas.
-- This removes the need to pass options=-csearch_path=... in connection strings.
ALTER ROLE un80actions_app_user SET search_path = un80actions, systemchart;


ALTER ROLE un80actions_app_user CONNECTION LIMIT 20;