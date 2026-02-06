CREATE SCHEMA IF NOT EXISTS systemchart;

CREATE TABLE IF NOT EXISTS systemchart.entities (
  entity varchar(255) PRIMARY KEY,
  entity_long text
);

GRANT USAGE ON SCHEMA systemchart TO un80actions_app_user;
GRANT SELECT ON TABLE systemchart.entities TO un80actions_app_user;