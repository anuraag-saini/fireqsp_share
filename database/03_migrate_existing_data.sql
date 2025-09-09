-- Migration script to move existing interaction data from JSON to separate table
-- Run this BEFORE removing the interactions column

DO $$
DECLARE
    extraction_record RECORD;
    interaction_data JSONB;
BEGIN
    -- Loop through all extractions that have interactions
    FOR extraction_record IN 
        SELECT id, interactions 
        FROM public.extractions 
        WHERE interactions IS NOT NULL 
        AND jsonb_array_length(interactions::jsonb) > 0
    LOOP
        -- Loop through each interaction in the JSONB array
        FOR interaction_data IN 
            SELECT * FROM jsonb_array_elements(extraction_record.interactions::jsonb)
        LOOP
            -- Insert each interaction into the new table
            INSERT INTO public.interactions (
                extraction_id,
                mechanism,
                source_name,
                source_level,
                target_name,
                target_level,
                interaction_type,
                details,
                confidence,
                reference_text,
                page_number,
                filename
            ) VALUES (
                extraction_record.id,
                COALESCE(interaction_data->>'mechanism', ''),
                COALESCE(interaction_data->'source'->>'name', ''),
                COALESCE(interaction_data->'source'->>'level', ''),
                COALESCE(interaction_data->'target'->>'name', ''),
                COALESCE(interaction_data->'target'->>'level', ''),
                COALESCE(interaction_data->>'interaction_type', ''),
                COALESCE(interaction_data->>'details', ''),
                COALESCE(interaction_data->>'confidence', 'medium'),
                COALESCE(interaction_data->>'reference_text', ''),
                COALESCE(interaction_data->>'page_number', ''),
                COALESCE(interaction_data->>'filename', '')
            );
        END LOOP;
        
        RAISE NOTICE 'Migrated interactions for extraction: %', extraction_record.id;
    END LOOP;
END $$;

-- Verify the migration
SELECT 
    e.id as extraction_id,
    e.title,
    COUNT(i.id) as migrated_interactions,
    e.interaction_count as original_count
FROM public.extractions e
LEFT JOIN public.interactions i ON e.id = i.extraction_id
WHERE e.interactions IS NOT NULL
GROUP BY e.id, e.title, e.interaction_count
ORDER BY e.created_at DESC;
