-- Drop the FK constraint linking action_member_entities.entity to systemchart.entities.
-- Action entities in the CSV use names that don't align with systemchart (e.g. "EOSG (SA)",
-- "UN Habitat", "OSRSG CAAC") so entity values are stored as free-text going forward.

ALTER TABLE un80actions.action_member_entities
    DROP CONSTRAINT IF EXISTS action_member_entities_entity_fkey;
