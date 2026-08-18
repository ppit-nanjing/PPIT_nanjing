-- Add Google-Forms-style grid question types.
ALTER TYPE "membership_field_type" ADD VALUE IF NOT EXISTS 'grid_radio';
ALTER TYPE "membership_field_type" ADD VALUE IF NOT EXISTS 'grid_checkbox';
