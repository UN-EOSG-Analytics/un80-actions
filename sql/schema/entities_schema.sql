CREATE SCHEMA IF NOT EXISTS systemchart;

CREATE TABLE IF NOT EXISTS systemchart.entities (
  entity varchar(255) PRIMARY KEY,
  entity_long text
);