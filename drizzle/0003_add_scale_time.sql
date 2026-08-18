-- Add Google-Forms-style field types.
ALTER TYPE "membership_field_type" ADD VALUE IF NOT EXISTS 'time';
ALTER TYPE "membership_field_type" ADD VALUE IF NOT EXISTS 'linear_scale';
